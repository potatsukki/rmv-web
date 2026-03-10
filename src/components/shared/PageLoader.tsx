import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      <div className="hidden h-14 items-center justify-between border-b border-[#e8e8ed] bg-white/85 px-6 backdrop-blur md:flex">
        <div className="h-5 w-28 animate-pulse rounded bg-[#ececf1]" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-56 animate-pulse rounded-xl bg-[#ececf1]" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-[#ececf1]" />
          <div className="h-9 w-24 animate-pulse rounded-xl bg-[#ececf1]" />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-20 md:px-8 md:py-10">
        <div className="flex items-center gap-3 text-[#6e6e73]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Loading this page...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[#e8e8ed] bg-white p-5 shadow-sm">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-[#ececf1]" />
              <div className="mt-5 h-8 w-24 animate-pulse rounded bg-[#ececf1]" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[#f1f1f4]" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-[#e8e8ed] bg-white p-5 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-[#ececf1]" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-[#ececf1]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-48 animate-pulse rounded bg-[#ececf1]" />
                  <div className="h-3 w-24 animate-pulse rounded bg-[#f1f1f4]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
