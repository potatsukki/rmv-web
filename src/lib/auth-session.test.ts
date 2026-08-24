import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getStoredAuthContinuationPath,
  setStoredAuthContinuationPath,
} from '@/lib/auth-session';

function useMemorySessionStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  return values;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth continuation storage', () => {
  it('round-trips the full safe booking URL through session storage', () => {
    useMemorySessionStorage();
    const bookingPath = '/appointments/book?serviceType=gates&design=Double+Swing+Gate#schedule';

    expect(setStoredAuthContinuationPath(bookingPath)).toBe(bookingPath);
    expect(getStoredAuthContinuationPath()).toBe(bookingPath);
  });

  it('does not store unsafe external continuation URLs', () => {
    const values = useMemorySessionStorage();

    expect(setStoredAuthContinuationPath('https://example.com/appointments/book')).toBeNull();
    expect(getStoredAuthContinuationPath()).toBeNull();
    expect(values.size).toBe(0);
  });
});
