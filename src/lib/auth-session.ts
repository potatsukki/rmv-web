const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_REDIRECT_REASON_KEY = 'authRedirectReason';

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
}

export function setAuthRedirectReason(message: string | null) {
  writeSessionValue(AUTH_REDIRECT_REASON_KEY, message);
}

export function consumeAuthRedirectReason(): string | null {
  const message = readSessionValue(AUTH_REDIRECT_REASON_KEY);
  writeSessionValue(AUTH_REDIRECT_REASON_KEY, null);
  return message;
}