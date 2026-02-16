import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Payment, PaymentPlan } from '@/lib/types';

const KEYS = {
  all: ['payments'] as const,
  plans: ['payment-plans'] as const,
  planByProject: (projectId: string) => [...KEYS.plans, projectId] as const,
  byProject: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
  pending: ['payments', 'pending'] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
};

export function usePaymentPlan(projectId: string) {
  return useQuery({
    queryKey: KEYS.planByProject(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaymentPlan>>(
        `/payments/plan/${projectId}`,
      );
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function usePaymentsByProject(projectId: string) {
  return useQuery({
    queryKey: KEYS.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payment[]>>(
        `/payments/project/${projectId}`,
      );
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function usePendingPayments() {
  return useQuery({
    queryKey: KEYS.pending,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payment[]>>('/payments/pending');
      return data.data;
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payment>>(`/payments/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePaymentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      projectId: string;
      stages: { label: string; percentage: number }[];
    }) => {
      const { data } = await api.post<ApiResponse<PaymentPlan>>('/payments/plans', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.plans });
    },
  });
}

export function useUpdatePaymentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      stages,
    }: {
      id: string;
      stages: { label: string; percentage: number }[];
    }) => {
      const { data } = await api.patch<ApiResponse<PaymentPlan>>(`/payments/plans/${id}`, {
        stages,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.plans });
    },
  });
}

export function useSubmitPaymentProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      projectId: string;
      stageId: string;
      method: string;
      amountPaid: number;
      referenceNumber?: string;
      proofKey?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Payment>>('/payments/submit-proof', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Payment>>(`/payments/${id}/verify`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.plans });
    },
  });
}

export function useDeclinePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<ApiResponse<Payment>>(`/payments/${id}/decline`, {
        reason,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
