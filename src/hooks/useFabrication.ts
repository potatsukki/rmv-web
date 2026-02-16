import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, FabricationUpdate } from '@/lib/types';

const KEYS = {
  all: ['fabrication'] as const,
  byProject: (projectId: string) => [...KEYS.all, 'project', projectId] as const,
  status: (projectId: string) => [...KEYS.all, 'status', projectId] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
};

interface UserRef {
  _id: string;
  firstName: string;
  lastName: string;
}

interface FabricationApiUpdate {
  _id: string;
  projectId: string;
  status: string;
  notes: string;
  photoKeys: string[];
  updatedBy: string | UserRef;
  createdAt: string;
}

function normalizeUpdate(update: FabricationApiUpdate): FabricationUpdate {
  const updatedBy = update.updatedBy;
  const createdBy = typeof updatedBy === 'string' ? updatedBy : updatedBy._id;
  const createdByName =
    typeof updatedBy === 'string'
      ? undefined
      : `${updatedBy.firstName} ${updatedBy.lastName}`;

  return {
    _id: update._id,
    projectId: update.projectId,
    status: update.status,
    notes: update.notes,
    photoKeys: update.photoKeys || [],
    createdBy,
    createdByName,
    createdAt: update.createdAt,
  };
}

export function useFabricationUpdates(projectId: string) {
  return useQuery({
    queryKey: KEYS.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<FabricationApiUpdate[]>>(
        `/fabrication/project/${projectId}`,
      );
      return (data.data || []).map(normalizeUpdate);
    },
    enabled: !!projectId,
  });
}

interface FabricationStatusResponse {
  currentStatus: string;
  latestUpdate: FabricationApiUpdate | null;
  allowedTransitions: string[];
}

export function useFabricationStatus(projectId: string) {
  return useQuery({
    queryKey: KEYS.status(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<FabricationStatusResponse>>(
        `/fabrication/project/${projectId}/status`,
      );

      return {
        ...data.data,
        latestUpdate: data.data.latestUpdate
          ? normalizeUpdate(data.data.latestUpdate)
          : null,
      };
    },
    enabled: !!projectId,
  });
}

export function useFabricationUpdate(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<FabricationApiUpdate>>(`/fabrication/${id}`);
      return normalizeUpdate(data.data);
    },
    enabled: !!id,
  });
}

export function useCreateFabricationUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      projectId: string;
      status: string;
      notes: string;
      photoKeys?: string[];
    }) => {
      const { data } = await api.post<ApiResponse<FabricationApiUpdate>>('/fabrication', body);
      return normalizeUpdate(data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
