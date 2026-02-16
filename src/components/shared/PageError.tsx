import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({ message = 'Something went wrong', onRetry }: PageErrorProps) {
  return (
    <div className="flex h-72 flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mb-4">
        <AlertCircle className="h-7 w-7 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">Unable to load</h3>
      <p className="mt-1 text-sm text-gray-400 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5 gap-2 border-gray-200 text-gray-600 hover:text-gray-900"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
