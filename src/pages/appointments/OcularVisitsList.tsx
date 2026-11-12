import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, MapPinned } from 'lucide-react';
import { format } from 'date-fns';

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
import { useAppointments } from '@/hooks/useAppointments';
import type { Appointment } from '@/lib/types';
import { resolveAppointmentWorkflowStatus } from '@/lib/workflow-status';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Requested', value: 'requested' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
];

const FEE_LABELS: Record<string, string> = {
  pending: 'Unpaid',
  cash_pending: 'Cash pending',
  proof_submitted: 'Proof submitted',
  verified: 'Paid',
  declined: 'Declined',
};

function feeLabel(appt: Appointment): string {
  if (appt.ocularFeeStatus) return FEE_LABELS[appt.ocularFeeStatus] ?? appt.ocularFeeStatus;
  return appt.ocularFee ? 'Unpaid' : 'No fee';
}

function dateLabel(appt: Appointment): string {
  return appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—';
}

function slotLabel(slotCode?: string): string {
  const [hour, minute] = String(slotCode || '').split(':').map(Number);
  if (hour === undefined || Number.isNaN(hour)) return '—';
  return `${hour % 12 || 12}:${String(minute || 0).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/**
 * Every ocular visit, including the ones a project scheduled and unpaid ones (the Appointments
 * tab leaves those out). Each one holds its sales staff member's time slot.
 */
export function OcularVisitsList({ showSalesStaff }: { showSalesStaff: boolean }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const params: Record<string, string> = {
    type: 'ocular',
    includeFeePending: 'true',
    sortBy: 'date',
    sortOrder: 'desc',
    limit: '100',
  };
  if (statusFilter) params.statusGroup = statusFilter;
  if (debouncedSearch) params.search = debouncedSearch;

  const { data, isLoading, isError, refetch } = useAppointments(params);
  const oculars = data?.items ?? [];

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <CollectionToolbar
        title="Ocular visits"
        description="Every ocular visit, including those scheduled from a project and those with an unpaid fee."
        searchPlaceholder="Search customer, project no., address"
        searchValue={search}
        onSearchChange={setSearch}
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {isLoading ? (
        <div className="metal-panel space-y-4 rounded-[1.5rem] p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : !oculars.length ? (
        <EmptyState
          icon={<MapPinned className="h-6 w-6" />}
          title="No ocular visits found"
          description={search || statusFilter
            ? 'Try adjusting the search terms or status filter.'
            : 'Ocular visits appear here once they are scheduled.'}
        />
      ) : (
        <>
          {/* ── Mobile list (< md) ── */}
          <div className="space-y-2 md:hidden">
            {oculars.map((appt) => {
              const workflowStatus = resolveAppointmentWorkflowStatus(appt);
              return (
                <Link key={appt._id} to={`/appointments/${appt._id}`} className="block">
                  <div className="metal-panel rounded-[1.35rem] px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[15px] font-medium text-[#171b21] dark:text-slate-100">
                        {appt.customerName || 'Customer'}
                      </p>
                      <StatusBadge status={workflowStatus.key} label={workflowStatus.label} className="h-5 px-1.5 py-0 text-[10px]" />
                    </div>
                    <p className="mt-1.5 text-xs text-[#68727d] dark:text-slate-400">
                      {dateLabel(appt)} · {slotLabel(appt.slotCode)}
                    </p>
                    <p className="mt-1 text-xs text-[#68727d] dark:text-slate-400">
                      {[
                        showSalesStaff ? appt.salesStaffName || 'No sales staff yet' : null,
                        appt.ocularProject?.projectNumber,
                        `Fee: ${feeLabel(appt)}`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="metal-panel hidden overflow-x-auto rounded-[1.5rem] md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-[#68727d]">Date & Time</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Customer</TableHead>
                  {showSalesStaff && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Sales Staff</TableHead>
                  )}
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Project No.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Fee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#68727d]">Status</TableHead>
                  <TableHead className="w-10 pr-5"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oculars.map((appt) => {
                  const workflowStatus = resolveAppointmentWorkflowStatus(appt);
                  return (
                    <TableRow
                      key={appt._id}
                      onClick={() => navigate(`/appointments/${appt._id}`)}
                      className="group cursor-pointer border-b border-[#e1e6ec] transition-colors hover:bg-white/45 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="py-4 pl-5">
                        <p className="whitespace-nowrap text-sm font-medium text-[#1d1d1f] dark:text-slate-100">{dateLabel(appt)}</p>
                        <p className="mt-0.5 text-xs text-[#68727d] dark:text-slate-400">{slotLabel(appt.slotCode)}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="truncate text-sm font-medium text-[#171b21] dark:text-slate-100">{appt.customerName || 'Customer'}</p>
                        {(appt.formattedAddress || appt.address) && (
                          <p className="mt-0.5 max-w-[260px] truncate text-xs text-[#68727d] dark:text-slate-400">
                            {appt.formattedAddress || appt.address}
                          </p>
                        )}
                      </TableCell>
                      {showSalesStaff && (
                        <TableCell className="py-4 text-sm text-[#434c56] dark:text-slate-300">
                          {appt.salesStaffName || 'No sales staff yet'}
                        </TableCell>
                      )}
                      <TableCell className="py-4">
                        {appt.ocularProject ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/projects/${appt.ocularProject!._id}`);
                            }}
                            className="font-mono text-xs font-semibold text-[#4f6679] underline-offset-4 hover:underline dark:text-sky-300"
                          >
                            {appt.ocularProject.projectNumber || 'Open project'}
                          </button>
                        ) : (
                          <span className="text-xs text-[#9fa8b3] dark:text-slate-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-[#434c56] dark:text-slate-300">{feeLabel(appt)}</TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={workflowStatus.key} label={workflowStatus.label} className="text-[11px]" />
                      </TableCell>
                      <TableCell className="py-4 pr-5">
                        <ChevronRight className="h-4 w-4 text-[#c8c8cd] transition-colors group-hover:text-[#86868b] dark:text-slate-500" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t border-[#dde3ea] bg-[#f8fafc]/65 px-5 py-3 dark:border-slate-700 dark:bg-[#101824]/80">
              <p className="text-xs font-medium text-[#6e6e73] dark:text-slate-400">
                {oculars.length} ocular visit{oculars.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
