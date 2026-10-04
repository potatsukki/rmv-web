import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeliveryType, Role } from '@/lib/constants';
import type { Project } from '@/lib/types';

const { state, mutation } = vi.hoisted(() => ({
  state: {
    project: {} as Project,
    user: { _id: 'fabricator-1', roles: ['fabrication_staff'] },
    fabricationStatus: undefined as { currentStatus: string; deliveryType: DeliveryType; allowedTransitions: string[]; confirmationGateStatus: string | null } | undefined,
  },
  mutation: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/useProjects', () => ({
  useProject: () => ({ data: state.project }),
  useUpdateProjectSiteAddress: () => mutation,
  useConfirmInstallation: () => mutation,
}));
vi.mock('@/hooks/useFabrication', () => ({
  useFabricationUpdates: () => ({ data: [], isLoading: false }),
  useFabricationStatus: () => ({ data: state.fabricationStatus }),
  useCreateFabricationUpdate: () => mutation,
  useUpdateFabricationUpdate: () => mutation,
  useDeleteFabricationUpdate: () => mutation,
}));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ user: state.user }) }));
vi.mock('@/stores/theme.store', () => ({ useThemeStore: () => ({ resolvedTheme: 'dark' }) }));
vi.mock('@/lib/socket', () => ({ connectSocket: vi.fn() }));
vi.mock('@/components/shared/FileUpload', () => ({ FileUpload: () => null }));

import { FabricationTab } from './FabricationTab';

function renderTab(canViewUpdates = true, canManageUpdates = false) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <FabricationTab projectId="project-1" projectStatus={state.project.status} canViewUpdates={canViewUpdates} canManageUpdates={canManageUpdates} showAssignmentNotice={!canViewUpdates} />
    </QueryClientProvider>,
  );
}

describe('FabricationTab project site address', () => {
  beforeEach(() => {
    state.fabricationStatus = undefined;
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

  it.each([Role.CUSTOMER, Role.FABRICATION_STAFF, Role.SALES_STAFF, Role.ENGINEER])('shows the six on-site lifecycle markers in order to %s', (role) => {
    state.user.roles = [role];
    state.project.deliveryType = DeliveryType.ON_SITE_INSTALLATION;
    state.fabricationStatus = { deliveryType: DeliveryType.ON_SITE_INSTALLATION, currentStatus: 'installation', allowedTransitions: ['finishing'], confirmationGateStatus: 'done' };
    const html = renderTab(true, role === Role.FABRICATION_STAFF || role === Role.ENGINEER);
    const labels = [...html.matchAll(/<span[^>]*>\d<\/span>([^<]+)<\/p>/g)].map((match) => match[1]);
    expect(labels).toEqual(['Fabrication', 'Welding / Assembly', 'Installation', 'Finishing', 'Quality Check', 'Done']);
    expect(html).toContain('Step 3 of 6');
    expect(html).toContain('grid-cols-6');
    expect(html).not.toMatch(/Site Preparation|Measurement \/ Layout|Material Prep|Fabrication \/ Installation|Turnover/);
  });

  it.each([
    ['fabrication', 'welding_assembly', 1, 17],
    ['welding_assembly', 'installation', 2, 33],
    ['installation', 'finishing', 3, 50],
    ['finishing', 'quality_check', 4, 67],
    ['quality_check', 'done', 5, 83],
    ['done', '', 6, 100],
  ])('uses six-stage item progress at %s', (currentStatus, next, step, progress) => {
    state.project.deliveryType = DeliveryType.ON_SITE_INSTALLATION;
    state.project.items = ['item-1', 'item-2'].map((_id) => ({ _id, projectId: 'project-1', title: _id, serviceType: 'railings', status: currentStatus === 'done' ? 'completed' : 'fabrication', installationConfirmedAt: '2026-01-01T00:00:00Z', createdAt: '', updatedAt: '' }));
    state.fabricationStatus = { currentStatus, deliveryType: DeliveryType.ON_SITE_INSTALLATION, allowedTransitions: next ? [next] : [], confirmationGateStatus: 'done' };
    const html = renderTab(true, true);
    expect(html).toContain(`Step ${step} of 6`);
    expect(html.match(new RegExp(`width:${progress}%`, 'g'))).toHaveLength(2);
    if (currentStatus === 'done') expect(html).not.toContain('New Update');
    else expect(html).toContain('New Update');
  });

  it('uses the on-site first stage for item cards while status information is unavailable', () => {
    state.project.deliveryType = DeliveryType.ON_SITE_INSTALLATION;
    state.project.items = ['item-1', 'item-2'].map((_id) => ({ _id, projectId: 'project-1', title: _id, serviceType: 'railings', status: 'fabrication', createdAt: '', updatedAt: '' }));
    const html = renderTab();
    expect(html).not.toContain('Material Prep');
    expect(html.match(/width:17%/g)).toHaveLength(2);
  });

  it.each([DeliveryType.SHOP_FABRICATED, undefined])('preserves the eight shop markers for delivery type %s', (deliveryType) => {
    state.project.deliveryType = deliveryType;
    state.fabricationStatus = { deliveryType: DeliveryType.SHOP_FABRICATED, currentStatus: 'assembly', allowedTransitions: ['finishing'], confirmationGateStatus: null };
    const html = renderTab();
    const labels = [...html.matchAll(/<span[^>]*>\d<\/span>([^<]+)<\/p>/g)].map((match) => match[1]);
    expect(labels).toEqual(['Material Prep', 'Cutting', 'Welding', 'Assembly', 'Finishing', 'Quality Check', 'Ready for Delivery', 'Done']);
    expect(html).toContain('Step 4 of 8');
    expect(html).toContain('grid-cols-8');
  });
});
