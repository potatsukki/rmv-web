import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('workspace-panel flex flex-col items-center justify-center border-dashed px-4 py-14 text-center sm:py-18', className)}>
      <div className="workspace-icon mb-4 h-14 w-14">
        {icon || <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-100 sm:text-base">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400 sm:text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
