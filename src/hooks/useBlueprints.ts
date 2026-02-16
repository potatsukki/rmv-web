import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Blueprint } from '@/lib/types';

const KEYS = {
  all: ['blueprints'] as const,
  byProject: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
  latest: (projectId: string) => [...KEYS.all, 'latest', projectId] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
};

export function useBlueprintsByProject(projectId: string) {
  return useQuery({
    queryKey: KEYS.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Blueprint[]>>(
        `/blueprints/project/${projectId}`,
      );
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useLatestBlueprint(projectId: string) {
  return useQuery({
    queryKey: KEYS.latest(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Blueprint>>(
        `/blueprints/project/${projectId}/latest`,
      );
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useBlueprint(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Blueprint>>(`/blueprints/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUploadBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      projectId: string;
      blueprintKey: string;
      costingKey: string;
    }) => {
      const { data } = await api.post<ApiResponse<Blueprint>>('/blueprints', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUploadRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      blueprintKey: string;
      costingKey: string;
    }) => {
      const { data } = await api.post<ApiResponse<Blueprint>>(
        `/blueprints/${id}/revision`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useApproveComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, component }: { id: string; component: 'blueprint' | 'costing' }) => {
      const { data } = await api.post<ApiResponse<Blueprint>>(`/blueprints/${id}/approve`, {
        component,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useRequestBlueprintRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      revisionNotes,
      revisionRefKeys,
    }: {
      id: string;
      revisionNotes: string;
      revisionRefKeys?: string[];
    }) => {
      const { data } = await api.post<ApiResponse<Blueprint>>(
        `/blueprints/${id}/request-revision`,
        {
          notes: revisionNotes,
          refKeys: revisionRefKeys || [],
        },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
