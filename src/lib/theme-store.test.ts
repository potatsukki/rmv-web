import { beforeEach, describe, expect, it } from 'vitest';

import { bootstrapThemePreference, useThemeStore } from '@/stores/theme.store';

type StorageMap = Record<string, string>;

function createLocalStorageMock(seed: StorageMap = {}) {
  let store = { ...seed };
  return {
    clear: () => { store = {}; },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => { delete store[key]; },
    setItem: (key: string, value: string) => { store[key] = String(value); },
    get length() { return Object.keys(store).length; },
  };
}

const documentElement = {
  dataset: {} as Record<string, string>,
  style: { colorScheme: '' },
  removeAttribute: (name: string) => {
    if (name === 'data-theme') delete documentElement.dataset.theme;
    if (name === 'data-theme-preference') delete documentElement.dataset.themePreference;
  },
};
const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'window', { value: { localStorage: localStorageMock }, configurable: true });
Object.defineProperty(globalThis, 'document', { value: { documentElement }, configurable: true });

describe('workspace theme foundation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
    document.documentElement.style.colorScheme = '';
    useThemeStore.setState({ storageScope: 'workspace', themePreference: 'dark', resolvedTheme: 'dark' });
  });

  it('locks the workspace to dark and clears obsolete per-account preferences', () => {
    window.localStorage.setItem('rmv_theme_preference:customer-1', 'light');
    window.localStorage.setItem('rmv_theme_resolved', 'light');
    bootstrapThemePreference();

    useThemeStore.getState().syncThemePreference('light', 'customer-1');
    expect(window.localStorage.getItem('rmv_theme_preference:customer-1')).toBeNull();
    expect(window.localStorage.getItem('rmv_theme_resolved')).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(useThemeStore.getState().themePreference).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('ignores legacy light or system preferences during session changes', () => {
    window.localStorage.setItem('rmv_theme_preference:guest', 'system');
    useThemeStore.getState().syncThemePreference('light', 'customer-1');
    useThemeStore.getState().syncThemePreference(undefined, 'guest');

    expect(useThemeStore.getState().storageScope).toBe('guest');
    expect(useThemeStore.getState().themePreference).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
