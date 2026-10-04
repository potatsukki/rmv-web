import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Payment } from '@/lib/types';
import type { GcashQueuePayment } from '@/pages/payments/components/GcashVerificationQueue';

export type GcashTarget = { bookingId: string; stageId?: never } | { stageId: string; bookingId?: never };
export interface GcashContext {
  reference: string;
  amountRequired: number;
  paymentStatus: 'unpaid' | 'pending_verification' | 'paid' | 'rejected';
  bookingStatus?: string;
  merchant: string;
  settings: { accountName: string; accountNumber: string; qrCodeKey?: string };
  attempts: Payment[];
}
export function useGcashContext(target: GcashTarget) {
  return useQuery({ queryKey: ['payments', 'gcash', target],
    queryFn: async () => (await api.get<ApiResponse<GcashContext>>('/payments/gcash/context', { params: target })).data.data,
    refetchInterval: () => document.visibilityState === 'visible' ? 5000 : false,
  });
}
export function useGcashSubmission() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (body: GcashTarget & { referenceNumber: string; amountPaid: number; paymentDate: string; proofKey?: string }) =>
    (await api.post<ApiResponse<Payment>>('/payments/gcash/submit', body)).data.data,
    onSettled: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['payment-plans'] }); qc.invalidateQueries({ queryKey: ['appointments'] }); },
  });
}
export function useFlaggedGcashPayments(enabled: boolean) {
  return useQuery({ queryKey: ['payments', 'gcash', 'flagged'], enabled,
    queryFn: async () => (await api.get<ApiResponse<GcashQueuePayment[]>>('/payments/gcash/flagged', { params: { limit: 100 } })).data.data,
    refetchInterval: () => document.visibilityState === 'visible' ? 60000 : false,
  });
}
export function useSelectCash() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (body: GcashTarget) => (await api.post('/payments/gcash/cash', body)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['appointments'] }); },
  });
}
