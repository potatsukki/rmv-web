import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, CashCollection } from '@/lib/types';
import { extractItems } from '@/lib/utils';

export interface CashDiscrepancy {
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

export interface PendingCashAppointment {
  _id: string;
  date: string;
  slotCode: string;
  status: string;
  type: string;
  ocularFee: number;
  ocularFeeStatus: string;
  ocularFeeNonRefundableAckAt?: string | null;
  appointmentNumber?: string;
  ocularFeeBreakdown?: {
    label: string;
    isWithinNCR: boolean;
    baseFee: number;
    baseCoveredKm: number;
    perKmRate: number;
    additionalDistanceKm: number;
    additionalFee: number;
    total: number;
  };
  formattedAddress?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  salesStaffId?: string;
  salesStaffName?: string;
}

const KEYS = {
  all: ['cash'] as const,
  collections: (params?: Record<string, unknown>) => [...KEYS.all, 'collections', params] as const,
  discrepancies: ['cash', 'discrepancies'] as const,
  pendingAppointments: ['cash', 'pending-appointments'] as const,
};

export function usePendingCashAppointments() {
  return useQuery({
    queryKey: KEYS.pendingAppointments,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PendingCashAppointment[]>>('/cash/pending-appointments');
      return extractItems<PendingCashAppointment>(data.data);
    },
  });
}

export function useCashCollections(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.collections(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CashCollection[]>>('/cash/collections', {
        params,
      });
      return extractItems<CashCollection>(data.data);
    },
  });
}

export function useCashDiscrepancies(enabled = true) {
  return useQuery({
    queryKey: KEYS.discrepancies,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CashDiscrepancy[]>>('/cash/discrepancies');
      return extractItems<CashDiscrepancy>(data.data);
    },
    enabled,
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

export interface OnsiteCashBody {
  /** The sales staff confirms the customer acknowledged in person that the fee is non-refundable. */
  customerAcknowledgedInPerson?: boolean;
  notes?: string;
}

export interface OnsiteCashResult {
  /** The customer's acknowledgement number (the official receipt comes from the cashier later). */
  collectionNumber?: string;
  collection: CashCollection;
}

/** Everything that shows a fee's status: the ocular appointment, its report, the project, payments, Cash Flow. */
function invalidateAfterOnsiteCash(qc: ReturnType<typeof useQueryClient>) {
  for (const queryKey of [KEYS.all, ['appointments'], ['visit-reports'], ['projects'], ['payments'], ['gcash']]) {
    qc.invalidateQueries({ queryKey });
  }
}

/** Sales staff: the customer paid the ocular fee in cash during the visit (paid at once; the cashier receives it later). */
export function useCollectOcularFeeOnSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, ...body }: OnsiteCashBody & { appointmentId: string }) => {
      const { data } = await api.post<ApiResponse<OnsiteCashResult>>(`/cash/onsite/ocular-fee/${appointmentId}`, body);
      return data.data;
    },
    onSuccess: () => invalidateAfterOnsiteCash(qc),
  });
}

/** Sales staff: the customer paid the design fee in cash after the ocular visit (the blueprint can start). */
export function useCollectDesignFeeOnSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...body }: OnsiteCashBody & { projectId: string }) => {
      const { data } = await api.post<ApiResponse<OnsiteCashResult>>(`/cash/onsite/design-fee/${projectId}`, body);
      return data.data;
    },
    onSuccess: () => invalidateAfterOnsiteCash(qc),
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
