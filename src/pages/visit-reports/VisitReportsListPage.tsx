import { Fragment, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronRight, Layers } from 'lucide-react';
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
import { useVisitReports } from '@/hooks/useVisitReports';
import { useAuthStore } from '@/stores/auth.store';
import { VisitReportStatus, Role, SERVICE_TYPE_LABELS } from '@/lib/constants';
import type { VisitReport } from '@/lib/types';

/* ── Helpers ── */

/** Mongoose `.populate()` may return an object — always extract the raw string ID. */
function rawId(field: unknown): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object' && '_id' in (field as Record<string, unknown>))
    return String((field as Record<string, unknown>)._id);
  return String(field);
}

/** Extract a display name from a populated `customerId` field. */
function customerDisplayName(report: VisitReport): string {
  const cid = report.customerId as unknown;
  if (cid && typeof cid === 'object') {
    const obj = cid as Record<string, unknown>;
    const first = obj.firstName ?? '';
    const last = obj.lastName ?? '';
    const name = `${first} ${last}`.trim();
    if (name) return name;
  }
  if (report.customerName) return report.customerName;
  return `Customer ${rawId(report.customerId).slice(-6)}`;
}

/** Derive an aggregate status for a group of reports. Priority: returned > draft > submitted > completed */
function groupStatus(reports: VisitReport[]): string {
  const statuses = new Set(reports.map((r) => r.status));
  if (statuses.has(VisitReportStatus.RETURNED)) return VisitReportStatus.RETURNED;
  if (statuses.has(VisitReportStatus.DRAFT)) return VisitReportStatus.DRAFT;
  if (statuses.has(VisitReportStatus.SUBMITTED)) return VisitReportStatus.SUBMITTED;
  if (statuses.has(VisitReportStatus.COMPLETED)) return VisitReportStatus.COMPLETED;
  return reports[0]?.status || VisitReportStatus.DRAFT;
}

/** Get service label for a single report. */
function serviceLabel(report: VisitReport): string {
  return (
    report.serviceTypeCustom ||
    SERVICE_TYPE_LABELS[report.serviceType] ||
    report.serviceType ||
    'General'
  );
}

function updatedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Updated recently';
  return `Updated ${format(date, 'MMM d, h:mm a')} (${formatDistanceToNow(date, { addSuffix: true })})`;
}

/** Group structure for one appointment's worth of reports. */
interface AppointmentGroup {
  appointmentId: string;
  reports: VisitReport[];
  customerName: string;
  visitType: string;
  status: string;
  latestUpdate: string;
}

interface ReportSection {
  key: string;
  label: string;
  groups: AppointmentGroup[];
}

/* ── Constants ── */

const STATUS_FILTERS = [
  { label: 'All Reports', value: '' },
  { label: 'Draft', value: VisitReportStatus.DRAFT },
  { label: 'Submitted', value: VisitReportStatus.SUBMITTED },
  { label: 'Returned', value: VisitReportStatus.RETURNED },
  { label: 'Completed', value: VisitReportStatus.COMPLETED },
];

const statusConfig: Record<string, { label: string; dot: string }> = {
  [VisitReportStatus.DRAFT]: {
    label: 'Draft',
    dot: 'bg-[#9099a3]',
  },
  [VisitReportStatus.SUBMITTED]: {
    label: 'Submitted',
    dot: 'bg-[#8da4b8]',
  },
  [VisitReportStatus.RETURNED]: {
    label: 'Returned',
    dot: 'bg-[#c7aa7a]',
  },
  [VisitReportStatus.COMPLETED]: {
    label: 'Completed',
    dot: 'bg-[#93ad9d]',
  },
};

const defaultConfig = { label: 'Draft', dot: 'bg-[#9099a3]' };

/* ── Component ── */

