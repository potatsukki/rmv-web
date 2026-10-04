import { AlertTriangle } from 'lucide-react';
import { getCashPaymentAmountError } from '@/lib/money';

export function CashAmountWarning({
  amount,
  amountDue,
  id,
}: {
  amount: string;
  amountDue: number;
  id: string;
}) {
  if (!amount.trim()) return null;
  const error = getCashPaymentAmountError(Number(amount), amountDue);
  if (!error) return null;

  return (
    <p id={id} role="status" className="flex min-w-0 max-w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{error}</span>
    </p>
  );
}
