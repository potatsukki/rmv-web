import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { disconnectSocket } from '@/lib/socket';

const API_BASE = '/api/v1';

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = useAuthStore.getState().csrfToken;
  if (csrfToken && config.method?.toLowerCase() !== 'get') {
    config.headers = config.headers ?? {};
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';
    const isRefreshRequest = requestUrl.includes('/auth/refresh-token');
    const isLogoutRequest = requestUrl.includes('/auth/logout');

    // If 401 and not retrying already
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest &&
      !isLogoutRequest
    ) {
      originalRequest._retry = true;

      try {
        // Try refresh
        await api.post('/auth/refresh-token');
        return api(originalRequest);
      } catch {
        // Refresh failed - clear local auth without triggering another logout request
        disconnectSocket();
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          csrfToken: null,
        });
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// CSRF token fetcher
export async function fetchCsrfToken(): Promise<string> {
  const { data } = await api.get('/csrf-token');
  const token = data.data.csrfToken;
  useAuthStore.getState().setCsrfToken(token);
  return token;
}
