import { describe, expect, it } from 'vitest';

import type { VisitReport } from './types';
import { mergeVisitReportCacheEntry } from './visit-report-cache';

function report(overrides: Partial<VisitReport> = {}): VisitReport {
  return {
    _id: 'report-1',
    appointmentId: 'appointment-1',
    customerId: 'customer-1',
    salesStaffId: 'sales-1',
    status: 'draft',
    visitType: 'consultation',
    serviceType: 'custom',
    photoKeys: [],
    videoKeys: [],
    sketchKeys: [],
    referenceImageKeys: [],
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeVisitReportCacheEntry', () => {
  it('keeps populated attendance when a save response contains only the appointment ID', () => {
    const populatedAppointment = {
      _id: 'appointment-1',
      attendanceStatus: 'in_progress',
      consultationStartedAt: '2026-08-20T01:00:00.000Z',
    };
    const existing = report({
      appointmentId: populatedAppointment,
      recommendedOcularDate: '2026-08-24',
      recommendedOcularSlot: '09:00',
    });
    const saved = report({ appointmentId: 'appointment-1', notes: 'Saved notes' });

    const merged = mergeVisitReportCacheEntry(existing, saved);

    expect(merged.appointmentId).toEqual(populatedAppointment);
    expect(merged.notes).toBe('Saved notes');
    expect(merged.recommendedOcularDate).toBeUndefined();
    expect(merged.recommendedOcularSlot).toBeUndefined();
  });

  it('uses a newly populated appointment as the authoritative value', () => {
    const existing = report({
      appointmentId: { _id: 'appointment-1', date: '2026-08-20', attendanceStatus: 'in_progress' },
    });
    const saved = report({
      appointmentId: { _id: 'appointment-1', attendanceStatus: 'completed' },
    });

    expect(mergeVisitReportCacheEntry(existing, saved).appointmentId).toEqual({
      _id: 'appointment-1',
      attendanceStatus: 'completed',
    });
  });
});
