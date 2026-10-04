import { describe, expect, it } from 'vitest';
import { getCashPaymentAmountError } from './money';

describe('cash payment amount validation', () => {
  it.each([3500, 3000.01, 999_999_999])('blocks %s when only 3000 is due', (amount) => {
    expect(getCashPaymentAmountError(amount, 3000)).toMatch(/cannot exceed.*amount due/i);
  });

  it.each([0, -1, NaN, Infinity, 1e100, 1.005, 0.0000001, 3000.0000001])('blocks invalid amount %s', (amount) => {
    expect(getCashPaymentAmountError(amount, 3000)).not.toBeNull();
  });

  it.each([0.01, 1000.25, 3000])('accepts valid partial or exact payment %s', (amount) => {
    expect(getCashPaymentAmountError(amount, 3000)).toBeNull();
  });

  it('compares cent amounts without floating-point rounding errors', () => {
    expect(getCashPaymentAmountError(0.29, 0.29)).toBeNull();
    expect(getCashPaymentAmountError(0.30, 0.29)).not.toBeNull();
  });

  it('blocks payment when no payable balance exists', () => {
    expect(getCashPaymentAmountError(1, 0)).not.toBeNull();
  });
});
