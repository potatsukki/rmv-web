import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, FileText, ChevronRight, MapPin } from 'lucide-react';
import { format } from 'date-fns';

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
import { useAppointments } from '@/hooks/useAppointments';
import { useAuthStore } from '@/stores/auth.store';
import { Role, AppointmentStatus } from '@/lib/constants';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Requested', value: AppointmentStatus.REQUESTED },
  { label: 'Confirmed', value: AppointmentStatus.CONFIRMED },
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
  ready_for_ocular: {
    label: 'Ready for Ocular',
    dot: 'bg-[#8277a3]',
    badge: 'border-[#afa7c5] text-[#665d82] bg-[linear-gradient(180deg,#f2f1f8_0%,#e0dced_100%)]',
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

export function AppointmentsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const formatSlotTime = (slot: string) => {
    const parts = slot.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch } = useAppointments(params);
  const isCustomer = user?.roles.includes(Role.CUSTOMER) && user.roles.length === 1;

  if (isError) return <PageError onRetry={refetch} />;

  const appointments = data?.items || [];

  const getStatusKey = (appt: (typeof appointments)[0]) => {
    const awaitingPayment =
      appt.type === 'ocular' && appt.ocularFeeStatus === 'pending' && !appt.ocularFeePaid;
    if (awaitingPayment) return 'awaiting_payment';
    if (appt.type === 'office' && appt.status === 'completed' && appt.consultationReportSubmitted)
      return 'ready_for_ocular';
    return appt.status;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#171b21]">Appointments</h1>
            {!isLoading && appointments.length > 0 && (
              <span className="metal-pill rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#5f6872]">
                {appointments.length} visible
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#616a74]">
            {isCustomer
              ? 'Schedule and manage your site visits.'
              : 'Manage customer booking requests.'}
          </p>
        </div>
        {isCustomer && (
          <Button asChild className="h-10">
            <Link to="/appointments/book">
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <CollectionToolbar
        title="Find the right appointment fast"
        description="Search customers, then narrow the list by lifecycle stage."
        searchPlaceholder="Search bookings"
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
      ) : !appointments.length ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No appointments found"
          description={isCustomer
            ? 'Book your first appointment to get started with your project.'
            : 'No appointments match your current search or status filters.'}
          action={isCustomer ? (
            <Button asChild variant="outline">
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
            {appointments.map((appt) => {
              const statusKey = getStatusKey(appt);
              const config = statusConfig[statusKey] ?? statusConfig.requested!;

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
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${config.dot}`} />
                        <p className="truncate text-sm font-medium text-[#171b21]">
                          {appt.customerName || 'Appointment'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={statusKey} label={config.label} className="h-5 px-1.5 py-0 text-[9px]" />
                        <ChevronRight className="h-4 w-4 text-[#c8c8cd]" />
                      </div>
                    </div>

                    {/* Row 2: Meta — type · date · time */}
                    <div className="mt-2 ml-[18px] flex items-center gap-1.5 text-[11px] text-[#68727d]">
                      <span className="capitalize">{appt.type}</span>
                      <span className="text-[#b8c0c9]">·</span>
                      <span>
                        {appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—'}
                      </span>
                      <span className="text-[#b8c0c9]">·</span>
                      <span className="font-medium text-[#434c56]">
                        {formatSlotTime(appt.slotCode)}
                      </span>
                    </div>

                    {/* Row 3 (optional): Site details badge */}
                    {appt.siteDetailsStatus === 'pending' && appt.status === 'requested' && (
                      <div className="ml-[18px] mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#4f6679]">
                          <FileText className="h-3 w-3" />
                          {appt.type === 'office' ? 'Site Details Required' : 'Site Details Optional'}
                        </span>
                      </div>
                    )}

                    {/* Row 4 (optional): Location */}
                    {(appt.addressStructured?.city || appt.address) ? (
                      <div className="ml-[18px] mt-1.5 flex items-center gap-1.5 text-[11px] text-[#68727d]">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{appt.addressStructured?.city || appt.address}</span>
                      </div>
                    ) : (
                      <div className="ml-[18px] mt-1.5 flex items-center gap-1.5 text-[11px] text-[#9fa8b3]">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span>Address not provided</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
            <div className="px-1 pt-1">
              <p className="text-[11px] text-[#68727d]">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="metal-panel hidden overflow-hidden rounded-[1.5rem] md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wider text-[#68727d]">Customer</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#68727d]">Type</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#68727d]">Date & Time</TableHead>
                  <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-[#68727d] lg:table-cell">Location</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#68727d]">Status</TableHead>
                  <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#68727d]">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const statusKey = getStatusKey(appt);
                  const config = statusConfig[statusKey] ?? statusConfig.requested!;

                  return (
                    <TableRow
                      key={appt._id}
                      onClick={() => navigate(`/appointments/${appt._id}`)}
                      className="group cursor-pointer border-b border-[#e1e6ec] transition-colors hover:bg-white/45"
                    >
                      {/* Customer */}
                      <TableCell className="pl-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${config.dot}`} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#171b21] transition-colors group-hover:text-[#4f6679]">
                              {appt.customerName || 'Appointment'}
                            </p>
                            {appt.siteDetailsStatus === 'pending' && appt.status === 'requested' && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#4f6679]">
                                <FileText className="h-3 w-3" />
                                {appt.type === 'office' ? 'Site Details Required' : 'Site Details Optional'}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-4">
                        <span className="inline-flex items-center text-xs font-medium capitalize text-[#616a74]">
                          {appt.type}
                        </span>
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell className="py-4">
                        <div className="text-sm">
                          <p className="text-[#1d1d1f] font-medium">
                            {appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—'}
                          </p>
                          <p className="mt-0.5 text-xs text-[#68727d]">
                            {formatSlotTime(appt.slotCode)}
                          </p>
                        </div>
                      </TableCell>

                      {/* Location — hidden below lg */}
                      <TableCell className="py-4 hidden lg:table-cell">
                        {appt.addressStructured?.city || appt.address ? (
                          <div className="flex max-w-[200px] items-center gap-1.5 text-xs text-[#616a74]">
                            <MapPin className="h-3 w-3 flex-shrink-0 text-[#8b95a0]" />
                            <span className="truncate">{appt.addressStructured?.city || appt.address}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9fa8b3]">Address not provided</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <StatusBadge status={statusKey} label={config.label} className="text-[10px]" />
                      </TableCell>

                      {/* Arrow */}
                      <TableCell className="py-4 pr-5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4d5660] group-hover:text-[#171b21]">
                          Open
                          <ChevronRight className="h-4 w-4 text-[#9ca6b1] transition-colors group-hover:text-[#68727d]" />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t border-[#dde3ea] bg-white/25 px-5 py-3">
              <p className="text-xs text-[#68727d]">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
