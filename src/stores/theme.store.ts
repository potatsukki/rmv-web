import { create } from 'zustand';

/**
 * Authenticated RMV screens intentionally use one visual environment.  These
 * types and methods remain as a compatibility adapter for existing API fields
 * and components while the UI no longer offers a light/system selection.
 */
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeStore {
  storageScope: string;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (_theme: ThemePreference) => void;
  syncThemePreference: (_theme?: 'light' | 'dark' | 'system' | null, storageScope?: string | null) => void;
}

export function bootstrapThemePreference() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.dataset.themePreference = 'dark';
  document.documentElement.style.colorScheme = 'dark';
  if (typeof window !== 'undefined') {
    const legacyKeys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .filter((key): key is string => Boolean(key))
      .filter((key) => key === 'rmv_theme_preference' || key === 'rmv_theme_resolved' || key.startsWith('rmv_theme_preference:'));
    legacyKeys.forEach((key) => window.localStorage.removeItem(key));
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  storageScope: 'workspace',
  themePreference: 'dark',
  resolvedTheme: 'dark',
  setThemePreference: () => {
    bootstrapThemePreference();
    set({ themePreference: 'dark', resolvedTheme: 'dark' });
  },
  syncThemePreference: (_theme, storageScope) => {
    bootstrapThemePreference();
    set({ storageScope: storageScope ?? get().storageScope, themePreference: 'dark', resolvedTheme: 'dark' });
  },
}));
