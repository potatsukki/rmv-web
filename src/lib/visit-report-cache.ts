import type { VisitReport } from './types';

export function getVisitReportReferenceId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return null;
}

function isReferenceObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

/** Preserve populated appointment fields when a mutation returns only its ID. */
export function mergeVisitReportCacheEntry(
  existing: VisitReport | undefined,
  incoming: VisitReport,
): VisitReport {
  if (!existing || String(existing._id) !== String(incoming._id)) return incoming;

  const existingAppointmentId = getVisitReportReferenceId(existing.appointmentId);
  const incomingAppointmentId = getVisitReportReferenceId(incoming.appointmentId);
  if (!existingAppointmentId || existingAppointmentId !== incomingAppointmentId) {
    return incoming;
  }

  if (!isReferenceObject(existing.appointmentId) || isReferenceObject(incoming.appointmentId)) {
    return incoming;
  }

  return { ...incoming, appointmentId: existing.appointmentId } as VisitReport;
}
