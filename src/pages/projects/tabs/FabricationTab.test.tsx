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

function renderTab(canViewUpdates = true, canManageUpdates = false, onSetInstallationDate?: () => void) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <FabricationTab
        projectId="project-1"
        projectStatus={state.project.status}
        canViewUpdates={canViewUpdates}
        canManageUpdates={canManageUpdates}
        showAssignmentNotice={!canViewUpdates}
        onSetInstallationDate={onSetInstallationDate}
      />
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

  // The site comes from the ocular pin or from Create Project; nobody edits it here.
  it.each([Role.FABRICATION_STAFF, Role.ADMIN, Role.SALES_STAFF, Role.ENGINEER, Role.CUSTOMER])('shows the site address read only to %s', (role) => {
    state.user.roles = [role];
    const html = renderTab();
    expect(html).toContain('123 Project Street');
    expect(html).toContain('Set by sales staff in Create Project.');
    expect(html).not.toContain('Save Address');
    expect(html).not.toContain('<textarea id="fabrication-site-address"');
  });

  it('labels an address that comes from the ocular visit pin', () => {
    state.project.ocularAppointmentId = 'ocular-1';
    expect(renderTab()).toContain('From the ocular visit pin.');
  });

  it('says when no site address is set yet', () => {
    state.project.siteAddress = undefined;
    expect(renderTab()).toContain('No project site address yet.');
  });

  it.each([Role.CUSTOMER, Role.FABRICATION_STAFF, Role.SALES_STAFF, Role.ENGINEER])('shows the six on-site lifecycle markers in order to %s', (role) => {
    state.user.roles = [role];
    state.project.deliveryType = DeliveryType.ON_SITE_INSTALLATION;
    state.fabricationStatus = { deliveryType: DeliveryType.ON_SITE_INSTALLATION, currentStatus: 'installation', allowedTransitions: ['finishing'], confirmationGateStatus: 'installation' };
    const html = renderTab(true, role === Role.FABRICATION_STAFF || role === Role.ENGINEER);
    const labels = [...html.matchAll(/<span[^>]*>\d<\/span>([^<]+)<\/p>/g)].map((match) => match[1]);
    expect(labels).toEqual(['Preparing Materials', 'Welding / Assembly', 'Installation', 'Finishing', 'Quality Check', 'Done']);
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
    state.fabricationStatus = { currentStatus, deliveryType: DeliveryType.ON_SITE_INSTALLATION, allowedTransitions: next ? [next] : [], confirmationGateStatus: 'installation' };
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
    state.fabricationStatus = { deliveryType: DeliveryType.SHOP_FABRICATED, currentStatus: 'assembly', allowedTransitions: ['finishing'], confirmationGateStatus: 'done' };
    const html = renderTab();
    const labels = [...html.matchAll(/<span[^>]*>\d<\/span>([^<]+)<\/p>/g)].map((match) => match[1]);
    expect(labels).toEqual(['Material Prep', 'Cutting', 'Welding', 'Assembly', 'Finishing', 'Quality Check', 'Ready for Delivery', 'Done']);
    expect(html).toContain('Step 4 of 8');
    expect(html).toContain('grid-cols-8');
  });
});

