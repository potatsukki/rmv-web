export const MAX_PAYMENT_AMOUNT = 999_999_999;

export function isValidPaymentAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_PAYMENT_AMOUNT;
}

export function getCashPaymentAmountError(amount: number, amountDue: number): string | null {
  if (!isValidPaymentAmount(amount)) return 'Enter a valid amount';

  const cents = Math.round(amount * 100);
  if (Number(amount.toFixed(2)) !== amount) {
    return 'Use no more than two decimal places';
  }
  if (!isValidPaymentAmount(amountDue)) return 'No payable balance is available';
  if (cents > Math.round(amountDue * 100)) {
    const due = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amountDue);
    return `Amount cannot exceed the amount due (${due}).`;
  }
  return null;
}

