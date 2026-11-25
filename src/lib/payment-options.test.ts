import { describe, expect, it } from 'vitest';
import { inPersonPaymentNote, onlinePaymentMethods, paymentMethodLabel } from './payment-options';

describe('one payment form for every fee', () => {
  it('offers only online methods (no "cash or GCash" choice for the customer)', () => {
    expect(onlinePaymentMethods(false)).toEqual(['gcash']);
    expect(onlinePaymentMethods(true)).toEqual(['gcash', 'qrph']);
    expect(onlinePaymentMethods(true)).not.toContain('cash');
  });

  it('tells the customer where to pay in person', () => {
    expect(inPersonPaymentNote({ bookingId: 'a1' })).toContain('to your sales staff during the ocular visit');
    expect(inPersonPaymentNote({ stageId: 'design-fee-p1' })).toContain('to your sales staff after the ocular visit');
    expect(inPersonPaymentNote({ stageId: 'stage-1' })).toContain('at the RMV office');
    expect(inPersonPaymentNote({ stageId: 'stage-1' })).not.toContain('sales staff');
    expect(inPersonPaymentNote({ bookingId: 'a1' })).toContain('the cashier issues your official receipt');
  });

  it('labels how a recorded payment was paid', () => {
    expect(paymentMethodLabel('gcash')).toBe('GCash');
    expect(paymentMethodLabel('qrph')).toBe('QR Ph');
    expect(paymentMethodLabel('cash')).toBe('Cash');
  });
});
