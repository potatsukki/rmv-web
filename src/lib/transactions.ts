import type { TransactionFilters, TransactionType } from '@/lib/types';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  project_payment: 'Project Payment',
  design_fee: 'Design Fee',
  revision_fee: 'Revision Fee',
  ocular_fee: 'Ocular Fee',
};

export const TRANSACTION_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  qrph: 'QR Ph',
  paymongo: 'PayMongo',
  bank_transfer: 'Bank Transfer',
  unspecified: 'Unspecified',
};

export const formatTransactionMethod = (method?: string) =>
  (method ? TRANSACTION_METHOD_LABELS[method] || method.replace(/_/g, ' ') : '—');

/** Query params for /payments/transactions: drops empty values and the "all" choices. */
export function buildTransactionParams(filters: TransactionFilters) {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === 'all') continue;
      params[key] = trimmed;
    } else {
      params[key] = value;
    }
  }
  return params;
}
