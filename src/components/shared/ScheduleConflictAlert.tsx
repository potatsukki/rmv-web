import { cn } from '@/lib/utils';
import { formatConflictRequest, type CustomerScheduleConflict } from '@/lib/schedule-conflict';

/** Shown beside the date and time fields when the customer already has an appointment at that time. */
export function ScheduleConflictAlert({ conflict, className }: { conflict: CustomerScheduleConflict; className?: string }) {
  const requested = formatConflictRequest(conflict);
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
        className,
      )}
    >
      <p className="font-semibold">
        Schedule conflict{requested ? `: change ${requested}` : ''}
      </p>
      <p className="mt-1">{conflict.message}</p>
    </div>
  );
}
