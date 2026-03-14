import { Loader2 } from 'lucide-react';

export function LandingPageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-[#0f1419] to-[#1a202a] text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    </div>
  );
}
