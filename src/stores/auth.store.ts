import { create } from 'zustand';
import type { User } from '@/lib/types';
import { api } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  csrfToken: string | null;
  accessToken: string | null;
  setUser: (user: User) => void;
  setCsrfToken: (token: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  csrfToken: null,
  accessToken: sessionStorage.getItem('accessToken'),

  setUser: (user: User) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  setCsrfToken: (token: string) => set({ csrfToken: token }),

  setAccessToken: (token: string) => {
    sessionStorage.setItem('accessToken', token);
    set({ accessToken: token });
  },

  logout: () => {
    const wasAuthenticated = get().isAuthenticated;
    disconnectSocket();
    sessionStorage.removeItem('accessToken');
    set({ user: null, isAuthenticated: false, isLoading: false, csrfToken: null, accessToken: null });
    if (wasAuthenticated) {
      api.post('/auth/logout').catch(() => {});
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      sessionStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false, isLoading: false, accessToken: null });
    }
  },
}));
