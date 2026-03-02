import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, Search, Filter, FileText, ChevronRight, MapPin } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PageError } from '@/components/shared/PageError';
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
    dot: 'bg-amber-500',
    badge: 'border-amber-200 text-amber-700 bg-amber-50',
  },
  confirmed: {
    label: 'Confirmed',
    dot: 'bg-blue-500',
    badge: 'border-blue-200 text-blue-700 bg-blue-50',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-red-500',
    badge: 'border-red-200 text-red-700 bg-red-50',
  },
  no_show: {
    label: 'No Show',
    dot: 'bg-gray-500',
    badge: 'border-gray-200 text-gray-700 bg-gray-50',
  },
  reschedule_requested: {
    label: 'Reschedule',
    dot: 'bg-violet-500',
    badge: 'border-violet-200 text-violet-700 bg-violet-50',
  },
  awaiting_payment: {
    label: 'Awaiting Payment',
    dot: 'bg-orange-500',
    badge: 'border-orange-200 text-orange-700 bg-orange-50',
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
    return awaitingPayment ? 'awaiting_payment' : appt.status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Appointments</h1>
          <p className="text-[#6e6e73] mt-1 text-sm">
            {isCustomer
              ? 'Schedule and manage your site visits.'
              : 'Manage customer booking requests.'}
          </p>
        </div>
        {isCustomer && (
          <Button asChild className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white shadow-sm h-10">
            <Link to="/appointments/book">
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-[#c8c8cd]/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
          <Input
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-[#d2d2d7] focus-visible:ring-[#6e6e73]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <Filter className="h-4 w-4 text-[#86868b] hidden md:block mr-1 flex-shrink-0" />
          {STATUS_FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${
                  statusFilter === f.value
                    ? 'bg-[#1d1d1f] text-white shadow-sm'
                    : 'bg-[#f0f0f5] text-[#6e6e73] hover:bg-[#e8e8ed] hover:text-[#3a3a3e]'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <>
          {/* Mobile skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#c8c8cd]/50 p-4 space-y-3">
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
          <div className="hidden md:block bg-white rounded-xl border border-[#c8c8cd]/50 shadow-sm overflow-hidden">
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
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center border border-dashed border-[#d2d2d7] rounded-2xl bg-[#f5f5f7]/50 px-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white shadow-sm mb-4">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#c8c8cd]" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f]">No appointments found</h3>
          <p className="text-xs sm:text-sm text-[#86868b] max-w-sm mt-1.5 mb-6">
            {isCustomer
              ? 'Book your first appointment to get started with your project.'
              : 'No appointments match your current filters.'}
          </p>
          {isCustomer && (
            <Button asChild variant="outline" className="border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7]">
              <Link to="/appointments/book">
                Book First Appointment
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── Mobile list (< md) ── */}
          <div className="md:hidden space-y-2">
            {appointments.map((appt) => {
              const statusKey = getStatusKey(appt);
              const config = statusConfig[statusKey] || statusConfig.requested;

              return (
                <Link
                  key={appt._id}
                  to={`/appointments/${appt._id}`}
                  className="group block"
                >
                  <div className="bg-white rounded-xl border border-[#c8c8cd]/50 px-4 py-3.5 active:bg-[#f5f5f7] transition-colors">
                    {/* Row 1: Status dot + Name + Badge + Chevron */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${config.dot}`} />
                        <p className="font-medium text-[#1d1d1f] text-sm truncate">
                          {appt.customerName || 'Appointment'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-5 ${config.badge}`}
                        >
                          {config.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-[#c8c8cd]" />
                      </div>
                    </div>

                    {/* Row 2: Meta — type · date · time */}
                    <div className="flex items-center gap-1.5 mt-2 ml-[18px] text-[11px] text-[#86868b]">
                      <span className="capitalize">{appt.type}</span>
                      <span className="text-[#d2d2d7]">·</span>
                      <span>
                        {appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—'}
                      </span>
                      <span className="text-[#d2d2d7]">·</span>
                      <span className="font-medium text-[#3a3a3e]">
                        {formatSlotTime(appt.slotCode)}
                      </span>
                    </div>

                    {/* Row 3 (optional): Site details badge */}
                    {appt.siteDetailsStatus === 'pending' && appt.status === 'requested' && (
                      <div className="ml-[18px] mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
                          <FileText className="h-3 w-3" />
                          {appt.type === 'office' ? 'Site Details Required' : 'Site Details Optional'}
                        </span>
                      </div>
                    )}

                    {/* Row 4 (optional): Location */}
                    {appt.address && (
                      <div className="flex items-center gap-1.5 ml-[18px] mt-1.5 text-[11px] text-[#86868b]">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{appt.address}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
            <div className="px-1 pt-1">
              <p className="text-[11px] text-[#86868b]">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="hidden md:block bg-white rounded-xl border border-[#c8c8cd]/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e8e8ed] hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] pl-5">Customer</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">Type</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">Date & Time</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] hidden lg:table-cell">Location</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] w-10 pr-5"><span className="sr-only">View</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const statusKey = getStatusKey(appt);
                  const config = statusConfig[statusKey] || statusConfig.requested;

                  return (
                    <TableRow
                      key={appt._id}
                      onClick={() => navigate(`/appointments/${appt._id}`)}
                      className="border-b border-[#f0f0f5] cursor-pointer transition-colors hover:bg-[#f9f9fb] group"
                    >
                      {/* Customer */}
                      <TableCell className="pl-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${config.dot}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-[#1d1d1f] text-sm truncate group-hover:text-[#0066cc] transition-colors">
                              {appt.customerName || 'Appointment'}
                            </p>
                            {appt.siteDetailsStatus === 'pending' && appt.status === 'requested' && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-blue-600">
                                <FileText className="h-3 w-3" />
                                {appt.type === 'office' ? 'Site Details Required' : 'Site Details Optional'}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-4">
                        <span className="inline-flex items-center text-xs font-medium text-[#6e6e73] capitalize">
                          {appt.type}
                        </span>
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell className="py-4">
                        <div className="text-sm">
                          <p className="text-[#1d1d1f] font-medium">
                            {appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—'}
                          </p>
                          <p className="text-[#86868b] text-xs mt-0.5">
                            {formatSlotTime(appt.slotCode)}
                          </p>
                        </div>
                      </TableCell>

                      {/* Location — hidden below lg */}
                      <TableCell className="py-4 hidden lg:table-cell">
                        {appt.address ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#6e6e73] max-w-[200px]">
                            <MapPin className="h-3 w-3 text-[#86868b] flex-shrink-0" />
                            <span className="truncate">{appt.address}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#c8c8cd]">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${config.badge}`}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>

                      {/* Arrow */}
                      <TableCell className="py-4 pr-5">
                        <ChevronRight className="h-4 w-4 text-[#c8c8cd] group-hover:text-[#86868b] transition-colors" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-5 py-3 border-t border-[#f0f0f5] bg-[#fafafa]">
              <p className="text-xs text-[#86868b]">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
