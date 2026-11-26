import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Car, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAvailableSlots } from '@/hooks/useAppointments';
import { useScheduleProjectOcular } from '@/hooks/useProjects';
import { fetchSalesStaffLookup } from '@/hooks/useUsers';
import { fetchOcularFeePreview, type MapPoint, type OcularFeePreview } from '@/lib/maps';
import { cn, extractErrorMessage } from '@/lib/utils';
import { conflictForSelection, getCustomerScheduleConflict, type CustomerScheduleConflict } from '@/lib/schedule-conflict';
import { ScheduleConflictAlert } from '@/components/shared/ScheduleConflictAlert';
import { MIN_BOOKING_LEAD_DAYS, OCULAR_MIN_DAYS_AFTER_CONSULTATION } from '@/lib/constants';

const LazyLocationPicker = lazy(() =>
  import('@/components/maps/LocationPicker').then((module) => ({ default: module.LocationPicker })),
);
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export function formatSlotTime(slot: string) {
  const [hour = 0, minute = 0] = slot.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** "45 min", "1 hr 20 min", "2 hr". */
export function formatTravelDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/*
 * Travel time, prep, leave and back times are NOT computed here: the server sends them
 * (OcularSchedule from scheduling/travel-time.ts) so every screen and every availability check agree.
 */

/** Today's date (yyyy-MM-dd) in Asia/Manila, whatever the browser's time zone. */
function manilaToday(now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Asia/Manila yyyy-MM-dd for today + `days`. */
export function localDateAfter(days: number, now: Date = new Date()) {
  return dateAfter(manilaToday(now), days);
}

/**
 * Earliest ocular date: the advance-booking lead from today (Manila), and at least
 * OCULAR_MIN_DAYS_AFTER_CONSULTATION days after the consultation's booked date (same rule as the server).
 */
export function ocularMinDate(consultationDate: string | undefined, now: Date = new Date()) {
  const leadMinDate = localDateAfter(MIN_BOOKING_LEAD_DAYS, now);
  const consultationMinDate = consultationDate
    ? dateAfter(consultationDate.slice(0, 10), OCULAR_MIN_DAYS_AFTER_CONSULTATION)
    : '';
  return {
    consultationDay: consultationDate ? consultationDate.slice(0, 10) : '',
    consultationMinDate,
    minDate: consultationMinDate > leadMinDate ? consultationMinDate : leadMinDate,
  };
}

/** yyyy-MM-dd `days` after a yyyy-MM-dd date. */
function dateAfter(dateStr: string, days: number) {
  const [year = 0, month = 1, day = 1] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatLongDate(dateStr: string) {
  const [year = 0, month = 1, day = 1] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ScheduleOcularDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Consultation date (yyyy-MM-dd); the ocular must be at least 3 days after it. */
  consultationDate?: string;
  /** The project's sales staff: picked by default when free at the chosen date and time. */
  salesStaffId?: string;
}

/** Sales staff schedules the ocular visit agreed face-to-face with the customer. */
export function ScheduleOcularDialog({ projectId, open, onOpenChange, consultationDate, salesStaffId }: ScheduleOcularDialogProps) {
  const scheduleOcular = useScheduleProjectOcular();
  const { consultationDay, consultationMinDate, minDate } = ocularMinDate(consultationDate);
  const [date, setDate] = useState('');
  const [slotCode, setSlotCode] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [sitePin, setSitePin] = useState<MapPoint | null>(null);
  const [siteAddress, setSiteAddress] = useState('');
  const [fee, setFee] = useState<OcularFeePreview | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  // The customer's own appointment at the chosen time; shown until the date or time changes.
  const [scheduleConflict, setScheduleConflict] = useState<CustomerScheduleConflict | null>(null);
  const visibleConflict = conflictForSelection(scheduleConflict, date, slotCode);
  // The pinned site's route: with it, staff are only busy from preparing at the shop until back
  // (travel + traffic allowance + 1.5 hr on site). Before a pin, an ocular visit holds the whole day.
  const route = fee ? { travelMinutes: Math.ceil(fee.route.durationMinutes), distanceKm: fee.route.distanceKm } : undefined;
  // A time is offered when any sales staff member is free; the list below shows who.
  const slots = useAvailableSlots(open ? date : '', 'ocular', { route });
  const staff = useQuery({
    queryKey: ['users', 'sales-staff', 'ocular', date, slotCode, route?.travelMinutes ?? '', route?.distanceKm ?? ''],
    // Anyone with an appointment during the visit's busy time is disabled with the reason.
    queryFn: () => fetchSalesStaffLookup({ date, slotCode, appointmentType: 'ocular', ...route }),
    enabled: open && !!date && !!slotCode,
    staleTime: 0,
  });
  const staffList = staff.data;
  const selectedStaff = staffList?.find((member) => member._id === selectedStaffId);
  // The server's schedule for the picked time (prep, leave, measuring, back), and any one of them for the traffic note.
  const selectedSchedule = slotCode ? fee?.ocularSchedules?.[slotCode] : undefined;
  const anySchedule = fee?.ocularSchedules ? Object.values(fee.ocularSchedules)[0] : undefined;

  // Keep the chosen person while they stay free; otherwise fall back to the project's own staff.
  useEffect(() => {
    if (!staffList) return;
    setSelectedStaffId((current) => {
      const isFree = (id: string) => staffList.some((member) => member._id === id && member.assignmentEligible !== false);
      if (current && isFree(current)) return current;
      return salesStaffId && isFree(salesStaffId) ? salesStaffId : '';
    });
  }, [staffList, salesStaffId]);

  useEffect(() => {
    if (!sitePin) {
      setFee(null);
      setFeeError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setFeeLoading(true);
      setFeeError(null);
      try {
        const preview = await fetchOcularFeePreview(sitePin);
        if (!cancelled) setFee(preview);
      } catch (error) {
        if (!cancelled) {
          setFee(null);
          setFeeError(extractErrorMessage(error, 'Unable to calculate the route to this location. Select a reachable location on mainland Luzon.'));
        }
      } finally {
        if (!cancelled) setFeeLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sitePin]);

  async function handleSchedule() {
    if (!date || !slotCode) {
      toast.error('Select the ocular visit date and time.');
      return;
    }
    if (date < minDate) {
      toast.error(consultationMinDate
        ? `The ocular visit must be at least ${OCULAR_MIN_DAYS_AFTER_CONSULTATION} days after the consultation on ${formatLongDate(consultationDay)}. Choose ${formatLongDate(minDate)} or later.`
        : `Choose ${formatLongDate(minDate)} or later.`);
      return;
    }
    if (!slots.data?.slots.find((slot) => slot.slotCode === slotCode)?.available) {
      toast.error('Select an available ocular visit time.');
      return;
    }
    // If the list could not load, the server falls back to the project's own sales staff.
    if (staff.isSuccess && !selectedStaffId) {
      toast.error('Select the sales staff who will take the ocular visit.');
      return;
    }
    if (!sitePin) {
      toast.error('Pin the project site location.');
      return;
    }
    try {
      await scheduleOcular.mutateAsync({
        id: projectId,
        date,
        slotCode,
        customerLocation: sitePin,
        formattedAddress: siteAddress || undefined,
        salesStaffId: selectedStaffId || undefined,
      });
      toast.success('Ocular visit scheduled.');
      onOpenChange(false);
    } catch (error) {
      setScheduleConflict(getCustomerScheduleConflict(error));
      toast.error(extractErrorMessage(error, 'Failed to schedule the ocular visit.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !scheduleOcular.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Ocular Visit</DialogTitle>
          <DialogDescription>Enter the ocular visit date, time, staff, and project site agreed with the customer.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="schedule-ocular-date">Ocular Visit Date</Label>
            <Input
              id="schedule-ocular-date"
              type="date"
              min={minDate}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSlotCode('');
              }}
            />
            {consultationMinDate && (
              <p className="text-xs text-muted-foreground">
                Earliest date: {formatLongDate(minDate)} (at least {OCULAR_MIN_DAYS_AFTER_CONSULTATION} days after the consultation on {formatLongDate(consultationDay)})
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-ocular-slot">Time Slot</Label>
            <Select value={slotCode} onValueChange={setSlotCode} disabled={!date || slots.isLoading}>
              <SelectTrigger id="schedule-ocular-slot" className="h-11">
                <SelectValue placeholder={slots.isLoading ? 'Checking slots…' : 'Select an available time'} />
              </SelectTrigger>
              <SelectContent>
                {slots.data?.slots.filter((slot) => slot.available).map((slot) => (
                  <SelectItem key={slot.slotCode} value={slot.slotCode}>{formatSlotTime(slot.slotCode)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {date && slots.isError && <p className="text-xs text-destructive">{extractErrorMessage(slots.error, 'Unable to load slots for this date.')}</p>}
            {date && !slots.isLoading && slots.data?.slots.every((slot) => !slot.available) && (
              <p className="text-xs text-destructive">
                No sales staff is free for an ocular visit on this date.{' '}
                {route
                  ? 'Each time needs the staff free from preparing at the shop until back (15 min prep, travel, traffic allowance and 1.5 hr on site), so choose another date.'
                  : 'Until the site is pinned, an ocular visit needs a staff member’s whole day. Pin the site below to see more times, or choose another date.'}
              </p>
            )}
          </div>
          {visibleConflict && <ScheduleConflictAlert conflict={visibleConflict} className="sm:col-span-2" />}

          <div className="space-y-2 sm:col-span-2">
            <div>
              <Label id="schedule-ocular-staff-label">Ocular Staff</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Who will go to the project site. The project stays with its own sales staff. The visit keeps them busy from preparing at the shop until back (15 min prep, travel, traffic allowance and 1.5 hr on site), so anyone with an appointment in that time can&apos;t take it; other times that day stay open.
                {!route && ' Pin the site below to see who is free at this time.'}
              </p>
            </div>
            {!date || !slotCode ? (
              <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Select the date and time first to see who is available.</p>
            ) : staff.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking who is available…</p>
            ) : staff.isError ? (
              <p className="text-xs text-destructive">Unable to load the sales staff list. The project&apos;s own sales staff will take the visit.</p>
            ) : !staffList?.length ? (
              <p className="text-xs text-destructive">No sales staff found.</p>
            ) : (
              <div role="radiogroup" aria-labelledby="schedule-ocular-staff-label" className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {staffList.map((member) => {
                  const eligible = member.assignmentEligible !== false;
                  const selected = selectedStaffId === member._id;
                  return (
                    <button
                      key={member._id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!eligible}
                      onClick={() => setSelectedStaffId(member._id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                        selected ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted',
                        !eligible && 'cursor-not-allowed opacity-60 hover:bg-background',
                      )}
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', eligible ? 'bg-emerald-500' : 'bg-slate-400')} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {member.firstName} {member.lastName}
                          {member._id === salesStaffId && (
                            <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Project staff</span>
                          )}
                        </span>
                        <span className={cn('block text-xs', eligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                          {eligible ? 'Available' : member.assignmentBlockedReason || 'Unavailable'}
                        </span>
                      </span>
                      {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 sm:col-span-2">
            <div>
              <Label>Project Site Map Pin</Label>
              <p className="mt-1 text-xs text-muted-foreground">Search, use the current location, or tap the map to pin the project site. The travel time appears after you pin it.</p>
            </div>
            {open && (
              <Suspense fallback={<div className="flex min-h-56 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
                <LazyLocationPicker
                  value={sitePin}
                  address={siteAddress}
                  onChange={(nextLocation, nextAddress) => {
                    setSitePin(nextLocation);
                    setSiteAddress(nextAddress || '');
                  }}
                />
              </Suspense>
            )}
            {siteAddress && (
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-medium text-muted-foreground">Project site address</p>
                <p className="mt-1 break-words text-sm">{siteAddress}</p>
              </div>
            )}
            {feeLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Calculating travel time and visit fee…</p>
            )}
            {feeError && <p className="text-sm text-destructive">{feeError}</p>}
            {fee && !feeLoading && (
              <>
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <Car className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Travel time: ~{fee.travelLabel ?? formatTravelDuration(fee.route.durationMinutes)} from the RMV shop ({fee.route.distanceKm.toFixed(1)} km)
                  </p>
                  {selectedSchedule && (
                    <>
                      <p className="mt-2 text-xs font-medium">
                        {selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : 'The ocular staff'}&apos;s schedule:
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        <li>Prepare at the shop from {selectedSchedule.prepFrom} ({selectedSchedule.prepMinutes} min)</li>
                        <li>Leave the shop by {selectedSchedule.leaveAt}</li>
                        <li>Measuring {selectedSchedule.onSiteStart}–{selectedSchedule.onSiteEnd} ({formatTravelDuration(selectedSchedule.siteMinutes)})</li>
                        <li>Back at the shop around {selectedSchedule.backAt}</li>
                      </ul>
                      {selectedSchedule.endsAfterWorkday && (
                        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                          The staff gets back after 5:00 PM. Choose an earlier time if possible.
                        </p>
                      )}
                    </>
                  )}
                  {anySchedule && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {anySchedule.nearShop
                        ? 'Near the shop: no traffic allowance added.'
                        : `Includes ${formatTravelDuration(anySchedule.trafficMinutes)} for traffic each way (the route estimate has no live traffic).`}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-semibold">
                    Ocular Visit Fee: {fee.fee.isWithinNCR ? 'FREE (within Metro Manila)' : peso.format(fee.fee.total)}
                  </p>
                  {!fee.fee.isWithinNCR && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      The customer pays this fee from their appointment page. ₱{fee.fee.baseFee} covers the first {fee.fee.baseCoveredKm} km, then ₱{fee.fee.perKmRate}/km. {fee.fee.tollNote || 'Toll fees are shouldered by RMV.'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={scheduleOcular.isPending}>Cancel</Button>
          <Button type="button" onClick={handleSchedule} disabled={scheduleOcular.isPending}>
            {scheduleOcular.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Schedule Ocular Visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
