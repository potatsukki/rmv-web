import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LIVE_QUERY_OPTIONS } from '@/lib/query-options';
import type { ApiResponse, Project, PaginatedResponse, LineItem, ServiceSpecifications, ProjectFeeSummary, PendingFees, FabricationStaffWorkload } from '@/lib/types';

// Kept outside ['projects'] so project cache updates never touch the staff list.
const FABRICATION_WORKLOAD_KEY = ['fabrication-staff-workload'] as const;

const KEYS = {
  all: ['projects'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
  byVisitReport: (visitReportId: string) => [...KEYS.all, 'by-visit-report', visitReportId] as const,
};

function syncProjectCaches(qc: ReturnType<typeof useQueryClient>, project: Project) {
  qc.setQueryData(KEYS.detail(project._id), project);

  qc.setQueriesData(
    { queryKey: KEYS.all },
    (existing: PaginatedResponse<Project> | Project[] | Project | undefined) => {
      if (!existing) return existing;

      if (Array.isArray(existing)) {
        return existing.map((item) => (item._id === project._id ? project : item));
      }

      if ('items' in existing && Array.isArray(existing.items)) {
        return {
          ...existing,
          items: existing.items.map((item) => (item._id === project._id ? project : item)),
        };
      }

      if ('_id' in existing && existing._id === project._id) {
        return project;
      }

      return existing;
    },
  );
}

export function useProjects(params?: Record<string, string>) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Project>>>('/projects', {
        params,
      });
      return data.data;
    },
    // Project stages change from other users' screens (engineer costing, customer approval).
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Project>>(`/projects/${id}`);
      return data.data;
    },
    enabled: !!id,
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useProjectByVisitReport(visitReportId: string | undefined) {
  return useQuery({
    queryKey: KEYS.byVisitReport(visitReportId!),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Pick<Project, '_id' | 'title' | 'serviceType' | 'status' | 'contractStatus'> | null>>(
        `/projects/by-visit-report/${visitReportId}`,
      );
      return data.data;
    },
    enabled: !!visitReportId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pendingProjectId, ...body }: {
      pendingProjectId?: string;
      customerId?: string;
      appointmentId?: string;
      visitReportId?: string;
      title?: string;
      serviceType?: string;
      serviceTypes?: string[];
      additionalItems?: Array<{ serviceType: string } & Record<string, unknown>>;
      deliveryType?: 'shop_fabricated' | 'on_site_installation';
      serviceTypeCustom?: string;
      measurementUnit?: string;
      lineItems?: LineItem[];
      specifications?: ServiceSpecifications;
      preferredDesign?: string;
      customerRequirements?: string;
      initialDesignKeys?: string[];
      initialDesignNotes?: string;
      selectedDesignTemplateId?: string;
      selectedDesignTemplateName?: string;
      selectedDesignTemplateImageUrl?: string;
      photoKeys?: string[];
      videoKeys?: string[];
      sketchKeys?: string[];
      referenceImageKeys?: string[];
      description?: string;
      siteAddress?: string;
      measurements?: Record<string, unknown>;
      materialType?: string;
      finishColor?: string;
      quantity?: number;
      notes?: string;
      contractFileKey?: string;
      contractFileName?: string;
      contractContentType?: string;
      contractFileSize?: number;
      ocularVisit?: {
        date: string;
        slotCode: string;
        customerLocation: { lat: number; lng: number };
        formattedAddress?: string;
      };
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        pendingProjectId ? `/projects/${pendingProjectId}/finalize-ocular` : '/projects',
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['visit-reports'] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; description?: string; serviceType?: string; deliveryType?: 'shop_fabricated' | 'on_site_installation'; siteAddress?: string; notes?: string }) => {
      const { data } = await api.patch<ApiResponse<Project>>(`/projects/${id}`, body);
      return data.data;
    },
    onSuccess: (project) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useAssignEngineers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, engineerIds }: { id: string; engineerIds: string[] }) => {
      const { data } = await api.post<ApiResponse<Project>>(`/projects/${id}/assign-engineers`, {
        engineerIds,
      });
      return data.data;
    },
    onSuccess: (project) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useReassignProjectSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      salesStaffId,
      reason,
    }: {
      id: string;
      salesStaffId: string;
      reason?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(`/projects/${id}/reassign-sales`, {
        salesStaffId,
        reason,
      });
      return data.data;
    },
    onSuccess: (project) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useAssignFabrication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      fabricationLeadId: string;
      fabricationAssistantIds?: string[];
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${id}/assign-fabrication`,
        body,
      );
      return data.data;
    },
    onSuccess: (project) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: FABRICATION_WORKLOAD_KEY });
    },
  });
}

/** Fabrication staff with the projects they are on, for the engineer's team and crew pickers. */
export function useFabricationStaffWorkload(enabled = true) {
  return useQuery({
    queryKey: FABRICATION_WORKLOAD_KEY,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<FabricationStaffWorkload[]>>('/projects/fabrication-staff/workload');
      return data.data;
    },
    enabled,
    staleTime: 0,
  });
}

export function useAssignDeliveryCrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deliveryCrewIds }: { id: string; deliveryCrewIds: string[] }) => {
      const { data } = await api.post<ApiResponse<Project>>(`/projects/${id}/assign-delivery-crew`, {
        deliveryCrewIds,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: FABRICATION_WORKLOAD_KEY });
    },
  });
}

export function useReviewInitialDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
      projectItemId,
    }: {
      id: string;
      decision: 'approved' | 'declined';
      notes?: string;
      projectItemId?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${id}/review-initial-design`,
        { decision, notes, projectItemId },
      );
      return data.data;
    },
    onSuccess: (project, variables) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
    },
  });
}

