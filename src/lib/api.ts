import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach CSRF token ──
api.interceptors.request.use((config) => {
  const csrfToken = useAuthStore.getState().csrfToken;
  if (csrfToken && config.method !== 'get') {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// ── Response interceptor: handle 401 ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not retrying already
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try refresh
        await api.post('/auth/refresh-token');
        return api(originalRequest);
      } catch {
        // Refresh failed — logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// ── CSRF Token Fetcher ──
export async function fetchCsrfToken(): Promise<string> {
  const { data } = await api.get('/csrf-token');
  const token = data.data.csrfToken;
  useAuthStore.getState().setCsrfToken(token);
  return token;
}
