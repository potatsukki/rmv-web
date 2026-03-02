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
  withCredentials: true, // still needed for refreshToken cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token + CSRF token
api.interceptors.request.use((config) => {
  const { csrfToken, accessToken } = useAuthStore.getState();

  // Attach access token as Authorization header (per-tab isolation)
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Attach CSRF token on mutating requests
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
        // Try refresh — refreshToken sent via httpOnly cookie automatically
        const refreshResponse = await api.post('/auth/refresh-token');
        const newAccessToken = refreshResponse.data?.data?.accessToken;
        if (newAccessToken) {
          useAuthStore.getState().setAccessToken(newAccessToken);
          // Update the original request's auth header with the new token
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch {
        // Refresh failed - clear local auth without triggering another logout request
        disconnectSocket();
        sessionStorage.removeItem('accessToken');
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          csrfToken: null,
          accessToken: null,
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
