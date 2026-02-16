import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';

// Dashboard
interface DashboardSummary {
  totalAppointmentsToday: number;
  pendingAppointments: number;
  activeProjects: number;
  pendingPayments: number;
  revenueThisMonth: number;
  conversionRate: number;
  fabricationInProgress: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardSummary>>('/reports/dashboard');
      return data.data;
    },
  });
}

// Revenue
interface RevenueApiResponse {
  byPeriod: Array<{
    period: string;
    revenue: number;
    count: number;
  }>;
}

interface RevenueDataPoint {
  label: string;
  total: number;
  count: number;
}

export function useRevenueReport(params?: { groupBy?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RevenueApiResponse>>('/reports/revenue', {
        params: {
          groupBy: params?.groupBy,
          dateFrom: params?.from,
          dateTo: params?.to,
        },
      });

      return (data.data.byPeriod || []).map((item) => ({
        label: item.period,
        total: item.revenue,
        count: item.count,
      })) as RevenueDataPoint[];
    },
  });
}

// Payment stages
interface PaymentStageData {
  status: string;
  count: number;
}

interface PaymentStageApiResponse {
  byStatus: PaymentStageData[];
}

export function usePaymentStageReport() {
  return useQuery({
    queryKey: ['reports', 'payment-stages'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaymentStageApiResponse>>(
        '/reports/payment-stages',
      );
      return data.data.byStatus || [];
    },
  });
}

// Outstanding
interface OutstandingProject {
  projectId: string;
  projectTitle: string;
  totalCost: number;
  totalPaid: number;
  outstanding: number;
}

export function useOutstandingReport() {
  return useQuery({
    queryKey: ['reports', 'outstanding'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<OutstandingProject[]>>(
        '/reports/outstanding',
      );
      return data.data;
    },
  });
}

// Pipeline
interface PipelineStage {
  status: string;
  count: number;
  percentage: number;
}

interface PipelineApiResponse {
  byStatus: PipelineStage[];
}

export function useProjectPipelineReport() {
  return useQuery({
    queryKey: ['reports', 'pipeline'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PipelineApiResponse>>('/reports/pipeline');
      return data.data.byStatus || [];
    },
  });
}

// Workload
interface WorkloadEntry {
  userId: string;
  userName: string;
  activeProjects: number;
  completedProjects: number;
}

interface WorkloadApiEntry {
  _id: string;
  name: string;
  activeProjects?: number;
  appointments?: number;
}

interface WorkloadApiResponse {
  engineers: WorkloadApiEntry[];
  fabrication: WorkloadApiEntry[];
  sales: WorkloadApiEntry[];
}

export function useWorkloadReport() {
  return useQuery({
    queryKey: ['reports', 'workload'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<WorkloadApiResponse>>('/reports/workload');
      const engineers = (data.data.engineers || []).map((entry) => ({
        userId: `engineer:${entry._id}`,
        userName: entry.name,
        activeProjects: entry.activeProjects || 0,
        completedProjects: 0,
      }));
      const fabrication = (data.data.fabrication || []).map((entry) => ({
        userId: `fabrication:${entry._id}`,
        userName: entry.name,
        activeProjects: entry.activeProjects || 0,
        completedProjects: 0,
      }));
      const sales = (data.data.sales || []).map((entry) => ({
        userId: `sales:${entry._id}`,
        userName: entry.name,
        activeProjects: entry.appointments || 0,
        completedProjects: 0,
      }));

      return [...engineers, ...fabrication, ...sales] as WorkloadEntry[];
    },
  });
}

// Conversion
interface ConversionApiResponse {
  totalAppointments: number;
  projectsCreated: number;
  conversionRate: number;
}

interface ConversionData {
  totalAppointments: number;
  convertedToProjects: number;
  rate: number;
}

export function useConversionReport() {
  return useQuery({
    queryKey: ['reports', 'conversion'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ConversionApiResponse>>('/reports/conversion');
      return {
        totalAppointments: data.data.totalAppointments,
        convertedToProjects: data.data.projectsCreated,
        rate: (data.data.conversionRate || 0) / 100,
      } as ConversionData;
    },
  });
}
