import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Appointment, Project, VisitReport } from '@/lib/types';

const source = vi.hoisted(() => ({
  project: undefined as Partial<Project> | undefined,
  appointment: undefined as Partial<Appointment> | undefined,
  reports: [] as Partial<VisitReport>[],
  reportsLoading: false,
  reportsError: false,
  customerAppointments: [] as Partial<Appointment>[],
}));

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: () => ({ isPending: false }),
  useProject: () => ({ data: source.project }),
}));
vi.mock('@/hooks/useAppointments', () => ({
  useAppointment: () => ({ data: source.appointment }),
  useAppointments: () => ({ data: { items: source.customerAppointments }, isLoading: false }),
  useAvailableSlots: () => ({ data: undefined }),
}));
vi.mock('@/hooks/useUsers', () => ({ useCustomerSearch: () => ({ data: [] }) }));
vi.mock('@/hooks/useVisitReports', () => ({ useVisitReportsByAppointment: () => ({
  data: source.reports, isLoading: source.reportsLoading, isError: source.reportsError,
}) }));
vi.mock('@/components/shared/FileUpload', () => ({ FileUpload: () => null }));

import { CreateProjectPage } from './CreateProjectPage';

beforeEach(() => {
  source.project = undefined;
  source.appointment = undefined;
  source.reports = [];
  source.reportsLoading = false;
  source.reportsError = false;
  source.customerAppointments = [];
});

function renderPage(path = '/') {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}><CreateProjectPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

function completedOcular() {
  source.project = { _id: 'project-1', ocularAppointmentId: 'ocular-1' };
  source.appointment = { _id: 'ocular-1', status: 'completed' };
}

it('does not ask sales to enter the fabricator site address when creating a project', () => {
  const html = renderPage();
  expect(html).toContain('Create Project');
  expect(html).not.toContain('Project Site Address');
  expect(html).not.toContain('name="siteAddress"');
  expect(html).toContain('id="project-sales-notes"');
});

it('does not show the report submission panel when the ocular appointment is complete', () => {
  completedOcular();
  source.reports = [
    { _id: 'report-1', serviceType: 'gates', status: 'submitted', visitType: 'ocular' },
    { _id: 'report-2', serviceType: 'railings', status: 'draft', visitType: 'ocular' },
  ];
  const html = renderPage('/projects/create?pendingProjectId=project-1');
  expect(html).not.toContain('Appointment completed. Submit the remaining visit reports before creating the project.');
  expect(html).not.toContain('href="/visit-reports/report-2"');
  expect(html).not.toContain('Reports open in a new tab');
  expect(html).not.toContain('Refresh Status');
  expect(html).not.toContain('href="/visit-reports/report-1"');
});

it('does not show a report submission panel for returned reports', () => {
  completedOcular();
  source.reports = [{ _id: 'returned-1', serviceType: 'gates', status: 'returned', visitType: 'ocular' }];
  const html = renderPage('/projects/create?pendingProjectId=project-1');
  expect(html).not.toContain('href="/visit-reports/returned-1"');
  expect(html).not.toContain('Refresh Status');
});

it('does not show a report blocker once all reports are submitted or completed', () => {
  completedOcular();
  source.reports = [
    { _id: 'report-1', status: 'submitted' },
    { _id: 'report-2', status: 'completed' },
  ];
  const html = renderPage('/projects/create?pendingProjectId=project-1');
  expect(html).not.toContain('Submit the remaining visit reports');
  expect(html).not.toContain('View Ocular Visit');
});

it('does not show the removed panel while reports are loading, missing or failed', () => {
  completedOcular();
  source.reportsLoading = true;
  expect(renderPage('/projects/create?pendingProjectId=project-1')).not.toContain('Checking ocular visit and reports');
  source.reportsLoading = false;
  expect(renderPage('/projects/create?pendingProjectId=project-1')).not.toContain('No visit report found');
  source.reportsError = true;
  expect(renderPage('/projects/create?pendingProjectId=project-1')).not.toContain('Unable to check ocular visit or reports');
});

it.each(['draft', 'returned', 'loading', 'error'])('asks for the signed contract before showing Create Project when reports are %s', (status) => {
  completedOcular();
  source.reports = [{ _id: 'report-1', status }];
  source.reportsLoading = status === 'loading';
  source.reportsError = status === 'error';
  const html = renderPage('/projects/create?pendingProjectId=project-1');
  // Create Project appears inside the Signed Contract card only after a file is uploaded.
  expect(html).toContain('Upload the signed contract to finish.');
  expect(html).not.toMatch(/<button\b[^>]*type="submit"/);
});

it('offers to link a completed appointment when creating a project manually', () => {
  source.customerAppointments = [
    { _id: 'appt-1', appointmentNumber: 'APT-1', type: 'ocular', date: '2026-09-01' },
  ];
  const html = renderPage('/projects/create?customerId=customer-1');
  expect(html).toContain('Appointment (optional)');
  // Starts unlinked so sales staff choose an appointment on purpose.
  expect(html).toMatch(/aria-label="Appointment"><span[^>]*>No appointment<\/span>/);
});

it('says so when the customer has no appointment to link', () => {
  const html = renderPage('/projects/create?customerId=customer-1');
  expect(html).toContain('No appointments to link for this customer.');
  expect(html).not.toContain('aria-label="Appointment"');
});

it('does not offer to link an appointment when one is already carried in the URL', () => {
  source.customerAppointments = [{ _id: 'appt-1', appointmentNumber: 'APT-1', type: 'ocular', date: '2026-09-01' }];
  const html = renderPage('/projects/create?customerId=customer-1&appointmentId=appt-1');
  expect(html).not.toContain('Appointment (optional)');
});
