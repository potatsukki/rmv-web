import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse, VisitReport, LineItem, SiteConditions, ServiceSpecifications, UserAddress } from '@/lib/types';

const KEYS = {
  all: ['visit-reports'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
  byAppointment: (appointmentId: string) => [...KEYS.all, 'appointment', appointmentId] as const,
};

function rawId(field: unknown): string | null {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object' && '_id' in (field as Record<string, unknown>)) {
    return String((field as Record<string, unknown>)._id);
  }
  return null;
}

function syncVisitReportCaches(qc: ReturnType<typeof useQueryClient>, report: VisitReport) {
  qc.setQueryData(KEYS.detail(String(report._id)), report);

  const appointmentId = rawId(report.appointmentId);
  if (appointmentId) {
    qc.setQueryData(KEYS.byAppointment(appointmentId), (existing: VisitReport[] | undefined) => {
      if (!existing) return existing;
      const next = existing.map((item) => (String(item._id) === String(report._id) ? report : item));
      return next.some((item) => String(item._id) === String(report._id)) ? next : [report, ...next];
    });
  }
}

export function useVisitReports(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<VisitReport>>>('/visit-reports', {
        params,
      });
      return data.data;
    },
    staleTime: 15_000,
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
    staleTime: 15_000,
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
    staleTime: 15_000,
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
    onSuccess: (report) => {
      syncVisitReportCaches(qc, report);
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
      specifications?: ServiceSpecifications;
      customerRequirements?: string;
      notes?: string;
      discussionNotes?: string;
      consultationOutcome?: 'schedule_ocular' | 'no_ocular';
      noOcularReason?: string;
      photoKeys?: string[];
      videoKeys?: string[];
      sketchKeys?: string[];
      referenceImageKeys?: string[];
      productsDiscussed?: string;
      designPreferences?: string;
      materialOptions?: string;
      projectScope?: string;
      initialDesignKeys?: string[];
      initialDesignNotes?: string;
      selectedDesignTemplateId?: string;
      selectedDesignTemplateName?: string;
      selectedDesignTemplateImageUrl?: string;
      recommendedOcularDate?: string;
      recommendedOcularSlot?: string;
      recommendedOcularAddressId?: string;
      recommendedOcularAddress?: UserAddress;
    }) => {
      const { data } = await api.put<ApiResponse<VisitReport>>(
        `/visit-reports/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: (report) => {
      syncVisitReportCaches(qc, report);
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
    onSuccess: (report) => {
      syncVisitReportCaches(qc, report);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(String(report._id)) });
      const appointmentId = rawId(report.appointmentId);
      if (appointmentId) qc.invalidateQueries({ queryKey: KEYS.byAppointment(appointmentId) });
      qc.invalidateQueries({ queryKey: ['projects'] });
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
    onSuccess: (report) => {
      syncVisitReportCaches(qc, report);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(String(report._id)) });
      const appointmentId = rawId(report.appointmentId);
      if (appointmentId) qc.invalidateQueries({ queryKey: KEYS.byAppointment(appointmentId) });
    },
  });
}

export function useReopenVisitReportForRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<ApiResponse<VisitReport>>(
        `/visit-reports/${id}/reopen-for-repair`,
        { reason },
      );
      return data.data;
    },
    onSuccess: (report) => {
      syncVisitReportCaches(qc, report);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(String(report._id)) });
      const appointmentId = rawId(report.appointmentId);
      if (appointmentId) qc.invalidateQueries({ queryKey: KEYS.byAppointment(appointmentId) });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<ApiResponse<{ deletedId: string }>>(
        `/visit-reports/${id}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
