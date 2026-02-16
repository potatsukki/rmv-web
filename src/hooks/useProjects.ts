import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Project, PaginatedResponse } from '@/lib/types';

const KEYS = {
  all: ['projects'] as const,
  list: (params?: Record<string, unknown>) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
};

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
    onSuccess: () => {
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
    onSuccess: () => {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
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
