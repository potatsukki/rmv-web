import { AlertTriangle } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

export function CashAmountWarning({
  amount,
  amountDue,
  id,
}: {
  amount: string;
  amountDue: number;
  id: string;
}) {
  const enteredAmount = Number(amount);
  if (!Number.isFinite(enteredAmount) || !Number.isFinite(amountDue) || amountDue <= 0) return null;

  const excess = (Math.round(enteredAmount * 100) - Math.round(amountDue * 100)) / 100;
  if (excess <= 0) return null;

  return (
    <p id={id} role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Amount entered is {formatCurrency(excess)} higher than the amount due ({formatCurrency(amountDue)}). Please check the amount before recording.
      </span>
    </p>
  );
}
