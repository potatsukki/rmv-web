import { describe, expect, it } from 'vitest';
import { getCustomerBookingWindow } from './customer-booking-time';

describe('customer booking window in Manila', () => {
  it.each([
    ['2026-11-26T07:59:59.999Z', '2026-11-26', '15:59', '2026-11-26'],
    // The temporary November 26 testing exception was removed (audit 2026-11-27): the 4 PM cutoff applies.
    ['2026-11-26T08:00:00.000Z', '2026-11-26', '16:00', '2026-11-27'],
    ['2026-12-31T15:59:59.999Z', '2026-12-31', '23:59', '2027-01-01'],
    ['2026-12-31T16:00:00.000Z', '2027-01-01', '00:00', '2027-01-01'],
  ])('maps %s to the Manila date and earliest booking day', (instant, today, time, earliestDate) => {
    expect(getCustomerBookingWindow(new Date(instant))).toEqual({ today, time, earliestDate });
  });
});
