import { describe, expect, it } from 'vitest';

import { conflictForSelection, formatConflictRequest, getCustomerScheduleConflict } from './schedule-conflict';

const apiError = (code: string, details?: Record<string, unknown>) => ({
  response: { data: { error: { code, message: 'This customer already has a consultation on Nov 18, 2026, 9:00 AM to 10:00 AM.', details } } },
});

describe('customer schedule conflict (form error)', () => {
  it('reads the reason and the date and time to change from the server error', () => {
    const conflict = getCustomerScheduleConflict(apiError('CUSTOMER_SCHEDULE_CONFLICT', {
      requestedDate: '2026-11-18', requestedSlotCode: '09:00', conflictAppointmentNumber: 'APT-20261118-0004',
    }));

    expect(conflict).toEqual({
      message: 'This customer already has a consultation on Nov 18, 2026, 9:00 AM to 10:00 AM.',
      requestedDate: '2026-11-18',
      requestedSlotCode: '09:00',
    });
    expect(formatConflictRequest(conflict!)).toBe('Nov 18, 2026, 9:00 AM');
    expect(formatConflictRequest({ message: 'x', requestedDate: '2026-11-18', requestedSlotCode: '13:00' })).toBe('Nov 18, 2026, 1:00 PM');
  });

  it('ignores every other error', () => {
    expect(getCustomerScheduleConflict(apiError('SLOT_LOCKED'))).toBeNull();
    expect(getCustomerScheduleConflict(apiError('DUPLICATE_ENTRY', { activeAppointmentId: 'a1' }))).toBeNull();
    expect(getCustomerScheduleConflict(new Error('Network Error'))).toBeNull();
    expect(getCustomerScheduleConflict(null)).toBeNull();
  });

  it('shows the conflict only while the same date and time stay selected', () => {
    const conflict = { message: 'x', requestedDate: '2026-11-18', requestedSlotCode: '09:00' };

    expect(conflictForSelection(conflict, '2026-11-18', '09:00')).toBe(conflict);
    expect(conflictForSelection(conflict, '2026-11-18', '10:00')).toBeNull();
    expect(conflictForSelection(conflict, '2026-11-19', '09:00')).toBeNull();
    expect(conflictForSelection(null, '2026-11-18', '09:00')).toBeNull();
  });
});
