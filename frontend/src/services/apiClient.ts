import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Airport, TripSuggestionCamel } from '../types/trip';
import { toCamelCase } from '../utils/formatters';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: any[];
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  key?: string;
}

export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  cache?: CacheConfig;
  retry?: RetryConfig;
  onRequest?: (config: AxiosRequestConfig) => void;
  onResponse?: (response: AxiosResponse) => void;
  onError?: (error: ApiError) => void;
}

class ApiClient {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: config.headers || {},
      withCredentials: config.withCredentials || true,
      cache: {
        enabled: config.cache?.enabled || false,
        ttl: config.cache?.ttl || 5 * 60 * 1000, // 5 minutes
        ...config.cache
      },
      retry: {
        enabled: config.retry?.enabled || false,
        maxRetries: config.retry?.maxRetries || 3,
        retryDelay: config.retry?.retryDelay || 1000,
        ...config.retry
      },
      onRequest: config.onRequest,
      onResponse: config.onResponse,
      onError: config.onError
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers,
      withCredentials: this.config.withCredentials
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getStoredAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Call custom request handler
        if (this.config.onRequest) {
          this.config.onRequest(config);
        }

        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Call custom response handler
        if (this.config.onResponse) {
          this.config.onResponse(response);
        }

        return response;
      },
      (error) => {
        const apiError = this.handleError(error);
        
        // Call custom error handler
        if (this.config.onError) {
          this.config.onError(apiError);
        }

        return Promise.reject(apiError);
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const response = error.response;
      const data = response.data as any;

      return {
        message: data?.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        code: data?.error || data?.code,
        details: data?.details || data?.errors
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error: No response received',
        status: 0,
        code: 'NETWORK_ERROR'
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'Unknown error occurred',
        status: 0,
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  private getStoredAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private setStoredAuthToken(token: string) {
    localStorage.setItem('token', token);
  }

  private clearStoredAuthToken() {
    localStorage.removeItem('token');
  }

  private generateCacheKey(config: AxiosRequestConfig): string {
    const { method, url, params, data } = config;
    return `${method?.toUpperCase()}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  private getCachedResponse(cacheKey: string): any | null {
    if (!this.config.cache?.enabled) return null;

    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  private setCachedResponse(cacheKey: string, data: any, ttl?: number) {
    if (!this.config.cache?.enabled) return;

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cache.ttl
    });
  }

  private async retryRequest<T>(
    config: AxiosRequestConfig,
    retryCount: number = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.request<T>(config);
    } catch (error) {
      const apiError = error as ApiError;
      
      if (!this.config.retry?.enabled || retryCount >= this.config.retry.maxRetries) {
        throw apiError;
      }

      const shouldRetry = this.config.retry.retryCondition 
        ? this.config.retry.retryCondition(error as AxiosError)
        : this.isRetryableError(apiError);

      if (!shouldRetry) {
        throw apiError;
      }

      // Wait before retrying
      await this.delay(this.config.retry.retryDelay * Math.pow(2, retryCount));

      return this.retryRequest(config, retryCount + 1);
    }
  }

  private isRetryableError(error: ApiError): boolean {
    // Retry on network errors and 5xx server errors
    return error.status === 0 || (error.status >= 500 && error.status < 600);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig & { cache?: CacheConfig }
  ): Promise<ApiResponse<T>> {
    const requestConfig = { ...config, method: 'GET' };
    const cacheKey = this.generateCacheKey({ ...requestConfig, url });

    // Check cache first
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest<T>({ ...requestConfig, url });
      const result = response.data as ApiResponse<T>;

      // Cache successful responses
      if (result.success && (config?.cache?.enabled || this.config.cache?.enabled)) {
        this.setCachedResponse(cacheKey, result, config?.cache?.ttl);
      }

      return result;
    } catch (error) {
      throw error as ApiError;
    }
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.retryRequest<T>({
        ...config,
        method: 'POST',
        url,
        data
      });
      return response.data as ApiResponse<T>;
    } catch (error) {
      throw error as ApiError;
    }
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.retryRequest<T>({
        ...config,
        method: 'PUT',
        url,
        data
      });
      return response.data as ApiResponse<T>;
    } catch (error) {
      throw error as ApiError;
    }
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.retryRequest<T>({
        ...config,
        method: 'PATCH',
        url,
        data
      });
      return response.data as ApiResponse<T>;
    } catch (error) {
      throw error as ApiError;
    }
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.retryRequest<T>({
        ...config,
        method: 'DELETE',
        url
      });
      return response.data as ApiResponse<T>;
    } catch (error) {
      throw error as ApiError;
    }
  }

  /**
   * Search airports by keyword (city, IATA code, or name)
   * @param keyword string
   * @returns Promise<ApiResponse<Airport[]>>
   */
  async searchAirports(keyword: string): Promise<ApiResponse<Airport[]>> {
    return this.get<Airport[]>('/api/travel/airports', {
      params: { keyword },
    });
  }

  /**
   * Fetch a trip suggestion by ID
   * @param id number
   * @returns Promise<ApiResponse<TripSuggestionCamel>>
   */
  async getTripById(id: number): Promise<ApiResponse<TripSuggestionCamel>> {
    const response = await this.get<TripSuggestionCamel>(`/api/trips/${id}`);
    if (response.success && response.data) {
      response.data = toCamelCase(response.data);
    }
    return response;
  }

  /**
   * Fetch all trip suggestions for the current user
   * @param params object (optional)
   * @returns Promise<ApiResponse<{ suggestions: TripSuggestionCamel[] }>>
   */
  async getTripSuggestions(params?: any): Promise<ApiResponse<{ suggestions: TripSuggestionCamel[] }>> {
    const response = await this.get<{ suggestions: TripSuggestionCamel[] }>(`/api/trips`, { params });
    if (response.success && response.data && response.data.suggestions) {
      response.data.suggestions = toCamelCase(response.data.suggestions);
    }
    return response;
  }

  // Authentication methods
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.post<{ token: string; user: any }>('/auth/login', credentials);
    
    if (response.success && response.data?.token) {
      this.setStoredAuthToken(response.data.token);
    }
    
    return response;
  }

  async register(userData: any): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.post<{ token: string; user: any }>('/auth/register', userData);
    
    if (response.success && response.data?.token) {
      this.setStoredAuthToken(response.data.token);
    }
    
    return response;
  }

  logout(): void {
    this.clearStoredAuthToken();
  }

  isAuthenticated(): boolean {
    return !!this.getStoredAuthToken();
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  clearCacheByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Utility methods
  setAuthToken(token: string): void {
    this.setStoredAuthToken(token);
  }

  getAuthToken(): string | null {
    return this.getStoredAuthToken();
  }

  // Request with custom config
  async request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.retryRequest<T>(config);
      return response.data as ApiResponse<T>;
    } catch (error) {
      throw error as ApiError;
    }
  }
}

// Create default API client instance
const apiClient = new ApiClient({
  baseURL: 'http://localhost:5001/api', // <-- ensure /api is included
  timeout: 10000,
  headers: {},
  withCredentials: true
});

export default apiClient;
export { ApiClient }; 