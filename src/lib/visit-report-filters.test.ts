import { describe, expect, it } from 'vitest';

import { VisitReportStatus } from './constants';
import { displayVisitReportStatus, normalizeVisitReportStatusFilter } from './visit-report-filters';

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

describe('displayVisitReportStatus', () => {
  it('shows a submitted report as Completed once its appointment is finished', () => {
    expect(displayVisitReportStatus({ status: 'submitted', appointmentId: { _id: 'a1', status: 'completed' } })).toBe('completed');
    expect(displayVisitReportStatus({ status: 'submitted', appointmentId: { _id: 'a1', status: 'ready_for_ocular' } })).toBe('completed');
  });

  it('keeps Submitted while the appointment is still open or not loaded', () => {
    expect(displayVisitReportStatus({ status: 'submitted', appointmentId: { _id: 'a1', status: 'in_progress' } })).toBe('submitted');
    expect(displayVisitReportStatus({ status: 'submitted', appointmentId: 'a1' })).toBe('submitted');
  });

  it('never changes drafts or returned reports', () => {
    expect(displayVisitReportStatus({ status: 'draft', appointmentId: { _id: 'a1', status: 'completed' } })).toBe('draft');
    expect(displayVisitReportStatus({ status: 'returned', appointmentId: { _id: 'a1', status: 'completed' } })).toBe('returned');
  });
});