export function useResubmitInitialDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      initialDesignKeys,
      initialDesignNotes,
      projectItemId,
    }: {
      id: string;
      initialDesignKeys?: string[];
      initialDesignNotes?: string;
      projectItemId?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${id}/resubmit-initial-design`,
        { initialDesignKeys, initialDesignNotes, projectItemId },
      );
      return data.data;
    },
    onSuccess: (project, variables) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
    },
  });
}

export function useBackfillInitialDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      initialDesignKeys,
      initialDesignNotes,
      backfillReason,
    }: {
      id: string;
      initialDesignKeys?: string[];
      initialDesignNotes?: string;
      backfillReason: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${id}/backfill-initial-design`,
        { initialDesignKeys, initialDesignNotes, backfillReason },
      );
      return data.data;
    },
    onSuccess: (project, variables) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
    },
  });
}

export function useSelectProjectPaymentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentType,
      projectItemId,
    }: {
      id: string;
      paymentType: 'full' | 'installment';
      projectItemId?: string;
    }) => {
      const cleanProjectItemId = projectItemId?.trim() || undefined;
      const { data } = await api.post<ApiResponse<{ paymentPlan: unknown; paymentPlans?: unknown[]; project: Project }>>(
        `/projects/${id}/select-payment-plan`,
        {
          paymentType,
          ...(cleanProjectItemId ? { projectItemId: cleanProjectItemId } : {}),
        },
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
    },
  });
}

export function useUploadProjectContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      contractFileKey,
      contractFileName,
      contractContentType,
      contractFileSize,
    }: {
      id: string;
      contractFileKey: string;
      contractFileName?: string;
      contractContentType?: string;
      contractFileSize?: number;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${id}/contract`,
        {
          contractFileKey,
          contractFileName,
          contractContentType,
          contractFileSize,
        },
      );
      return data.data;
    },
    onSuccess: (project, variables) => {
      syncProjectCaches(qc, project);
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
    },
  });
}

export interface ProjectOcularVisitInput {
  date: string;
  slotCode: string;
  customerLocation: { lat: number; lng: number };
  formattedAddress?: string;
  /** The sales staff who takes the visit; left out, the project's own sales staff does. */
  salesStaffId?: string;
}

/** Sales staff schedules the ocular visit after the signed contract is uploaded. */
export function useScheduleProjectOcular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...visit }: { id: string } & ProjectOcularVisitInput) => {
      const { data } = await api.post<ApiResponse<Project>>(`/projects/${id}/schedule-ocular`, visit);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['visit-reports'] });
    },
  });
}

/** Sales staff marks the ocular visit done: "For Ocular" → "For Review". */
export function useMarkOcularDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Project>>(`/projects/${id}/done-ocular`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useTransitionProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, cancelReason }: { id: string; status: string; cancelReason?: string }) => {
      const { data } = await api.post<ApiResponse<Project>>(`/projects/${id}/transition`, {
        status,
        cancelReason,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useConfirmInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      projectItemId,
    }: {
      projectId: string;
      projectItemId?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${projectId}/confirm-installation`,
        projectItemId ? { projectItemId } : undefined,
      );
      return data.data;
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(projectId) });
      qc.invalidateQueries({ queryKey: ['fabrication', 'project', projectId] });
      qc.invalidateQueries({ queryKey: ['fabrication', 'status', projectId] });
    },
  });
}

export function useSubmitProjectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      rating,
      comment,
    }: {
      projectId: string;
      rating: number;
      comment?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${projectId}/review`,
        { rating, comment },
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.projectId) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useSkipProjectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      reason,
    }: {
      projectId: string;
      reason?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>(
        `/projects/${projectId}/review/skip`,
        { reason },
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.projectId) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

// ── Fees: design fee + ocular fee breakdown ──

export function useProjectFeeSummary(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...KEYS.all, id, 'fee-summary'] as const,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectFeeSummary>>(`/projects/${id}/fee-summary`);
      return data.data;
    },
    enabled: Boolean(id) && enabled,
    ...LIVE_QUERY_OPTIONS,
  });
}

export function usePendingFees(enabled = true) {
  return useQuery({
    queryKey: [...KEYS.all, 'fees', 'pending'] as const,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PendingFees>>('/projects/fees/pending');
      return data.data;
    },
    enabled,
  });
}

export function useAcknowledgeDesignFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Project>>(`/projects/${id}/design-fee/acknowledge`, {});
      return data.data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: [...KEYS.all, id, 'fee-summary'] });
    },
  });
}

export type FeePaymentMethod = 'cash' | 'gcash' | 'bank_transfer';

/** Cashier records a paid revision fee (blueprint revision beyond the free ones). */
export function useRecordRevisionFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ blueprintId, method, referenceNumber }: {
      blueprintId: string;
      method: FeePaymentMethod;
      referenceNumber?: string;
    }) => {
      const { data } = await api.post<ApiResponse<{ receiptNumber: string }>>(
        `/blueprints/${blueprintId}/revision-fee/record`,
        { method, ...(referenceNumber?.trim() ? { referenceNumber: referenceNumber.trim() } : {}) },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['blueprints'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useRecordDesignFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, method, referenceNumber, customerAcknowledgedInPerson }: {
      id: string;
      method: 'cash' | 'gcash' | 'bank_transfer';
      referenceNumber?: string;
      customerAcknowledgedInPerson?: boolean;
    }) => {
      const { data } = await api.post<ApiResponse<{ receiptNumber: string }>>(
        `/projects/${id}/design-fee/record`,
        {
          method,
          ...(referenceNumber?.trim() ? { referenceNumber: referenceNumber.trim() } : {}),
          ...(customerAcknowledgedInPerson ? { customerAcknowledgedInPerson: true } : {}),
        },
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

