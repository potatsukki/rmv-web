import { Link, useNavigate } from 'react-router';
import { ArrowLeft, CalendarDays, ChevronRight } from 'lucide-react';

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
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import { useTodaySchedule } from '@/hooks/useAppointments';
import { AppointmentType } from '@/lib/constants';
import { formatDeliveryDay } from '@/lib/delivery-schedule';
import type { Appointment } from '@/lib/types';

const HEAD_CLASS = 'text-xs font-semibold uppercase tracking-wider text-[#68727d]';

function slotLabel(slotCode?: string): string {
  const [hour, minute] = String(slotCode || '').split(':').map(Number);
  if (hour === undefined || Number.isNaN(hour)) return '—';
  return `${hour % 12 || 12}:${String(minute || 0).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function typeLabel(appt: Appointment): string {
  return appt.type === AppointmentType.OCULAR ? 'Ocular' : 'Appointment';
}

function addressOf(appt: Appointment): string | undefined {
  return appt.formattedAddress || appt.address || undefined;
}

/**
 * Sales Staff "Today's Schedule" (opened from the dashboard card): my Appointed consultations and
 * ocular visits for today, earliest first. Same list as the card's count.
 */
export function TodaySchedulePage() {
  const navigate = useNavigate();
  const { items, today, isLoading, isError, refetch } = useTodaySchedule();

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f] dark:text-slate-300 dark:hover:text-slate-100"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-slate-100">Today&apos;s Schedule</h1>
          <p className="mt-1 text-sm text-[#68727d] dark:text-slate-400">
            {formatDeliveryDay(today)} · Appointed consultations and ocular visits assigned to you
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="metal-panel space-y-4 rounded-[1.5rem] p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No appointed visits today"
          description="Consultations appear here once they are assigned to you, and ocular visits once they are scheduled for today."
          action={(
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/appointments">Open Appointments</Link>
            </Button>
          )}
        />
      ) : (
        <>
          {/* ── Mobile list (< md) ── */}
          <div className="space-y-2 md:hidden">
            {items.map((appt) => {
              const address = addressOf(appt);
              return (
                <Link key={appt._id} to={`/appointments/${appt._id}`} className="block">
                  <div className="metal-panel rounded-[1.35rem] px-4 py-3.5">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-slate-100">
                      {slotLabel(appt.slotCode)} · {typeLabel(appt)}
                    </p>
                    <p className="mt-1.5 truncate text-[15px] font-medium text-[#171b21] dark:text-slate-100">
                      {appt.customerName || 'Customer'}
                    </p>
                    {address && (
                      <p className="mt-1 truncate text-xs text-[#68727d] dark:text-slate-400">{address}</p>
                    )}
                    <p className="mt-1.5 font-mono text-xs text-[#4f6679] dark:text-sky-300">
                      {appt.appointmentNumber || 'Open'}
                    </p>
                  </div>
                </Link>
              );
            })}
            <p className="px-1 text-xs font-medium text-[#6e6e73] dark:text-slate-400">
              {items.length} visit{items.length !== 1 ? 's' : ''} today
            </p>
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="metal-panel hidden overflow-x-auto rounded-[1.5rem] md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={`pl-5 ${HEAD_CLASS}`}>Time</TableHead>
                  <TableHead className={HEAD_CLASS}>Type</TableHead>
                  <TableHead className={HEAD_CLASS}>Customer</TableHead>
                  <TableHead className={HEAD_CLASS}>Reference</TableHead>
                  <TableHead className="w-10 pr-5"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((appt) => {
                  const address = addressOf(appt);
                  return (
                    <TableRow
                      key={appt._id}
                      onClick={() => navigate(`/appointments/${appt._id}`)}
                      className="group cursor-pointer border-b border-[#e1e6ec] transition-colors hover:bg-white/45 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="whitespace-nowrap py-4 pl-5 text-sm font-medium text-[#1d1d1f] dark:text-slate-100">
                        {slotLabel(appt.slotCode)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-4 text-sm text-[#434c56] dark:text-slate-300">{typeLabel(appt)}</TableCell>
                      <TableCell className="py-4">
                        <p className="truncate text-sm font-medium text-[#171b21] dark:text-slate-100">{appt.customerName || 'Customer'}</p>
                        {address && (
                          <p className="mt-0.5 max-w-[320px] truncate text-xs text-[#68727d] dark:text-slate-400">{address}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-4 font-mono text-xs text-[#4f6679] dark:text-sky-300">
                        <Link
                          to={`/appointments/${appt._id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="underline-offset-4 hover:underline"
                        >
                          {appt.appointmentNumber || 'Open'}
                        </Link>
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
                {items.length} visit{items.length !== 1 ? 's' : ''} today
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
