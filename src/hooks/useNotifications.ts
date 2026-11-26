import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LIVE_LIST_REFETCH_MS, whileTabVisible } from '@/lib/query-options';
import type { ApiResponse, Notification, PaginatedResponse } from '@/lib/types';

const KEYS = {
  all: ['notifications'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
};

export function useNotifications(params?: Record<string, string>, enabled = true) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Notification>>>(
        '/notifications',
        { params },
      );
      return data.data;
    },
    enabled,
    // New notifications arrive over the socket; this is the fallback when it is disconnected.
    refetchInterval: whileTabVisible(LIVE_LIST_REFETCH_MS),
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
