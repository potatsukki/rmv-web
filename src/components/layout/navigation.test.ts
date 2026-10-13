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
});
