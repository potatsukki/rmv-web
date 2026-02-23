import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────
export interface ConfigItem {
  _id: string;
  key: string;
  value: unknown;
  description?: string;
}

export interface Holiday {
  _id: string;
  date: string;
  name: string;
}

export interface BlockedSlot {
  _id: string;
  date: string;
  slotCode: string;
  type: 'office' | 'ocular';
  reason?: string;
  blockedBy: { _id: string; firstName: string; lastName: string };
  createdAt: string;
}

// ─── Queries ──────────────────────────────────────────────────
export function useConfigs() {
  return useQuery<ConfigItem[]>({
    queryKey: ['configs'],
    queryFn: async () => {
      const { data } = await api.get('/config/configs');
      return data.data;
    },
  });
}

export function useHolidays(year?: string) {
  return useQuery<Holiday[]>({
    queryKey: ['holidays', year],
    queryFn: async () => {
      const { data } = await api.get('/config/holidays', { params: year ? { year } : {} });
      return data.data;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────
export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: unknown; description?: string }) => {
      const { data } = await api.put(`/config/configs/${key}`, { value, description });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configs'] }),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { date: string; name: string }) => {
      const { data } = await api.post('/config/holidays', body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/config/holidays/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useToggleMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data } = await api.post('/config/maintenance', { enabled });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configs'] }),
  });
}

// ─── Blocked Slots ────────────────────────────────────────────
export function useBlockedSlots(date?: string) {
  return useQuery<BlockedSlot[]>({
    queryKey: ['blocked-slots', date],
    queryFn: async () => {
      const { data } = await api.get('/config/blocked-slots', { params: date ? { date } : {} });
      return data.data;
    },
  });
}

export function useCreateBlockedSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { date: string; slotCode: string; type: 'office' | 'ocular'; reason?: string }) => {
      const { data } = await api.post('/config/blocked-slots', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-slots'] });
      qc.invalidateQueries({ queryKey: ['available-slots'] });
    },
  });
}

export function useDeleteBlockedSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/config/blocked-slots/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-slots'] });
      qc.invalidateQueries({ queryKey: ['available-slots'] });
    },
  });
}

export function useBulkBlockSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      date: string;
      slots: Array<{ slotCode: string; type: 'office' | 'ocular' }>;
      reason?: string;
    }) => {
      const { data } = await api.post('/config/blocked-slots/bulk', body);
      return data.data as { created: number; skipped: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-slots'] });
      qc.invalidateQueries({ queryKey: ['available-slots'] });
    },
  });
}

export function useBulkDeleteBlockedSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.delete('/config/blocked-slots/bulk', { data: { ids } });
      return data.data as { deleted: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-slots'] });
      qc.invalidateQueries({ queryKey: ['available-slots'] });
    },
  });
}
