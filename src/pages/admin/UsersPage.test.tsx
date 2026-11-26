import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { Role, StaffAvailabilityStatus } from '@/lib/constants';
import type { User } from '@/lib/types';

const { list } = vi.hoisted(() => ({ list: { users: [] as unknown[] } }));

vi.mock('@/hooks/useUsers', () => {
  const mutation = { mutateAsync: vi.fn(), isPending: false };
  return {
    useUsers: () => ({ data: list.users, isLoading: false, error: null, refetch: vi.fn() }),
    useCreateUser: () => mutation,
    useUpdateUser: () => mutation,
    useDisableUser: () => mutation,
    useEnableUser: () => mutation,
  };
});

import { UsersPage, availabilityUpdate } from './UsersPage';

const staff = (overrides: Partial<User>) => ({
  _id: 'user-1',
  firstName: 'Alle',
  lastName: 'Tyson',
  email: 'alle@example.com',
  roles: [Role.FABRICATION_STAFF],
  isActive: true,
  isEmailVerified: true,
  mustChangePassword: false,
  ...overrides,
}) as User;

describe('UsersPage availability column', () => {
  it('shows only the status and note: no shift text', () => {
    list.users = [
      staff({ _id: 'a', availabilityStatus: StaffAvailabilityStatus.AVAILABLE }),
      staff({ _id: 'b', firstName: 'Bea', availabilityStatus: StaffAvailabilityStatus.ON_LEAVE, availabilityNote: 'Back Monday' }),
      staff({ _id: 'c', firstName: 'Cy', roles: [Role.CUSTOMER] }),
    ];

    const html = renderToStaticMarkup(<MemoryRouter><UsersPage /></MemoryRouter>);

    // Mobile card + desktop row each show the status.
    expect((html.match(/>available</g) || []).length).toBeGreaterThanOrEqual(2);
    expect((html.match(/>on leave</g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Back Monday');
    expect(html).toContain('Not applicable');
    for (const shiftText of ['No shift details', 'Timed in at', 'Shift Ended', 'Setup Required', 'Not Set']) {
      expect(html).not.toContain(shiftText);
    }
  });
});

describe('availabilityUpdate (what an admin save sends)', () => {
  const available = { availabilityStatus: StaffAvailabilityStatus.AVAILABLE, availabilityNote: undefined };

  // QA 2026-11-26: a new password + contract date on an Available staff failed with
  // "Shift start time is required" because Available was sent again on every save.
  it('sends nothing when only the password, contract or name changed', () => {
    expect(availabilityUpdate(available, {
      role: Role.FABRICATION_STAFF,
      availabilityStatus: StaffAvailabilityStatus.AVAILABLE,
      availabilityNote: '',
    })).toEqual({});
    expect(availabilityUpdate(
      { availabilityStatus: StaffAvailabilityStatus.AVAILABLE, availabilityNote: 'Timed in' },
      { role: Role.FABRICATION_STAFF, availabilityStatus: StaffAvailabilityStatus.AVAILABLE, availabilityNote: 'Timed in' },
    )).toEqual({});
  });

  it('sends the status and note when the status changed', () => {
    expect(availabilityUpdate(available, {
      role: Role.SALES_STAFF,
      availabilityStatus: StaffAvailabilityStatus.ON_LEAVE,
      availabilityNote: 'Back Monday',
    })).toEqual({ availabilityStatus: StaffAvailabilityStatus.ON_LEAVE, availabilityNote: 'Back Monday' });
  });

  it('sends the status with a changed or cleared note', () => {
    const onLeave = { availabilityStatus: StaffAvailabilityStatus.ON_LEAVE, availabilityNote: 'Back Monday' };
    expect(availabilityUpdate(onLeave, {
      role: Role.SALES_STAFF,
      availabilityStatus: StaffAvailabilityStatus.ON_LEAVE,
      availabilityNote: 'Back Tuesday',
    })).toEqual({ availabilityStatus: StaffAvailabilityStatus.ON_LEAVE, availabilityNote: 'Back Tuesday' });
    expect(availabilityUpdate(onLeave, {
      role: Role.SALES_STAFF,
      availabilityStatus: StaffAvailabilityStatus.ON_LEAVE,
      availabilityNote: '',
    })).toEqual({ availabilityStatus: StaffAvailabilityStatus.ON_LEAVE, availabilityNote: null });
  });

  it('sends nothing for a customer or when no status is picked', () => {
    expect(availabilityUpdate({}, {
      role: Role.CUSTOMER,
      availabilityStatus: StaffAvailabilityStatus.UNAVAILABLE,
      availabilityNote: '',
    })).toEqual({});
    expect(availabilityUpdate({}, {
      role: Role.ENGINEER,
      availabilityStatus: undefined,
      availabilityNote: '',
    })).toEqual({});
  });
});
