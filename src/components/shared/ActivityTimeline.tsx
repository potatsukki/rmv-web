import { format } from 'date-fns';
import { History } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { describeAuditDetails, getAuditDisplay } from '@/lib/audit-actions';
import { cn } from '@/lib/utils';
import type { ActivityHistoryItem } from '@/lib/types';

const TARGET_LABELS: Record<string, string> = {
  appointment: 'Appointment',
  visit_report: 'Visit report',
  project: 'Project',
  blueprint: 'Blueprint',
};

interface ActivityTimelineProps {
  items?: ActivityHistoryItem[];
  isLoading?: boolean;
  isError?: boolean;
  /** Shown before each entry when the history mixes several records (e.g. a project's). */
  showTarget?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'MMM d, yyyy · h:mm a');
}

/** Every recorded step, oldest first: what happened, who did it, and when. Staff only. */
export function ActivityTimeline({
  items,
  isLoading,
  isError,
  showTarget = false,
  title = 'Activity',
  description = 'Every recorded step: what happened, who did it, and when.',
  className,
}: ActivityTimelineProps) {
  return (
    <Card className={cn('rounded-2xl', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          {title}
        </CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => <Skeleton key={key} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Unable to load the activity history.</p>
        ) : !items?.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No recorded activity yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-slate-200 pl-6 dark:border-white/10">
            {items.map((item) => {
              const display = getAuditDisplay(item.action);
              const Icon = display.icon;
              const detail = describeAuditDetails(item.details);
              const who = item.actor?.name || (item.automatic ? 'System (automatic)' : 'Unknown user');
              return (
                <li key={item._id} className="relative">
                  <span className={cn(
                    'absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-[#121723]',
                    display.color,
                  )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {showTarget && item.targetType && TARGET_LABELS[item.targetType] && (
                        <span className="mr-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {TARGET_LABELS[item.targetType]}
                        </span>
                      )}
                      {display.label}
                    </p>
                    <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={item.at}>{formatWhen(item.at)}</time>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {who}
                    {detail && <span className="text-slate-500 dark:text-slate-400"> · {detail}</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
