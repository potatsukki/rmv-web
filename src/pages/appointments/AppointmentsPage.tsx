import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Calendar, FileText, ChevronRight, MapPin, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAppointmentQueue, useAppointments } from '@/hooks/useAppointments';
import type { Appointment } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { Role, AppointmentStatus, APPOINTMENT_TYPE_LABELS } from '@/lib/constants';
import { VisitReportsListPage } from '@/pages/visit-reports/VisitReportsListPage';
import { resolveAppointmentWorkflowStatus } from '@/lib/workflow-status';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  {
    label: 'Needs Action',
    value: [
      AppointmentStatus.REQUESTED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.RESCHEDULE_REQUESTED,
      AppointmentStatus.READY_FOR_OCULAR,
    ].join(','),
  },
  { label: 'Completed', value: AppointmentStatus.COMPLETED },
  { label: 'Cancelled', value: AppointmentStatus.CANCELLED },
];

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  requested: {
    label: 'Requested',
    dot: 'bg-[#a97d49]',
    badge: 'border-[#c7aa7a] text-[#7e6239] bg-[linear-gradient(180deg,#f8f0e5_0%,#ebdcc6_100%)]',
  },
  confirmed: {
    label: 'Confirmed',
    dot: 'bg-[#708ca6]',
    badge: 'border-[#8da4b8] text-[#4f6679] bg-[linear-gradient(180deg,#eef4f9_0%,#d8e4ee_100%)]',
  },
  [AppointmentStatus.READY_FOR_OCULAR]: {
    label: 'Ready for Ocular',
    dot: 'bg-[#0f766e]',
    badge: 'border-[#14b8a6] text-[#0f766e] bg-[linear-gradient(180deg,#f0fdfa_0%,#ccfbf1_100%)]',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-[#6c8f7d]',
    badge: 'border-[#93ad9d] text-[#4e6c5a] bg-[linear-gradient(180deg,#eef6f1_0%,#dceade_100%)]',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-[#b96c66]',
    badge: 'border-[#cb8b86] text-[#87544f] bg-[linear-gradient(180deg,#fbefed_0%,#efd7d4_100%)]',
  },
  no_show: {
    label: 'No Show',
    dot: 'bg-[#9ca6b1]',
    badge: 'border-[#c6ccd3] text-[#5b6470] bg-[linear-gradient(180deg,#eef2f5_0%,#dde3e8_100%)]',
  },
  reschedule_requested: {
    label: 'Reschedule',
    dot: 'bg-[#8277a3]',
    badge: 'border-[#afa7c5] text-[#665d82] bg-[linear-gradient(180deg,#f2f1f8_0%,#e0dced_100%)]',
  },
  awaiting_payment: {
    label: 'Awaiting Payment',
    dot: 'bg-[#aa7f53]',
    badge: 'border-[#c4a07d] text-[#7b5d3f] bg-[linear-gradient(180deg,#f8f1e9_0%,#ecdcc8_100%)]',
  },
};

const workflowDotClass: Record<string, string> = {
  gray: 'bg-[#9ca6b1]',
  blue: 'bg-[#708ca6]',
  green: 'bg-[#6c8f7d]',
  yellow: 'bg-[#a97d49]',
  red: 'bg-[#b96c66]',
  purple: 'bg-[#8277a3]',
  orange: 'bg-[#aa7f53]',
  indigo: 'bg-[#5b6785]',
  cyan: 'bg-[#4f6d78]',
};

function compareAppointmentAscending(a: Appointment, b: Appointment) {
  const aDate = a.date || '';
  const bDate = b.date || '';
  if (aDate !== bDate) return aDate < bDate ? -1 : 1;

  const aSlot = a.slotCode || '';
  const bSlot = b.slotCode || '';
  if (aSlot !== bSlot) return aSlot < bSlot ? -1 : 1;

  return String(a._id).localeCompare(String(b._id));
}

function compareAppointmentDescending(a: Appointment, b: Appointment) {
  const aDate = a.date || '';
  const bDate = b.date || '';
  if (aDate !== bDate) return aDate < bDate ? 1 : -1;

  const aSlot = a.slotCode || '';
  const bSlot = b.slotCode || '';
  if (aSlot !== bSlot) return aSlot < bSlot ? 1 : -1;

  return String(b._id).localeCompare(String(a._id));
}

function appointmentActivityTime(appt: Appointment) {
  const updatedAt = appt.updatedAt ? new Date(appt.updatedAt).getTime() : 0;
  if (!Number.isNaN(updatedAt) && updatedAt > 0) return updatedAt;

  const createdAt = appt.createdAt ? new Date(appt.createdAt).getTime() : 0;
  return Number.isNaN(createdAt) ? 0 : createdAt;
}

function compareAppointmentLatestActivity(a: Appointment, b: Appointment) {
  const aTime = appointmentActivityTime(a);
  const bTime = appointmentActivityTime(b);
  if (aTime !== bTime) return bTime - aTime;

  return compareAppointmentAscending(a, b);
}

function getOcularDuplicateKey(appt: Appointment) {
  const services = (appt.serviceTypes || [])
    .map((service) => service.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
  const address = (
    appt.formattedAddress
    || appt.address
    || appt.customerAddress
    || [
      appt.addressStructured?.street,
      appt.addressStructured?.barangay,
      appt.addressStructured?.city,
      appt.addressStructured?.province,
      appt.addressStructured?.zip,
    ].filter(Boolean).join(', ')
  ).trim().toLowerCase();
  const location = appt.customerLocation
    ? `${appt.customerLocation.lat.toFixed(4)},${appt.customerLocation.lng.toFixed(4)}`
    : '';

  return `${services || 'unspecified'}::${address || location || 'no-location'}`;
}

function dedupeCustomerOcularFollowUps(appointments: Appointment[]) {
  const preferredByKey = new Map<string, Appointment>();
  const duplicateIds = new Set<string>();

  appointments.forEach((appt) => {
    const isUnpaidActiveOcular =
      appt.type === 'ocular'
      && !appt.ocularFeePaid
      && ['pending', 'cash_pending', 'proof_submitted'].includes(String(appt.ocularFeeStatus || ''))
      && !['completed', 'cancelled', 'no_show'].includes(appt.status);

    if (!isUnpaidActiveOcular) return;

    const key = getOcularDuplicateKey(appt);
    const current = preferredByKey.get(key);
    if (!current) {
      preferredByKey.set(key, appt);
      return;
    }

    const apptTime = appointmentActivityTime(appt);
    const currentTime = appointmentActivityTime(current);
    const keepNext =
      apptTime > currentTime
      || (apptTime === currentTime && compareAppointmentDescending(appt, current) < 0);

    if (keepNext) {
      duplicateIds.add(current._id);
      preferredByKey.set(key, appt);
    } else {
      duplicateIds.add(appt._id);
    }
  });

  return appointments.filter((appt) => !duplicateIds.has(appt._id));
}

export function AppointmentsPage() {
  const { user } = useAuthStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status'));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const isDark = resolvedTheme === 'dark';
  const canSeeVisitReports = Boolean(
    user?.roles.some((role) => [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN].includes(role)),
  );
  const activeTab = canSeeVisitReports ? (searchParams.get('tab') || 'appointments') : 'appointments';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const formatSlotTime = (slot: string) => {
    const parts = slot.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const params: Record<string, string> = {};
  if (statusFilter !== null) params.status = statusFilter;
  if (debouncedSearch) params.search = debouncedSearch;

  const isQueueRole = Boolean(
    user?.roles.some((role) => [Role.APPOINTMENT_AGENT, Role.ADMIN, Role.SALES_STAFF].includes(role)),
  );
  const isCustomer = user?.roles.includes(Role.CUSTOMER) && user.roles.length === 1;

  if (isCustomer && !params.limit) {
    params.limit = '100';
  }

  const listQuery = useAppointments(params, !isQueueRole);
  const queueQuery = useAppointmentQueue(params, isQueueRole);

  const activeQuery = isQueueRole ? queueQuery : listQuery;
  const { isLoading, isError, isFetching, refetch } = activeQuery;

  const queueItems = queueQuery.data?.items || [];
  const appointments: Appointment[] = isQueueRole
    ? queueItems.map((item) => item.appointment)
    : (listQuery.data?.items || []);
  const visibleAppointments = isCustomer
    ? dedupeCustomerOcularFollowUps(appointments)
    : appointments;

  const recentWindowDays = queueQuery.data?.recentWindowDays || 14;
  let sections: Array<{ key: string; label: string; items: Appointment[] }> = [];

  if (isQueueRole) {
    const sortUpcomingQueueItems = !statusFilter && !search
      ? compareAppointmentLatestActivity
      : compareAppointmentAscending;

    sections = [
      {
        key: 'upcoming',
        label: 'Upcoming and Actionable',
        items: queueItems
          .filter((item) => item.segment === 'upcoming')
          .map((item) => item.appointment)
          .sort(sortUpcomingQueueItems),
      },
      {
        key: 'recent',
        label: (statusFilter !== null || search) ? 'Recent and History' : `Recent (${recentWindowDays} days)`,
        items: queueItems
          .filter((item) => item.segment === 'recent')
          .map((item) => item.appointment)
          .sort(compareAppointmentDescending),
      },
    ].filter((section) => section.items.length > 0);
  } else {
    const upcomingItems = visibleAppointments
      .filter(a => !['completed', 'cancelled', 'no_show'].includes(a.status))
      .sort(compareAppointmentAscending);
    const recentItems = visibleAppointments
      .filter(a => ['completed', 'cancelled', 'no_show'].includes(a.status))
      .sort(compareAppointmentDescending);

    sections = [
      {
        key: 'upcoming',
        label: 'Upcoming and Actionable',
        items: upcomingItems,
      },
      {
        key: 'recent',
        label: (statusFilter !== null || search) ? 'Recent and History' : 'Recent and History',
        items: recentItems,
      },
    ].filter((section) => section.items.length > 0);
  }

  const queueMetaByAppointmentId = new Map(
    queueItems.map((item) => [
      item.appointment._id,
      {
        actions: item.actions,
        sampleProjects: item.sampleProjects,
      },
    ]),
  );

  const isSalesOnly = Boolean(
    user?.roles.includes(Role.SALES_STAFF)
    && !user.roles.some((role) => [Role.ADMIN, Role.APPOINTMENT_AGENT].includes(role)),
  );
  const trimmedSearch = search.trim();

  if (isError) return <PageError onRetry={refetch} />;

  const customerCtaClassName = isDark
    ? 'border border-white/35 bg-[linear-gradient(180deg,rgba(248,250,252,0.99)_0%,rgba(225,232,240,0.97)_100%)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_18px_34px_rgba(0,0,0,0.34)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(233,239,245,1)_100%)] hover:text-slate-950'
    : '';

  const isDerivedReadyForOcular = (appt: Appointment) =>
    appt.type === 'office'
    && appt.status === AppointmentStatus.COMPLETED
    && appt.consultationReportSubmitted;

  const getStatusKey = (appt: Appointment) => {
    const awaitingPayment =
      appt.type === 'ocular' && appt.ocularFeeStatus === 'pending' && !appt.ocularFeePaid;
    if (awaitingPayment) return 'awaiting_payment';
    if (appt.status === AppointmentStatus.READY_FOR_OCULAR) {
      return AppointmentStatus.READY_FOR_OCULAR;
    }
    if (
      statusFilter !== AppointmentStatus.COMPLETED
      && isDerivedReadyForOcular(appt)
    ) {
      return 'ready_for_ocular';
    }
    return appt.status;
  };

  const searchPlaceholder = isCustomer
    ? 'Search service, location, date, or notes'
    : isSalesOnly
      ? 'Search assigned customers, project no., service, address'
      : 'Search customers, project no., service, address';

  const emptyDescription = trimmedSearch
    ? isQueueRole
      ? `No queue items match "${trimmedSearch}" with the current status filters.`
      : `No appointments match "${trimmedSearch}" with the current status filters.`
    : isCustomer
      ? 'Book your first appointment to get started with your project.'
      : isQueueRole
        ? 'No queue items match your current search or status filters.'
        : 'No appointments match your current search or status filters.';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#171b21] dark:text-slate-100">Appointments</h1>
            {!isLoading && visibleAppointments.length > 0 && (
              <span className="rounded-full border border-[#56606c] bg-[#202833] px-2.5 py-1 text-[11px] font-semibold text-[#b0bac5] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {visibleAppointments.length} visible
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#616a74] dark:text-slate-400">
            {isCustomer
              ? 'Schedule and manage your site visits.'
              : isQueueRole
                ? 'Manage the appointment queue with upcoming work first and recent outcomes second.'
                : 'Manage customer booking requests.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[#8f99a6] bg-white/75 px-4 text-sm font-semibold text-[#2f3a46] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:border-[#6f7b88] hover:bg-white/95 hover:text-[#1f2933] disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-500/80 dark:bg-slate-800/90 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Refresh appointments"
            title="Refresh appointments"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''} text-current`} />
            Refresh
          </button>
          {isCustomer && (
            <Button asChild variant="prominent" className={`h-10 ${customerCtaClassName}`}>
              <Link to="/appointments/book">
                <Plus className="mr-2 h-4 w-4" />
                Book Appointment
              </Link>
            </Button>
          )}
        </div>
      </div>

      {canSeeVisitReports && (
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-muted)]/40 p-1">
          {[
            { key: 'appointments', label: 'Appointments' },
            { key: 'visit-reports', label: 'Visit Reports' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('tab', tab.key);
                if (tab.key === 'visit-reports') {
                  nextParams.delete('status');
                }
                navigate(`/appointments?${nextParams.toString()}`, { replace: true });
              }}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[color:var(--color-card)] text-[var(--color-card-foreground)] shadow-sm'
                  : 'text-[var(--text-metal-color)] hover:text-[var(--color-card-foreground)] hover:bg-[color:var(--color-card)]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'visit-reports' && canSeeVisitReports ? (
        <VisitReportsListPage isEmbedded />
      ) : (
      <>
      {/* Filters */}
      <CollectionToolbar
        title="Find the right appointment fast"
        description="Search customers, then narrow the list by lifecycle stage."
        searchPlaceholder={searchPlaceholder}
        searchValue={search}
        onSearchChange={setSearch}
        filters={STATUS_FILTERS}
        activeFilter={statusFilter ?? ''}
        onFilterChange={setStatusFilter}
      />

      {/* Content */}
      {isLoading ? (
        <>
          {/* Mobile skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="metal-panel rounded-[1.35rem] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-5 w-18 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="metal-panel hidden overflow-hidden rounded-[1.5rem] md:block">
            <div className="p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : !visibleAppointments.length ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No appointments found"
          description={emptyDescription}
          action={isCustomer ? (
            <Button asChild variant="prominent" className={customerCtaClassName}>
              <Link to="/appointments/book">
                Book First Appointment
              </Link>
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* ── Mobile list (< md) ── */}
          <div className="md:hidden space-y-2">
            {sections.map((section) => (
              <div key={section.key} className="space-y-2">
                <Fragment>
                  <div className="px-1 py-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d7782] dark:text-slate-400">
                      {section.label}
                    </p>
                  </div>
                </Fragment>
                {section.items.map((appt) => {
                  const workflowStatus = resolveAppointmentWorkflowStatus({
                    ...appt,
                    status: getStatusKey(appt),
                  });
                  const config = statusConfig[getStatusKey(appt)] ?? statusConfig.requested!;
                  const queueMeta = queueMetaByAppointmentId.get(appt._id);

                  return (
                    <Link
                      key={appt._id}
                      to={`/appointments/${appt._id}`}
                      className="group block"
                    >
                      <div className="metal-panel rounded-[1.35rem] px-4 py-3.5 transition-colors active:bg-white/60">
                        {/* Row 1: Status dot + Name + Badge + Chevron */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${workflowDotClass[workflowStatus.tone] || config.dot}`} />
                            <p className="truncate text-[15px] font-medium text-[#171b21] dark:text-slate-100">
                              {appt.customerName || 'Appointment'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={workflowStatus.key} label={workflowStatus.label} className="h-5 px-1.5 py-0 text-[10px]" />
                            <ChevronRight className="h-4 w-4 text-[#c8c8cd] dark:text-slate-500" />
                          </div>
                        </div>

                        {/* Row 2: Meta — type · date · time */}
                        <div className="mt-2 ml-[18px] flex items-center gap-1.5 text-xs text-[#68727d] dark:text-slate-400">
                          <span className="capitalize">{APPOINTMENT_TYPE_LABELS[appt.type] || appt.type}</span>
                          <span className="text-[#b8c0c9] dark:text-slate-500">·</span>
                          <span>
                            {appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—'}
                          </span>
                          <span className="text-[#b8c0c9] dark:text-slate-500">·</span>
                          <span className="font-medium text-[#434c56] dark:text-slate-300">
                            {formatSlotTime(appt.slotCode)}
                          </span>
                        </div>
                        <div className="mt-1 ml-[18px] text-[10px] text-[#8b95a0] dark:text-slate-500">
                          Last updated {formatDistanceToNow(new Date(appt.updatedAt), { addSuffix: true })}
                        </div>

                        {/* Row 3 (optional): Site details badge */}
                        {appt.siteDetailsStatus === 'pending' && appt.status === 'requested' && (
                          <div className="ml-[18px] mt-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#4f6679]">
                              <FileText className="h-3 w-3" />
                              {appt.type === 'office' ? 'Consultation Details Required' : 'Site Details Optional'}
                            </span>
                          </div>
                        )}

                        {isQueueRole && queueMeta?.sampleProjects?.[0] && (
                          <div className="ml-[18px] mt-1.5 text-[11px] text-[#5c6672] dark:text-slate-400">
                            Sample project: {queueMeta.sampleProjects[0].title}
                          </div>
                        )}

                        {/* Row 4 (optional): Location */}
                        {(appt.addressStructured?.city || appt.address) ? (
                          <div className="ml-[18px] mt-1.5 flex items-center gap-1.5 text-[11px] text-[#68727d] dark:text-slate-400">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{appt.addressStructured?.city || appt.address}</span>
                          </div>
                        ) : (
                          <div className="ml-[18px] mt-1.5 flex items-center gap-1.5 text-[11px] text-[#9fa8b3] dark:text-slate-500">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span>Address not provided</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
            <div className="px-1 pt-1">
              <p className="text-[11px] text-[#68727d] dark:text-slate-400">
                {visibleAppointments.length} appointment{visibleAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="metal-panel hidden overflow-hidden rounded-[1.5rem] md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-[#68727d]">Customer</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Date & Time</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-[#68727d] lg:table-cell">Location</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Status</TableHead>
                  <TableHead className="pr-5 text-right text-xs font-semibold uppercase tracking-wider text-[#68727d]">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <Fragment key={section.key}>
                    <Fragment>
                      <TableRow key={`${section.key}-heading`} className="hover:bg-transparent">
                        <TableCell colSpan={6} className="px-5 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d7782] dark:text-slate-400">
                            {section.label}
                          </p>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                    {section.items.map((appt) => {
                      const workflowStatus = resolveAppointmentWorkflowStatus({
                        ...appt,
                        status: getStatusKey(appt),
                      });
                      const config = statusConfig[getStatusKey(appt)] ?? statusConfig.requested!;
                      const queueMeta = queueMetaByAppointmentId.get(appt._id);
                      const queueActions = [
                        queueMeta?.actions.reviewReportPath
                          ? { label: 'Review Report', path: queueMeta.actions.reviewReportPath }
                          : null,
                        queueMeta?.actions.projectPath
                          ? { label: 'Open Project', path: queueMeta.actions.projectPath }
                          : null,
                        queueMeta?.actions.createProjectPath
                          ? { label: appt.type === 'ocular' ? 'Submit Visit Report' : 'Add Specification', path: queueMeta.actions.createProjectPath }
                          : null,
                      ].filter((action): action is { label: string; path: string } => Boolean(action));

                      return (
                        <TableRow
                          key={appt._id}
                          onClick={() => navigate(`/appointments/${appt._id}`)}
                          className="group cursor-pointer border-b border-[#e1e6ec] transition-colors hover:bg-white/45 dark:border-slate-700 dark:hover:bg-slate-800/50"
                        >
                          {/* Customer */}
                          <TableCell className="pl-5 py-5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${workflowDotClass[workflowStatus.tone] || config.dot}`} />
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-medium text-[#171b21] dark:text-slate-100 transition-colors group-hover:text-[#4f6679] dark:group-hover:text-sky-300">
                                  {appt.customerName || 'Appointment'}
                                  {appt.projectNumber && (
                                    <span className="ml-2 text-[10px] font-bold text-[#68727d] dark:text-slate-400 bg-[#f1f3f5] dark:bg-slate-800 px-1.5 py-0.5 rounded border border-[#d1d5db] dark:border-slate-700">
                                      {appt.projectNumber}
                                    </span>
                                  )}
                                </p>
                                {appt.siteDetailsStatus === 'pending' && appt.status === 'requested' && (
                                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#4f6679]">
                                    <FileText className="h-3 w-3" />
                                    {appt.type === 'office' ? 'Consultation Details Required' : 'Site Details Optional'}
                                  </span>
                                )}
                                {isQueueRole && queueMeta?.sampleProjects?.[0] && (
                                  <p className="mt-1 text-[11px] text-[#5f6872] dark:text-slate-400 truncate">
                                    Sample project: {queueMeta.sampleProjects[0].title}
                                  </p>
                                )}
                                {isQueueRole && typeof appt.salesStaffId === 'object' && appt.salesStaffId && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold
                                      ${appt.salesStaffId.availabilityStatus === 'available'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                      {appt.salesStaffId.availabilityStatus === 'available' ? (
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      ) : (
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      )}
                                      {appt.salesStaffName || `${appt.salesStaffId.firstName} ${appt.salesStaffId.lastName}`}
                                      {appt.salesStaffId.availabilityNote && (
                                        <span className="ml-1 text-[9px] font-normal opacity-80 italic">
                                          ({appt.salesStaffId.availabilityNote})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {isQueueRole && queueActions.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {queueActions.map((action) => (
                                      <button
                                        key={action.path}
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          navigate(action.path);
                                        }}
                                        className="rounded-full border border-[#d0d7df] bg-white/75 px-2 py-0.5 text-[10px] font-semibold text-[#4f6679] transition-colors hover:bg-white dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700"
                                      >
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="py-5">
                            <span className="inline-flex items-center text-sm font-medium capitalize text-[#616a74] dark:text-slate-400">
                              {APPOINTMENT_TYPE_LABELS[appt.type] || appt.type}
                            </span>
                          </TableCell>

                          {/* Date & Time */}
                          <TableCell className="py-5">
                            <div>
                              <p className="text-sm text-[#1d1d1f] dark:text-slate-100 font-medium">
                                {appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—'}
                              </p>
                              <p className="mt-0.5 text-xs text-[#68727d] dark:text-slate-400">
                                {formatSlotTime(appt.slotCode)}
                              </p>
                              <p className="mt-1 text-[10px] font-medium text-[#8b95a0] dark:text-slate-500 italic">
                                Updated {format(new Date(appt.updatedAt), 'MMM d, h:mm a')} ({formatDistanceToNow(new Date(appt.updatedAt), { addSuffix: true })})
                              </p>
                            </div>
                          </TableCell>

                          {/* Location — hidden below lg */}
                          <TableCell className="py-5 hidden lg:table-cell">
                            {appt.addressStructured?.city || appt.address ? (
                              <div className="flex max-w-[200px] items-center gap-1.5 text-xs text-[#616a74] dark:text-slate-400">
                                <MapPin className="h-3 w-3 flex-shrink-0 text-[#8b95a0] dark:text-slate-500" />
                                <span className="truncate">{appt.addressStructured?.city || appt.address}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-[#9fa8b3] dark:text-slate-500">Address not provided</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-5">
                            <StatusBadge status={workflowStatus.key} label={workflowStatus.label} className="text-[11px]" />
                          </TableCell>

                          {/* Arrow */}
                          <TableCell className="py-5 pr-5 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4d5660] dark:text-slate-400 group-hover:text-[#171b21] dark:group-hover:text-slate-200">
                              Open
                              <ChevronRight className="h-4 w-4 text-[#9ca6b1] dark:text-slate-500 transition-colors group-hover:text-[#68727d] dark:group-hover:text-slate-300" />
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-[#dde3ea] bg-white/25 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/35">
              <p className="text-xs text-[#68727d] dark:text-slate-400">
                {visibleAppointments.length} appointment{visibleAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
