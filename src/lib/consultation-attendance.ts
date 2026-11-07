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
