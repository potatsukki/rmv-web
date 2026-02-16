import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, User } from '@/lib/types';

const KEYS = {
  all: ['users'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
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
