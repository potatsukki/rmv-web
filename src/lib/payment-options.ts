import type { GcashTarget } from '@/hooks/useGcash';

/**
 * One way to pay for every fee: the customer pays online now (GCash, or QR Ph where offered), or
 * pays in person (cash or GCash) — RMV records it. The customer no longer picks "cash or GCash"
 * beforehand; whoever receives the payment records how it was paid.
 */
export type OnlinePaymentMethod = 'gcash' | 'qrph';

export function onlinePaymentMethods(hasQrPh: boolean): readonly OnlinePaymentMethod[] {
  return hasQrPh ? ['gcash', 'qrph'] : ['gcash'];
}

export const ONLINE_METHOD_LABELS: Record<OnlinePaymentMethod, string> = {
  gcash: 'GCash',
  qrph: 'QR Ph (PayMongo)',
};

/** How a recorded payment was paid, for the payment history. */
export function paymentMethodLabel(method?: string | null) {
  if (method === 'gcash') return 'GCash';
  if (method === 'qrph') return 'QR Ph';
  if (method === 'bank_transfer') return 'Bank Transfer';
  return 'Cash';
}

/**
 * The note under "Pay online now" about paying in person. The ocular fee and the design fee can
 * also be handed to the sales staff at the ocular visit.
 */
export function inPersonPaymentNote(target: GcashTarget) {
  const where = target.bookingId
    ? 'to your sales staff during the ocular visit, or at the RMV office'
    : target.stageId?.startsWith('design-fee-')
      ? 'to your sales staff after the ocular visit, or at the RMV office'
      : 'at the RMV office';
  return `Or pay in person (cash or GCash) ${where}. RMV records it, and the cashier issues your official receipt.`;
}
