import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, User } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

const KEYS = {
  all: ['users'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  customers: (search: string) => [...KEYS.all, 'customers', search] as const,
};

export function useUsers(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User[]>>('/users/admin/users', { params });
      return data.data;
    },
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
      return data.data;
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
  notificationPreferences?: {
    appointment?: boolean;
    payment?: boolean;
    blueprint?: boolean;
    fabrication?: boolean;
  };
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
    onError: () => {
      toast.error('Failed to update profile');
    },
  });
}
