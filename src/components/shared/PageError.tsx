import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({ message = 'Something went wrong', onRetry }: PageErrorProps) {
  return (
    <div className="flex h-72 flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/15">
        <AlertCircle className="h-7 w-7 text-red-500 dark:text-red-300" />
      </div>
      <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-slate-100">Unable to load</h3>
      <p className="mt-1 max-w-sm text-sm text-[#6e6e73] dark:text-slate-300">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5 gap-2 rounded-xl border-[#d2d2d7] text-[#3a3a3e] hover:text-[#1d1d1f] dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-slate-100"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
