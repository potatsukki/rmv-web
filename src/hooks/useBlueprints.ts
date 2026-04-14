import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ApiResponse,
  Blueprint,
  BlueprintDraft,
  BlueprintDraftFile,
} from '@/lib/types';

const KEYS = {
  all: ['blueprints'] as const,
  byProject: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
  latest: (projectId: string) => [...KEYS.all, 'latest', projectId] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
  draft: (projectId: string) => [...KEYS.all, 'draft', projectId] as const,
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

export function useBlueprintDraft(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.draft(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<BlueprintDraft | null>>(
        `/blueprints/project/${projectId}/draft`,
      );
      return data.data;
    },
    enabled: !!projectId && (options?.enabled ?? true),
  });
}

export function useUploadBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      projectId: string;
      blueprintKey: string;
      designKey: string;
      costingKey: string;
      quotation?: {
        materials: number;
        labor: number;
        fees: number;
        total: number;
        lineItems?: {
          label: string;
          quantity: number;
          materials: number;
          labor: number;
          amount: number;
        }[];
        validityDays?: number;
        breakdown?: string;
        estimatedDuration?: string;
        engineerNotes?: string;
        paymentMilestones?: { label: string; description: string }[];
      };
    }) => {
      const { data } = await api.post<ApiResponse<Blueprint>>('/blueprints', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpsertBlueprintDraft() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      ...body
    }: {
      projectId: string;
      mode: 'initial' | 'revision';
      sourceBlueprintId?: string;
      files?: {
        blueprint?: BlueprintDraftFile | null;
        design?: BlueprintDraftFile | null;
        costing?: BlueprintDraftFile | null;
      };
      quotation?: BlueprintDraft['quotation'];
    }) => {
      const { data } = await api.put<ApiResponse<BlueprintDraft>>(
        `/blueprints/project/${projectId}/draft`,
        body,
      );
      return data.data;
    },
    onSuccess: (draft) => {
      qc.setQueryData(KEYS.draft(draft.projectId), draft);
    },
  });
}

export function useFinalizeBlueprintDraft() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data } = await api.post<ApiResponse<Blueprint>>(
        `/blueprints/project/${projectId}/draft/finalize`,
      );
      return data.data;
    },
    onSuccess: (blueprint) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.setQueryData(KEYS.draft(blueprint.projectId), null);
    },
  });
}

export function useDeleteBlueprintDraft() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/blueprints/project/${projectId}/draft`);
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.setQueryData(KEYS.draft(projectId), null);
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
      designKey: string;
      costingKey: string;
      quotation?: {
        materials: number;
        labor: number;
        fees: number;
        total: number;
        lineItems?: {
          label: string;
          quantity: number;
          materials: number;
          labor: number;
          amount: number;
        }[];
        validityDays?: number;
        breakdown?: string;
        estimatedDuration?: string;
        engineerNotes?: string;
        paymentMilestones?: { label: string; description: string }[];
      };
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

export function useAcceptBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentType,
    }: {
      id: string;
      paymentType: 'full' | 'installment';
    }) => {
      const { data } = await api.post<ApiResponse<{ blueprint: Blueprint }>>(
        `/blueprints/${id}/accept`,
        { paymentType },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
    },
  });
}
