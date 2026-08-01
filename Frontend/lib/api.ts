import axios from 'axios';

import { storeTokens, getRefreshToken, clearTokens } from '@/lib/auth';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // Check if running in browser to access localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // On 401, try a one-shot refresh with the stored refresh token before
    // giving up and redirecting to login.
    if (error.response?.status === 401 && original && !original._retried) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        original._retried = true;
        try {
          const { data } = await axios.post(
            `${apiClient.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          storeTokens(data.access_token, data.refresh_token);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(original);
        } catch {
          // fall through to logout below
        }
      }

      if (typeof window !== 'undefined') {
        clearTokens();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
