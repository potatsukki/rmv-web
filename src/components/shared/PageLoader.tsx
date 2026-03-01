import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex h-72 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#6e6e73]" />
        <p className="text-xs text-[#86868b] font-medium">Loading...</p>
      </div>
    </div>
  );
}
