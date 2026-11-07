import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeeBreakdownCard } from './FeeBreakdownCard';
import type { ProjectFeeSummary } from '@/lib/types';

const baseSummary: ProjectFeeSummary = {
  projectId: 'project-1',
  projectCost: 55000,
  designFee: { amount: 1000, status: 'verified', paidAt: null, method: 'cash', referenceNumber: null, receiptNumber: 'RMV-2026-00001' },
  designFeeCredit: 1000,
  ocularFee: { applies: true, amount: 590, status: 'verified', treatment: 'separate', isWithinNCR: false, tollNote: 'Toll fees are shouldered by RMV.' },
  ocularFeeCredit: 0,
  totalCharges: 56590,
  totalCredits: 1000,
  totalAmountDue: 55590,
  paymentsReceived: 1590,
  planPaymentsReceived: 0,
  remainingBalance: 54000,
  hasPaymentPlan: true,
};

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('FeeBreakdownCard', () => {
  it('shows every fee line, the design fee credit, and the balance', () => {
    const html = text(renderToStaticMarkup(<FeeBreakdownCard summary={baseSummary} />));

    expect(html).toContain('Project Cost');
    expect(html).toContain('Design Fee Credit');
    expect(html).toContain('−₱1,000.00');
    expect(html).toContain('Ocular Fee');
    expect(html).toContain('Toll fees are shouldered by RMV.');
    expect(html).toContain('Total Amount Due ₱55,590.00');
    expect(html).toContain('Remaining Balance ₱54,000.00');
    expect(html).not.toContain('Ocular Fee Credit');
  });

  it('shows the ocular fee as free and hides the credit before any design fee is paid', () => {
    const html = text(renderToStaticMarkup(<FeeBreakdownCard summary={{
      ...baseSummary,
      projectCost: null,
      designFee: { ...baseSummary.designFee, status: 'pending', receiptNumber: null },
      designFeeCredit: 0,
      ocularFee: { ...baseSummary.ocularFee, applies: false, amount: 0, status: 'not_applicable', isWithinNCR: true },
    }} />));

    expect(html).toContain('Pending costing');
    expect(html).toContain('Due before blueprint');
    expect(html).toContain('Free');
    expect(html).not.toContain('Design Fee Credit');
  });

  it('shows the ocular fee credit only when the policy deducts it', () => {
    const html = text(renderToStaticMarkup(<FeeBreakdownCard summary={{
      ...baseSummary,
      ocularFee: { ...baseSummary.ocularFee, treatment: 'credit' },
      ocularFeeCredit: 590,
    }} />));

    expect(html).toContain('Ocular Fee Credit');
    expect(html).toContain('−₱590.00');
  });
});
