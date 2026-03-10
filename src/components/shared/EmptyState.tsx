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
    <div className={cn('metal-panel flex flex-col items-center justify-center rounded-[1.6rem] border-dashed px-4 py-16 text-center sm:py-20', className)}>
      <div className="silver-sheen mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#4f5863] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_22px_rgba(18,22,27,0.08)]">
        {icon || <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-sm font-semibold text-[#15191f] sm:text-base">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#616a74] sm:text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
