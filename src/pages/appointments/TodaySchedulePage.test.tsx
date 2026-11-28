import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppointmentStatus } from '@/lib/constants';
import { todayScheduleItems } from '@/lib/today-schedule';
import type { Appointment } from '@/lib/types';

const { schedule } = vi.hoisted(() => ({
  schedule: {
    raw: [] as Appointment[],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

// The real filter, so the page shows exactly what the dashboard card counts.
vi.mock('@/hooks/useAppointments', () => ({
  useTodaySchedule: () => ({
    today: '2026-11-28',
    items: todayScheduleItems(schedule.raw),
    data: { items: schedule.raw },
    isLoading: schedule.isLoading,
    isError: schedule.isError,
    refetch: schedule.refetch,
  }),
}));

import { TodaySchedulePage } from './TodaySchedulePage';

function render() {
  return renderToStaticMarkup(<MemoryRouter initialEntries={['/appointments/today']}><TodaySchedulePage /></MemoryRouter>);
}

const base = { customerId: 'c', date: '2026-11-28', salesStaffId: 'sales-1' };

beforeEach(() => {
  schedule.isLoading = false;
  schedule.isError = false;
  schedule.raw = [
    { ...base, _id: 'ocular-1', appointmentNumber: 'APT-20261128-0005', customerName: 'Michael Dela Rosa', type: 'ocular', slotCode: '10:00', status: AppointmentStatus.CONFIRMED, formattedAddress: 'Tetuan Street, Santa Cruz, Manila' },
    { ...base, _id: 'office-1', appointmentNumber: 'APT-20261128-0003', customerName: 'R-jay Salazar', type: 'office', slotCode: '09:00', status: AppointmentStatus.CONFIRMED },
    { ...base, _id: 'requested-1', appointmentNumber: 'APT-20261128-0009', customerName: 'Waiting Customer', type: 'office', slotCode: '11:00', status: AppointmentStatus.REQUESTED, salesStaffId: undefined },
    { ...base, _id: 'done-1', appointmentNumber: 'APT-20261128-0001', customerName: 'Done Customer', type: 'office', slotCode: '13:00', status: AppointmentStatus.COMPLETED },
  ] as Appointment[];
});

describe('TodaySchedulePage', () => {
  it('has its own table: Time, Type, Customer, Reference, Status', () => {
    const html = render();
    const headers = [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((match) => match[1]);
    expect(headers.slice(0, 5)).toEqual(['Time', 'Type', 'Customer', 'Reference', 'Status']);
    expect(html).toContain("Today&#x27;s Schedule");
    expect(html).toContain('Nov 28, 2026');
  });

  it('lists the Appointed consultation and ocular visit, earliest first, with the ocular address under the customer', () => {
    const html = render();
    const jay = html.indexOf('R-jay Salazar');
    const michael = html.indexOf('Michael Dela Rosa');
    expect(jay).toBeGreaterThan(-1);
    expect(michael).toBeGreaterThan(jay);
    expect(html).toContain('>9:00 AM<');
    expect(html).toContain('>10:00 AM<');
    expect(html).toContain('>Consultation<');
    expect(html).toContain('>Ocular<');
    expect(html).toContain('Tetuan Street, Santa Cruz, Manila');
    expect(html).toContain('href="/appointments/office-1"');
    expect(html).toContain('href="/appointments/ocular-1"');
    expect(html).toContain('APT-20261128-0003');
    expect(html).toContain('>Appointed</span>');
    expect(html).toContain('2 visits today');
  });

  it('leaves out Requested (not yet assigned by the agent) and finished visits', () => {
    const html = render();
    expect(html).not.toContain('Waiting Customer');
    expect(html).not.toContain('Done Customer');
    expect(html).not.toContain('>Requested</span>');
    expect(html).not.toContain('>Completed</span>');
  });

  it('shows an empty state when nothing is appointed today', () => {
    schedule.raw = schedule.raw.filter((item) => item.status !== AppointmentStatus.CONFIRMED);
    const html = render();
    expect(html).toContain('No appointed visits today');
    expect(html).toContain('href="/appointments"');
    expect(html).not.toContain('<table');
  });
});
