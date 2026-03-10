import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="metal-shell min-h-screen">
      <div className="metal-panel hidden h-14 items-center justify-between border-b px-6 md:flex">
        <div className="h-5 w-28 animate-pulse rounded bg-[#d7dde4]" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-56 animate-pulse rounded-xl bg-[#d7dde4]" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-[#d7dde4]" />
          <div className="h-9 w-24 animate-pulse rounded-xl bg-[#d7dde4]" />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-20 md:px-8 md:py-10">
        <div className="flex items-center gap-3 text-[#5d6671]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Loading this page...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="metal-panel rounded-[1.5rem] p-5">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-[#d7dde4]" />
              <div className="mt-5 h-8 w-24 animate-pulse rounded bg-[#d7dde4]" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[#e5e8ed]" />
            </div>
          ))}
        </div>
        <div className="metal-panel rounded-[1.5rem] p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-[#d7dde4]" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-[#d7dde4]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-48 animate-pulse rounded bg-[#d7dde4]" />
                  <div className="h-3 w-24 animate-pulse rounded bg-[#e5e8ed]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
