import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Search, Filter, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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

export function AppointmentsPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch } = useAppointments(params);
  const isCustomer = user?.roles.includes(Role.CUSTOMER) && user.roles.length === 1;

  if (isError) return <PageError onRetry={refetch} />;

  const appointments = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isCustomer
              ? 'Schedule and manage your site visits.'
              : 'Manage customer booking requests.'}
          </p>
        </div>
        {isCustomer && (
          <Button asChild className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm h-10">
            <Link to="/appointments/book">
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-gray-200 focus-visible:ring-orange-500"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <Filter className="h-4 w-4 text-gray-400 hidden md:block mr-1 flex-shrink-0" />
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
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-gray-100 overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !appointments.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm mb-4">
            <Calendar className="h-6 w-6 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No appointments found</h3>
          <p className="text-sm text-gray-400 max-w-sm mt-1.5 mb-6">
            {isCustomer
              ? 'Book your first appointment to get started with your project.'
              : 'No appointments match your current filters.'}
          </p>
          {isCustomer && (
            <Button asChild variant="outline" className="border-gray-200 text-orange-600 hover:bg-orange-50">
              <Link to="/appointments/book">
                Book First Appointment
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appointments.map((appt) => (
            <Link key={appt._id} to={`/appointments/${appt._id}`} className="group block h-full">
              <Card className="h-full border-gray-100 transition-all duration-200 hover:border-orange-100 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden flex flex-col">
                {/* Top color bar */}
                <div
                  className={`h-1 w-full ${
                    appt.status === 'confirmed'
                      ? 'bg-blue-500'
                      : appt.status === 'completed'
                        ? 'bg-emerald-500'
                        : appt.status === 'cancelled'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                  }`}
                />
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`uppercase text-[10px] font-bold tracking-wider ${
                        appt.status === 'confirmed'
                          ? 'border-blue-200 text-blue-700 bg-blue-50'
                          : appt.status === 'completed'
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                            : appt.status === 'cancelled'
                              ? 'border-red-200 text-red-700 bg-red-50'
                              : 'border-amber-200 text-amber-700 bg-amber-50'
                      }`}
                    >
                      {appt.status}
                    </Badge>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {appt.customerName || 'Appointment'}
                      </h3>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-1">
                        {appt.type}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-50 space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span>
                          {appt.date ? format(new Date(appt.date), 'MMM d, yyyy') : '—'} &middot;{' '}
                          <span className="text-gray-700 font-medium">{appt.slotCode}</span>
                        </span>
                      </div>
                      {appt.address && (
                        <div className="flex items-start text-sm text-gray-500">
                          <MapPin className="mr-2 h-3.5 w-3.5 text-gray-400 mt-0.5" />
                          <span className="line-clamp-1">{appt.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
