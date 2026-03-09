import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, AuditLogListResponse } from '@/lib/types';

const getActiveTabRefetchInterval = (ms: number) =>
  typeof document === 'undefined' || document.visibilityState === 'visible' ? ms : false;

// Dashboard
interface DashboardSummary {
  totalAppointmentsToday: number;
  pendingAppointments: number;
  activeProjects: number;
  completedProjects: number;
  totalProjects: number;
  pendingPayments: number;
  revenueThisMonth: number;
  conversionRate: number;
  fabricationInProgress: number;
  pendingVisitReports: number;
  pendingCashPayments: number;
  totalUsers: number;
  pendingBlueprints: number;
  pendingInstallationConfirmations: { _id: string; title: string }[];
}

export function useDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardSummary>>('/reports/dashboard');
      return data.data;
    },
    enabled,
    refetchInterval: () => getActiveTabRefetchInterval(60_000),
  });
}

// Revenue
interface RevenueApiResponse {
  totalRevenue: number;
  totalPayments: number;
  byPeriod: Array<{
    period: string;
    revenue: number;
    count: number;
  }>;
}

export interface RevenueDataPoint {
  label: string;
  total: number;
  count: number;
}

export interface RevenueReport {
  items: RevenueDataPoint[];
  totalRevenue: number;
  totalPayments: number;
}

export function useRevenueReport(
  params?: { groupBy?: string; from?: string; to?: string },
  enabled = true,
) {
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

      return {
        items: (data.data.byPeriod || []).map((item) => ({
          label: item.period,
          total: item.revenue,
          count: item.count,
        })),
        totalRevenue: data.data.totalRevenue ?? 0,
        totalPayments: data.data.totalPayments ?? 0,
      } as RevenueReport;
    },
    enabled,
  });
}

// Payment stages
export interface PaymentStageData {
  status: string;
  count: number;
}

interface PaymentStageApiResponse {
  totalPlans: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  byStatus: PaymentStageData[];
}

export interface PaymentStageReport {
  byStatus: PaymentStageData[];
  totalPlans: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
}

export function usePaymentStageReport(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'payment-stages'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaymentStageApiResponse>>(
        '/reports/payment-stages',
      );
      return {
        byStatus: data.data.byStatus || [],
        totalPlans: data.data.totalPlans ?? 0,
        totalAmount: data.data.totalAmount ?? 0,
        totalPaid: data.data.totalPaid ?? 0,
        totalOutstanding: data.data.totalOutstanding ?? 0,
      } as PaymentStageReport;
    },
    enabled,
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

export function useProjectPipelineReport(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'pipeline'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PipelineApiResponse>>('/reports/pipeline');
      return data.data.byStatus || [];
    },
    enabled,
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

export function useWorkloadReport(enabled = true) {
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
    enabled,
  });
}

// Conversion
interface ConversionApiResponse {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  projectsCreated: number;
  conversionRate: number;
  completionRate: number;
  byType: { office: number; ocular: number };
}

export interface ConversionData {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  convertedToProjects: number;
  rate: number;
  completionRate: number;
  byType: { office: number; ocular: number };
}

export function useConversionReport(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'conversion'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ConversionApiResponse>>('/reports/conversion');
      return {
        totalAppointments: data.data.totalAppointments,
        completed: data.data.completed ?? 0,
        cancelled: data.data.cancelled ?? 0,
        noShow: data.data.noShow ?? 0,
        convertedToProjects: data.data.projectsCreated,
        rate: (data.data.conversionRate || 0) / 100,
        completionRate: (data.data.completionRate || 0) / 100,
        byType: data.data.byType ?? { office: 0, ocular: 0 },
      } as ConversionData;
    },
    enabled,
  });
}

// ── Audit Logs (Admin recent activity) ──
export function useAuditLogs(params?: { limit?: number; page?: number }, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'audit-logs', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AuditLogListResponse>>(
        '/reports/audit-logs',
        { params },
      );
      return data.data;
    },
    enabled,
  });
}
