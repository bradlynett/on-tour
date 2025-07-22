import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../config/api';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
  needsOnboarding?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, totp?: string, backupCode?: string) => Promise<any>;
  register: (userData: RegisterData) => Promise<any>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isLoading: boolean;
  error: string | null;
}

interface RegisterData {
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data.user);
          setToken(storedToken);
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, totp?: string, backupCode?: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const payload: any = { email, password };
      if (totp) payload.totp = totp;
      if (backupCode) payload.backupCode = backupCode;
      const response = await api.post('/auth/login', payload);
      if (response.data.twoFactorRequired) {
        // 2FA required, return response for further handling
        setIsLoading(false);
        return response.data;
      }
      const { token: newToken, refreshToken, user: userData } = response.data.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('authToken', newToken);
      setToken(newToken);
      setUser(userData);
      setIsLoading(false);
      return response.data;
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed');
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await api.post('/auth/register', userData);
      console.log('AuthContext register response:', response.data); // Debug log
      
      // If registration returns tokens, log the user in
      if (response.data?.data?.token) {
        const { token: newToken, refreshToken, user: userData } = response.data.data;
        console.log('AuthContext setting user:', userData); // Debug log
        console.log('User object keys:', Object.keys(userData)); // Debug log
        console.log('User object needsOnboarding:', userData.needsOnboarding); // Debug log
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        setUser(userData);
      }
      
      return response.data;
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    updateUser,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 