import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AppointmentAttendanceStatus, AppointmentStatus, Role } from '@/lib/constants';
import type { Appointment } from '@/lib/types';

const { query, auth } = vi.hoisted(() => ({
  query: { data: { items: [] as unknown[] }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
  auth: { user: { roles: ['customer'] } },
}));

vi.mock('@/hooks/useAppointments', () => ({
  useAppointments: () => query,
  useAppointmentQueue: (_params: unknown, enabled: boolean) => enabled ? query : { ...query, data: { items: [] } },
  useCustomerQueueStatus: () => ({ data: undefined }),
}));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => auth }));
vi.mock('@/stores/theme.store', () => ({ useThemeStore: () => 'dark' }));
vi.mock('@/pages/visit-reports/VisitReportsListPage', () => ({ VisitReportsListPage: () => null }));

import { AppointmentsPage } from './AppointmentsPage';

describe('AppointmentsPage consultation status', () => {
  it.each([Role.CUSTOMER, Role.SALES_STAFF])('shows completed consultation without a project as done for %s', (role) => {
    const appointment: Appointment = {
      _id: 'appointment-2',
      appointmentNumber: 'APT-20261007-0002',
      customerId: 'customer-1',
      customerName: 'Kiryu Kazuma',
      type: 'office',
      status: AppointmentStatus.COMPLETED,
      attendanceStatus: AppointmentAttendanceStatus.COMPLETED,
      consultationReportSubmitted: true,
      date: '2026-10-07',
      slotCode: '09:00',
      rescheduleCount: 0,
      maxReschedules: 3,
      createdAt: '2026-10-04T02:00:00.000Z',
      updatedAt: '2026-10-04T02:07:00.000Z',
    };
    auth.user.roles = [role];
    query.data.items = role === Role.CUSTOMER ? [appointment] : [{
      appointment,
      segment: 'upcoming',
      actions: { createProjectPath: '/projects/create?appointmentId=appointment-2' },
      sampleProjects: [],
    }];

    const html = renderToStaticMarkup(<MemoryRouter><AppointmentsPage /></MemoryRouter>);

    expect(html).toContain('APT-20261007-0002');
    // Both desktop and mobile badges must describe the completed consultation.
    expect(html.match(/Appointment Done/g)).toHaveLength(2);
    expect(html).not.toContain('Ready for Ocular');
  });
});
