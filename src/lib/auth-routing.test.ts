import { describe, expect, it } from 'vitest';
import { Role } from '@/lib/constants';
import { canAccessPath, getDefaultAuthenticatedPath, resolvePostLoginPath } from '@/lib/auth-routing';

describe('auth routing guards', () => {
  it('allows a role to keep an allowed protected route after login', () => {
    expect(resolvePostLoginPath('/appointments/create-for-customer', [Role.APPOINTMENT_AGENT])).toEqual({
      path: '/appointments/create-for-customer',
      redirectReason: null,
    });
    expect(resolvePostLoginPath('/appointments/create-for-customer', [Role.SALES_STAFF])).toEqual({
      path: '/appointments/create-for-customer',
      redirectReason: null,
    });
  });

  it('redirects role-exclusive routes to dashboard when the new role cannot access them', () => {
    expect(resolvePostLoginPath('/appointments/create-for-customer', [Role.CUSTOMER])).toEqual({
      path: getDefaultAuthenticatedPath(),
      redirectReason:
        'You were redirected to your dashboard because the previous page is not available for this account.',
    });
  });

  it('treats unknown protected paths as unsafe and redirects to dashboard', () => {
    expect(resolvePostLoginPath('/admin/legacy-secret', [Role.ADMIN]).path).toBe('/dashboard');
  });

  it('allows authenticated shared routes for all signed-in roles', () => {
    expect(canAccessPath('/dashboard', [Role.CUSTOMER])).toBe(true);
    expect(canAccessPath('/account/security', [Role.ENGINEER])).toBe(true);
  });

  it('restricts customer self-booking pages to customers only', () => {
    expect(canAccessPath('/appointments/book', [Role.CUSTOMER])).toBe(true);
    expect(canAccessPath('/appointments/book', [Role.SALES_STAFF])).toBe(false);
    expect(canAccessPath('/appointments/book', [Role.APPOINTMENT_AGENT])).toBe(false);
  });

  it('keeps public or auth pages from being used as post-login redirects', () => {
    expect(resolvePostLoginPath('/login', [Role.ADMIN])).toEqual({
      path: '/dashboard',
      redirectReason: null,
    });
  });
});
