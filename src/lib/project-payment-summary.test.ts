import { describe, expect, it } from 'vitest';

import type { PaymentPlan } from './types';
import { summarizeProjectPaymentPlans } from './project-payment-summary';

const plan = (totalAmount: number, status: string): PaymentPlan => ({
  _id: `plan-${totalAmount}`,
  projectId: 'project-1',
  projectItemId: `item-${totalAmount}`,
  totalAmount,
  stages: [{
    stageId: 'stage-1',
    label: 'Down payment',
    percentage: 50,
    amount: totalAmount / 2,
    status,
  }],
  isImmutable: true,
  createdAt: '2026-10-01T00:00:00.000Z',
});

const items = [
  { id: 'kitchen', label: 'Kitchen Counter' },
  { id: 'stairs', label: 'Staircase' },
];

describe('summarizeProjectPaymentPlans', () => {
  it('counts a combined project plan once even though every item returns it', () => {
    const combined = { ...plan(23_131, 'pending'), projectItemId: undefined };
    const summary = summarizeProjectPaymentPlans(items, [combined, combined]);

    expect(summary.combinedTotal).toBe(23_131);
    expect(summary.hasAllPlans).toBe(true);
    expect(summary.rows.map((row) => [row.inCombinedPlan, row.totalAmount])).toEqual([[true, undefined], [true, undefined]]);
  });

  it('shows every item and combines their plan totals', () => {
    const summary = summarizeProjectPaymentPlans(items, [
      plan(70_000, 'verified'),
      plan(45_000, 'proof_submitted'),
    ]);

    expect(summary.combinedTotal).toBe(115_000);
    expect(summary.planCount).toBe(2);
    expect(summary.hasAllPlans).toBe(true);
    expect(summary.rows.map((row) => [row.label, row.totalAmount])).toEqual([
      ['Kitchen Counter', 70_000],
      ['Staircase', 45_000],
    ]);
    expect(summary.allInitialPaymentsVerified).toBe(false);
    expect(summary.outstandingRows[0]?.readinessLabel).toBe('First payment awaiting cashier verification');
  });

  it('explains a missing item plan instead of hiding the item', () => {
    const summary = summarizeProjectPaymentPlans(items, [plan(70_000, 'verified'), undefined]);

    expect(summary.rows[1]).toMatchObject({
      label: 'Staircase',
      totalAmount: undefined,
      readiness: 'plan_missing',
      readinessLabel: 'Payment plan not created',
    });
    expect(summary.combinedTotal).toBe(70_000);
    expect(summary.hasAllPlans).toBe(false);
    expect(summary.allInitialPaymentsVerified).toBe(false);
  });

  it('unlocks fabrication only when every first payment is verified', () => {
    const summary = summarizeProjectPaymentPlans(items, [
      plan(70_000, 'verified'),
      plan(45_000, 'verified'),
    ]);

    expect(summary.allInitialPaymentsVerified).toBe(true);
    expect(summary.outstandingRows).toEqual([]);
  });
});
