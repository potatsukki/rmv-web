import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertCircle,
  FolderOpen,
  CalendarCheck,
  XCircle,
  UserX,
  Building2,
  MapPin,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useRevenueReport,
  useProjectPipelineReport,
  usePaymentStageReport,
  useWorkloadReport,
  useConversionReport,
  useDashboardSummary,
} from '@/hooks/useReports';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/lib/constants';

/* ── Helpers ── */

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
  }).format(v);

const formatCurrencyFull = (v: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const formatStatus = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

type GroupBy = 'day' | 'week' | 'month';

/* ── Pipeline bar color map ── */
const PIPELINE_COLORS: Record<string, string> = {
  approved: '#1d1d1f',
  in_progress: '#6e6e73',
  blueprint_phase: '#0ea5e9',
  fabrication: '#f59e0b',
  installation: '#8b5cf6',
  pending_payment: '#d97706',
  completed: '#10b981',
  cancelled: '#ef4444',
};

/* ── Payment stage bar color map ── */
const STAGE_COLORS: Record<string, string> = {
  verified: '#10b981',
  pending: '#f59e0b',
  awaiting_proof: '#6e6e73',
  declined: '#ef4444',
  overdue: '#dc2626',
  refunded: '#8b5cf6',
};

/* ── Custom tooltip ── */
function ChartTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#e8e8ed] bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[#1d1d1f]">{label}</p>
      <p className="text-sm font-semibold text-[#1d1d1f]">
        {isCurrency ? formatCurrency(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
}

/* ── KPI Card Component ── */
function KpiCard({
  label,
  value,
  icon: Icon,
  subtitle,
  isLoading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="border-[#c8c8cd]/50 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-20 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#c8c8cd]/50 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f0f5]">
            <Icon className="h-5 w-5 text-[#1d1d1f]" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-[#1d1d1f] tracking-tight">
          {value}
        </div>
        <p className="text-[11px] sm:text-xs text-[#6e6e73] font-medium mt-1">
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] text-[#86868b] mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────── */
/* ── ReportsPage                                          ── */
/* ────────────────────────────────────────────────────────── */

export function ReportsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes(Role.ADMIN);
  const canAccessCashierReports = user?.roles?.some((role) => [Role.CASHIER, Role.ADMIN].includes(role));
  const [revenueGroupBy, setRevenueGroupBy] = useState<GroupBy>('month');

  const { data: revenue, isLoading: revLoading } = useRevenueReport({
    groupBy: revenueGroupBy,
  }, !!canAccessCashierReports);
  const { data: pipeline, isLoading: pipeLoading } = useProjectPipelineReport(!!isAdmin);
  const { data: paymentStages, isLoading: psLoading } = usePaymentStageReport(!!canAccessCashierReports);
  const { data: workload, isLoading: wlLoading } = useWorkloadReport(!!isAdmin);
  const { data: conversion, isLoading: convLoading } = useConversionReport(!!isAdmin);
  const { data: dashboard, isLoading: dashLoading } = useDashboardSummary(!!isAdmin);

  const anyKpiLoading = revLoading || psLoading || (isAdmin ? convLoading || dashLoading : false);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
          Reports
        </h1>
        <p className="text-[#6e6e73] text-sm mt-1">
          Business analytics and insights
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div
        className={`grid gap-3 grid-cols-2 ${
          isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-3'
        }`}
      >
        <KpiCard
          label="Total Revenue"
          value={formatCurrencyFull(revenue?.totalRevenue ?? 0)}
          icon={DollarSign}
          isLoading={anyKpiLoading}
        />
        <KpiCard
          label="Total Payments"
          value={revenue?.totalPayments ?? 0}
          icon={CreditCard}
          subtitle="Verified payments"
          isLoading={anyKpiLoading}
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrencyFull(paymentStages?.totalOutstanding ?? 0)}
          icon={AlertCircle}
          subtitle={`${paymentStages?.totalPlans ?? 0} payment plans`}
          isLoading={anyKpiLoading}
        />
        {isAdmin && (
          <>
            <KpiCard
              label="Conversion Rate"
              value={`${((conversion?.rate ?? 0) * 100).toFixed(1)}%`}
              icon={TrendingUp}
              subtitle={`${conversion?.convertedToProjects ?? 0} of ${conversion?.completed ?? 0} completed`}
              isLoading={anyKpiLoading}
            />
            <KpiCard
              label="Active Projects"
              value={dashboard?.activeProjects ?? 0}
              icon={FolderOpen}
              subtitle="In progress"
              isLoading={anyKpiLoading}
            />
          </>
        )}
      </div>

      {/* ── Appointment Funnel — admin only ── */}
      {isAdmin && (
        <Card className="rounded-xl border-[#e8e8ed] bg-white/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1d1d1f]">
              Appointment Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {convLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : conversion ? (
              <div className="space-y-4">
                {/* Stat row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Total',
                      value: conversion.totalAppointments,
                      icon: CalendarCheck,
                      badge: 'default' as const,
                    },
                    {
                      label: 'Completed',
                      value: conversion.completed,
                      icon: CalendarCheck,
                      badge: 'success' as const,
                    },
                    {
                      label: 'Cancelled',
                      value: conversion.cancelled,
                      icon: XCircle,
                      badge: 'destructive' as const,
                    },
                    {
                      label: 'No-Show',
                      value: conversion.noShow,
                      icon: UserX,
                      badge: 'warning' as const,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-3 rounded-xl bg-[#f5f5f7] p-3"
                    >
                      <s.icon className="h-4 w-4 text-[#86868b] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-[#1d1d1f]">
                          {s.value}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={s.badge} className="text-[10px] px-1.5 py-0">
                            {s.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom detail row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#6e6e73]">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Office: <strong className="text-[#1d1d1f]">{conversion.byType.office}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Ocular: <strong className="text-[#1d1d1f]">{conversion.byType.ocular}</strong>
                  </span>
                  <span className="ml-auto">
                    {(conversion.completionRate * 100).toFixed(0)}% completed
                    {' → '}
                    {((conversion.rate) * 100).toFixed(1)}% converted to projects
                  </span>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[#86868b]">
                No appointment data available.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Revenue Chart ── */}
      <Card className="rounded-xl border-[#e8e8ed] bg-white/70 backdrop-blur-sm shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#1d1d1f]">
            Revenue
          </CardTitle>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as GroupBy[]).map((g) => (
              <Button
                key={g}
                variant={revenueGroupBy === g ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueGroupBy(g)}
                className={`capitalize rounded-lg text-xs h-8 px-3 ${
                  revenueGroupBy === g
                    ? 'bg-[#1d1d1f] text-white hover:bg-[#2d2d2f]'
                    : 'border-[#e8e8ed] text-[#6e6e73] hover:bg-[#f5f5f7]'
                }`}
              >
                {g}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {revLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : revenue && revenue.items.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue.items}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#86868b' }}
                  stroke="#e8e8ed"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 12, fill: '#86868b' }}
                  stroke="#e8e8ed"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip isCurrency />} />
                <Bar dataKey="total" fill="#1d1d1f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-[#86868b]">
              No revenue data available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Pipeline + Payment Stages ── */}
      <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-2' : ''}`}>
        {/* Project Pipeline — admin only */}
        {isAdmin && (
          <Card className="rounded-xl border-[#e8e8ed] bg-white/70 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#1d1d1f]">
                Project Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pipeLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : pipeline && pipeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, pipeline.length * 44)}>
                  <BarChart
                    data={pipeline.map((p) => ({
                      name: formatStatus(String(p.status)),
                      count: p.count,
                      fill: PIPELINE_COLORS[p.status] || '#6e6e73',
                    }))}
                    layout="vertical"
                    margin={{ left: 0, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: '#86868b' }}
                      stroke="#e8e8ed"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12, fill: '#1d1d1f' }}
                      width={120}
                      stroke="transparent"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                      {pipeline.map((p, i) => (
                        <rect key={i} fill={PIPELINE_COLORS[p.status] || '#6e6e73'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-[#86868b]">
                  No pipeline data.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Stages */}
        <Card className="rounded-xl border-[#e8e8ed] bg-white/70 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#1d1d1f]">
              Payment Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {psLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : paymentStages && paymentStages.byStatus.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, paymentStages.byStatus.length * 44)}
              >
                <BarChart
                  data={paymentStages.byStatus.map((p) => ({
                    name: formatStatus(String(p.status)),
                    count: p.count,
                    fill: STAGE_COLORS[p.status] || '#6e6e73',
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#86868b' }}
                    stroke="#e8e8ed"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12, fill: '#1d1d1f' }}
                    width={110}
                    stroke="transparent"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                    {paymentStages.byStatus.map((p, i) => (
                      <rect key={i} fill={STAGE_COLORS[p.status] || '#6e6e73'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-[#86868b]">
                No payment data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Staff Workload — admin only ── */}
      {isAdmin && (
        <Card className="rounded-xl border-[#e8e8ed] bg-white/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-[#86868b]" />
            <CardTitle className="text-base font-semibold text-[#1d1d1f]">
              Staff Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wlLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : workload && workload.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[#e8e8ed]">
                    <TableHead className="text-[#6e6e73] text-xs uppercase tracking-wider font-medium">
                      Staff
                    </TableHead>
                    <TableHead className="text-[#6e6e73] text-xs uppercase tracking-wider font-medium text-right">
                      Active
                    </TableHead>
                    <TableHead className="text-[#6e6e73] text-xs uppercase tracking-wider font-medium text-right">
                      Completed
                    </TableHead>
                    <TableHead className="text-[#6e6e73] text-xs uppercase tracking-wider font-medium text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workload.map((w) => (
                    <TableRow
                      key={String(w.userId)}
                      className="hover:bg-[#f5f5f7] border-[#e8e8ed]/50"
                    >
                      <TableCell className="font-medium text-[#1d1d1f]">
                        {String(w.userName)}
                      </TableCell>
                      <TableCell className="text-right text-[#6e6e73]">
                        {String(w.activeProjects)}
                      </TableCell>
                      <TableCell className="text-right text-[#6e6e73]">
                        {String(w.completedProjects)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#1d1d1f]">
                        {Number(w.activeProjects) + Number(w.completedProjects)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-[#86868b]">
                No workload data.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
