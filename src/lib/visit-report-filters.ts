import { AppointmentStatus, VisitReportStatus } from './constants';

export function normalizeVisitReportStatusFilter(status: string | null): string {
  if (status === 'pending') return VisitReportStatus.DRAFT;
  return status || '';
}

/** Appointment statuses the Appointments list shows as "Completed". */
const FINISHED_APPOINTMENT_STATUSES = new Set<string>([AppointmentStatus.COMPLETED, AppointmentStatus.READY_FOR_OCULAR]);

/**
 * The status to show for a visit report. A submitted report whose appointment is finished reads
 * "Completed", like its appointment does; the stored status stays "submitted" so engineers can
 * still return it.
 */
export function displayVisitReportStatus(report: { status: string; appointmentId?: unknown }): string {
  if (report.status !== VisitReportStatus.SUBMITTED) return report.status;
  const appointment = report.appointmentId;
  const appointmentStatus = appointment && typeof appointment === 'object'
    ? (appointment as { status?: string }).status
    : undefined;
  return appointmentStatus && FINISHED_APPOINTMENT_STATUSES.has(appointmentStatus)
    ? VisitReportStatus.COMPLETED
    : report.status;
}

/** Submitted and Completed depend on the appointment too, so those filters run on the displayed status. */
export function isDisplayedStatusFilter(filter: string): boolean {
  return filter === VisitReportStatus.SUBMITTED || filter === VisitReportStatus.COMPLETED;
}
