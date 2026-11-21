import {
  AppointmentAttendanceStatus,
  AppointmentStatus,
} from '@/lib/constants';

const TERMINAL_ATTENDANCE_STATUSES = new Set<string>([
  AppointmentAttendanceStatus.COMPLETED,
  AppointmentAttendanceStatus.NO_SHOW,
  AppointmentAttendanceStatus.RESCHEDULED,
  AppointmentAttendanceStatus.CUSTOMER_DECLINED,
]);
const AUTOMATABLE_APPOINTMENT_STATUSES = new Set<string>([
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.READY_FOR_OCULAR,
]);

/** A customer is a no-show once this many minutes have passed since the scheduled time (same as the server). */
export const NO_SHOW_GRACE_MINUTES = 15;

function manilaDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function manilaTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(date);
}

export interface NoShowAvailability {
  allowed: boolean;
  /** Why the button is disabled, e.g. "Available on Nov 15 from 10:15 AM". */
  hint?: string;
  /** When it becomes allowed (on the appointment date), so the page can enable the button then. */
  opensAt?: Date;
}

/**
 * A no-show is recorded on the appointment date itself, from 15 minutes after the scheduled time
 * (Manila time); never before, and never on another day. The server enforces the same rule.
 */
export function getNoShowAvailability(
  date: string | undefined,
  slotCode: string | undefined,
  now = new Date(),
): NoShowAvailability {
  const day = String(date ?? '').slice(0, 10);
  const start = new Date(`${day}T${slotCode ?? ''}:00+08:00`);
  if (Number.isNaN(start.getTime())) return { allowed: false, hint: 'This appointment has no scheduled time.' };
  const opensAt = new Date(start.getTime() + NO_SHOW_GRACE_MINUTES * 60 * 1000);
  const today = manilaDate(now);
  const dayLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).format(start);

  if (today > day) return { allowed: false, hint: `No-show could only be recorded on ${dayLabel}.` };
  if (today < day || now < opensAt) {
    return { allowed: false, hint: `Available on ${dayLabel} from ${manilaTime(opensAt)}`, opensAt };
  }
  return { allowed: true };
}

/**
 * Staff reminder for an office consultation that has no check-in yet: the server closes it as a
 * No Show automatically once the grace period passes (processAutomaticConsultationNoShows).
 */
export function getAutoNoShowNotice(
  date: string | undefined,
  slotCode: string | undefined,
  now = new Date(),
): string | undefined {
  const day = String(date ?? '').slice(0, 10);
  const start = new Date(`${day}T${slotCode ?? ''}:00+08:00`);
  if (Number.isNaN(start.getTime())) return undefined;
  const closesAt = new Date(start.getTime() + NO_SHOW_GRACE_MINUTES * 60 * 1000);
  const today = manilaDate(now);
  if (today > day) return undefined;
  if (today === day && now >= closesAt) {
    return `The ${NO_SHOW_GRACE_MINUTES}-minute grace period has passed. Without a check-in, the system marks this consultation as No Show automatically.`;
  }
  const dayLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).format(start);
  return `Check in the customer by ${manilaTime(closesAt)}${today === day ? '' : ` on ${dayLabel}`}. After that, the system marks this consultation as No Show automatically.`;
}

/** A finished attendance only means the customer was there; the consultation is completed separately. */
export function consultationAttendanceLabel(status?: string) {
  return status === AppointmentAttendanceStatus.COMPLETED ? 'Present' : undefined;
}

export function getNextConsultationAttendanceBoundary(
  appointment: {
    type?: string;
    status?: string;
    date?: string;
    slotCode?: string;
    attendanceStatus?: string;
  } | null | undefined,
  now = new Date(),
): Date | undefined {
  if (
    appointment?.type !== 'office'
    || !AUTOMATABLE_APPOINTMENT_STATUSES.has(appointment.status || '')
    || !appointment.date
    || !appointment.slotCode
    || TERMINAL_ATTENDANCE_STATUSES.has(
      appointment.attendanceStatus || AppointmentAttendanceStatus.SCHEDULED,
    )
  ) {
    return undefined;
  }

  const start = new Date(`${appointment.date}T${appointment.slotCode}:00+08:00`);
  if (Number.isNaN(start.getTime())) return undefined;

  // The only automatic change is In Progress at the scheduled start.
  if (now < start) return start;
  return appointment.attendanceStatus === AppointmentAttendanceStatus.IN_PROGRESS ? undefined : now;
}
