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
