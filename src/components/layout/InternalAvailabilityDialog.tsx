import { useEffect, useMemo, useState } from 'react';
import { format, startOfDay } from 'date-fns';
import { AlertTriangle, Clock3, UserRoundCheck, Calendar as CalendarIcon, ArrowDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { StaffAvailabilityStatus } from '@/lib/constants';
import type { User } from '@/lib/types';
import { useCloseOwnAvailability, useUpdateOwnAvailability } from '@/hooks/useUsers';
import { useAvailabilityDialogStore } from '@/stores/availability-dialog.store';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface InternalAvailabilityDialogProps {
  user: User | null;
  enforceSetupPrompt: boolean;
}


function formatShiftRange(start?: string, end?: string) {
  if (!start || !end) return 'Shift window not set';
  try {
    return `${format(new Date(start), 'MMM d, yyyy h:mm a')} to ${format(new Date(end), 'MMM d, yyyy h:mm a')}`;
  } catch (e) {
    return 'Invalid shift dates';
  }
}

const PH_TIMEZONE_OFFSET = '+08:00';

const SLOT_CODES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const formatSlotTime = (code: string) => {
  const [hour, minute] = code.split(':');
  const h = parseInt(hour!, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
};

const STATUS_OPTIONS: Array<{ value: StaffAvailabilityStatus; label: string }> = [
  { value: StaffAvailabilityStatus.AVAILABLE, label: 'Available' },
  { value: StaffAvailabilityStatus.UNAVAILABLE, label: 'Unavailable' },
  { value: StaffAvailabilityStatus.ON_LEAVE, label: 'On Leave' },
];

export function InternalAvailabilityDialog({
  user,
  enforceSetupPrompt,
}: InternalAvailabilityDialogProps) {
  const isOpen = useAvailabilityDialogStore((state) => state.isOpen);
  const closeDialog = useAvailabilityDialogStore((state) => state.closeDialog);
  const updateAvailability = useUpdateOwnAvailability();
  const closeAvailability = useCloseOwnAvailability();

  const [status, setStatus] = useState<StaffAvailabilityStatus>(
    user?.availabilityStatus ?? StaffAvailabilityStatus.AVAILABLE,
  );
  const [availabilityNote, setAvailabilityNote] = useState(user?.availabilityNote ?? '');
  






  // Split start date/time
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>('08:00');
  
  // Split end date/time
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<string>('17:00');

  useEffect(() => {
    if (!isOpen || !user) return;
    setStatus(user.availabilityStatus ?? StaffAvailabilityStatus.AVAILABLE);
    setAvailabilityNote(user.availabilityNote ?? '');
    
    const startIso = user.activeShift?.shiftStartAt ?? user.expiredShift?.shiftStartAt;
    const endIso = user.activeShift?.shiftEndAt ?? user.expiredShift?.shiftEndAt;

    if (startIso) {
      const d = new Date(startIso);
      setStartDate(startOfDay(d));
      setStartTime(format(d, 'HH:mm'));
    } else {
      setStartDate(startOfDay(new Date()));
      setStartTime('08:00');
    }

    if (endIso) {
      const d = new Date(endIso);
      setEndDate(startOfDay(d));
      setEndTime(format(d, 'HH:mm'));
    } else {
      setEndDate(startOfDay(new Date()));
      setEndTime('17:00');
    }
  }, [isOpen, user]);

  const hasExpiredShift = Boolean(user?.expiredShift);
  const canCloseExistingAvailability = Boolean(user?.activeShift || user?.expiredShift || user?.availabilityStatus);
  const requiresShift = status === StaffAvailabilityStatus.AVAILABLE;
  const isBusy = updateAvailability.isPending || closeAvailability.isPending;

  const titleCopy = useMemo(() => {
    if (hasExpiredShift) return 'Close your previous availability';
    if (enforceSetupPrompt) return 'Set your availability before continuing';
    return 'Manage your availability';
  }, [enforceSetupPrompt, hasExpiredShift]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (nextOpen) return;
    if (enforceSetupPrompt) return;
    closeDialog();
  };

  const handleSave = async () => {
    if (!user) return;

    if (requiresShift) {
      if (!startDate || !startTime || !endDate || !endTime) {
        toast.error('Shift start and end times are required when marking yourself available.');
        return;
      }

      const startISO = `${format(startDate, 'yyyy-MM-dd')}T${startTime}:00${PH_TIMEZONE_OFFSET}`;
      const endISO = `${format(endDate, 'yyyy-MM-dd')}T${endTime}:00${PH_TIMEZONE_OFFSET}`;

      if (new Date(startISO).getTime() >= new Date(endISO).getTime()) {
        toast.error('Shift end time must be after the shift start time.');
        return;
      }

      const now = new Date();
      if (new Date(endISO).getTime() < now.getTime()) {
        toast.error('Cannot set a shift window that has already ended.');
        return;
      }

      await updateAvailability.mutateAsync({
        availabilityStatus: status,
        availabilityNote: availabilityNote.trim(),
        shiftStartAt: startISO,
        shiftEndAt: endISO,
      });
    } else {
      await updateAvailability.mutateAsync({
        availabilityStatus: status,
        availabilityNote: availabilityNote.trim() || null,
        shiftStartAt: null,
        shiftEndAt: null,
      });
    }

    toast.success(
      status === StaffAvailabilityStatus.AVAILABLE
        ? 'Availability and shift saved.'
        : 'Availability updated.',
    );
    closeDialog();
  };

  const handleCloseAvailability = async () => {
    await closeAvailability.mutateAsync();
    toast.success('Availability closed.');
    if (!enforceSetupPrompt) {
      closeDialog();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent
        className={`sm:max-w-xl rounded-[32px] border-white/10 bg-[#0f172a] shadow-2xl max-h-[95vh] overflow-y-auto ${enforceSetupPrompt ? '[&>button]:hidden' : ''}`}
        onEscapeKeyDown={(event) => {
          if (enforceSetupPrompt) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (enforceSetupPrompt) event.preventDefault();
        }}
      >
        <DialogHeader className="space-y-3 pb-2">
          <DialogTitle className="text-2xl font-black tracking-tight text-white">
            {titleCopy}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-400">
            Set your current working status and shift hours. This data is critical for appointment assignment and team coordination.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(user?.activeShift || user?.expiredShift || user?.availabilityStatus) && (
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm dark:bg-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner",
                    user?.availabilityStatus === StaffAvailabilityStatus.AVAILABLE 
                      ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" 
                      : "bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/20"
                  )}>
                    <UserRoundCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-100">
                      Current: <span className="capitalize">{(user?.availabilityStatus || 'setup_required').replace(/_/g, ' ')}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 font-medium">
                      {user?.expiredShift
                        ? `Expired: ${formatShiftRange(user.expiredShift?.shiftStartAt, user.expiredShift?.shiftEndAt)}`
                        : user?.activeShift
                          ? formatShiftRange(user.activeShift?.shiftStartAt, user.activeShift?.shiftEndAt)
                          : 'No shift currently active'}
                    </p>
                  </div>
                </div>
                {canCloseExistingAvailability && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-xl border border-white/5 bg-white/5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                    disabled={closeAvailability.isPending}
                    onClick={handleCloseAvailability}
                  >
                    {closeAvailability.isPending ? 'Closing...' : 'Close Shift'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {hasExpiredShift && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Your previous shift has ended.</p>
                  <p className="mt-1 text-xs">
                    Close the expired availability first, then set your next status or shift.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-300 tracking-wide uppercase opacity-70 px-1">Availability status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as StaffAvailabilityStatus)}
                disabled={isBusy}
              >
                <SelectTrigger className="h-13 rounded-2xl border-white/10 bg-white/5 text-slate-100 shadow-xl transition-all focus:ring-2 focus:ring-blue-500/20 hover:bg-white/10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/10 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-xl">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="rounded-xl py-3 px-4 focus:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">{option.label}</span>
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          option.value === StaffAvailabilityStatus.AVAILABLE ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-500"
                        )} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-300 tracking-wide uppercase opacity-70 px-1">Availability note</Label>
              <Input
                value={availabilityNote}
                onChange={(event) => setAvailabilityNote(event.target.value.slice(0, 240))}
                placeholder="Message for the team..."
                className="h-13 rounded-2xl border-white/10 bg-white/5 text-slate-100 shadow-xl transition-all focus:ring-2 focus:ring-blue-500/20 hover:bg-white/10 placeholder:text-slate-500"
                disabled={isBusy}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md dark:bg-black/40">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 shadow-lg">
                <Clock3 className="h-6 w-6" />
              </div>
              <div className="min-w-0 pt-1 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold tracking-tight text-white">Shift Windows</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 max-w-[340px]">
                  Select your working hours. Agents can only assign you to appointments that fall within this window.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Shift Start Section */}
              <div className="group relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <Label className="text-[13px] font-bold text-slate-200 tracking-wide uppercase opacity-80">Shift Start</Label>
                  </div>
                  {startDate && (
                    <span className="text-[11px] font-bold text-blue-400/90 bg-blue-400/5 px-2 py-0.5 rounded-md border border-blue-400/10">
                      {format(startDate, 'MMM d')} • {formatSlotTime(startTime)}
                    </span>
                  )}
                </div>
                
                <div className="grid gap-4 sm:grid-cols-[160px,1fr]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!requiresShift || isBusy}
                        className={cn(
                          "h-12 justify-start text-left font-semibold rounded-2xl border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-white/20 text-slate-200",
                          !startDate && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-400" />
                        {startDate ? format(startDate, "MMM d, yyyy") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-white/10 bg-slate-900 shadow-2xl" align="start">
                      <CalendarUI
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        autoFocus
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="flex flex-wrap gap-2">
                    {SLOT_CODES.map((slot) => (
                      <button
                        key={`start-${slot}`}
                        type="button"
                        disabled={!requiresShift || isBusy}
                        onClick={() => setStartTime(slot)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-200",
                          startTime === slot
                            ? "bg-blue-600 border-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] scale-[1.02]"
                            : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-slate-200"
                        )}
                      >
                        {formatSlotTime(slot)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="relative h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-4 dark:bg-[#0f172a]">
                  <ArrowDown className="h-3 w-3 text-slate-500" />
                </div>
              </div>

              {/* Shift End Section */}
              <div className="group relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <Label className="text-[13px] font-bold text-slate-200 tracking-wide uppercase opacity-80">Shift End</Label>
                  </div>
                  {endDate && (
                    <span className="text-[11px] font-bold text-emerald-400/90 bg-emerald-400/5 px-2 py-0.5 rounded-md border border-emerald-400/10">
                      {format(endDate, 'MMM d')} • {formatSlotTime(endTime)}
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-[160px,1fr]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!requiresShift || isBusy}
                        className={cn(
                          "h-12 justify-start text-left font-semibold rounded-2xl border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-white/20 text-slate-200",
                          !endDate && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-emerald-400" />
                        {endDate ? format(endDate, "MMM d, yyyy") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-white/10 bg-slate-900 shadow-2xl" align="start">
                      <CalendarUI
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        autoFocus
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="flex flex-wrap gap-2">
                    {SLOT_CODES.map((slot) => (
                      <button
                        key={`end-${slot}`}
                        type="button"
                        disabled={!requiresShift || isBusy}
                        onClick={() => setEndTime(slot)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-200",
                          endTime === slot
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] scale-[1.02]"
                            : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-slate-200"
                        )}
                      >
                        {formatSlotTime(slot)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-2xl bg-amber-500/5 p-4 border border-amber-500/10">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-200/60">
                The system will automatically notify you via push when your shift ends. You must manually close the availability to stop appearing in agent lookups.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            {!enforceSetupPrompt && (
              <Button 
                type="button" 
                variant="ghost" 
                className="h-12 px-8 rounded-2xl text-slate-400 font-bold hover:text-white hover:bg-white/5" 
                onClick={closeDialog} 
                disabled={isBusy}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              className="h-12 px-8 rounded-2xl bg-blue-600 text-white font-bold shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:bg-blue-500 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:grayscale"
              onClick={handleSave}
              disabled={isBusy}
            >
              {updateAvailability.isPending ? 'Saving...' : 'Save Availability'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