export function VisitReportsListPage({ isEmbedded }: { isEmbedded?: boolean } = {}) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch } = useVisitReports(params);

  if (isError) return <PageError onRetry={refetch} />;

  const reports = data?.items || [];

  /* ── Group reports by appointment ── */
  const groups: AppointmentGroup[] = useMemo(() => {
    const map = new Map<string, VisitReport[]>();
    for (const r of reports) {
      const key = rawId(r.appointmentId);
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }

    return Array.from(map.entries()).map(([apptId, reps]) => {
      // Sort so the most recently updated report comes first (clicked first)
      reps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const first = reps[0]!; // guaranteed at least 1 entry per group
      return {
        appointmentId: apptId,
        reports: reps,
        customerName: customerDisplayName(first),
        visitType: first.visitType,
        status: groupStatus(reps),
        latestUpdate: first.updatedAt,
      };
    }).sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime());
  }, [reports]);

  const sections: ReportSection[] = useMemo(() => {
    const actionable = groups.filter((group) => group.status !== VisitReportStatus.COMPLETED);
    const history = groups.filter((group) => group.status === VisitReportStatus.COMPLETED);

    return [
      { key: 'upcoming', label: 'Upcoming and Actionable', groups: actionable },
      { key: 'recent', label: 'Recent and History', groups: history },
    ].filter((section) => section.groups.length > 0);
  }, [groups]);

  const isEngineer = user?.roles.includes(Role.ENGINEER);
  const pageTitle = isEngineer ? 'Visit Report Queue' : 'Visit Reports';
  const pageDescription = isEngineer
    ? 'Review submitted visit reports and create projects.'
    : 'Manage your visit reports and site inspection records.';

  return (
    <div className={isEmbedded ? "space-y-4" : "space-y-6"}>
      {/* Header */}
      {!isEmbedded && (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-slate-100">
            {pageTitle}
          </h1>
          <p className="text-[#6e6e73] dark:text-slate-400 mt-1 text-sm">{pageDescription}</p>
        </div>
      </div>
      )}

      {/* Filters */}
      <CollectionToolbar
        title="Find the right report faster"
        description="Search by customer name or report ID, then narrow the queue by review state."
        searchPlaceholder="Search by customer name or report ID"
        searchValue={search}
        onSearchChange={setSearch}
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Content */}
      {isLoading ? (
        <>
          {/* Mobile skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="metal-panel rounded-xl p-4 space-y-3">
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
          <div className="metal-panel hidden overflow-hidden rounded-xl md:block">
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
      ) : !groups.length ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No visit reports found"
          description={search || statusFilter
            ? 'Try adjusting the search terms or review-state filter.'
            : 'Visit reports will appear here after appointments are confirmed and inspections begin.'}
          action={(search || statusFilter) ? (
            <Button
              variant="outline"
              className="text-[#171b21] dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* ── Mobile list (< md) ── */}
          <div className="md:hidden space-y-2">
            {sections.map((section) => (
              <div key={section.key} className="space-y-2">
                <div className="px-1 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8da4b8] dark:text-slate-400">
                    {section.label}
                  </p>
                </div>
            {section.groups.map((group) => {
              const { reports: reps, status, customerName: custName } = group;
              const firstReport = reps[0]!;
              const projectCount = reps.length;
              const projectLabels = reps.map(serviceLabel);
              const config = statusConfig[status] ?? defaultConfig;

              return (
                <Link
                  key={group.appointmentId}
                  to={`/visit-reports/${firstReport._id}`}
                  className="group block"
                >
                  <div className="metal-panel rounded-xl px-4 py-3.5 transition-colors active:bg-white/45">
                    {/* Row 1: Status dot + Name + Badge + Chevron */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${config.dot}`} />
                        <p className="font-medium text-[#1d1d1f] dark:text-slate-100 text-[15px] truncate">
                          {custName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge
                          status={status}
                          label={config.label}
                          className="h-5 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider"
                        />
                        <ChevronRight className="h-4 w-4 text-[#c8c8cd] dark:text-slate-500" />
                      </div>
                    </div>

                    {/* Row 2: Meta — visit type · project count */}
                    <div className="flex items-center gap-1.5 mt-2 ml-[18px] text-xs text-[#86868b] dark:text-slate-400">
                      <span className="capitalize">{group.visitType === 'ocular' ? 'Ocular' : 'Consultation'}</span>
                      <span className="text-[#d2d2d7] dark:text-slate-500">·</span>
                      <span>{projectCount} item{projectCount !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="mt-1 ml-[18px] text-[10px] font-medium italic text-[#8b95a0] dark:text-slate-500">
                      {updatedLabel(group.latestUpdate)}
                    </p>

                    {/* Row 3: Service type chips */}
                    <div className="flex flex-wrap gap-1 mt-2 ml-[18px]">
                      {projectLabels.map((label, i) => (
                        <span
                          key={i}
                          className="metal-pill inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-[#171b21] dark:text-slate-100"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
              </div>
            ))}
            <div className="rounded-xl border border-[#dde3ea] bg-white/55 px-4 py-3 dark:border-slate-700 dark:bg-[#101824]/70">
              <p className="text-[11px] font-medium text-[#6e6e73] dark:text-slate-400">
                {groups.length} report group{groups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="metal-panel hidden overflow-hidden rounded-xl md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e8e8ed] hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#86868b] pl-5">Customer</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">Visit Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">Items</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#86868b] hidden lg:table-cell">Services</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#86868b] w-10 pr-5"><span className="sr-only">View</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <Fragment key={section.key}>
                    <TableRow key={`${section.key}-heading`} className="border-b border-[#e8e8ed] bg-[#f8fafc]/60 hover:bg-[#f8fafc]/60 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/40">
                      <TableCell colSpan={6} className="px-5 py-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#8da4b8] dark:text-slate-400">
                          {section.label}
                        </span>
                      </TableCell>
                    </TableRow>
                {section.groups.map((group) => {
                  const { reports: reps, status, customerName: custName } = group;
                  const firstReport = reps[0]!;
                  const projectCount = reps.length;
                  const projectLabels = reps.map(serviceLabel);
                  const config = statusConfig[status] ?? defaultConfig;

                  return (
                    <TableRow
                      key={group.appointmentId}
                      onClick={() => navigate(`/visit-reports/${firstReport._id}`)}
                      className="border-b border-[#f0f0f5] cursor-pointer transition-colors hover:bg-[#f9f9fb] group dark:border-slate-700 dark:hover:bg-slate-800/50"
                    >
                      {/* Customer */}
                      <TableCell className="pl-5 py-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${config.dot}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-[#1d1d1f] dark:text-slate-100 text-[15px] truncate group-hover:text-[#0066cc] dark:group-hover:text-sky-300 transition-colors">
                              {custName}
                            </p>
                            <p className="mt-1 text-[10px] font-medium italic text-[#8b95a0] dark:text-slate-500">
                              {updatedLabel(group.latestUpdate)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Visit Type */}
                      <TableCell className="py-5">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-[#6e6e73] dark:text-slate-400">
                          <Layers className="h-3.5 w-3.5 text-[#86868b] dark:text-slate-500" />
                          <span>{group.visitType === 'ocular' ? 'Ocular' : 'Consultation'}</span>
                        </div>
                      </TableCell>

                      {/* Projects */}
                      <TableCell className="py-5">
                        <span className="text-sm text-[#1d1d1f] dark:text-slate-100 font-medium">
                          {projectCount}
                        </span>
                        <span className="text-xs text-[#86868b] dark:text-slate-400 ml-1">
                          item{projectCount !== 1 ? 's' : ''}
                        </span>
                      </TableCell>

                      {/* Services — hidden below lg */}
                      <TableCell className="py-5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {projectLabels.map((label, i) => (
                            <span
                              key={i}
                              className="metal-pill inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-[#171b21] dark:text-slate-100"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-5">
                        <StatusBadge
                          status={status}
                          label={config.label}
                          className="text-[11px] font-bold uppercase tracking-wider"
                        />
                      </TableCell>

                      {/* Arrow */}
                      <TableCell className="py-5 pr-5">
                        <ChevronRight className="h-4 w-4 text-[#c8c8cd] dark:text-slate-500 group-hover:text-[#86868b] dark:group-hover:text-slate-300 transition-colors" />
                      </TableCell>
                    </TableRow>
                  );
                })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-[#dde3ea] bg-[#f8fafc]/65 px-5 py-3 dark:border-slate-700 dark:bg-[#101824]/80">
              <p className="text-xs font-medium text-[#6e6e73] dark:text-slate-400">
                {groups.length} report group{groups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
