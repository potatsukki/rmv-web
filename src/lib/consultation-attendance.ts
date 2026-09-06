import {
  AppointmentAttendanceStatus,
  AppointmentStatus,
} from '@/lib/constants';

const CONSULTATION_DURATION_MS = 60 * 60 * 1000;
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

  if (now < start) return start;

  const end = new Date(start.getTime() + CONSULTATION_DURATION_MS);
  return now < end ? end : now;
}
