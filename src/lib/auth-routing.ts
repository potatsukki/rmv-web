import { Role } from '@/lib/constants';

interface RouteRule {
  pattern: RegExp;
  allowedRoles: Role[] | null;
}

const PROTECTED_ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/dashboard\/?$/i, allowedRoles: null },
  { pattern: /^\/notifications\/?$/i, allowedRoles: null },
  { pattern: /^\/account(?:\/.*)?$/i, allowedRoles: null },
  { pattern: /^\/profile\/?$/i, allowedRoles: null },
  { pattern: /^\/change-password\/?$/i, allowedRoles: null },
  { pattern: /^\/appointments\/create-for-customer\/?$/i, allowedRoles: [Role.APPOINTMENT_AGENT] },
  { pattern: /^\/appointments\/[^/]+(?:\/pay-ocular-fee)?\/?$/i, allowedRoles: null },
  { pattern: /^\/appointments(?:\/book)?\/?$/i, allowedRoles: null },
  { pattern: /^\/ocular-fee-queue\/?$/i, allowedRoles: [Role.CASHIER, Role.ADMIN] },
  {
    pattern: /^\/projects(?:\/[^/]+(?:\/(?:blueprint|payments|fabrication))?)?\/?$/i,
    allowedRoles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN],
  },
  { pattern: /^\/visit-reports(?:\/[^/]+)?\/?$/i, allowedRoles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN] },
  { pattern: /^\/payments\/?$/i, allowedRoles: [Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN] },
  { pattern: /^\/cashier-queue\/?$/i, allowedRoles: [Role.CASHIER, Role.ADMIN] },
  { pattern: /^\/refund-requests\/?$/i, allowedRoles: [Role.CASHIER, Role.ADMIN] },
  { pattern: /^\/cash\/?$/i, allowedRoles: [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN] },
  { pattern: /^\/reports\/?$/i, allowedRoles: [Role.CASHIER, Role.ADMIN] },
  { pattern: /^\/users\/?$/i, allowedRoles: [Role.ADMIN] },
  { pattern: /^\/settings\/?$/i, allowedRoles: [Role.ADMIN] },
  { pattern: /^\/slot-management\/?$/i, allowedRoles: [Role.ADMIN, Role.APPOINTMENT_AGENT] },
];

const LOGIN_EXCLUDED_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/verify-otp',
  '/verify-2fa',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/privacy',
  '/terms',
  '/unauthorized',
]);

export function getDefaultAuthenticatedPath(): string {
  return '/dashboard';
}

export function canAccessPath(pathname: string, roles: Role[]): boolean {
  const normalizedPath = pathname || '/dashboard';
  const matchingRule = PROTECTED_ROUTE_RULES.find((rule) => rule.pattern.test(normalizedPath));

  if (!matchingRule) {
    return false;
  }

  if (!matchingRule.allowedRoles) {
    return true;
  }

  return roles.some((role) => matchingRule.allowedRoles?.includes(role));
}

export function resolvePostLoginPath(pathname: string | null | undefined, roles: Role[]) {
  if (!pathname) {
    return { path: getDefaultAuthenticatedPath(), redirectReason: null as string | null };
  }

  if (LOGIN_EXCLUDED_PATHS.has(pathname)) {
    return { path: getDefaultAuthenticatedPath(), redirectReason: null as string | null };
  }

  if (canAccessPath(pathname, roles)) {
    return { path: pathname, redirectReason: null as string | null };
  }

  return {
    path: getDefaultAuthenticatedPath(),
    redirectReason:
      'You were redirected to your dashboard because the previous page is not available for this account.',
  };
}