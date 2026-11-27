import { Link } from 'react-router';
import { CalendarCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { describeCustomerSlotBooking, type CustomerSlotBooking } from '@/lib/customer-slot-booking';

/**
 * Opened from an "Already booked" time slot: the slot is the customer's own appointment, so they
 * can see which one it is and open it. The slot itself stays unbookable.
 */
export function BookedSlotDialog({ booking, onClose }: { booking: CustomerSlotBooking | null; onClose: () => void }) {
  const details = booking ? describeCustomerSlotBooking(booking) : null;
  return (
    <Dialog open={Boolean(booking)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-red-600 dark:text-red-300" />
            You already have an appointment at this time
          </DialogTitle>
          <DialogDescription>Choose another time for the new booking, or open this appointment.</DialogDescription>
        </DialogHeader>
        {booking && details && (
          <div className="space-y-3 rounded-xl border border-[color:var(--color-border)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-card-foreground)]">{details.kind}</p>
                {details.reference && <p className="mt-0.5 text-xs text-[var(--text-metal-color)]">{details.reference}</p>}
              </div>
              <StatusBadge status={details.status.key} label={details.status.label} className="shrink-0" />
            </div>
            <p className="text-sm text-[var(--color-card-foreground)]">{details.when}</p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          {booking && (
            <Button asChild>
              <Link to={`/appointments/${booking.appointmentId}`}>View Appointment</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
