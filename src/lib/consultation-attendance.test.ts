import { describe, expect, it } from 'vitest';
import { getNextConsultationAttendanceBoundary } from './consultation-attendance';
import {
  AppointmentAttendanceStatus,
  AppointmentStatus,
} from './constants';

const consultation = {
  type: 'office',
  status: AppointmentStatus.CONFIRMED,
  date: '2026-09-10',
  slotCode: '09:00',
  attendanceStatus: AppointmentAttendanceStatus.SCHEDULED,
};

describe('getNextConsultationAttendanceBoundary', () => {
  it('uses the Philippine-time slot start before the consultation begins', () => {
    expect(getNextConsultationAttendanceBoundary(
      consultation,
      new Date('2026-09-10T00:30:00.000Z'),
    )).toEqual(new Date('2026-09-10T01:00:00.000Z'));
  });

  it('uses the one-hour slot end while the consultation is active', () => {
    expect(getNextConsultationAttendanceBoundary(
      { ...consultation, attendanceStatus: AppointmentAttendanceStatus.IN_PROGRESS },
      new Date('2026-09-10T01:30:00.000Z'),
    )).toEqual(new Date('2026-09-10T02:00:00.000Z'));
  });

  it('does not schedule automatic refreshes for terminal or unconfirmed attendance', () => {
    expect(getNextConsultationAttendanceBoundary({
      ...consultation,
      attendanceStatus: AppointmentAttendanceStatus.COMPLETED,
    })).toBeUndefined();
    expect(getNextConsultationAttendanceBoundary({
      ...consultation,
      status: AppointmentStatus.REQUESTED,
    })).toBeUndefined();
  });
});