describe('FabricationTab customer confirmation banners', () => {
  beforeEach(() => {
    state.user = { _id: 'fabricator-1', roles: [Role.FABRICATION_STAFF] };
    state.project = {
      _id: 'project-1', title: 'Railings', customerId: 'customer-1', status: 'fabrication',
      fabricationLeadId: 'fabricator-1', fabricationAssistantIds: [], engineerIds: [],
      mediaKeys: [], createdAt: '', updatedAt: '', deliverySchedule: { date: '2026-11-25' },
    } as Project;
  });

  const onSiteAt = (currentStatus: string, next: string) => {
    state.project.deliveryType = DeliveryType.ON_SITE_INSTALLATION;
    state.fabricationStatus = { currentStatus, deliveryType: DeliveryType.ON_SITE_INSTALLATION, allowedTransitions: [next], confirmationGateStatus: 'installation' };
  };
  const shopAt = (currentStatus: string, next: string) => {
    state.project.deliveryType = DeliveryType.SHOP_FABRICATED;
    state.fabricationStatus = { currentStatus, deliveryType: DeliveryType.SHOP_FABRICATED, allowedTransitions: [next], confirmationGateStatus: 'done' };
  };

  it('shows the on-site installation confirmation at Welding / Assembly, before Installation', () => {
    onSiteAt('welding_assembly', 'installation');
    const staffHtml = renderTab(true, true);
    expect(staffHtml).toContain('Awaiting Customer Confirmation');
    expect(staffHtml).toContain('before you can move this to Installation');

    state.user = { _id: 'customer-1', roles: [Role.CUSTOMER] };
    const customerHtml = renderTab();
    expect(customerHtml).toContain('Installation at your location');
    expect(customerHtml).toContain('Confirm Installation');
  });

  it('names the installation date in the staff banner once it is set', () => {
    onSiteAt('welding_assembly', 'installation');
    const staffHtml = renderTab(true, true, () => {});
    expect(staffHtml).toContain('Installation is set on');
    expect(staffHtml).not.toContain('Waiting for the installation date');
    expect(staffHtml).not.toContain('Set Installation Date');

    state.user = { _id: 'customer-1', roles: [Role.CUSTOMER] };
    const customerHtml = renderTab();
    expect(customerHtml).toContain('Confirm Installation');
    expect(customerHtml).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>Confirm Installation/);
  });

  describe('on-site project with no installation date yet', () => {
    beforeEach(() => {
      onSiteAt('welding_assembly', 'installation');
      state.project.deliverySchedule = undefined;
    });

    it('tells the customer RMV sets the date and hides the confirm button', () => {
      state.user = { _id: 'customer-1', roles: [Role.CUSTOMER] };
      const html = renderTab();
      expect(html).toContain('Installation date not set yet');
      expect(html).toContain('RMV will set your installation date');
      expect(html).not.toContain('Confirm Installation');
    });

    it('tells the fabricator the date is missing instead of awaiting the customer', () => {
      const html = renderTab(true, true);
      expect(html).toContain('Waiting for the installation date');
      expect(html).toContain('The admin or the assigned engineer needs to set the installation date and crew');
      expect(html).not.toContain('Awaiting Customer Confirmation');
      expect(html).not.toContain('Set Installation Date');
    });

    it('gives the admin / assigned engineer a Set Installation Date button', () => {
      state.user = { _id: 'admin-1', roles: [Role.ADMIN] };
      const html = renderTab(true, false, () => {});
      expect(html).toContain('Waiting for the installation date');
      expect(html).toContain('Set Installation Date');
    });
  });

  it('no longer shows the on-site confirmation at Quality Check', () => {
    onSiteAt('quality_check', 'done');
    expect(renderTab(true, true)).not.toContain('Awaiting Customer Confirmation');
  });

  it('asks a delivery customer to confirm receipt at Ready for Delivery, before Done', () => {
    shopAt('ready_for_delivery', 'done');
    const staffHtml = renderTab(true, true);
    expect(staffHtml).toContain('Awaiting Customer Confirmation');
    expect(staffHtml).toContain('must confirm they received the order before you can mark this as Done');

    state.user = { _id: 'customer-1', roles: [Role.CUSTOMER] };
    const customerHtml = renderTab();
    expect(customerHtml).toContain('Confirm you received your order');
    expect(customerHtml).toContain('Confirm Order Received');
  });

  it('does not ask a delivery customer anything before Ready for Delivery', () => {
    shopAt('quality_check', 'ready_for_delivery');
    state.user = { _id: 'customer-1', roles: [Role.CUSTOMER] };
    expect(renderTab()).not.toContain('Confirm Order Received');
  });
});
