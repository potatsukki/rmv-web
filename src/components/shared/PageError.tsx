import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({ message = 'Something went wrong', onRetry }: PageErrorProps) {
  return (
    <div className="flex h-72 flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-red-400/25 bg-red-400/10">
        <AlertCircle className="h-7 w-7 text-red-200" />
      </div>
      <h3 className="text-base font-semibold text-slate-100">Unable to load</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5 gap-2 rounded-lg border-white/15 bg-white/[.03] text-slate-100 hover:bg-white/[.08] hover:text-white"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
