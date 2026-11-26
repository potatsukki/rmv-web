import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '@/lib/constants';
import type { Appointment, VisitReport } from '@/lib/types';

const { auth, projectsQuery, reportsQuery, ocularQuery, projectRequests, reportRequests, appointmentRequests } = vi.hoisted(() => ({
  auth: { user: { roles: ['sales_staff'] } },
  projectsQuery: { data: { items: [], total: 0 }, isLoading: false, isError: false, refetch: vi.fn() },
  reportsQuery: { data: { items: [] as Partial<VisitReport>[] }, isLoading: false, isError: false, refetch: vi.fn() },
  ocularQuery: { data: { items: [] as Partial<Appointment>[] }, isLoading: false, isError: false, refetch: vi.fn() },
  projectRequests: [] as unknown[],
  reportRequests: [] as unknown[],
  appointmentRequests: [] as unknown[],
}));

vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => auth }));
vi.mock('@/hooks/useProjects', () => ({
  useProjects: (params: unknown) => { projectRequests.push(params); return projectsQuery; },
}));
vi.mock('@/hooks/useAppointments', () => ({ useAppointments: (params: unknown, enabled: boolean) => {
  if (enabled) appointmentRequests.push(params);
  return ocularQuery;
} }));
vi.mock('@/hooks/useVisitReports', () => ({
  useVisitReports: (params: unknown) => { reportRequests.push(params); return reportsQuery; },
}));

import { ProjectsPage } from './ProjectsPage';
import { VisitReportsListPage } from '@/pages/visit-reports/VisitReportsListPage';

function renderPage(path = '/projects') {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><ProjectsPage /></MemoryRouter>);
}

beforeEach(() => {
  auth.user.roles = [Role.SALES_STAFF];
  projectsQuery.isError = false;
  projectRequests.length = 0;
  reportRequests.length = 0;
  appointmentRequests.length = 0;
  reportsQuery.data.items = [];
  ocularQuery.data.items = [];
});

describe('Ocular visits in Projects', () => {
  it.each([Role.SALES_STAFF, Role.ADMIN])('offers the relocated Ocular tab to %s', (role) => {
    auth.user.roles = [role];
    const html = renderPage();
    expect(html).toContain('>Ocular</a>');
    expect(html).toContain('href="/projects?tab=oculars"');
    expect(html).not.toContain('>Returned</a>');
    expect(html).toContain('Find a project faster');
  });

  it.each([Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.ENGINEER, Role.FABRICATION_STAFF, Role.CASHIER])('does not expose the Ocular view or query to %s', (role) => {
    auth.user.roles = [role];
    const html = renderPage('/projects?tab=oculars');
    expect(html).not.toContain('>Ocular</a>');
    expect(html).not.toContain('Ocular visits');
    expect(appointmentRequests.every((params) => !(params as Record<string, string>).includeFeePending)).toBe(true);
    expect(projectRequests).toHaveLength(1);
  });

  it('keeps the ocular query, fee/status columns and visit/project links in the new view', () => {
    ocularQuery.data.items = [{
      _id: 'ocular-1', customerName: 'Ocular customer', date: '2026-12-01', slotCode: '10:00',
      type: 'ocular', status: 'confirmed', ocularFeeStatus: 'verified',
      ocularProject: { _id: 'project-1', projectNumber: 'PRJ-2026-00118' },
    }];
    const html = renderPage('/projects?tab=oculars');
    expect(appointmentRequests).toEqual([{
      type: 'ocular', includeFeePending: 'true', sortBy: 'date', sortOrder: 'desc', limit: '100',
    }]);
    expect(projectRequests).toHaveLength(0);
    expect(reportRequests).toHaveLength(0);
    expect(html).toContain('Ocular visits');
    expect(html).toContain('Ocular customer');
    expect(html).toContain('PRJ-2026-00118');
    expect(html).toContain('href="/appointments/ocular-1"');
    expect(html).toContain('>Paid<');
    expect(html).not.toContain('>Sales Staff</th>');
    for (const label of ['All', 'Requested', 'Appointed', 'Completed', 'No Show']) {
      expect(html).toContain(`>${label}</button>`);
    }
    expect(html).not.toContain('>Assigned</button>');
  });

  it('keeps the Sales Staff column visible to Admin in the relocated ocular list', () => {
    auth.user.roles = [Role.ADMIN];
    ocularQuery.data.items = [{ _id: 'ocular-1', date: '2026-12-01', slotCode: '10:00', status: 'confirmed' }];
    const html = renderPage('/projects?tab=oculars');
    expect(html).toContain('>Sales Staff</th>');
    expect(projectRequests).toHaveLength(0);
  });
});

describe('Declined initial designs in Projects', () => {
  it.each([Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN])('offers Declined and requests its review state for %s', (role) => {
    auth.user.roles = [role];
    const html = renderPage('/projects?stage=declined');
    expect(html).toContain('>Declined</button>');
    expect(html).toContain('initial design');
    expect(projectRequests).toEqual([{ limit: '100', designReviewStatus: 'declined' }]);
    expect(reportRequests).toHaveLength(0);
  });

  it.each([Role.CUSTOMER, Role.CASHIER, Role.FABRICATION_STAFF, Role.APPOINTMENT_AGENT])('keeps Declined unavailable to %s, including direct filter links', (role) => {
    auth.user.roles = [role];
    const html = renderPage('/projects?stage=declined');
    expect(html).not.toContain('>Declined</button>');
    expect(projectRequests).toEqual([{ limit: '100' }]);
  });
});

// User decision 2026-11-27: Returned stays in Appointments → Visit Reports; only Ocular moved to Projects.
describe('Returned reports stay in Visit Reports', () => {
  it.each([Role.SALES_STAFF, Role.ADMIN, Role.ENGINEER, Role.CUSTOMER])('has no Returned tab in Projects for %s, even from an old link', (role) => {
    auth.user.roles = [role];
    const html = renderPage('/projects?tab=returned');
    expect(html).not.toContain('>Returned</a>');
    expect(html).not.toContain('Returned reports');
    expect(reportRequests).toHaveLength(0);
    expect(projectRequests).toHaveLength(1);
  });

  // Only Sales Staff and Admin reach Visit Reports (the /appointments route does not admit engineers).
  it.each([Role.SALES_STAFF, Role.ADMIN])('offers the Returned filter in Visit Reports for %s', (role) => {
    auth.user.roles = [role];
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/appointments?tab=visit-reports']}><VisitReportsListPage isEmbedded /></MemoryRouter>,
    );
    for (const label of ['All Reports', 'Draft', 'Submitted', 'Returned', 'Completed']) {
      expect(html).toContain(`>${label}</button>`);
    }
  });

  it('lists returned reports in Visit Reports instead of sending the user to Projects', () => {
    reportsQuery.data.items = [{
      _id: 'returned-report', appointmentId: 'returned-visit', customerId: 'customer-1',
      customerName: 'Returned customer', serviceType: 'railings', visitType: 'ocular', status: 'returned',
      createdAt: '2026-11-26T02:00:00Z', updatedAt: '2026-11-26T02:00:00Z',
    } as Partial<VisitReport>];
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/appointments?tab=visit-reports&reportStatus=returned']}><VisitReportsListPage isEmbedded /></MemoryRouter>,
    );
    expect(reportRequests).toEqual([{ status: 'returned' }]);
    expect(html).toContain('Find the right report faster');
    expect(html).toContain('Returned customer');
    expect(html).toContain('href="/visit-reports/returned-report"');
  });
});
