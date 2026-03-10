import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Appointment, PaginatedResponse, CustomerSiteDetails } from '@/lib/types';
import type { SlotCode } from '@/lib/constants';
import { extractItems } from '@/lib/utils';

// ── Keys ──
const KEYS = {
  all: ['appointments'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
  slots: (date: string, type: string) => [...KEYS.all, 'slots', date, type] as const,
};

function syncAppointmentCaches(qc: ReturnType<typeof useQueryClient>, appointment: Appointment) {
  qc.setQueryData(KEYS.detail(appointment._id), appointment);
  qc.invalidateQueries({ queryKey: KEYS.all });
}

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
    staleTime: 0, // Always refetch — detail pages must show fresh status
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
      serviceType?: string;
      serviceTypeCustom?: string;
      formattedAddress?: string;
      customerLocation?: { lat: number; lng: number };
      lockId?: string;
      addressStructured?: { street: string; barangay: string; city: string; province: string; zip: string };
      ocularFeePaymentChoice?: 'online' | 'cash';
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>('/appointments', body);
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useAgentCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      customerId: string;
      type: string;
      date: string;
      slotCode: string;
      purpose?: string;
      formattedAddress?: string;
      customerLocation?: { lat: number; lng: number };
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>('/appointments/agent', body);
      return data.data;
    },
    onSettled: () => {
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
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
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
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
    },
  });
}

export function useUpdateVisitStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'preparing' | 'on_the_way' }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/visit-status/${status}`);
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/cancel`, { reason });
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
    },
  });
}

export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/no-show`, {});
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
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
    onSettled: () => {
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useCreateOcularFeeCheckout() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<
        ApiResponse<{ checkoutUrl: string; sessionId: string }>
      >(`/appointments/${id}/ocular-fee-checkout`, {});
      return data.data;
    },
  });
}

export function useVerifyOcularFeeCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<{ verified: boolean }>>(
        `/appointments/${id}/ocular-fee-verify-checkout`,
        {},
      );
      return data.data;
    },
    onSuccess: (result) => {
      if (result.verified) {
        qc.invalidateQueries({ queryKey: ['appointments'] });
      }
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// ⚠️ TESTING ONLY: Simulate payment without PayMongo. Remove for production.
export function useSimulateOcularPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<{ verified: boolean }>>(
        `/appointments/${id}/simulate-ocular-payment`,
        {},
      );
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
// ⚠️ END TESTING ONLY

export function useSubmitOcularFeeProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      referenceNumber: string;
      proofKey: string;
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/ocular-fee-proof`,
        body,
      );
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useVerifyOcularFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/ocular-fee-verify`,
        {},
      );
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
      qc.invalidateQueries({ queryKey: ['ocular-fee-queue'] });
    },
  });
}

export function useDeclineOcularFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/ocular-fee-decline`,
        { reason },
      );
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
      qc.invalidateQueries({ queryKey: ['ocular-fee-queue'] });
    },
  });
}

export function usePendingOcularFees() {
  return useQuery({
    queryKey: ['ocular-fee-queue'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Appointment[]>>(
        '/appointments/ocular-fee-queue',
      );
      return extractItems<Appointment>(data.data);
    },
  });
}

export function useUnpaidOcularFees() {
  return useQuery({
    queryKey: [...KEYS.all, 'unpaid-ocular-fees'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Appointment>>>(
        '/appointments',
        { params: { type: 'ocular', ocularFeeStatus: 'pending', limit: '50' } },
      );
      return extractItems<Appointment>(data.data);
    },
  });
}

export function useSubmitSiteDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
    } & CustomerSiteDetails) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/site-details`,
        body,
      );
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useSkipSiteDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/skip-site-details`,
        {},
      );
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useRefundOcularFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/refund-ocular-fee`,
        { reason },
      );
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
    },
  });
}

// ── Agent: Create Ocular (from consultation context) ──
export function useAgentCreateOcular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      customerId: string;
      date: string;
      slotCode: string;
      visitReportId?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        '/appointments/agent-create-ocular',
        body,
      );
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

// ── Customer: Submit Ocular Location ──
export function useCustomerSubmitLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      customerLocation: { lat: number; lng: number };
      formattedAddress?: string;
      addressStructured?: { street: string; barangay: string; city: string; province: string; zip: string };
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/submit-location`,
        body,
      );
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
    },
  });
}

// ── Agent: Finalize Ocular ──
export function useAgentFinalizeOcular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      salesStaffId?: string;
      internalNotes?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Appointment>>(
        `/appointments/${id}/finalize-ocular`,
        body,
      );
      return data.data;
    },
    onSuccess: (appointment) => {
      syncAppointmentCaches(qc, appointment);
    },
  });
}
