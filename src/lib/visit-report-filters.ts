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
