import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Appointment, PaginatedResponse } from '@/lib/types';
import type { SlotCode } from '@/lib/constants';

// ── Keys ──
const KEYS = {
  all: ['appointments'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
  slots: (date: string, type: string) => [...KEYS.all, 'slots', date, type] as const,
};

// ── Queries ──
export function useAppointments(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Appointment>>>(
        '/appointments',
        { params },
      );
      return data.data;
    },
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAvailableSlots(date: string, type: string) {
  return useQuery({
    queryKey: KEYS.slots(date, type),
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<{ date: string; slots: { slotCode: SlotCode; available: boolean; remaining: number }[] }>
      >('/appointments/slots', { params: { date, type } });
      return data.data;
    },
    enabled: !!date && !!type,
  });
}

// ── Mutations ──
export function useRequestAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type: string;
      date: string;
      slotCode: string;
      purpose?: string;
      address?: string;
      lockId?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>('/appointments', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useConfirmAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      salesStaffId: string;
      internalNotes?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/confirm`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useCompleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/complete`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/cancel`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/no-show`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useRequestReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      newDate: string;
      newSlotCode: string;
      reason?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/reschedule-request`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useRecordOcularFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      ocularFee: number;
      ocularFeeMethod: string;
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/ocular-fee`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
