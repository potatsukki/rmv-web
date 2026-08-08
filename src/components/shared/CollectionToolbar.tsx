import { Filter, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

interface CollectionToolbarFilter {
  label: string;
  value: string;
}

interface CollectionToolbarProps {
  title: string;
  description: string;
  searchPlaceholder: string;
  searchAriaLabel?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: CollectionToolbarFilter[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  filterGroupLabel?: string;
  className?: string;
  searchWidthClassName?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export function CollectionToolbar({
  title,
  description,
  searchPlaceholder,
  searchAriaLabel,
  searchValue,
  onSearchChange,
  filters,
  activeFilter,
  onFilterChange,
  filterGroupLabel = 'List filters',
  className,
  searchWidthClassName,
  action,
  footer,
}: CollectionToolbarProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,#12171b_0%,#0e1215_100%)] p-5 shadow-[0_18px_44px_rgba(0,0,0,.22)] sm:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="workspace-icon h-12 w-12 shrink-0">
              <Filter className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-xl font-bold tracking-tight text-[#f7f7f5] sm:text-2xl">{title}</p>
              <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
            </div>
          </div>
          {action}
        </div>

        <div className={cn('relative w-full', searchWidthClassName)}>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label={searchAriaLabel ?? searchPlaceholder}
            className="h-12 w-full rounded-lg border border-white/12 bg-black/20 pl-12 pr-4 text-sm font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#f5b400]/70 focus:ring-2 focus:ring-[#f5b400]/15"
          />
        </div>

        {filters.length > 0 && (
          <div
            className="flex flex-wrap gap-3"
            role="group"
            aria-label={filterGroupLabel}
          >
            {filters.map((filter) => (
              <button
                type="button"
                key={filter.value || '__all'}
                onClick={() => onFilterChange(filter.value)}
                aria-pressed={activeFilter === filter.value}
                className={cn(
                  'inline-flex h-11 cursor-pointer items-center gap-3 whitespace-nowrap rounded-lg border px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0d]',
                  activeFilter === filter.value
                    ? 'border-[#f5b400]/75 bg-[#f5b400]/10 text-[#ffd36b]'
                    : 'border-white/10 bg-white/[.035] text-slate-300 hover:border-white/20 hover:bg-white/[.07] hover:text-white',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {footer}
      </div>
    </div>
  );
}
