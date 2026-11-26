/**
 * The server's clock, read from the Date header of API responses. "Time ago" labels and
 * time-gated buttons (e.g. No Show from 15 minutes after the slot) use it, so a device whose
 * clock is wrong, or was moved to test a schedule, still shows the real elapsed time.
 */
let offsetMs = 0;

/** The Date header has one-second precision: smaller differences are normal latency, not skew. */
export const SERVER_CLOCK_MIN_SKEW_MS = 5_000;

export function syncServerClock(dateHeader: unknown, receivedAt = Date.now()): void {
  if (typeof dateHeader !== 'string') return;
  const serverTime = Date.parse(dateHeader);
  if (Number.isNaN(serverTime)) return;
  // The header is cut to the whole second, so +500 ms is the expected midpoint.
  const offset = serverTime + 500 - receivedAt;
  offsetMs = Math.abs(offset) < SERVER_CLOCK_MIN_SKEW_MS ? 0 : offset;
}

export function serverNowMs(): number {
  return Date.now() + offsetMs;
}

export function serverNow(): Date {
  return new Date(serverNowMs());
}
