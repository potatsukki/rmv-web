import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse, VisitReport, LineItem, SiteConditions } from '@/lib/types';

const KEYS = {
  all: ['visit-reports'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
  byAppointment: (appointmentId: string) => [...KEYS.all, 'appointment', appointmentId] as const,
};

export function useVisitReports(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<VisitReport>>>('/visit-reports', {
        params,
      });
      return data.data;
    },
  });
}

export function useVisitReport(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<VisitReport>>(`/visit-reports/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

/**
 * Returns an ARRAY of visit reports for an appointment (multiple projects per appointment).
 */
export function useVisitReportsByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: KEYS.byAppointment(appointmentId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<VisitReport[]>>(
        `/visit-reports/appointment/${appointmentId}`,
      );
      return data.data;
    },
    enabled: !!appointmentId,
  });
}

/**
 * @deprecated Use useVisitReportsByAppointment (plural) — returns array now.
 * Kept for backward compat; returns first report or null.
 */
export function useVisitReportByAppointment(appointmentId: string) {
  const query = useVisitReportsByAppointment(appointmentId);
  return {
    ...query,
    data: query.data?.[0] ?? null,
  };
}

export function useCreateVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      appointmentId: string;
      serviceType: string;
      serviceTypeCustom?: string;
      visitType?: string;
    }) => {
      const { data } = await api.post<ApiResponse<VisitReport>>(
        '/visit-reports',
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      visitType?: string;
      actualVisitDateTime?: string;
      serviceType?: string;
      serviceTypeCustom?: string;
      measurementUnit?: string;
      lineItems?: LineItem[];
      measurements?: Record<string, unknown>;
      siteConditions?: SiteConditions;
      materials?: string;
      finishes?: string;
      preferredDesign?: string;
      customerRequirements?: string;
      notes?: string;
      photoKeys?: string[];
      videoKeys?: string[];
      sketchKeys?: string[];
      referenceImageKeys?: string[];
    }) => {
      const { data } = await api.put<ApiResponse<VisitReport>>(
        `/visit-reports/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useSubmitVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<VisitReport>>(
        `/visit-reports/${id}/submit`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useReturnVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<ApiResponse<VisitReport>>(
        `/visit-reports/${id}/return`,
        { reason },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
