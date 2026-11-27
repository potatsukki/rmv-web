import { resolveAppointmentWorkflowStatus, type WorkflowStatus } from './workflow-status';

/** The customer's own appointment behind an "Already booked" slot (sent by the slots API). */
export interface CustomerSlotBooking {
  appointmentId: string;
  appointmentNumber?: string;
  type?: string;
  date: string;
  slotCode: string;
  status?: string;
  attendanceStatus?: string;
  salesStaffAssigned: boolean;
  projectNumber?: string;
}

function formatClock(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** What the "Already booked" dialog shows: kind, number, "Nov 27, 2026 · 1:00 PM – 2:00 PM", status. */
export function describeCustomerSlotBooking(booking: CustomerSlotBooking): {
  kind: string;
  reference: string;
  when: string;
  status: WorkflowStatus;
} {
  const [year = 0, month = 1, day = 1] = booking.date.slice(0, 10).split('-').map(Number);
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const [hour = 0, minute = 0] = booking.slotCode.split(':').map(Number);
  const start = hour * 60 + minute;
  return {
    kind: booking.type === 'ocular' ? 'Ocular Visit' : 'Consultation',
    reference: [booking.appointmentNumber, booking.projectNumber].filter(Boolean).join(' · '),
    // Every appointment holds one hour (the server's overlap rule).
    when: `${dateLabel} · ${formatClock(start)} – ${formatClock(start + 60)}`,
    status: resolveAppointmentWorkflowStatus({
      status: booking.status,
      attendanceStatus: booking.attendanceStatus,
      salesStaffId: booking.salesStaffAssigned ? 'assigned' : undefined,
      type: booking.type,
      date: booking.date,
      slotCode: booking.slotCode,
    }),
  };
}
