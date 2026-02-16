import { create } from 'zustand';
import type { User } from '@/lib/types';
import { api } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  csrfToken: string | null;
  setUser: (user: User) => void;
  setCsrfToken: (token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  csrfToken: null,

  setUser: (user: User) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  setCsrfToken: (token: string) => set({ csrfToken: token }),

  logout: () => {
    disconnectSocket();
    api.post('/auth/logout').catch(() => {});
    set({ user: null, isAuthenticated: false, isLoading: false, csrfToken: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
