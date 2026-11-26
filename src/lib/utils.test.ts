import { describe, expect, it } from 'vitest';
import { formatApiTimeAgo, formatManilaDateTime } from './utils';

/** A Manila time (UTC+8) as a Date. */
const manila = (dateTime: string) => new Date(`${dateTime}+08:00`);

describe('formatApiTimeAgo (QA 2026-11-26: real elapsed time, never calendar days)', () => {
  // The QA example: created yesterday 11:00 PM, viewed today 2:00 AM.
  const viewedAt = manila('2026-11-26T02:00:00');

  it.each([
    ['3 hours across midnight (11:00 PM → 2:00 AM)', '2026-11-25T23:00:00', '3 hours ago'],
    ['23 hours 59 minutes', '2026-11-25T02:01:00', '23 hours ago'],
    ['exactly 24 hours', '2026-11-25T02:00:00', '1 day ago'],
    ['47 hours 59 minutes', '2026-11-24T02:01:00', '1 day ago'],
    ['exactly 48 hours', '2026-11-24T02:00:00', '2 days ago'],
    ['59 minutes', '2026-11-26T01:01:00', '59 minutes ago'],
    ['1 minute', '2026-11-26T01:59:00', '1 minute ago'],
    ['30 seconds', '2026-11-26T01:59:30', 'just now'],
    ['a moment ahead of this clock', '2026-11-26T02:00:20', 'just now'],
  ])('%s → %s', (_case, createdAt, expected) => {
    expect(formatApiTimeAgo(manila(createdAt).toISOString(), viewedAt)).toBe(expected);
  });

  it('reads API timestamps without a timezone marker as UTC', () => {
    // 15:00 UTC = 11:00 PM in Manila.
    expect(formatApiTimeAgo('2026-11-25T15:00:00', viewedAt)).toBe('3 hours ago');
  });

  it('says "recently" for an unreadable timestamp', () => {
    expect(formatApiTimeAgo('not a date', viewedAt)).toBe('recently');
  });
});

describe('formatManilaDateTime', () => {
  it('shows the exact Manila date and time, whatever the device time zone', () => {
    expect(formatManilaDateTime('2026-11-25T15:00:00.000Z')).toBe('Nov 25, 2026, 11:00 PM');
    expect(formatManilaDateTime('2026-11-25T01:15:00.000Z')).toBe('Nov 25, 2026, 9:15 AM');
  });

  it('is empty for an unreadable timestamp', () => {
    expect(formatManilaDateTime('not a date')).toBe('');
  });
});
