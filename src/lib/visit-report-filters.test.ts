import { describe, expect, it } from 'vitest';

import { VisitReportStatus } from './constants';
import { normalizeVisitReportStatusFilter } from './visit-report-filters';

describe('normalizeVisitReportStatusFilter', () => {
  it('routes the retired pending filter to draft', () => {
    expect(normalizeVisitReportStatusFilter('pending')).toBe(VisitReportStatus.DRAFT);
  });

  it('preserves supported status filters', () => {
    expect(normalizeVisitReportStatusFilter(VisitReportStatus.RETURNED)).toBe(
      VisitReportStatus.RETURNED,
    );
    expect(normalizeVisitReportStatusFilter(null)).toBe('');
  });
});
