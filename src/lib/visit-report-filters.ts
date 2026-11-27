import { AppointmentStatus, VisitReportStatus } from './constants';

export function normalizeVisitReportStatusFilter(status: string | null): string {
  // Returned has no chip of its own: it is listed under Draft (old links included).
  if (status === 'pending' || status === VisitReportStatus.RETURNED) return VisitReportStatus.DRAFT;
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

/**
 * Filters that run on the loaded reports instead of the API: Submitted and Completed depend on the
 * appointment too, and Draft also covers returned reports (Admin's list API has no combined status).
 */
export function isDisplayedStatusFilter(filter: string): boolean {
  return filter === VisitReportStatus.DRAFT
    || filter === VisitReportStatus.SUBMITTED
    || filter === VisitReportStatus.COMPLETED;
}

/** Attendance outcomes that end a visit without a report (the server refuses to submit one). */
const CLOSED_ATTENDANCE_STATUSES = new Set<string>(['no_show', 'customer_declined', 'rescheduled']);

/**
 * True when the report's appointment ended without a report: cancelled, No Show, Customer Declined
 * or Rescheduled. Its draft can never be submitted, so it is not pending work (same rule as the
 * server's closedWithoutReportFilter, which the dashboard's Pending Reports uses).
 */
export function appointmentClosedWithoutReport(appointmentId: unknown): boolean {
  if (!appointmentId || typeof appointmentId !== 'object') return false;
  const { status, attendanceStatus } = appointmentId as { status?: string; attendanceStatus?: string };
  return status === AppointmentStatus.CANCELLED
    || status === AppointmentStatus.NO_SHOW
    || CLOSED_ATTENDANCE_STATUSES.has(String(attendanceStatus ?? ''));
}

/**
 * Whether a report belongs under a status chip. Draft = still with Sales (draft or returned) and
 * still possible to complete; drafts of appointments that ended without a report stay under All
 * (user decision 2026-11-27: finished appointments are not counted as pending).
 */
export function matchesVisitReportStatusFilter(report: { status: string; appointmentId?: unknown }, filter: string): boolean {
  const status = displayVisitReportStatus(report);
  if (filter === VisitReportStatus.DRAFT) {
    return (status === VisitReportStatus.DRAFT || status === VisitReportStatus.RETURNED)
      && !appointmentClosedWithoutReport(report.appointmentId);
  }
  return status === filter;
}

const VISIT_REPORT_STATUS_LABELS: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'Draft',
  [VisitReportStatus.SUBMITTED]: 'Submitted',
  [VisitReportStatus.RETURNED]: 'Returned',
  [VisitReportStatus.COMPLETED]: 'Completed',
};

/** Status badge for a visit report, the same on every staff page (list, report, project). */
export function visitReportStatusBadge(report: { status: string; appointmentId?: unknown }): { status: string; label: string } {
  const status = displayVisitReportStatus(report);
  return { status, label: VISIT_REPORT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ') };
}

export type SubmittedState =
  | { kind: 'submitted'; at: string }
  /** Submitted, but before submission times were saved (or the backfill has not run). */
  | { kind: 'not_recorded' }
  | { kind: 'not_submitted' };

const SUBMITTED_REPORT_STATUSES = new Set<string>([VisitReportStatus.SUBMITTED, VisitReportStatus.COMPLETED]);

/**
 * When a group of reports was last submitted. Only submitted reports count, and only their own
 * submission time: createdAt / updatedAt are never shown as a submission date.
 */
export function groupSubmittedState(reports: Array<{ status: string; submittedAt?: string }>): SubmittedState {
  const submitted = reports.filter((report) => SUBMITTED_REPORT_STATUSES.has(report.status));
  if (!submitted.length) return { kind: 'not_submitted' };
  const times = submitted
    .map((report) => report.submittedAt)
    .filter((value): value is string => Boolean(value) && !Number.isNaN(new Date(value!).getTime()))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return times[0] ? { kind: 'submitted', at: times[0] } : { kind: 'not_recorded' };
}
