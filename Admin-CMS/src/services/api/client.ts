/**
 * API client configuration with Axios
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import toast from 'react-hot-toast';

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.platform.com';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Storage keys
const TOKEN_KEY = 'qv_auth_token';
const REFRESH_TOKEN_KEY = 'qv_refresh_token';

// Request queue for token refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Create and configure the Axios instance
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable cookies for httpOnly tokens
  });

  // Request interceptor
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add auth token to headers
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token for mutations
      const csrfToken = getCsrfToken();
      if (csrfToken && config.method !== 'get' && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }

      // Add request ID for tracking
      if (config.headers) {
        config.headers['X-Request-ID'] = generateRequestId();
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Extract and store new CSRF token if present
      const newCsrfToken = response.headers['x-csrf-token'];
      if (newCsrfToken) {
        setCsrfToken(newCsrfToken);
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401 Unauthorized - token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Wait for token refresh
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;
          localStorage.setItem(TOKEN_KEY, token);
          isRefreshing = false;
          onTokenRefreshed(token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          // Clear tokens and redirect to login
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Handle other errors
      handleApiError(error);
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Handle API errors globally
 */
function handleApiError(error: AxiosError) {
  const status = error.response?.status;
  const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
  const message = data?.message;

  switch (status) {
    case 400:
      toast.error(message || 'Invalid request. Please check your input.');
      break;
    case 401:
      toast.error('Session expired. Please log in again.');
      break;
    case 403:
      toast.error('You do not have permission to perform this action.');
      break;
    case 404:
      toast.error('The requested resource was not found.');
      break;
    case 429:
      toast.error('Too many requests. Please wait and try again.');
      break;
    case 500:
      toast.error('Server error. Please try again later.');
      break;
    default:
      toast.error(message || 'An unexpected error occurred.');
  }
}

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Set CSRF token in cookie
 */
function setCsrfToken(token: string): void {
  document.cookie = `csrf_token=${encodeURIComponent(token)}; path=/; secure; samesite=strict`;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create and export the API client
export const apiClient = createApiClient();

/**
 * Type-safe API request helpers
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

export async function post<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
}

export async function put<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
}

export async function patch<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}

export default apiClient;
