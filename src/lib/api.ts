import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { disconnectSocket } from '@/lib/socket';
import {
  getStoredRefreshToken,
  setAuthRedirectReason,
} from '@/lib/auth-session';

const API_BASE = '/api/v1';

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _csrfRetry?: boolean;
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // still needed for refreshToken cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Shared in-flight promises to prevent thundering-herd on concurrent 401/403 ──
let refreshPromise: Promise<string | null> | null = null;
let csrfRefreshPromise: Promise<string> | null = null;

/**
 * Deduplicated token refresh — only one POST /auth/refresh-token at a time.
 * All concurrent 401 callers await the same promise.
 */
function doRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken || getStoredRefreshToken();
  if (!refreshToken) {
    return Promise.resolve(null);
  }

  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh-token', { refreshToken })
      .then((res) => {
        const newToken = res.data?.data?.accessToken as string | undefined;
        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken);
        }
        return newToken ?? null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Deduplicated CSRF refresh — only one GET /csrf-token at a time.
 * All concurrent 403 callers await the same promise.
 */
function doCsrfRefresh(): Promise<string> {
  if (!csrfRefreshPromise) {
    csrfRefreshPromise = api
      .get('/csrf-token')
      .then((res) => {
        const token = res.data.data.csrfToken as string;
        useAuthStore.getState().setCsrfToken(token);
        return token;
      })
      .finally(() => {
        csrfRefreshPromise = null;
      });
  }
  return csrfRefreshPromise;
}

// Request interceptor: attach Bearer token + CSRF token
api.interceptors.request.use((config) => {
  const { csrfToken, accessToken, refreshToken } = useAuthStore.getState();

  // Attach access token as Authorization header (per-tab isolation)
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (refreshToken) {
    config.headers = config.headers ?? {};
    config.headers['X-Refresh-Token'] = refreshToken;
  }

  // Attach CSRF token on mutating requests
  if (csrfToken && config.method?.toLowerCase() !== 'get') {
    config.headers = config.headers ?? {};
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor: handle 401 / 403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';
    const isRefreshRequest = requestUrl.includes('/auth/refresh-token');
    const isLogoutRequest = requestUrl.includes('/auth/logout');
    const isCsrfRequest = requestUrl.includes('/csrf-token');

    // ── 403: CSRF token missing or stale — refresh once and retry ──
    // Handle 403 BEFORE 401 because a failed refresh-token POST due to
    // missing CSRF should be retried with a fresh CSRF token first.
    if (
      status === 403 &&
      originalRequest &&
      !originalRequest._csrfRetry &&
      !isCsrfRequest &&
      originalRequest.method?.toLowerCase() !== 'get'
    ) {
      originalRequest._csrfRetry = true;
      try {
        const newCsrfToken = await doCsrfRefresh();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers['X-CSRF-Token'] = newCsrfToken;
        return api(originalRequest);
      } catch {
        // CSRF refresh failed — propagate original error
      }
    }

    // ── 401: Access token expired — refresh once and retry ──
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest &&
      !isLogoutRequest
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await doRefresh();
        if (!newAccessToken) {
          throw new Error('Missing refresh token');
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear local auth without triggering another logout request
        disconnectSocket();
        useAuthStore.getState().clearAuthState();
        setAuthRedirectReason('Your session expired or was replaced. Please sign in again.');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// CSRF token fetcher (used by App init)
export async function fetchCsrfToken(): Promise<string> {
  return doCsrfRefresh();
}
