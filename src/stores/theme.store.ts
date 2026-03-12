import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'rmv_theme_preference';
const GUEST_THEME_SCOPE = 'guest';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

function getThemeStorageKey(scope: string = GUEST_THEME_SCOPE) {
  return `${THEME_STORAGE_KEY}:${scope}`;
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getResolvedSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
}

function resolveThemePreference(theme: ThemePreference): ResolvedTheme {
  return theme === 'system' ? getResolvedSystemTheme() : theme;
}

export function getStoredThemePreference(scope: string = GUEST_THEME_SCOPE): ThemePreference | null {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(getThemeStorageKey(scope));
  if (isThemePreference(stored)) {
    return stored;
  }

  if (scope === GUEST_THEME_SCOPE) {
    const legacyStored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(legacyStored)) {
      window.localStorage.setItem(getThemeStorageKey(scope), legacyStored);
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      return legacyStored;
    }
  }

  return isThemePreference(stored) ? stored : null;
}

export function applyThemePreference(theme: ThemePreference, scope: string = GUEST_THEME_SCOPE) {
  if (typeof document === 'undefined') return;

  const resolvedTheme = resolveThemePreference(theme);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = theme;
  document.documentElement.style.colorScheme = resolvedTheme;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(getThemeStorageKey(scope), theme);
  }
}

export function bootstrapThemePreference() {
  const stored = getStoredThemePreference(GUEST_THEME_SCOPE);
  attachSystemThemeListener();
  applyThemePreference(stored ?? 'light', GUEST_THEME_SCOPE);
}

let systemThemeListenerAttached = false;

function attachSystemThemeListener() {
  if (typeof window === 'undefined' || systemThemeListenerAttached) return;

  const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
  const handleChange = () => {
    const { themePreference, setThemePreference } = useThemeStore.getState();
    if (themePreference === 'system') {
      setThemePreference('system');
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  systemThemeListenerAttached = true;
}

interface ThemeStore {
  storageScope: string;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  syncThemePreference: (theme?: ThemePreference | null, storageScope?: string | null) => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  storageScope: GUEST_THEME_SCOPE,
  themePreference: getStoredThemePreference(GUEST_THEME_SCOPE) ?? 'light',
  resolvedTheme: resolveThemePreference(getStoredThemePreference(GUEST_THEME_SCOPE) ?? 'light'),
  setThemePreference: (theme) => {
    attachSystemThemeListener();
    applyThemePreference(theme, get().storageScope);
    set({ themePreference: theme, resolvedTheme: resolveThemePreference(theme) });
  },
  syncThemePreference: (theme, storageScope) => {
    const nextStorageScope = storageScope ?? get().storageScope ?? GUEST_THEME_SCOPE;
    const nextTheme = theme ?? getStoredThemePreference(nextStorageScope) ?? 'light';
    attachSystemThemeListener();
    applyThemePreference(nextTheme, nextStorageScope);
    set({
      storageScope: nextStorageScope,
      themePreference: nextTheme,
      resolvedTheme: resolveThemePreference(nextTheme),
    });
  },
}));