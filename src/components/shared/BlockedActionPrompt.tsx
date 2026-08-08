import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BlockedActionPromptProps = {
  title: string;
  reason: string;
  actionLabel?: string;
  actionPath?: string;
  className?: string;
};

export function BlockedActionPrompt({
  title,
  reason,
  actionLabel,
  actionPath,
  className,
}: BlockedActionPromptProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-amber-300/60 bg-[linear-gradient(180deg,#fff9eb_0%,#f6edd7_100%)] p-3',
        'dark:border-amber-700/60 dark:bg-amber-950/30',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-800 dark:text-amber-200">
            {title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            {reason}
          </p>
          {actionLabel && actionPath && (
            <Button size="sm" variant="outline" className="mt-2 h-7 rounded-lg text-xs" asChild>
              <Link to={actionPath}>{actionLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
