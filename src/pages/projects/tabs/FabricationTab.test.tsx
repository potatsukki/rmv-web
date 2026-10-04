import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '@/lib/constants';
import type { Project } from '@/lib/types';

const { state, mutation } = vi.hoisted(() => ({
  state: { project: {} as Project, user: { _id: 'fabricator-1', roles: ['fabrication_staff'] } },
  mutation: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/useProjects', () => ({
  useProject: () => ({ data: state.project }),
  useUpdateProjectSiteAddress: () => mutation,
  useConfirmInstallation: () => mutation,
}));
vi.mock('@/hooks/useFabrication', () => ({
  useFabricationUpdates: () => ({ data: [], isLoading: false }),
  useFabricationStatus: () => ({ data: undefined }),
  useCreateFabricationUpdate: () => mutation,
  useUpdateFabricationUpdate: () => mutation,
  useDeleteFabricationUpdate: () => mutation,
}));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ user: state.user }) }));
vi.mock('@/stores/theme.store', () => ({ useThemeStore: () => ({ resolvedTheme: 'dark' }) }));
vi.mock('@/lib/socket', () => ({ connectSocket: vi.fn() }));
vi.mock('@/components/shared/FileUpload', () => ({ FileUpload: () => null }));

import { FabricationTab } from './FabricationTab';

function renderTab(canViewUpdates = true) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <FabricationTab projectId="project-1" projectStatus={state.project.status} canViewUpdates={canViewUpdates} canManageUpdates={false} showAssignmentNotice={!canViewUpdates} />
    </QueryClientProvider>,
  );
}

describe('FabricationTab project site address', () => {
  beforeEach(() => {
    state.user = { _id: 'fabricator-1', roles: [Role.FABRICATION_STAFF] };
    state.project = {
      _id: 'project-1', title: 'Railings', customerId: 'customer-1', status: 'fabrication',
      fabricationLeadId: 'fabricator-1', fabricationAssistantIds: ['assistant-1'], engineerIds: [],
      mediaKeys: [], createdAt: '', updatedAt: '', siteAddress: '123 Project Street',
    };
  });

  it.each(['fabricator-1', 'assistant-1'])('shows the address editor to assigned member %s', (memberId) => {
    state.user._id = memberId;
    const html = renderTab();
    expect(html).toContain('id="fabrication-site-address"');
    expect(html).toContain('123 Project Street');
    expect(html).toContain('Save Address');
  });

  it('allows the fabricator to add the first address', () => {
    state.project.siteAddress = undefined;
    expect(renderTab()).toContain('id="fabrication-site-address"');
  });

  it.each([Role.SALES_STAFF, Role.ENGINEER, Role.CUSTOMER])('shows a saved address without an editor to %s', (role) => {
    state.user.roles = [role];
    const html = renderTab();
    expect(html).toContain('123 Project Street');
    expect(html).not.toContain('Save Address');
    expect(html).not.toContain('id="fabrication-site-address"');
  });

  it('hides the editor from an unassigned fabricator', () => {
    state.user._id = 'other-fabricator';
    expect(renderTab(false)).not.toContain('Save Address');
  });

  it('keeps completed projects read only', () => {
    state.project.status = 'completed';
    expect(renderTab()).not.toContain('Save Address');
  });
});
