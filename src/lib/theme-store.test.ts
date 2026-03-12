import { beforeEach, describe, expect, it } from 'vitest';

import { bootstrapThemePreference, useThemeStore } from '@/stores/theme.store';

type StorageMap = Record<string, string>;

function createLocalStorageMock(seed: StorageMap = {}) {
  let store = { ...seed };

  return {
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    get length() {
      return Object.keys(store).length;
    },
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

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
    }),
  },
  configurable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: {
    documentElement,
  },
  configurable: true,
});

describe('theme store scoping', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
    document.documentElement.style.colorScheme = '';
    useThemeStore.setState({
      storageScope: 'guest',
      themePreference: 'light',
      resolvedTheme: 'light',
    });
  });

  it('keeps theme preferences isolated per account scope', () => {
    bootstrapThemePreference();

    useThemeStore.getState().syncThemePreference('dark', 'customer-1');
    expect(window.localStorage.getItem('rmv_theme_preference:customer-1')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    useThemeStore.getState().syncThemePreference('light', 'agent-1');
    expect(window.localStorage.getItem('rmv_theme_preference:agent-1')).toBe('light');
    expect(window.localStorage.getItem('rmv_theme_preference:customer-1')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('light');

    useThemeStore.getState().syncThemePreference(undefined, 'customer-1');
    expect(useThemeStore.getState().themePreference).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('restores guest theme scope after logout-like sync', () => {
    window.localStorage.setItem('rmv_theme_preference:guest', 'system');

    useThemeStore.getState().syncThemePreference('dark', 'customer-1');
    useThemeStore.getState().syncThemePreference(undefined, 'guest');

    expect(useThemeStore.getState().storageScope).toBe('guest');
    expect(useThemeStore.getState().themePreference).toBe('system');
  });
});
