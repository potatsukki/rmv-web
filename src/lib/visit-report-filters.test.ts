import { describe, expect, it } from 'vitest';

import { VisitReportStatus } from './constants';
import {
  displayVisitReportStatus,
  groupSubmittedState,
  normalizeVisitReportStatusFilter,
  visitReportStatusBadge,
} from './visit-report-filters';

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

describe('visitReportStatusBadge (same report on every staff page)', () => {
  // One finished ocular report, as two pages receive it.
  const fromVisitReportsList = {
    _id: 'r1', status: 'submitted',
    appointmentId: { _id: 'a1', date: '2026-11-16', slotCode: '09:00', type: 'ocular', status: 'completed' },
  };
  const fromProjectDetail = { _id: 'r1', status: 'submitted', appointmentId: { _id: 'a1', status: 'completed' } };

  it('reads Completed in the Visit Reports list and on the project page', () => {
    expect(visitReportStatusBadge(fromVisitReportsList)).toEqual({ status: 'completed', label: 'Completed' });
    expect(visitReportStatusBadge(fromProjectDetail)).toEqual({ status: 'completed', label: 'Completed' });
  });

  it('reads Completed for a stored completed report even without its appointment', () => {
    expect(visitReportStatusBadge({ status: 'completed', appointmentId: 'a1' })).toEqual({ status: 'completed', label: 'Completed' });
    expect(visitReportStatusBadge({ status: 'completed' })).toEqual({ status: 'completed', label: 'Completed' });
  });

  it('labels the other statuses in title case, never the raw value', () => {
    expect(visitReportStatusBadge({ status: 'submitted', appointmentId: 'a1' }).label).toBe('Submitted');
    expect(visitReportStatusBadge({ status: 'returned' }).label).toBe('Returned');
    expect(visitReportStatusBadge({ status: 'draft' }).label).toBe('Draft');
  });
});

describe('groupSubmittedState', () => {
  it('uses the latest submission time of the submitted reports', () => {
    expect(groupSubmittedState([
      { status: 'submitted', submittedAt: '2026-11-16T03:00:00.000Z' },
      { status: 'completed', submittedAt: '2026-11-16T05:00:00.000Z' },
    ])).toEqual({ kind: 'submitted', at: '2026-11-16T05:00:00.000Z' });
  });

  it('says Not recorded for a submitted report from before submission times were saved', () => {
    expect(groupSubmittedState([{ status: 'submitted' }])).toEqual({ kind: 'not_recorded' });
    expect(groupSubmittedState([{ status: 'completed', submittedAt: '' }])).toEqual({ kind: 'not_recorded' });
  });

  it('ignores a time left on a draft or returned report', () => {
    expect(groupSubmittedState([{ status: 'draft', submittedAt: '2026-11-10T02:00:00.000Z' }])).toEqual({ kind: 'not_submitted' });
    expect(groupSubmittedState([
      { status: 'returned', submittedAt: '2026-11-10T02:00:00.000Z' },
      { status: 'completed' },
    ])).toEqual({ kind: 'not_recorded' });
  });

  it('never falls back to createdAt or updatedAt', () => {
    const report = { status: 'submitted', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' };
    expect(groupSubmittedState([report])).toEqual({ kind: 'not_recorded' });
  });
});
