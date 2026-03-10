import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, RefundRequest } from '@/lib/types';
import { extractItems } from '@/lib/utils';

// ── Keys ──
const KEYS = {
  all: ['refunds'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  my: ['refunds', 'my'] as const,
};

// ── Queries ──

/** Customer: list own refund requests */
export function useMyRefundRequests(enabled = true) {
  return useQuery({
    queryKey: KEYS.my,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RefundRequest[]>>('/refunds/my');
      return extractItems<RefundRequest>(data.data);
    },
    enabled,
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
      const payload = data.data as unknown;
      const requests = extractItems<RefundRequest>(payload);

      if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        return {
          requests,
          total: typeof record.total === 'number' ? record.total : requests.length,
          page: typeof record.page === 'number' ? record.page : 1,
          limit: typeof record.limit === 'number' ? record.limit : requests.length || 20,
          totalPages: typeof record.totalPages === 'number' ? record.totalPages : 1,
        };
      }

      return {
        requests,
        total: requests.length,
        page: 1,
        limit: requests.length || 20,
        totalPages: 1,
      };
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
