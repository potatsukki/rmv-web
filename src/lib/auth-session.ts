const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_REDIRECT_REASON_KEY = 'authRedirectReason';
const AUTH_CONTINUATION_PATH_KEY = 'authContinuationPath';
const AUTH_CONTINUATION_BASE_URL = 'https://rmv.local';
const MAX_AUTH_CONTINUATION_LENGTH = 4096;

export interface AuthContinuationLocation {
  pathname: string;
  search?: string;
  hash?: string;
}

export type AuthContinuationInput = string | AuthContinuationLocation;

function readSessionValue(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string | null) {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and fall back to in-memory state.
  }
}

export function getStoredAccessToken(): string | null {
  return readSessionValue(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token: string | null) {
  writeSessionValue(ACCESS_TOKEN_KEY, token);
}

export function getStoredRefreshToken(): string | null {
  return readSessionValue(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null) {
  writeSessionValue(REFRESH_TOKEN_KEY, token);
}

export function clearStoredAuthSession() {
  writeSessionValue(ACCESS_TOKEN_KEY, null);
  writeSessionValue(REFRESH_TOKEN_KEY, null);
  writeSessionValue(AUTH_CONTINUATION_PATH_KEY, null);
}

export function normalizeAuthContinuationPath(value: unknown): string | null {
  let candidate: string;

  if (typeof value === 'string') {
    candidate = value.trim();
  } else if (
    value
    && typeof value === 'object'
    && typeof (value as Partial<AuthContinuationLocation>).pathname === 'string'
  ) {
    const location = value as AuthContinuationLocation;
    if (
      (location.search !== undefined && typeof location.search !== 'string')
      || (location.hash !== undefined && typeof location.hash !== 'string')
    ) {
      return null;
    }
    candidate = `${location.pathname}${location.search || ''}${location.hash || ''}`.trim();
  } else {
    return null;
  }

  if (
    !candidate
    || candidate.length > MAX_AUTH_CONTINUATION_LENGTH
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return null;
  }

  try {
    const parsed = new URL(candidate, AUTH_CONTINUATION_BASE_URL);
    if (parsed.origin !== AUTH_CONTINUATION_BASE_URL) return null;

    const decodedPath = decodeURIComponent(parsed.pathname);
    if (
      decodedPath.startsWith('//')
      || decodedPath.includes('\\')
      || /[\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function getStoredAuthContinuationPath(): string | null {
  const storedPath = readSessionValue(AUTH_CONTINUATION_PATH_KEY);
  const safePath = normalizeAuthContinuationPath(storedPath);

  if (storedPath && !safePath) writeSessionValue(AUTH_CONTINUATION_PATH_KEY, null);
  return safePath;
}

export function setStoredAuthContinuationPath(value: AuthContinuationInput | null): string | null {
  const safePath = normalizeAuthContinuationPath(value);
  writeSessionValue(AUTH_CONTINUATION_PATH_KEY, safePath);
  return safePath;
}

export function clearStoredAuthContinuationPath() {
  writeSessionValue(AUTH_CONTINUATION_PATH_KEY, null);
}

export function setAuthRedirectReason(message: string | null) {
  writeSessionValue(AUTH_REDIRECT_REASON_KEY, message);
}

export function consumeAuthRedirectReason(): string | null {
  const message = readSessionValue(AUTH_REDIRECT_REASON_KEY);
  writeSessionValue(AUTH_REDIRECT_REASON_KEY, null);
  return message;
}
