import { describe, expect, it } from 'vitest';
import {
  departureTime,
  formatTravelDuration,
  localDateAfter,
  ocularLegMinutes,
  ocularMinDate,
  ocularVisitEnd,
  returnMinutes,
  returnTime,
} from './ScheduleOcularDialog';

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

describe('ocular travel time', () => {
  it('formats minutes as minutes or hours and minutes', () => {
    expect(formatTravelDuration(45)).toBe('45 min');
    expect(formatTravelDuration(80)).toBe('1 hr 20 min');
    expect(formatTravelDuration(120)).toBe('2 hr');
  });

  it('adds 45 min of traffic to each one-way trip, except within 4 km of the shop', () => {
    expect(ocularLegMinutes(45, 18)).toBe(90);
    expect(ocularLegMinutes(10, 3)).toBe(10);
    expect(ocularLegMinutes(10, 4)).toBe(10);
    // Unknown distance: the traffic allowance is kept (the server does the same).
    expect(ocularLegMinutes(44.2)).toBe(90);
  });

  it('tells when to leave the shop for the visit time, traffic included', () => {
    expect(departureTime('13:00', 45, 18)).toBe('11:30 AM');
    expect(departureTime('09:00', 45, 18)).toBe('7:30 AM');
    // Near the shop: just the drive.
    expect(departureTime('13:00', 10, 3)).toBe('12:50 PM');
  });

  it('tells when the measuring ends and when the staff is back at the shop', () => {
    expect(ocularVisitEnd('13:00')).toBe('2:30 PM');
    expect(returnTime('13:00', 45, 18)).toBe('4:00 PM');
    expect(returnTime('13:00', 10, 3)).toBe('2:40 PM');
    // A 4 PM far visit gets back after 5 PM (the dialog warns about it).
    expect(returnMinutes('16:00', 45, 18)).toBe(19 * 60);
  });

  it('never goes before midnight for a very long drive', () => {
    expect(departureTime('08:00', 600)).toBe('12:00 AM');
  });
});
