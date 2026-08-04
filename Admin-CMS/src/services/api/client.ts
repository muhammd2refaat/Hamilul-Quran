/**
 * API client configuration with Axios
 */

import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';

// Backend base URL — reads VITE_API_BASE_URL (e.g. http://localhost:8000/api/v1
// in dev, the real API domain in production). Falls back to the relative
// /api/v1 path (routed by the Vite dev proxy to 127.0.0.1:8000) when unset.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Create the Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // Sends/receives the backend's HttpOnly access_token/refresh_token cookies
  // instead of a JS-held Authorization header.
  withCredentials: true,
});

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
