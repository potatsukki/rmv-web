import type { Appointment } from './types';
import { resolveAppointmentWorkflowStatus } from './workflow-status';

/**
 * Sales Staff "Today's Schedule" (user decision 2026-11-28): every consultation and ocular visit
 * on today's Manila date. The server already limits a Sales Staff member to their own appointments.
 */
export function todayScheduleParams(today: string): Record<string, string> {
  return { date: today, sortBy: 'slotCode', sortOrder: 'asc', limit: '100' };
}

/**
 * Only Appointed visits (under way ones included). A consultation appears once the Appointment
 * Agent or Admin assigns it to the sales staff, which makes it Appointed. Requested and finished
 * visits (Completed, Customer Declined, No Show, Cancelled) are left out.
 */
export function todayScheduleItems(appointments: Appointment[]): Appointment[] {
  return appointments
    .filter((appointment) => resolveAppointmentWorkflowStatus(appointment).key === 'appointment_confirmed')
    .sort((a, b) => String(a.slotCode || '').localeCompare(String(b.slotCode || '')));
}
