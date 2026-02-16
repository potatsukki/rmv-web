import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, CashCollection } from '@/lib/types';

interface CashDiscrepancy {
  _id: string;
  cashCollectionId: string;
  appointmentId: string;
  salesStaffId: string;
  cashierId: string;
  amountCollected: number;
  amountReceived: number;
  difference: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

const KEYS = {
  all: ['cash'] as const,
  collections: (params?: Record<string, unknown>) => [...KEYS.all, 'collections', params] as const,
  discrepancies: ['cash', 'discrepancies'] as const,
};

export function useCashCollections(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.collections(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CashCollection[]>>('/cash/collections', {
        params,
      });
      return data.data;
    },
  });
}

export function useCashDiscrepancies() {
  return useQuery({
    queryKey: KEYS.discrepancies,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CashDiscrepancy[]>>('/cash/discrepancies');
      return data.data;
    },
  });
}

export function useRecordCashCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      appointmentId: string;
      amountCollected: number;
      notes?: string;
      photoKey?: string;
    }) => {
      const { data } = await api.post<ApiResponse<CashCollection>>(
        '/cash/collections',
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useReceiveCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amountReceived }: { id: string; amountReceived: number }) => {
      const { data } = await api.post<ApiResponse<CashCollection>>(
        `/cash/collections/${id}/receive`,
        { amountReceived },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useResolveDiscrepancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolutionNotes }: { id: string; resolutionNotes: string }) => {
      const { data } = await api.post<ApiResponse<CashDiscrepancy>>(
        `/cash/discrepancies/${id}/resolve`,
        { resolutionNotes },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
