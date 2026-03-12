import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract the human-readable error message from an Axios error response.
 * Falls back to the provided default message if the server message is unavailable.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as Record<string, unknown>).response === 'object' &&
    (error as Record<string, unknown>).response !== null
  ) {
    const resp = (error as { response: { data?: { error?: { message?: string }; message?: string } } }).response;
    // Standard AppError shape: { error: { message: '...' } }
    if (typeof resp.data?.error?.message === 'string') {
      return resp.data.error.message;
    }
    // Fallback shape: { message: '...' }
    if (typeof resp.data?.message === 'string') {
      return resp.data.message;
    }
  }
  return fallback;
}

export function extractItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.items)) {
      return record.items as T[];
    }

    if (Array.isArray(record.requests)) {
      return record.requests as T[];
    }

    if (Array.isArray(record.results)) {
      return record.results as T[];
    }

    if (Array.isArray(record.data)) {
      return record.data as T[];
    }
  }

  return [];
}

export function extractLocalDateValue(value?: string | Date | null): string {
  if (!value) return '';

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function serializeDateOnlyAsUtcNoon(value?: string | null): string | undefined {
  if (!value) return undefined;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}
