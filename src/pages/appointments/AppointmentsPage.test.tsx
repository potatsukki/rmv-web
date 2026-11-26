import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppointmentAttendanceStatus, AppointmentStatus, Role } from '@/lib/constants';
import type { Appointment } from '@/lib/types';

const { query, auth, listRequests, redirects } = vi.hoisted(() => ({
  query: { data: { items: [] as unknown[] }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
  auth: { user: { roles: ['customer'] } },
  listRequests: [] as unknown[],
  redirects: [] as string[],
}));

vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  Navigate: ({ to }: { to: string }) => { redirects.push(to); return null; },
}));

vi.mock('@/hooks/useAppointments', () => ({
  useAppointments: (params: unknown) => { listRequests.push(params); return query; },
  useAppointmentQueue: (params: unknown, enabled: boolean) => {
    if (enabled) listRequests.push(params);
    return enabled ? query : { ...query, data: { items: [] } };
  },
  useCustomerQueueStatus: () => ({ data: undefined }),
}));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => auth }));
vi.mock('@/stores/theme.store', () => ({ useThemeStore: () => 'dark' }));
vi.mock('@/pages/visit-reports/VisitReportsListPage', () => ({ VisitReportsListPage: () => null }));

import { AppointmentsPage } from './AppointmentsPage';
import { OcularVisitsList } from './OcularVisitsList';
import { StatusBadge } from '@/components/shared/StatusBadge';

describe('AppointmentsPage consultation status', () => {
  beforeEach(() => { listRequests.length = 0; redirects.length = 0; });
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
    expect((html.match(/>Completed</g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('Ready for Ocular');
  });

  it.each([Role.CUSTOMER, Role.SALES_STAFF, Role.APPOINTMENT_AGENT, Role.ADMIN])('offers four status filters without Assigned to %s', (role) => {
    auth.user.roles = [role];
    query.data.items = [];

    const html = renderToStaticMarkup(<MemoryRouter><AppointmentsPage /></MemoryRouter>);

    for (const label of ['All', 'Requested', 'Appointed', 'Completed', 'No Show']) {
      expect(html).toContain(`>${label}</button>`);
    }
    expect(html).not.toContain('>Cancelled<');
    expect(html).not.toContain('>Assigned<');
  });

  it('opens old Assigned filter links as Requested', () => {
    auth.user.roles = [Role.CUSTOMER];
    query.data.items = [];
    renderToStaticMarkup(<MemoryRouter initialEntries={['/appointments?status=assigned']}><AppointmentsPage /></MemoryRouter>);
    expect(listRequests).toContainEqual(expect.objectContaining({ statusGroup: 'requested' }));
  });

  it('removes Assigned from Ocular filters', () => {
    query.data.items = [];
    const html = renderToStaticMarkup(<MemoryRouter><OcularVisitsList showSalesStaff /></MemoryRouter>);
    expect(html).toContain('>Requested</button>');
    expect(html).not.toContain('>Assigned<');
  });

  it.each([Role.SALES_STAFF, Role.APPOINTMENT_AGENT, Role.ADMIN])('no longer lists Ocular under Appointments for %s', (role) => {
    auth.user.roles = [role];
    query.data.items = [];
    const html = renderToStaticMarkup(<MemoryRouter><AppointmentsPage /></MemoryRouter>);
    expect(html).not.toContain('>Ocular</button>');
    if (role !== Role.APPOINTMENT_AGENT) expect(html).toContain('>Visit Reports</button>');
  });

  it.each([Role.SALES_STAFF, Role.ADMIN])('redirects a %s bookmark to the Ocular tab in Projects', (role) => {
    auth.user.roles = [role];
    query.data.items = [];
    renderToStaticMarkup(<MemoryRouter initialEntries={['/appointments?tab=oculars']}><AppointmentsPage /></MemoryRouter>);
    expect(redirects).toEqual(['/projects?tab=oculars']);
  });

  it.each(['assigned', 'appointment_assigned'])('renders legacy %s badges as Requested', (status) => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />);
    expect(html).toContain('>Requested</span>');
    expect(html).not.toContain('Assigned');
  });

  it.each([Role.CUSTOMER, Role.SALES_STAFF])('shows a no-show consultation as No Show only, without Completed, for %s', (role) => {
    const appointment: Appointment = {
      _id: 'appointment-3',
      appointmentNumber: 'APT-20261125-0003',
      customerId: 'customer-1',
      customerName: 'Kiryu Kazuma',
      type: 'office',
      status: AppointmentStatus.COMPLETED,
      attendanceStatus: AppointmentAttendanceStatus.NO_SHOW,
      date: '2026-11-25',
      slotCode: '09:00',
      rescheduleCount: 0,
      maxReschedules: 3,
      createdAt: '2026-11-20T02:00:00.000Z',
      updatedAt: '2026-11-25T01:15:00.000Z',
    };
    auth.user.roles = [role];
    query.data.items = role === Role.CUSTOMER ? [appointment] : [{
      appointment,
      segment: 'recent',
      actions: {},
      sampleProjects: [],
    }];

    const html = renderToStaticMarkup(<MemoryRouter><AppointmentsPage /></MemoryRouter>);

    expect(html).toContain('APT-20261125-0003');
    // Mobile and desktop badges say No Show; the only "Completed" left is the filter chip.
    expect((html.match(/>No Show<\/span>/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('>Completed</span>');
    expect(html).toContain('>Completed</button>');
  });
});
