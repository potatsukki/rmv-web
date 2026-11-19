import { describe, expect, it } from 'vitest';
import { deliveryDateError, describeDeliverySchedule, formatDeliveryDay, isSunday, manilaToday } from './delivery-schedule';

const NOW = new Date('2026-11-18T23:30:00+08:00'); // Wednesday night in Manila

describe('delivery schedule helpers', () => {
  it('uses the Manila day', () => {
    expect(manilaToday(NOW)).toBe('2026-11-18');
    expect(manilaToday(new Date('2026-11-18T17:00:00Z'))).toBe('2026-11-19');
  });

  it('checks past dates and Sundays before saving', () => {
    expect(deliveryDateError('2026-11-18', NOW)).toBeNull();
    expect(deliveryDateError('2026-11-17', NOW)).toMatch('past');
    expect(isSunday('2026-11-22')).toBe(true);
    expect(deliveryDateError('2026-11-22', NOW)).toMatch('Monday to Saturday');
    expect(deliveryDateError('', NOW)).toMatch('Choose');
  });

  it('describes the date only', () => {
    expect(formatDeliveryDay('2026-11-25')).toBe('Nov 25, 2026');
    // The drive time / distance is no longer shown, even on older schedules that stored it.
    expect(describeDeliverySchedule({ date: '2026-11-25', travelDurationMinutes: 45, distanceKm: 18.24 })).toBe('Nov 25, 2026');
    expect(describeDeliverySchedule({ date: '2026-11-25', travelDurationMinutes: null })).toBe('Nov 25, 2026');
    expect(describeDeliverySchedule(undefined)).toBe('');
  });
});
