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
}));

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: () => ({ isPending: false }),
  useProject: () => ({ data: source.project }),
}));
vi.mock('@/hooks/useAppointments', () => ({
  useAppointment: () => ({ data: source.appointment }),
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
});

it('shows which report needs submission even when the ocular appointment is complete', () => {
  completedOcular();
  source.reports = [
    { _id: 'report-1', serviceType: 'gates', status: 'submitted', visitType: 'ocular' },
    { _id: 'report-2', serviceType: 'railings', status: 'draft', visitType: 'ocular' },
  ];
  const html = renderPage('/projects/create?pendingProjectId=project-1');
  expect(html).toContain('Appointment completed. Submit the remaining visit reports before creating the project.');
  expect(html).toContain('href="/visit-reports/report-2"');
  expect(html).toContain('target="_blank"');
  expect(html).not.toContain('href="/visit-reports/report-1"');
});

it('shows returned reports as needing resubmission', () => {
  completedOcular();
  source.reports = [{ _id: 'returned-1', serviceType: 'gates', status: 'returned', visitType: 'ocular' }];
  const html = renderPage('/projects/create?pendingProjectId=project-1');
  expect(html).toContain('href="/visit-reports/returned-1"');
  expect(html).toContain('Returned');
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

it('explains loading, missing and failed report checks instead of treating them as ready', () => {
  completedOcular();
  source.reportsLoading = true;
  expect(renderPage('/projects/create?pendingProjectId=project-1')).toContain('Checking ocular visit and reports');
  source.reportsLoading = false;
  expect(renderPage('/projects/create?pendingProjectId=project-1')).toContain('No visit report found');
  source.reportsError = true;
  expect(renderPage('/projects/create?pendingProjectId=project-1')).toContain('Unable to check ocular visit or reports');
});
