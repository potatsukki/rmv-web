import { describe, expect, it } from 'vitest';
import { visitReportHasMeasurements } from './service-specifications';

describe('visitReportHasMeasurements', () => {
  it('counts numbers saved in the service-specific measurements form', () => {
    expect(visitReportHasMeasurements({ specifications: { measurements: { totalRunLength: 67, mountType: 'core_drilled' } } })).toBe(true);
  });

  it('ignores prefilled dropdown defaults with no measured numbers', () => {
    expect(visitReportHasMeasurements({ specifications: { measurements: { mountType: 'core_drilled' } } })).toBe(false);
    expect(visitReportHasMeasurements(null)).toBe(false);
  });
});
