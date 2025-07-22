import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Use local network IP for device testing
const API_BASE_URL = 'http://192.168.0.42:5001/api'; // Your local network IP

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const storeToken = async (token: string) => {
  await SecureStore.setItemAsync('authToken', token);
};

export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('authToken');
};

export const removeToken = async () => {
  await SecureStore.deleteItemAsync('authToken');
};

// Add token to requests if available
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data.data; // Return the nested data object containing token, user, etc.
};

// Add more API functions as needed

export default api; 