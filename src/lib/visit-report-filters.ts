import { VisitReportStatus } from './constants';

export function normalizeVisitReportStatusFilter(status: string | null): string {
  if (status === 'pending') return VisitReportStatus.DRAFT;
  return status || '';
}
