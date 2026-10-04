import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: () => ({ isPending: false }),
  useProject: () => ({ data: undefined }),
}));
vi.mock('@/hooks/useAppointments', () => ({
  useAppointment: () => ({ data: undefined }),
  useAvailableSlots: () => ({ data: undefined }),
}));
vi.mock('@/hooks/useUsers', () => ({ useCustomerSearch: () => ({ data: [] }) }));
vi.mock('@/hooks/useVisitReports', () => ({ useVisitReportsByAppointment: () => ({ data: [] }) }));
vi.mock('@/components/shared/FileUpload', () => ({ FileUpload: () => null }));

import { CreateProjectPage } from './CreateProjectPage';

it('does not ask sales to enter the fabricator site address when creating a project', () => {
  const html = renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><CreateProjectPage /></MemoryRouter>
    </QueryClientProvider>,
  );
  expect(html).toContain('Create Project');
  expect(html).not.toContain('Project Site Address');
  expect(html).not.toContain('name="siteAddress"');
});
