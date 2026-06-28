/**
 * API client configuration with Axios
 */

import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

// Backend base URL — uses Vite proxy (/api → http://127.0.0.1:8000) to avoid IPv6/localhost issues
const API_BASE_URL = '/api/v1';
const API_TIMEOUT = 30000;

// Storage keys
const TOKEN_KEY = 'qv_auth_token';
const REFRESH_TOKEN_KEY = 'qv_refresh_token';

// Create the Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // No withCredentials — we use JWT in Authorization header, not cookies
});

// ─── Request Interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token = localStorage.getItem(TOKEN_KEY);

    // Clean up any corrupt Zustand JSON objects stored as tokens
    if (token && token.startsWith('{')) {
      localStorage.removeItem(TOKEN_KEY);
      token = null;
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // For auth/login failures, let the caller handle the error — don't toast here
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (isLoginRequest) {
      return Promise.reject(error);
    }

    // For all other requests, show a generic error toast
    const status = error.response?.status;
    const data = error.response?.data as { message?: string } | undefined;

    if (!status) {
      // Network error
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Cannot connect to server. Please check your connection.');
      });
    } else if (status === 401) {
      // Clear stale tokens and let the page refresh handle redirect
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.location.href = '/auth/login';
    } else if (status >= 400) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(data?.message || `Error ${status}`);
      });
    }

    return Promise.reject(error);
  }
);

// ─── Type-safe helpers ─────────────────────────────────────────────────────────
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

export { apiClient };
export default apiClient;
