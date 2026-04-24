import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, SalesStaffLookupUser, User } from '@/lib/types';
import type { StaffAvailabilityStatus } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import { extractErrorMessage, extractItems } from '@/lib/utils';

const KEYS = {
  all: ['users'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  customers: (search: string) => [...KEYS.all, 'customers', search] as const,
};

export function useUsers(params?: Record<string, string>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User[]>>('/users/admin/users', { params });
      return extractItems<User>(data.data);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roles: string[];
      expiresAt?: string;
    }) => {
      const { data } = await api.post<ApiResponse<User>>('/users/admin/users', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      roles?: string[];
      password?: string;
      expiresAt?: string | null;
      availabilityStatus?: StaffAvailabilityStatus;
      availabilityNote?: string | null;
      shiftStartAt?: string | null;
      shiftEndAt?: string | null;
    }) => {
      const { data } = await api.patch<ApiResponse<User>>(`/users/admin/users/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDisableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<User>>(`/users/admin/users/${id}/disable`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useEnableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<User>>(`/users/admin/users/${id}/enable`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export interface CustomerSearchResult {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export function useCustomerSearch(search: string) {
  return useQuery({
    queryKey: KEYS.customers(search),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CustomerSearchResult[]>>('/users/customers', {
        params: { search },
      });
      return extractItems<CustomerSearchResult>(data.data);
    },
    enabled: search.length >= 2,
    staleTime: 30_000,
  });
}

// ── Self-profile update (any authenticated user) ──

interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  addressData?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    addressType?: 'personal' | 'business';
    lat?: number;
    lng?: number;
    formattedAddress?: string;
  };
  notificationPreferences?: {
    appointment?: boolean;
    payment?: boolean;
    blueprint?: boolean;
    fabrication?: boolean;
    project?: boolean;
    emailNotifications?: boolean;
  };
  themePreference?: 'light' | 'dark' | 'system';
}

export function useUpdateProfile() {
  const { fetchMe } = useAuthStore();
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await api.patch<ApiResponse<User>>('/users/profile', payload);
      return data.data;
    },
    onSuccess: async () => {
      await fetchMe();
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update profile'));
    },
  });
}

interface UpdateOwnAvailabilityPayload {
  availabilityStatus?: StaffAvailabilityStatus;
  availabilityNote?: string | null;
  shiftStartAt?: string | null;
  shiftEndAt?: string | null;
}

export function useUpdateOwnAvailability() {
  const qc = useQueryClient();
  const { fetchMe } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: UpdateOwnAvailabilityPayload) => {
      const { data } = await api.patch<ApiResponse<User>>('/users/profile/availability', payload);
      return data.data;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      await fetchMe();
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update availability'));
    },
  });
}

export function useCloseOwnAvailability() {
  const qc = useQueryClient();
  const { fetchMe } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<User>>('/users/profile/availability/close');
      return data.data;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      await fetchMe();
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to close availability'));
    },
  });
}

export async function fetchSalesStaffLookup(params?: {
  date?: string;
  slotCode?: string;
  appointmentId?: string;
  search?: string;
}) {
  const { data } = await api.get<ApiResponse<SalesStaffLookupUser[]>>('/users/sales-staff', {
    params,
  });
  return extractItems<SalesStaffLookupUser>(data.data);
}

// ── E-Signature ──

export function useSignature() {
  return useQuery({
    queryKey: ['signature'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ signatureKey: string | null }>>('/users/signature');
      return data.data;
    },
  });
}

export function useSaveSignature() {
  const qc = useQueryClient();
  const { fetchMe } = useAuthStore();
  return useMutation({
    mutationFn: async (signatureKey: string) => {
      const { data } = await api.post<ApiResponse<{ signatureKey: string }>>('/users/signature', {
        signatureKey,
      });
      return data.data;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['signature'] });
      await fetchMe();
    },
  });
}

export function useDeleteSignature() {
  const qc = useQueryClient();
  const { fetchMe } = useAuthStore();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ApiResponse<{ signatureKey: null }>>('/users/signature');
      return data.data;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['signature'] });
      await fetchMe();
    },
  });
}
