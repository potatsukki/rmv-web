import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, RefundRequest } from '@/lib/types';

// ── Keys ──
const KEYS = {
  all: ['refunds'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  my: ['refunds', 'my'] as const,
};

// ── Queries ──

/** Customer: list own refund requests */
export function useMyRefundRequests() {
  return useQuery({
    queryKey: KEYS.my,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RefundRequest[]>>('/refunds/my');
      return data.data;
    },
  });
}

/** Cashier/Admin: list all refund requests */
export function useRefundRequests(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{
        requests: RefundRequest[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>>('/refunds', { params });
      return data.data;
    },
  });
}

// ── Mutations ──

/** Customer: submit refund request */
export function useSubmitRefundRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      appointmentId: string;
      reason: string;
      refundMethod: 'gcash' | 'bank_transfer';
      accountName: string;
      accountNumber: string;
      bankName?: string;
    }) => {
      const { data } = await api.post<ApiResponse<RefundRequest>>('/refunds', body);
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

/** Cashier/Admin: approve refund */
export function useApproveRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<RefundRequest>>(`/refunds/${id}/approve`);
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

/** Cashier/Admin: deny refund */
export function useDenyRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, denialReason }: { id: string; denialReason: string }) => {
      const { data } = await api.post<ApiResponse<RefundRequest>>(`/refunds/${id}/deny`, { denialReason });
      return data.data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
