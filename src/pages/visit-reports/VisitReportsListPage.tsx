import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ClipboardList,
  Filter,
  ArrowUpRight,
  Calendar,
  User,
  Layers,
  FolderOpen,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageError } from '@/components/shared/PageError';
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

/** Group structure for one appointment's worth of reports. */
interface AppointmentGroup {
  appointmentId: string;
  reports: VisitReport[];
  customerName: string;
  visitType: string;
  status: string;
  latestUpdate: string;
}

/* ── Constants ── */

const STATUS_FILTERS = [
  { label: 'All Reports', value: '' },
  { label: 'Draft', value: VisitReportStatus.DRAFT },
  { label: 'Submitted', value: VisitReportStatus.SUBMITTED },
  { label: 'Returned', value: VisitReportStatus.RETURNED },
  { label: 'Completed', value: VisitReportStatus.COMPLETED },
];

const STATUS_COLORS: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'border-gray-200 text-gray-600 bg-gray-50',
  [VisitReportStatus.SUBMITTED]: 'border-blue-200 text-blue-700 bg-blue-50',
  [VisitReportStatus.RETURNED]: 'border-orange-200 text-orange-700 bg-orange-50',
  [VisitReportStatus.COMPLETED]: 'border-emerald-200 text-emerald-700 bg-emerald-50',
};

const BAR_COLORS: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'bg-gray-300',
  [VisitReportStatus.SUBMITTED]: 'bg-blue-500',
  [VisitReportStatus.RETURNED]: 'bg-orange-500',
  [VisitReportStatus.COMPLETED]: 'bg-emerald-500',
};

/* ── Component ── */

export function VisitReportsListPage() {
  const { user } = useAuthStore();
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
    });
  }, [reports]);

  const isEngineer = user?.roles.includes(Role.ENGINEER);
  const pageTitle = isEngineer ? 'Visit Report Queue' : 'Visit Reports';
  const pageDescription = isEngineer
    ? 'Review submitted visit reports and create projects.'
    : 'Manage your visit reports and site inspection records.';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {pageTitle}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{pageDescription}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by customer name or report ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-gray-200 focus:border-[#6e6e73] focus:ring-[#6e6e73]/20"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <Filter className="h-4 w-4 text-gray-400 hidden md:block mr-1" />
          {STATUS_FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === f.value
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-gray-100 overflow-hidden rounded-xl">
              <div className="h-1.5 bg-gray-100 w-full" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !groups.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="bg-white p-4 rounded-2xl mb-4 shadow-sm">
            <ClipboardList className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            No visit reports found
          </h3>
          <p className="text-gray-500 max-w-sm mt-1 text-sm">
            {search || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Visit reports will appear here after appointments are confirmed.'}
          </p>
          {(search || statusFilter) && (
            <Button
              variant="outline"
              className="mt-4 border-gray-200 text-[#1d1d1f] hover:text-[#6e6e73] hover:bg-[#f0f0f5] rounded-lg"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const { reports: reps, status, customerName: custName } = group;
            const firstReport = reps[0]!;
            const projectCount = reps.length;
            const projectLabels = reps.map(serviceLabel);

            return (
              <Link
                key={group.appointmentId}
                to={`/visit-reports/${firstReport._id}`}
                className="group block h-full"
              >
                <Card className="h-full border-gray-100 transition-all duration-200 hover:border-[#c8c8cd] hover:shadow-md hover:-translate-y-0.5 overflow-hidden flex flex-col rounded-xl">
                  <div
                    className={`h-1.5 w-full ${BAR_COLORS[status] || 'bg-gray-200'}`}
                  />
                  <CardContent className="p-6 flex-1 flex flex-col">
                    {/* Top row: icon + status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 text-[#1d1d1f] bg-[#f0f0f5] rounded-xl flex items-center justify-center">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`uppercase text-[10px] font-bold tracking-wider rounded-md ${
                          STATUS_COLORS[status] || 'border-gray-200 text-gray-600 bg-gray-50'
                        }`}
                      >
                        {String(status || '').replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {/* Customer name + project count */}
                    <div className="mb-3 flex-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-[#6e6e73] transition-colors line-clamp-1">
                        {custName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {projectCount === 1
                          ? '1 project'
                          : `${projectCount} projects`}
                      </p>
                    </div>

                    {/* Service type chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {projectLabels.map((label, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-[#f0f0f5] px-2 py-0.5 text-[11px] font-medium text-[#1d1d1f] border border-[#c8c8cd]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* Meta info */}
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                      <div className="flex items-center text-sm text-gray-600">
                        <Layers className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500">
                          {group.visitType === 'ocular' ? 'Ocular' : 'Consultation'}
                        </span>
                      </div>
                      {firstReport.actualVisitDateTime && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="mr-2 h-3.5 w-3.5 text-gray-400" />
                          <span>
                            {format(new Date(firstReport.actualVisitDateTime), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span className="line-clamp-1">{custName}</span>
                      </div>
                      {projectCount > 1 && (
                        <div className="flex items-center text-sm text-gray-600">
                          <FolderOpen className="mr-2 h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">
                            {projectCount} projects in this visit
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center text-sm font-medium text-[#1d1d1f] opacity-0 group-hover:opacity-100 transition-opacity">
                      {status === VisitReportStatus.DRAFT
                        ? 'Continue Editing'
                        : 'View Details'}{' '}
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
