import { describe, expect, it } from 'vitest';
import { localDateAfter, ocularMinDate } from './ScheduleOcularDialog';

// Nov 10, 2026, 10:00 AM in Manila.
const NOV_10 = new Date('2026-11-10T02:00:00Z');

describe('ocularMinDate', () => {
  it('counts 3 days from the booked consultation date, even when it was completed early', () => {
    // PRJ-2026-00094: consultation booked Nov 13, completed Nov 10 → earliest ocular Nov 16, not Nov 13.
    expect(ocularMinDate('2026-11-13', NOV_10)).toEqual({
      consultationDay: '2026-11-13',
      consultationMinDate: '2026-11-16',
      minDate: '2026-11-16',
    });
  });

  it('falls back to the advance-booking lead for an old consultation', () => {
    expect(ocularMinDate('2026-11-01', NOV_10).minDate).toBe('2026-11-13');
    expect(ocularMinDate(undefined, NOV_10).minDate).toBe('2026-11-13');
  });

  it('uses the Manila date, not the browser time zone', () => {
    // 4:30 PM UTC on Nov 9 is already Nov 10 in Manila.
    expect(localDateAfter(0, new Date('2026-11-09T16:30:00Z'))).toBe('2026-11-10');
  });
});
