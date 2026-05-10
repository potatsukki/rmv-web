export const MAX_PAYMENT_AMOUNT = 999_999_999;

export function isValidPaymentAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_PAYMENT_AMOUNT;
}

