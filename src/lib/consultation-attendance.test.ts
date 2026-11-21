import { describe, expect, it } from 'vitest';
import { getAutoNoShowNotice, getNextConsultationAttendanceBoundary, getNoShowAvailability } from './consultation-attendance';
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

  it('stops scheduling refreshes once the consultation is in progress', () => {
    expect(getNextConsultationAttendanceBoundary(
      { ...consultation, attendanceStatus: AppointmentAttendanceStatus.IN_PROGRESS },
      new Date('2026-09-10T03:30:00.000Z'),
    )).toBeUndefined();
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

describe('getNoShowAvailability (appointment date only, 15 minutes after the scheduled time)', () => {
  // A 10:00 AM appointment on Nov 15, 2026 (Manila is UTC+8).
  const at = (manilaTime: string, day = '2026-11-15') => new Date(`${day}T${manilaTime}:00+08:00`);
  const check = (now: Date) => getNoShowAvailability('2026-11-15', '10:00', now);

  it('is disabled before the scheduled time and during the grace period, with when it opens', () => {
    expect(check(at('08:00'))).toEqual({ allowed: false, hint: 'Available on Nov 15 from 10:15 AM', opensAt: at('10:15') });
    expect(check(at('10:14')).allowed).toBe(false);
    expect(check(at('10:30', '2026-11-14'))).toMatchObject({ allowed: false, hint: 'Available on Nov 15 from 10:15 AM' });
  });

  it('is allowed from 10:15 AM until the end of the appointment date', () => {
    expect(check(at('10:15'))).toEqual({ allowed: true });
    expect(check(at('23:59'))).toEqual({ allowed: true });
  });

  it('is disabled once the appointment date has passed', () => {
    expect(check(at('09:00', '2026-11-16'))).toEqual({ allowed: false, hint: 'No-show could only be recorded on Nov 15.' });
  });

  it('uses the Manila date, whatever the browser time zone', () => {
    expect(check(new Date('2026-11-15T15:30:00Z')).allowed).toBe(true);
    expect(check(new Date('2026-11-15T16:30:00Z')).allowed).toBe(false);
  });
});

describe('getAutoNoShowNotice (automatic No Show 15 minutes after the scheduled time)', () => {
  const at = (manilaTime: string, day = '2026-11-15') => new Date(`${day}T${manilaTime}:00+08:00`);
  const notice = (now: Date) => getAutoNoShowNotice('2026-11-15', '10:00', now);

  it('tells staff the check-in deadline, with the date when it is not today', () => {
    expect(notice(at('09:30'))).toBe('Check in the customer by 10:15 AM. After that, the system marks this consultation as No Show automatically.');
    expect(notice(at('09:30', '2026-11-14'))).toContain('by 10:15 AM on Nov 15');
  });

  it('says the grace period has passed once it is 10:15 AM', () => {
    expect(notice(at('10:16'))).toContain('grace period has passed');
  });

  it('shows nothing after the appointment date', () => {
    expect(notice(at('09:00', '2026-11-16'))).toBeUndefined();
  });
});
