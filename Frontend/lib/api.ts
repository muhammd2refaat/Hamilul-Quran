import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  // Sends/receives the HttpOnly auth cookies on every request instead of an
  // Authorization header the client would have to hold in JS-reachable storage.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // On 401, try a one-shot refresh (the refresh_token cookie is sent
    // automatically) before giving up and redirecting to login.
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          undefined,
          { withCredentials: true }
        );
        return apiClient(original);
      } catch {
        // fall through to redirect below
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
