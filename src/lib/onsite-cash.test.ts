import { describe, expect, it } from 'vitest';
import {
  canRecordOcularCashNow,
  canSubmitOnsiteCash,
  describeCashCollection,
  describeCollectionReceipt,
  isUnpaidOcularFeeStatus,
  ocularFeeAmount,
  ocularFeeAwaitingCash,
  onsiteCashCopy,
} from './onsite-cash';
import type { CashCollection } from './types';

const ocular = (overrides: Record<string, unknown> = {}) => ({
  type: 'ocular',
  status: 'in_progress',
  ocularFee: 650,
  ocularFeePaid: false,
  ocularFeeStatus: 'cash_pending',
  ...overrides,
});

describe('on-site ocular fee cash', () => {
  it('lets the sales staff record the cash only at the site or right after the visit', () => {
    for (const status of ['arrived_at_site', 'in_progress', 'completed']) {
      expect(canRecordOcularCashNow(ocular({ status })), status).toBe(true);
    }
    for (const status of ['confirmed', 'on_the_way', 'cancelled']) {
      expect(canRecordOcularCashNow(ocular({ status })), status).toBe(false);
    }
  });

  it('works whether or not the customer chose cash online', () => {
    expect(canRecordOcularCashNow(ocular({ ocularFeeStatus: 'pending' }))).toBe(true);
    expect(canRecordOcularCashNow(ocular({ ocularFeeStatus: 'declined' }))).toBe(true);
  });

  it('skips paid, free (Metro Manila), waiting-for-cashier, and non-ocular visits', () => {
    expect(ocularFeeAwaitingCash(ocular({ ocularFeePaid: true }))).toBe(false);
    expect(ocularFeeAwaitingCash(ocular({ ocularFee: 0 }))).toBe(false);
    expect(ocularFeeAwaitingCash(ocular({ ocularFeeStatus: 'proof_submitted' }))).toBe(false);
    expect(ocularFeeAwaitingCash(ocular({ type: 'office' }))).toBe(false);
  });

  it('treats pending, the old "pay on-site" choice and a rejected GCash as still payable', () => {
    for (const status of ['pending', 'cash_pending', 'declined']) expect(isUnpaidOcularFeeStatus(status), status).toBe(true);
    for (const status of ['verified', 'proof_submitted', undefined]) expect(isUnpaidOcularFeeStatus(status), String(status)).toBe(false);
  });

  it('falls back to the fee breakdown total', () => {
    expect(ocularFeeAmount({ ocularFeeBreakdown: { total: 590 } })).toBe(590);
  });

  it('asks for the in-person non-refundable acknowledgment only when the customer did not confirm it in the app', () => {
    expect(canSubmitOnsiteCash(true, false)).toBe(true);
    expect(canSubmitOnsiteCash(false, false)).toBe(false);
    expect(canSubmitOnsiteCash(false, true)).toBe(true);
  });

  it('names the fee in the dialog', () => {
    expect(onsiteCashCopy('ocular')).toMatchObject({ title: 'Record Cash Payment', fee: 'ocular fee' });
    expect(onsiteCashCopy('design').acknowledgment).toContain('design fee is non-refundable');
  });
});

describe('Cash Flow collection label', () => {
  const base: CashCollection = {
    _id: 'c1',
    appointmentId: { _id: 'a1', appointmentNumber: 'APT-20261126-0001' },
    salesStaffId: { _id: 's1', firstName: 'Kendl', lastName: 'Reyes' },
    customerId: { _id: 'u1', firstName: 'Juan', lastName: 'Dela Cruz' },
    amountCollected: 650,
    status: 'collected',
    createdAt: '2026-11-26T02:00:00Z',
  };

  it('shows the fee, the customer, and the appointment or project reference', () => {
    expect(describeCashCollection({ ...base, feeType: 'ocular_fee' })).toBe('Ocular Fee · Juan Dela Cruz · APT-20261126-0001');
    expect(describeCashCollection({
      ...base, feeType: 'design_fee', projectId: { _id: 'p1', title: 'Terrace railing', projectNumber: 'PRJ-2026-00120' },
    })).toBe('Design Fee · Juan Dela Cruz · PRJ-2026-00120');
  });

  it('shows the acknowledgement number and whether the official receipt is out', () => {
    expect(describeCollectionReceipt({ collectionNumber: 'CC-2026-00001' })).toBe('Collection No. CC-2026-00001 · OR pending');
    expect(describeCollectionReceipt({ collectionNumber: 'CC-2026-00001', receiptNumber: 'RMV-2026-00042' }))
      .toBe('Collection No. CC-2026-00001 · OR RMV-2026-00042');
    expect(describeCollectionReceipt({})).toBe('');
  });

  it('treats old rows without a fee type as ocular fees', () => {
    expect(describeCashCollection({ ...base, appointmentId: 'a1', customerId: 'u1' })).toBe('Ocular Fee');
  });
});
