import { describe, expect, it } from 'vitest';

import { AppointmentAttendanceStatus, AppointmentStatus } from './constants';
import { todayScheduleItems, todayScheduleParams } from './today-schedule';
import type { Appointment } from './types';

function appt(id: string, overrides: Partial<Appointment> = {}): Appointment {
  return {
    _id: id,
    customerId: 'customer-1',
    type: 'office',
    date: '2026-11-28',
    slotCode: '10:00',
    status: AppointmentStatus.CONFIRMED,
    salesStaffId: 'sales-1',
    ...overrides,
  } as Appointment;
}

describe('todayScheduleParams', () => {
  it('asks for every appointment on that day, earliest slot first, without a status or type filter', () => {
    expect(todayScheduleParams('2026-11-28')).toEqual({
      date: '2026-11-28', sortBy: 'slotCode', sortOrder: 'asc', limit: '100',
    });
  });
});

describe('todayScheduleItems (Appointed only)', () => {
  it.each([
    ['confirmed consultation', appt('a', { status: AppointmentStatus.CONFIRMED })],
    ['confirmed ocular', appt('a', { type: 'ocular', status: AppointmentStatus.CONFIRMED })],
    ['preparing', appt('a', { status: AppointmentStatus.PREPARING })],
    ['on the way', appt('a', { type: 'ocular', status: AppointmentStatus.ON_THE_WAY })],
    ['arrived at site', appt('a', { type: 'ocular', status: AppointmentStatus.ARRIVED_AT_SITE })],
    ['in progress', appt('a', { status: AppointmentStatus.IN_PROGRESS })],
    ['reschedule request with a sales staff', appt('a', { status: AppointmentStatus.RESCHEDULE_REQUESTED })],
  ])('keeps a %s', (_label, item) => {
    expect(todayScheduleItems([item]).map((row) => row._id)).toEqual(['a']);
  });

  it.each([
    ['requested (not yet assigned by the agent)', appt('a', { status: AppointmentStatus.REQUESTED, salesStaffId: undefined })],
    ['assigned', appt('a', { status: AppointmentStatus.ASSIGNED })],
    ['reschedule request without a sales staff', appt('a', { status: AppointmentStatus.RESCHEDULE_REQUESTED, salesStaffId: undefined })],
    ['completed', appt('a', { status: AppointmentStatus.COMPLETED })],
    ['customer declined', appt('a', { status: AppointmentStatus.COMPLETED, attendanceStatus: AppointmentAttendanceStatus.CUSTOMER_DECLINED })],
    ['office no show', appt('a', { status: AppointmentStatus.COMPLETED, attendanceStatus: AppointmentAttendanceStatus.NO_SHOW })],
    ['ocular no show', appt('a', { type: 'ocular', status: AppointmentStatus.NO_SHOW })],
    ['cancelled', appt('a', { status: AppointmentStatus.CANCELLED })],
    ['ready for ocular', appt('a', { status: AppointmentStatus.READY_FOR_OCULAR })],
  ])('leaves out a %s visit', (_label, item) => {
    expect(todayScheduleItems([item])).toEqual([]);
  });

  it('lists consultations and ocular visits together, earliest time first', () => {
    const rows = todayScheduleItems([
      appt('ocular-3pm', { type: 'ocular', slotCode: '15:00' }),
      appt('requested-9am', { slotCode: '09:00', status: AppointmentStatus.REQUESTED, salesStaffId: undefined }),
      appt('office-9am', { slotCode: '09:00' }),
      appt('office-1pm', { slotCode: '13:00', status: AppointmentStatus.IN_PROGRESS }),
      appt('done-10am', { slotCode: '10:00', status: AppointmentStatus.COMPLETED }),
    ]);
    expect(rows.map((row) => row._id)).toEqual(['office-9am', 'office-1pm', 'ocular-3pm']);
  });
});
