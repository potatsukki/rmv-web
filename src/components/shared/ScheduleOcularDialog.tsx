import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAvailableSlots } from '@/hooks/useAppointments';
import { useScheduleProjectOcular } from '@/hooks/useProjects';
import { fetchOcularFeePreview, type MapPoint, type OcularFeePreview } from '@/lib/maps';
import { extractErrorMessage } from '@/lib/utils';
import { MIN_BOOKING_LEAD_DAYS } from '@/lib/constants';

const LazyLocationPicker = lazy(() =>
  import('@/components/maps/LocationPicker').then((module) => ({ default: module.LocationPicker })),
);
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export function formatSlotTime(slot: string) {
  const [hour = 0, minute = 0] = slot.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** Local yyyy-MM-dd for today + `days`. */
export function localDateAfter(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface ScheduleOcularDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sales staff schedules the ocular visit agreed face-to-face with the customer. */
export function ScheduleOcularDialog({ projectId, open, onOpenChange }: ScheduleOcularDialogProps) {
  const scheduleOcular = useScheduleProjectOcular();
  const [date, setDate] = useState('');
  const [slotCode, setSlotCode] = useState('');
  const [sitePin, setSitePin] = useState<MapPoint | null>(null);
  const [siteAddress, setSiteAddress] = useState('');
  const [fee, setFee] = useState<OcularFeePreview | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const slots = useAvailableSlots(open ? date : '', 'ocular');

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
      } catch {
        if (!cancelled) {
          setFee(null);
          setFeeError('Unable to calculate the route to this location. Select a reachable land location.');
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
    if (!slots.data?.slots.find((slot) => slot.slotCode === slotCode)?.available) {
      toast.error('Select an available ocular visit time.');
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
      });
      toast.success('Ocular visit scheduled.');
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to schedule the ocular visit.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !scheduleOcular.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Ocular Visit</DialogTitle>
          <DialogDescription>Enter the ocular visit date, time, and project site agreed with the customer.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="schedule-ocular-date">Ocular Visit Date</Label>
            <Input
              id="schedule-ocular-date"
              type="date"
              min={localDateAfter(MIN_BOOKING_LEAD_DAYS)}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSlotCode('');
              }}
            />
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
              <p className="text-xs text-destructive">No available ocular slots on this date.</p>
            )}
          </div>
          <div className="space-y-3 sm:col-span-2">
            <div>
              <Label>Project Site Map Pin</Label>
              <p className="mt-1 text-xs text-muted-foreground">Search, use the current location, or tap the map to pin the project site.</p>
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
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Calculating visit fee…</p>
            )}
            {feeError && <p className="text-sm text-destructive">{feeError}</p>}
            {fee && !feeLoading && (
              <div className="rounded-lg border bg-background p-3 text-sm">
                <p className="font-semibold">
                  Ocular Visit Fee: {fee.fee.isWithinNCR ? 'FREE (within Metro Manila)' : peso.format(fee.fee.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Distance: {fee.route.distanceKm.toFixed(1)} km · ~{fee.route.durationMinutes} min drive
                  {!fee.fee.isWithinNCR && ' · The customer pays this fee from their appointment page.'}
                </p>
                {!fee.fee.isWithinNCR && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ₱{fee.fee.baseFee} covers the first {fee.fee.baseCoveredKm} km, then ₱{fee.fee.perKmRate}/km. {fee.fee.tollNote || 'Toll fees are shouldered by RMV.'}
                  </p>
                )}
              </div>
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
