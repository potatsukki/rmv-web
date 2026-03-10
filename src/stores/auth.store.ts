import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';
import type { User } from '@/lib/types';
import { api } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import {
  clearStoredAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from '@/lib/auth-session';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  csrfToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: User) => void;
  setCsrfToken: (token: string) => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  clearAuthState: () => void;
  logout: () => Promise<{ success: boolean; message: string | null }>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  csrfToken: null,
  accessToken: getStoredAccessToken(),
  refreshToken: getStoredRefreshToken(),

  setUser: (user: User) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  setCsrfToken: (token: string) => set({ csrfToken: token }),

  setAccessToken: (token: string) => {
    setStoredAccessToken(token);
    set({ accessToken: token });
  },

  setRefreshToken: (token: string) => {
    setStoredRefreshToken(token);
    set({ refreshToken: token });
  },

  clearAuthState: () => {
    disconnectSocket();
    clearStoredAuthSession();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      csrfToken: null,
      accessToken: null,
      refreshToken: null,
    });
  },

  logout: async () => {
    const { isAuthenticated, accessToken, clearAuthState } = get();
    let message: string | null = null;

    if (isAuthenticated && accessToken) {
      try {
        await api.post('/auth/logout');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: { message?: string } } } };
        message =
          err.response?.data?.error?.message ||
          'You were signed out on this tab, but we could not fully close the server session.';
      }
    }

    clearAuthState();
    return { success: message === null, message };
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (status === 401 || status === 403) {
        get().clearAuthState();
        return;
      }

      toast.error('Temporary connection issue. We could not refresh your account details, but your session is still active.', {
        duration: 5000,
      });
      set({ isLoading: false });
    }
  },
}));
