import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  FolderOpen,
  CalendarCheck,
  XCircle,
  Building2,
  MapPin,
  Users,
  Download,
  ShieldCheck,
  RefreshCw,
  Coins,
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
import { VisitReportsListPage } from '../visit-reports/VisitReportsListPage';
import {
  useRevenueReport,
  useProjectPipelineReport,
  usePaymentStageReport,
  useWorkloadReport,
  useConversionReport,
  useDashboardSummary,
  useAcknowledgeLifecycleMismatchHotspot,
  useLifecycleMismatchHotspots,
} from '@/hooks/useReports';
import { useConfigs, useUpdateConfig } from '@/hooks/useConfig';
import {
  buildLifecycleHealthSnapshot,
  buildLifecycleRangeParams,
  deriveLifecycleAlert,
  getLifecycleHelpPath,
  getLifecycleSeverityThreshold,
  toIsoDate,
  type LifecycleRange,
} from '@/lib/reports-lifecycle';
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

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLastUpdated = (value?: number) => {
  if (!value) return 'Not yet refreshed';
  return new Date(value).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

type GroupBy = 'day' | 'week' | 'month';

const escapeCsv = (value: unknown) => {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
};

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
        <div className="mb-3 flex items-start justify-between">
          <div className="silver-sheen flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_18px_30px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_34px_rgba(0,0,0,0.34)]">
            <Icon className="h-[1.35rem] w-[1.35rem] text-[#33414d] dark:text-[#33414d]" />
          </div>
        </div>
        <div className={`min-w-0 break-words text-[clamp(1.35rem,1.9vw,1.9rem)] font-semibold leading-tight tracking-[-0.04em] ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
          {value}
        </div>
        <p className={`mt-2 break-words text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
          {label}
        </p>
        {subtitle && (
          <p className={`mt-1 break-words text-[11px] ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>{subtitle}</p>
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
  const sectionDescriptionClass = isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]';
  const chartSurfaceClass = isDark
    ? 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),rgba(2,6,23,0.94)_62%)]'
    : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.74),rgba(238,242,247,0.96)_68%)]';
  const isAdmin = user?.roles?.includes(Role.ADMIN);
  const isCashier = user?.roles?.includes(Role.CASHIER);
  const canAccessCashierReports = user?.roles?.some((role) => [Role.CASHIER, Role.ADMIN].includes(role));
  const [revenueGroupBy, setRevenueGroupBy] = useState<GroupBy>('month');
  const [lifecycleRange, setLifecycleRange] = useState<LifecycleRange>('7d');
  const [activeTab, setActiveTab] = useState<'analytics' | 'visit_reports'>('analytics');

  const lifecycleParams = useMemo(
    () => buildLifecycleRangeParams(lifecycleRange),
    [lifecycleRange],
  );

  const { data: revenue, isLoading: revLoading } = useRevenueReport({
    groupBy: revenueGroupBy,
  }, !!canAccessCashierReports);
  const { data: pipeline, isLoading: pipeLoading } = useProjectPipelineReport(!!isAdmin);
  const { data: paymentStages, isLoading: psLoading } = usePaymentStageReport(!!canAccessCashierReports);
  const { data: workload, isLoading: wlLoading } = useWorkloadReport(!!isAdmin);
  const { data: conversion, isLoading: convLoading } = useConversionReport(!!isAdmin);
  const { data: dashboard, isLoading: dashLoading } = useDashboardSummary(!!canAccessCashierReports);
  const { data: configs } = useConfigs();
  const lifecycleFeatureEnabled = (() => {
    const feature = configs?.find((cfg) => cfg.key === 'feature_lifecycle_mismatch_analytics');
    return typeof feature?.value === 'boolean' ? feature.value : true;
  })();
  const updateConfig = useUpdateConfig();
  const {
    data: lifecycleHotspots,
    isLoading: lifecycleLoading,
    isFetching: lifecycleFetching,
    refetch: refetchLifecycleHotspots,
    dataUpdatedAt: lifecycleUpdatedAt,
  } = useLifecycleMismatchHotspots(
    lifecycleParams,
    !!isAdmin && lifecycleFeatureEnabled,
  );
  const acknowledgeHotspot = useAcknowledgeLifecycleMismatchHotspot();
  const lifecycleSeverityThreshold = getLifecycleSeverityThreshold(lifecycleRange);
  const criticalHotspotCount = (lifecycleHotspots?.items || []).filter((item) => item.count >= lifecycleSeverityThreshold).length;
  const lifecycleRefreshRatioPct = lifecycleHotspots?.total
    ? Math.round((lifecycleHotspots.refreshRequiredTotal / lifecycleHotspots.total) * 100)
    : 0;
  const lifecycleTopModule = lifecycleHotspots?.byTargetType?.[0]
    ? formatStatus(String(lifecycleHotspots.byTargetType[0].targetType || 'unknown'))
    : 'None';
  const lifecycleEscalationSummary = lifecycleHotspots?.escalationSummary;
  const lifecycleAlert = deriveLifecycleAlert({
    range: lifecycleRange,
    total: lifecycleHotspots?.total ?? 0,
    refreshRequiredTotal: lifecycleHotspots?.refreshRequiredTotal ?? 0,
    criticalHotspotCount,
    trendDelta: lifecycleHotspots?.trend?.trendDelta,
    trendPercent: lifecycleHotspots?.trend?.trendPercent,
  });
  const lifecycleHealthSnapshot = useMemo(
    () =>
      buildLifecycleHealthSnapshot(lifecycleAlert, {
        total: lifecycleHotspots?.total ?? 0,
        refreshRequiredTotal: lifecycleHotspots?.refreshRequiredTotal ?? 0,
        criticalHotspotCount,
      }),
    [criticalHotspotCount, lifecycleAlert, lifecycleHotspots?.refreshRequiredTotal, lifecycleHotspots?.total],
  );

  const handleExportLifecycleCsv = () => {
    if (!lifecycleHotspots?.items?.length) return;

    const header = ['Module', 'Current Status', 'Attempted Status', 'Refresh Required', 'Hits', 'Last Seen'];
    const rows = lifecycleHotspots.items.map((item) => [
      formatStatus(String(item.targetType || 'unknown')),
      formatStatus(String(item.currentStatus || 'unknown')),
      formatStatus(String(item.attemptedStatus || 'unknown')),
      item.refreshRequired ? 'yes' : 'no',
      item.count,
      formatDateTime(item.lastSeenAt),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lifecycle-mismatch-hotspots-${toIsoDate(new Date())}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleToggleHotspotAcknowledged = async (item: {
    targetType?: string;
    currentStatus?: string;
    attemptedStatus?: string;
    refreshRequired?: boolean;
    isAcknowledged?: boolean;
  }) => {
    await acknowledgeHotspot.mutateAsync({
      targetType: item.targetType,
      currentStatus: item.currentStatus,
      attemptedStatus: item.attemptedStatus,
      refreshRequired: item.refreshRequired,
      acknowledged: item.isAcknowledged ? false : true,
    });
  };

  const anyKpiLoading = revLoading || psLoading || dashLoading || (isAdmin ? convLoading : false);

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 border-b border-[color:var(--color-border)]/60 mb-2 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
            activeTab === 'analytics'
              ? 'text-[var(--color-card-foreground)] border-b-2 border-cyan-500 bg-[color:var(--color-muted)]/40'
              : 'text-[var(--text-metal-color)] hover:text-[var(--color-card-foreground)] hover:bg-[color:var(--color-muted)]/20'
          }`}
        >
          Analytics Dashboard
        </button>
        {!isCashier && (
          <button
            onClick={() => setActiveTab('visit_reports')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
              activeTab === 'visit_reports'
                ? 'text-[var(--color-card-foreground)] border-b-2 border-cyan-500 bg-[color:var(--color-muted)]/40'
                : 'text-[var(--text-metal-color)] hover:text-[var(--color-card-foreground)] hover:bg-[color:var(--color-muted)]/20'
            }`}
          >
            Visit Reports
          </button>
        )}
      </div>

      {activeTab === 'analytics' && (
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

      {isAdmin && lifecycleFeatureEnabled && (lifecycleHotspots?.total ?? 0) > 0 && (
        <Card className={`${isDark ? 'metal-panel-strong' : 'metal-panel'} rounded-[1.35rem] border-[color:var(--color-border)]/60`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`h-4 w-4 ${isDark ? 'text-slate-300' : 'text-[#4a5663]'}`} />
                  <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                    Lifecycle Health Snapshot
                  </p>
                  <Badge
                    variant={
                      lifecycleAlert.level === 'critical'
                        ? 'destructive'
                        : lifecycleAlert.level === 'warning'
                          ? 'warning'
                          : 'default'
                    }
                    className={
                      lifecycleHealthSnapshot.statusLabel.toLowerCase() === 'healthy' && isDark
                        ? 'border-emerald-300/45 bg-[linear-gradient(180deg,rgba(74,163,124,0.58)_0%,rgba(39,102,74,0.72)_100%)] text-emerald-50'
                        : undefined
                    }
                  >
                    {lifecycleHealthSnapshot.statusLabel}
                  </Badge>
                </div>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>
                  {lifecycleHealthSnapshot.headline}
                </p>
                <div className={`mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                  <span>Total mismatches: <strong>{lifecycleHotspots?.total ?? 0}</strong></span>
                  <span>Refresh required: <strong>{lifecycleRefreshRatioPct}%</strong></span>
                  <span>Top module: <strong>{lifecycleTopModule}</strong></span>
                  {lifecycleEscalationSummary && (
                    <>
                      <span>Owner: <strong>{lifecycleEscalationSummary.ownerRole}</strong></span>
                      <span>SLA target: <strong>{lifecycleEscalationSummary.slaHours}h</strong></span>
                    </>
                  )}
                </div>
                <p className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                  Last updated {formatLastUpdated(lifecycleUpdatedAt)}. Auto-refresh runs every 60 seconds while this tab is active.
                </p>
              </div>

              <div className={`w-full rounded-2xl border px-4 py-4 lg:w-[17rem] ${isDark ? 'border-slate-700/70 bg-slate-900/55' : 'border-[color:var(--color-border)]/65 bg-white/80'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`}>
                  Quick Actions
                </p>
                <div className="mt-3 grid gap-2">
                  <Button
                    asChild
                    size="sm"
                    className={`h-9 w-full rounded-lg px-4 text-xs uppercase tracking-[0.08em] ${
                      isDark
                        ? 'border-sky-400/45 bg-[linear-gradient(180deg,rgba(44,115,179,0.45)_0%,rgba(25,67,112,0.55)_100%)] text-sky-100 shadow-[inset_0_1px_0_rgba(186,230,253,0.22),0_10px_20px_rgba(2,8,23,0.28)] hover:bg-[linear-gradient(180deg,rgba(54,128,196,0.48)_0%,rgba(30,79,129,0.58)_100%)]'
                        : ''
                    }`}
                  >
                    <Link to={lifecycleHealthSnapshot.primaryActionPath}>{lifecycleHealthSnapshot.primaryActionLabel}</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refetchLifecycleHotspots()}
                    disabled={lifecycleFetching}
                    className={`h-9 w-full rounded-lg px-4 text-xs uppercase tracking-[0.08em] ${
                      isDark
                        ? 'border-slate-600/80 bg-slate-900/75 text-slate-100 hover:bg-slate-800/90'
                        : 'border-[color:var(--color-border)]/70 bg-white/90 text-[var(--color-card-foreground)] hover:bg-white'
                    }`}
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${lifecycleFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className={`h-9 w-full rounded-lg px-4 text-xs uppercase tracking-[0.08em] ${
                      isDark
                        ? 'border-slate-600/80 bg-slate-900/75 text-slate-100 hover:bg-slate-800/90'
                        : 'border-[color:var(--color-border)]/70 bg-white/90 text-[var(--color-card-foreground)] hover:bg-white'
                    }`}
                  >
                    <a href="#lifecycle-hotspots">View Transition Details</a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards ── */}
      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
          isAdmin ? 'lg:grid-cols-3 2xl:grid-cols-5' : 'lg:grid-cols-3'
        }`}
      >
        <KpiCard
          label="Monthly Revenue"
          value={formatCurrencyFull(dashboard?.revenueThisMonth ?? 0)}
          icon={Coins}
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
              Track appointment outcomes before they convert into project work. Click a stat to view those appointments.
            </p>
          </CardHeader>
          <CardContent>
            {convLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : conversion ? (
              <div className="space-y-4">
                {/* Stat row */}
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Total',
                      value: conversion.totalAppointments,
                      icon: CalendarCheck,
                      badge: 'default' as const,
                      filterPath: '/appointments',
                    },
                    {
                      label: 'Completed',
                      value: conversion.completed,
                      icon: CalendarCheck,
                      badge: 'success' as const,
                      filterPath: '/appointments?status=completed',
                    },
                    {
                      label: 'Cancelled',
                      value: conversion.cancelled,
                      icon: XCircle,
                      badge: 'destructive' as const,
                      filterPath: '/appointments?status=cancelled',
                    },
                  ].map((s) => (
                    <Link
                      key={s.label}
                      to={s.filterPath}
                      className="group/stat metal-panel flex items-center gap-3 rounded-[1rem] border-[color:var(--color-border)]/50 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      <div className="silver-sheen flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                        <s.icon className="h-4 w-4 text-[#49535d] dark:text-[#49535d]" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-lg font-bold transition-colors ${isDark ? 'text-slate-50 group-hover/stat:text-cyan-400' : 'text-[var(--color-card-foreground)] group-hover/stat:text-cyan-600'}`}>
                          {s.value}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={s.badge}
                            className={`text-[10px] px-1.5 py-0 ${
                              s.badge === 'default' && isDark
                                ? 'border-slate-500 bg-slate-800 text-slate-100 shadow-none'
                                : ''
                            }`}
                          >
                            {s.label}
                          </Badge>
                        </div>
                      </div>
                    </Link>
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
          ) : revenue && revenue.items.length > 0 && revenue.items.some((item: any) => item.total > 0) ? (
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
              <p className={`text-sm ${sectionDescriptionClass}`}>
                See where active projects are stacking up across production stages.
              </p>
            </CardHeader>
            <CardContent>
              {pipeLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : pipeline && pipeline.length > 0 ? (
                <div className={`rounded-[1.35rem] border border-[color:var(--color-border)]/55 p-3 ${chartSurfaceClass}`}>
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
                          <Cell key={i} fill={PIPELINE_COLORS[p.status] || '#8fa3b7'} />
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
            <p className={`text-sm ${sectionDescriptionClass}`}>
              Surface pending proof, overdue balances, and verification pressure.
            </p>
          </CardHeader>
          <CardContent>
            {psLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : paymentStages && paymentStages.byStatus.length > 0 ? (
              <div className={`rounded-[1.35rem] border border-[color:var(--color-border)]/55 p-3 ${chartSurfaceClass}`}>
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
                        <Cell key={i} fill={STAGE_COLORS[p.status] || '#9aaabd'} />
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
      {isAdmin && lifecycleFeatureEnabled && (
        <Card className="metal-panel-strong rounded-[1.6rem] border-[color:var(--color-border)]/60">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-metal-muted-color)]" />
            <div>
              <CardTitle className="text-base font-semibold text-[var(--color-card-foreground)]">
                Staff Workload
              </CardTitle>
              <p className={`mt-1 text-sm ${sectionDescriptionClass}`}>
                Compare active and completed project assignments by staff member.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {wlLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : workload && workload.length > 0 && workload.some((w: any) => Number(w.activeProjects) > 0 || Number(w.completedProjects) > 0) ? (
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

      {/* ── Lifecycle Mismatch Hotspots — admin only ── */}
      {isAdmin && lifecycleFeatureEnabled && (
        <Card id="lifecycle-hotspots" className="metal-panel-strong rounded-[1.6rem] border-[color:var(--color-border)]/60">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-[var(--color-card-foreground)]">
                  Lifecycle Mismatch Hotspots
                </CardTitle>
                <p className={`mt-1 text-sm ${sectionDescriptionClass}`}>
                  Top blocked transitions grouped by module and attempted status change.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['24h', '7d', '30d', 'all'] as LifecycleRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={lifecycleRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLifecycleRange(range)}
                    className={`rounded-xl h-8 px-3 text-[11px] uppercase tracking-[0.08em] ${
                      lifecycleRange === range
                        ? isDark
                          ? 'border-sky-400/45 bg-[linear-gradient(180deg,rgba(44,115,179,0.45)_0%,rgba(25,67,112,0.55)_100%)] text-sky-100 shadow-[inset_0_1px_0_rgba(186,230,253,0.22),0_12px_22px_rgba(2,8,23,0.32)] hover:bg-[linear-gradient(180deg,rgba(54,128,196,0.48)_0%,rgba(30,79,129,0.58)_100%)]'
                          : 'border-white/55 bg-[linear-gradient(180deg,rgba(248,250,252,0.99)_0%,rgba(224,232,240,0.97)_100%)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_12px_22px_rgba(0,0,0,0.18)]'
                        : isDark
                          ? 'border-slate-600/80 bg-slate-900/70 text-slate-200 hover:bg-slate-800/90 hover:text-slate-100'
                          : 'border-[color:var(--color-border)]/70 bg-white/82 text-[var(--text-metal-color)] hover:bg-white'
                    }`}
                  >
                    {range}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportLifecycleCsv}
                  disabled={!lifecycleHotspots?.items?.length}
                  className={`rounded-xl h-8 px-3 text-[11px] uppercase tracking-[0.08em] ${
                    isDark
                      ? 'border-slate-600/80 bg-slate-900/75 text-slate-100 hover:bg-slate-800/90 disabled:border-slate-700/60 disabled:text-slate-500'
                      : 'border-[color:var(--color-border)]/70 bg-white/90 text-[var(--color-card-foreground)] hover:bg-white'
                  }`}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateConfig.mutate({ key: 'feature_lifecycle_mismatch_analytics', value: false })}
                  disabled={updateConfig.isPending}
                  className={`rounded-xl h-8 px-3 text-[11px] uppercase tracking-[0.08em] ${
                    isDark
                      ? 'border-slate-600/80 bg-slate-900/75 text-slate-100 hover:bg-slate-800/90'
                      : 'border-[color:var(--color-border)]/70 bg-white/90 text-[var(--color-card-foreground)] hover:bg-white'
                  }`}
                >
                  Disable
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {lifecycleLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : lifecycleHotspots?.items?.length ? (
              <>
                <p className="mb-2 text-xs text-[var(--text-metal-color)]">
                  Showing {lifecycleHotspots.items.length} grouped hotspots from {lifecycleHotspots.total} lifecycle mismatch events.
                </p>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">
                    Refresh required: {lifecycleHotspots.refreshRequiredTotal}/{lifecycleHotspots.total || 0}
                  </Badge>
                  <Badge variant="outline">
                    Unacknowledged: {lifecycleHotspots.unacknowledgedCount ?? 0}
                  </Badge>
                  <Badge variant="outline">
                    Acknowledged: {lifecycleHotspots.acknowledgedCount ?? 0}
                  </Badge>
                  {lifecycleHotspots.byTargetType?.[0] && (
                    <Badge variant="outline">
                      Top module: {formatStatus(String(lifecycleHotspots.byTargetType[0].targetType || 'unknown'))} ({lifecycleHotspots.byTargetType[0].count})
                    </Badge>
                  )}
                  {lifecycleHotspots.trend?.trendPercent != null && (
                    <Badge variant={lifecycleHotspots.trend.trendDelta && lifecycleHotspots.trend.trendDelta > 0 ? 'warning' : 'default'}>
                      Trend: {lifecycleHotspots.trend.trendDelta && lifecycleHotspots.trend.trendDelta > 0 ? '+' : ''}{lifecycleHotspots.trend.trendDelta ?? 0}
                      {' ('}{lifecycleHotspots.trend.trendPercent}%{')'} vs previous window
                    </Badge>
                  )}
                </div>
                <div className="mb-3 flex items-center gap-2 text-xs">
                  <Badge
                    variant={
                      lifecycleAlert.level === 'critical'
                        ? 'destructive'
                        : lifecycleAlert.level === 'warning'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {lifecycleAlert.level === 'critical'
                      ? 'Critical'
                      : lifecycleAlert.level === 'warning'
                        ? 'Watch'
                        : 'Stable'}
                  </Badge>
                  <span className="text-[var(--text-metal-color)]">{lifecycleAlert.message}</span>
                </div>
                <div className={`mb-4 rounded-2xl border p-3.5 ${isDark ? 'border-slate-700/80 bg-slate-900/75' : 'border-[color:var(--color-border)]/70 bg-white/90'}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`h-4 w-4 ${isDark ? 'text-slate-300' : 'text-[#4a5663]'}`} />
                        <Badge
                          variant={
                            lifecycleAlert.level === 'critical'
                              ? 'destructive'
                              : lifecycleAlert.level === 'warning'
                                ? 'warning'
                                : 'default'
                          }
                          className={
                            lifecycleHealthSnapshot.statusLabel.toLowerCase() === 'healthy' && isDark
                              ? 'border-emerald-300/45 bg-[linear-gradient(180deg,rgba(74,163,124,0.58)_0%,rgba(39,102,74,0.72)_100%)] text-emerald-50'
                              : undefined
                          }
                        >
                          {lifecycleHealthSnapshot.statusLabel}
                        </Badge>
                      </div>
                      <p className={`mt-2 text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>
                        {lifecycleHealthSnapshot.headline}
                      </p>
                      <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}`}>
                        Use this as your first-pass triage summary before reviewing individual transitions.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button asChild size="sm" className="h-8 rounded-lg text-[11px] uppercase tracking-[0.08em]">
                        <Link to={lifecycleHealthSnapshot.primaryActionPath}>{lifecycleHealthSnapshot.primaryActionLabel}</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-[11px] uppercase tracking-[0.08em]">
                        <Link to="/settings">Toggle Feature</Link>
                      </Button>
                    </div>
                  </div>
                </div>
                {criticalHotspotCount > 0 && (
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <Badge variant="warning">Attention</Badge>
                    <span className="text-[var(--text-metal-color)]">
                      {criticalHotspotCount} hotspot{criticalHotspotCount > 1 ? 's' : ''} exceeded the {lifecycleSeverityThreshold} hit threshold for the selected range.
                    </span>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-[color:var(--color-border)]">
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium">
                        Module
                      </TableHead>
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium">
                        Transition
                      </TableHead>
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium text-right">
                        Hits
                      </TableHead>
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium">
                        Ack
                      </TableHead>
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium">
                        Severity
                      </TableHead>
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium">
                        Refresh
                      </TableHead>
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium">
                        Last Seen
                      </TableHead>
                      <TableHead className="text-[var(--text-metal-color)] text-xs uppercase tracking-wider font-medium text-right">
                        Guidance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lifecycleHotspots.items.map((item, index) => (
                      (() => {
                        const isCritical = item.count >= lifecycleSeverityThreshold;
                        return (
                      <TableRow
                        key={`${item.targetType || 'unknown'}:${item.currentStatus || 'unknown'}:${item.attemptedStatus || 'unknown'}:${index}`}
                        className="border-[color:var(--color-border)]/50 hover:bg-[color:var(--color-muted)]/70"
                      >
                        <TableCell className="font-medium text-[var(--color-card-foreground)]">
                          {formatStatus(String(item.targetType || 'unknown'))}
                        </TableCell>
                        <TableCell className="text-[var(--text-metal-color)]">
                          {formatStatus(String(item.currentStatus || 'unknown'))}
                          {' -> '}
                          {formatStatus(String(item.attemptedStatus || 'unknown'))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[var(--color-card-foreground)]">
                          {item.count}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isAcknowledged ? 'secondary' : 'warning'}>
                            {item.isAcknowledged ? 'Acknowledged' : 'Unacknowledged'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isCritical ? 'destructive' : 'default'}>
                            {isCritical ? 'High' : 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.refreshRequired ? 'warning' : 'default'}>
                            {item.refreshRequired ? 'Required' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[var(--text-metal-color)]">
                          {formatDateTime(item.lastSeenAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-lg text-[10px] uppercase tracking-[0.08em]"
                              onClick={() => void handleToggleHotspotAcknowledged(item)}
                              disabled={acknowledgeHotspot.isPending}
                            >
                              {item.isAcknowledged ? 'Clear Ack' : 'Acknowledge'}
                            </Button>
                            <Button asChild variant="outline" size="sm" className="h-7 rounded-lg text-[10px] uppercase tracking-[0.08em]">
                              <Link to={getLifecycleHelpPath(item.targetType, item.currentStatus, item.attemptedStatus)}>Open Help</Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                        );
                      })()
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-[#86868b]">
                No lifecycle mismatch hotspots yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && !lifecycleFeatureEnabled && (
        <Card className="metal-panel rounded-[1.6rem] border-[color:var(--color-border)]/60">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
            <ShieldCheck className={`h-8 w-8 ${isDark ? 'text-slate-500' : 'text-[#9ca6b1]'}`} />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
              Lifecycle mismatch analytics is currently disabled.
            </p>
            <Button
              size="sm"
              className={`h-9 rounded-xl px-5 text-xs uppercase tracking-[0.08em] ${
                isDark
                  ? 'border-sky-400/45 bg-[linear-gradient(180deg,rgba(44,115,179,0.45)_0%,rgba(25,67,112,0.55)_100%)] text-sky-100 shadow-[inset_0_1px_0_rgba(186,230,253,0.22),0_12px_22px_rgba(2,8,23,0.32)] hover:bg-[linear-gradient(180deg,rgba(54,128,196,0.48)_0%,rgba(30,79,129,0.58)_100%)]'
                  : 'border-white/55 bg-[linear-gradient(180deg,rgba(248,250,252,0.99)_0%,rgba(224,232,240,0.97)_100%)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_12px_22px_rgba(0,0,0,0.18)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(232,238,244,1)_100%)]'
              }`}
              disabled={updateConfig.isPending}
              onClick={() => updateConfig.mutate({ key: 'feature_lifecycle_mismatch_analytics', value: true })}
            >
              Enable Lifecycle Analytics
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
      )}

      {!isCashier && activeTab === 'visit_reports' && (
        <VisitReportsListPage isEmbedded />
      )}
    </div>
  );
}
