import { describe, expect, it } from 'vitest';
import { Role } from '@/lib/constants';
import { getSidebarNavGroups } from './navigation';

const titles = (roles: Role[]) => getSidebarNavGroups(roles).map((group) => group.title);

describe('getSidebarNavGroups', () => {
  it('puts Financials right after Overview for a cashier', () => {
    expect(titles([Role.CASHIER])).toEqual(['Overview', 'Financials', 'Project Management', 'Administration']);
  });

  it('puts Administration right after Overview for an admin', () => {
    expect(titles([Role.ADMIN])).toEqual(['Overview', 'Administration', 'Project Management', 'Financials']);
  });

  it('keeps the default order for other roles', () => {
    expect(titles([Role.CUSTOMER])).toEqual(['Overview', 'Project Management', 'Financials', 'Administration']);
  });

  it('lists Transaction History for cashiers and admins only', () => {
    const financialItems = (role: Role) => getSidebarNavGroups([role])
      .find((group) => group.title === 'Financials')!.items
      .filter((item) => item.roles.includes(role))
      .map((item) => item.path);
    expect(financialItems(Role.CASHIER)).toContain('/transactions');
    expect(financialItems(Role.ADMIN)).toContain('/transactions');
    expect(financialItems(Role.CUSTOMER)).not.toContain('/transactions');
    expect(financialItems(Role.SALES_STAFF)).not.toContain('/transactions');
  });
});
