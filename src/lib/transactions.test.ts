import { describe, expect, it } from 'vitest';
import { buildTransactionParams, formatTransactionMethod } from './transactions';

describe('buildTransactionParams', () => {
  it('drops empty values and "all" choices, trims text, keeps numbers', () => {
    expect(buildTransactionParams({
      search: '  PRJ-2026-00095 ', dateFrom: '', dateTo: '2026-11-10', type: 'all', status: 'verified', method: 'all', page: 2, limit: 25,
    })).toEqual({ search: 'PRJ-2026-00095', dateTo: '2026-11-10', status: 'verified', page: 2, limit: 25 });
  });
});

describe('formatTransactionMethod', () => {
  it('uses readable labels', () => {
    expect(formatTransactionMethod('gcash')).toBe('GCash');
    expect(formatTransactionMethod('bank_transfer')).toBe('Bank Transfer');
    expect(formatTransactionMethod(undefined)).toBe('—');
  });
});
