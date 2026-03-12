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
import { useThemeStore } from '@/stores/theme.store';
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

const CHART_GRID = 'var(--color-border)';
const CHART_MUTED_TEXT = 'var(--text-metal-muted-color)';
const CHART_PRIMARY_TEXT = 'var(--color-card-foreground)';
const REVENUE_BAR_COLOR = '#89a9c1';

/* ── Pipeline bar color map ── */
const PIPELINE_COLORS: Record<string, string> = {
  approved: '#c7d3dd',
  in_progress: '#8fa3b7',
  blueprint_phase: '#4fb6f6',
  fabrication: '#f5b84a',
  installation: '#a78bfa',
  pending_payment: '#e39a2f',
  completed: '#38c993',
  cancelled: '#f07167',
};

/* ── Payment stage bar color map ── */
const STAGE_COLORS: Record<string, string> = {
  verified: '#38c993',
  pending: '#f5b84a',
  awaiting_proof: '#9aaabd',
  declined: '#f07167',
  overdue: '#e45151',
  refunded: '#ab8cff',
};

/* ── Custom tooltip ── */
function ChartTooltip({ active, payload, label, isCurrency, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={isDark ? 'metal-panel-strong rounded-lg px-3 py-2 text-slate-50 shadow-[0_18px_34px_rgba(18,22,27,0.18)]' : 'metal-panel rounded-lg px-3 py-2 text-[var(--color-card-foreground)] shadow-[0_12px_24px_rgba(18,22,27,0.08)]'}>
      <p className={isDark ? 'text-xs font-medium text-slate-300' : 'text-xs font-medium text-[var(--text-metal-muted-color)]'}>{label}</p>
      <p className={isDark ? 'text-sm font-semibold text-slate-50' : 'text-sm font-semibold text-[var(--color-card-foreground)]'}>
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
  isDark,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  isLoading?: boolean;
  isDark: boolean;
}) {
  if (isLoading) {
    return (
      <Card className={`${isDark ? 'metal-panel-strong' : 'metal-panel'} overflow-hidden rounded-[1.5rem]`}>
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
    <Card className={`${isDark ? 'metal-panel-strong' : 'metal-panel'} rounded-[1.5rem] border-[color:var(--color-border)]/60 transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_24px_38px_rgba(18,22,27,0.12)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_42px_rgba(0,0,0,0.3)]`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="silver-sheen flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_18px_30px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_34px_rgba(0,0,0,0.34)]">
            <Icon className="h-[1.35rem] w-[1.35rem] text-[#33414d] dark:text-[#33414d]" />
          </div>
        </div>
        <div className={`text-[1.75rem] leading-none sm:text-[2rem] font-semibold tracking-[-0.03em] ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
          {value}
        </div>
        <p className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
          {label}
        </p>
        {subtitle && (
          <p className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>{subtitle}</p>
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
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
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
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className={`${isDark ? 'metal-panel-strong' : 'metal-panel'} rounded-[1.75rem] p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="silver-sheen flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.15rem] shadow-[0_20px_34px_rgba(15,23,42,0.16)] dark:shadow-[0_20px_34px_rgba(0,0,0,0.34)]">
              <TrendingUp className="h-7 w-7 text-[#33414d] dark:text-[#33414d]" />
            </div>
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Analytics</p>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
              Reports
            </h1>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
              Track revenue, workload, project movement, and payment pressure from one place.
            </p>
            </div>
          </div>
          <div className={`metal-pill rounded-2xl px-3.5 py-2.5 text-xs font-medium ${isDark ? 'text-slate-200' : 'text-[var(--text-metal-color)]'}`}>
            Use the summary cards for fast scanning, then validate trends in the charts below.
          </div>
        </div>
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
          isDark={isDark}
        />
        <KpiCard
          label="Total Payments"
          value={revenue?.totalPayments ?? 0}
          icon={CreditCard}
          subtitle="Verified payments"
          isLoading={anyKpiLoading}
          isDark={isDark}
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrencyFull(paymentStages?.totalOutstanding ?? 0)}
          icon={AlertCircle}
          subtitle={`${paymentStages?.totalPlans ?? 0} payment plans`}
          isLoading={anyKpiLoading}
          isDark={isDark}
        />
        {isAdmin && (
          <>
            <KpiCard
              label="Conversion Rate"
              value={`${((conversion?.rate ?? 0) * 100).toFixed(1)}%`}
              icon={TrendingUp}
              subtitle={`${conversion?.convertedToProjects ?? 0} of ${conversion?.completed ?? 0} completed`}
              isLoading={anyKpiLoading}
              isDark={isDark}
            />
            <KpiCard
              label="Active Projects"
              value={dashboard?.activeProjects ?? 0}
              icon={FolderOpen}
              subtitle="In progress"
              isLoading={anyKpiLoading}
              isDark={isDark}
            />
          </>
        )}
      </div>

      {/* ── Appointment Funnel — admin only ── */}
      {isAdmin && (
        <Card className={`${isDark ? 'metal-panel-strong' : 'metal-panel'} rounded-[1.6rem] border-[color:var(--color-border)]/60`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-base font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
              Appointment Funnel
            </CardTitle>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
              Track appointment outcomes before they convert into project work.
            </p>
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
                      className="metal-panel flex items-center gap-3 rounded-[1rem] border-[color:var(--color-border)]/50 p-3"
                    >
                      <div className="silver-sheen flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                        <s.icon className="h-4 w-4 text-[#49535d] dark:text-[#49535d]" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-lg font-bold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
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
                <div className={`metal-panel flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[1rem] border-[color:var(--color-border)]/50 px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Office: <strong className={isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}>{conversion.byType.office}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Ocular: <strong className={isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}>{conversion.byType.ocular}</strong>
                  </span>
                  <span className={`ml-auto font-medium ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>
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
      <Card className={`${isDark ? 'metal-panel-strong' : 'metal-panel'} rounded-[1.6rem] border-[color:var(--color-border)]/60`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className={`text-base font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
              Revenue
            </CardTitle>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
              Review incoming verified payments by time range.
            </p>
          </div>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as GroupBy[]).map((g) => (
              <Button
                key={g}
                variant={revenueGroupBy === g ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueGroupBy(g)}
                className={`capitalize rounded-xl border text-xs h-9 px-4 ${
                  revenueGroupBy === g
                    ? 'border-white/55 bg-[linear-gradient(180deg,rgba(248,250,252,0.99)_0%,rgba(224,232,240,0.97)_100%)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_16px_28px_rgba(0,0,0,0.22)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(232,238,244,1)_100%)] dark:border-white/55 dark:bg-[linear-gradient(180deg,rgba(248,250,252,0.99)_0%,rgba(224,232,240,0.97)_100%)] dark:text-slate-950 dark:hover:bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(232,238,244,1)_100%)]'
                    : isDark
                      ? 'border-[color:var(--color-border)]/60 bg-slate-900/65 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_20px_rgba(0,0,0,0.14)] hover:bg-slate-800/80 hover:text-white dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800/90'
                      : 'border-[color:var(--color-border)]/70 bg-white/82 text-[var(--text-metal-color)] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_20px_rgba(18,22,27,0.08)] hover:bg-white hover:text-[var(--color-card-foreground)]'
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
            <div className={`rounded-[1.35rem] border border-[color:var(--color-border)]/55 p-3 ${isDark ? 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),rgba(2,6,23,0.94)_62%)]' : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.74),rgba(238,242,247,0.96)_68%)]'}`}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenue.items}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }}
                    stroke={CHART_GRID}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }}
                    stroke={CHART_GRID}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip cursor={false} content={<ChartTooltip isCurrency isDark={isDark} />} />
                  <Bar dataKey="total" fill={REVENUE_BAR_COLOR} activeBar={false} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#86868b]">
              No revenue data available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Pipeline + Payment Stages ── */}
      <div className={`grid gap-5 ${isAdmin ? 'lg:grid-cols-2' : ''}`}>
        {/* Project Pipeline — admin only */}
        {isAdmin && (
          <Card className="metal-panel-strong rounded-[1.6rem] border-[color:var(--color-border)]/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[var(--color-card-foreground)]">
                Project Pipeline
              </CardTitle>
              <p className="text-sm text-slate-300">
                See where active projects are stacking up across production stages.
              </p>
            </CardHeader>
            <CardContent>
              {pipeLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : pipeline && pipeline.length > 0 ? (
                <div className="rounded-[1.35rem] border border-[color:var(--color-border)]/55 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),rgba(2,6,23,0.94)_62%)] p-3">
                  <ResponsiveContainer width="100%" height={Math.max(200, pipeline.length * 44)}>
                    <BarChart
                      data={pipeline.map((p) => ({
                        name: formatStatus(String(p.status)),
                        count: p.count,
                        fill: PIPELINE_COLORS[p.status] || '#8fa3b7',
                      }))}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }}
                        stroke={CHART_GRID}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12, fill: CHART_PRIMARY_TEXT }}
                        width={120}
                        stroke="transparent"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip cursor={false} content={<ChartTooltip />} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24} activeBar={false}>
                        {pipeline.map((p, i) => (
                          <rect key={i} fill={PIPELINE_COLORS[p.status] || '#8fa3b7'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-[#86868b]">
                  No pipeline data.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Stages */}
        <Card className="metal-panel-strong rounded-[1.6rem] border-[color:var(--color-border)]/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[var(--color-card-foreground)]">
              Payment Stages
            </CardTitle>
            <p className="text-sm text-slate-300">
              Surface pending proof, overdue balances, and verification pressure.
            </p>
          </CardHeader>
          <CardContent>
            {psLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : paymentStages && paymentStages.byStatus.length > 0 ? (
              <div className="rounded-[1.35rem] border border-[color:var(--color-border)]/55 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),rgba(2,6,23,0.94)_62%)] p-3">
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(200, paymentStages.byStatus.length * 44)}
                >
                  <BarChart
                    data={paymentStages.byStatus.map((p) => ({
                      name: formatStatus(String(p.status)),
                      count: p.count,
                      fill: STAGE_COLORS[p.status] || '#9aaabd',
                    }))}
                    layout="vertical"
                    margin={{ left: 0, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }}
                      stroke={CHART_GRID}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12, fill: CHART_PRIMARY_TEXT }}
                      width={110}
                      stroke="transparent"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip cursor={false} content={<ChartTooltip />} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24} activeBar={false}>
                      {paymentStages.byStatus.map((p, i) => (
                        <rect key={i} fill={STAGE_COLORS[p.status] || '#9aaabd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
        <Card className="metal-panel-strong rounded-[1.6rem] border-[color:var(--color-border)]/60">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-metal-muted-color)]" />
            <div>
              <CardTitle className="text-base font-semibold text-[var(--color-card-foreground)]">
                Staff Workload
              </CardTitle>
              <p className="mt-1 text-sm text-slate-300">
                Compare active and completed project assignments by staff member.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {wlLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : workload && workload.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[color:var(--color-border)]">
                    <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium">
                      Staff
                    </TableHead>
                    <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium text-right">
                      Active
                    </TableHead>
                    <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium text-right">
                      Completed
                    </TableHead>
                    <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workload.map((w) => (
                    <TableRow
                      key={String(w.userId)}
                      className="border-[color:var(--color-border)]/50 hover:bg-[color:var(--color-muted)]/70"
                    >
                      <TableCell className="font-medium text-[var(--color-card-foreground)]">
                        {String(w.userName)}
                      </TableCell>
                      <TableCell className="text-right text-[var(--text-metal-color)]">
                        {String(w.activeProjects)}
                      </TableCell>
                      <TableCell className="text-right text-[var(--text-metal-color)]">
                        {String(w.completedProjects)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[var(--color-card-foreground)]">
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
