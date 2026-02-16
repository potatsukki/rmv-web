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
