import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Project, PaginatedResponse } from '@/lib/types';

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
    mutationFn: async (body: {
      appointmentId: string;
      title: string;
      serviceType: string;
      description: string;
      siteAddress: string;
      measurements?: Record<string, unknown>;
      materialType?: string;
      finishColor?: string;
      quantity?: number;
      notes?: string;
    }) => {
      const { data } = await api.post<ApiResponse<Project>>('/projects', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; description?: string; serviceType?: string; siteAddress?: string; notes?: string }) => {
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
