import { useState } from 'react';
import { addDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAvailableSlots, useRequestReschedule } from '@/hooks/useAppointments';
import { extractErrorMessage } from '@/lib/utils';

// Rescheduling applies immediately once a date, time, and reason are given — there is
// no agent approval step, so this matches the 3-day minimum advance rule the backend enforces.
const MIN_RESCHEDULE_DATE = format(addDays(new Date(), 3), 'yyyy-MM-dd');

export function RescheduleAppointment({
  appointmentId,
  type,
  onRescheduled,
}: {
  appointmentId: string;
  type: string;
  onRescheduled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [slotCode, setSlotCode] = useState('');
  const [reason, setReason] = useState('');
  const rescheduleMutation = useRequestReschedule();
  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(date, type);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Reschedule
      </Button>
    );
  }

  const handleSubmit = async () => {
    if (!date || !slotCode) {
      toast.error('Please select a new date and time');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for rescheduling');
      return;
    }
    try {
      await rescheduleMutation.mutateAsync({ id: appointmentId, newDate: date, newSlotCode: slotCode, reason: reason.trim() });
      toast.success('Appointment rescheduled.');
      setOpen(false);
      setDate('');
      setSlotCode('');
      setReason('');
      onRescheduled?.();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to reschedule'));
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#d7dce3] bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/40">
      <div className="space-y-1.5">
        <Label htmlFor="reschedule-date">New date</Label>
        <Input
          id="reschedule-date"
          type="date"
          min={MIN_RESCHEDULE_DATE}
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setSlotCode('');
          }}
        />
      </div>
      {date && (
        <div className="space-y-1.5">
          <Label>New time</Label>
          {slotsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {slotsData?.slots.map((slot) => (
                <button
                  key={slot.slotCode}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => setSlotCode(slot.slotCode)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    slotCode === slot.slotCode
                      ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reschedule-reason">Reason</Label>
        <Textarea
          id="reschedule-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Why do you need to reschedule?"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={handleSubmit} disabled={rescheduleMutation.isPending || !date || !slotCode}>
          {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={rescheduleMutation.isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
