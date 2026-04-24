import { Filter, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
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
  searchWidthClassName = 'lg:max-w-md',
  action,
}: CollectionToolbarProps) {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] border border-[#ccd5df] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(245,249,252,0.98)_52%,rgba(236,242,247,0.98)_100%)] p-4 shadow-[0_18px_40px_rgba(23,31,40,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-[#5c6775] dark:bg-[linear-gradient(135deg,rgba(59,72,88,0.96)_0%,rgba(74,88,106,0.96)_55%,rgba(92,108,128,0.96)_100%)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5',
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xl font-semibold tracking-tight text-[#18202a] dark:text-[#f7fbff]">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#5f6d7c] dark:text-[#e4edf7]">{description}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto lg:min-w-[28rem]">
            <div className={cn('relative w-full lg:min-w-[24rem]', searchWidthClassName)}>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5b6a79] dark:text-[#24364a]" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                aria-label={searchAriaLabel ?? searchPlaceholder}
                className="h-14 rounded-[1.35rem] border border-[#c0cad5] bg-white/80 pl-11 pr-5 text-sm font-medium text-[#18202a] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_22px_rgba(26,34,44,0.06)] placeholder:text-[#738190] focus-visible:ring-[#6d8fb3] dark:border-[#9caec4] dark:bg-[linear-gradient(180deg,rgba(237,244,251,0.94)_0%,rgba(226,236,247,0.92)_100%)] dark:text-[#122033] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_26px_rgba(10,18,28,0.14)] dark:placeholder:text-[#5e7185]"
              />
            </div>
            {action}
          </div>
        </div>
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar lg:flex-wrap lg:overflow-visible"
          role="group"
          aria-label={filterGroupLabel}
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#ccd5df] bg-white/78 text-[#556575] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-[#90a1b6] dark:bg-[linear-gradient(180deg,rgba(235,242,250,0.92)_0%,rgba(223,233,245,0.9)_100%)] dark:text-[#324861]">
            <Filter className="h-4 w-4" />
          </div>
          {filters.map((filter) => (
            <button
              type="button"
              key={filter.value || '__all'}
              onClick={() => onFilterChange(filter.value)}
              aria-pressed={activeFilter === filter.value}
              className={cn(
                'whitespace-nowrap rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-[border-color,background-color,box-shadow,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e6e73] focus-visible:ring-offset-2',
                activeFilter === filter.value
                  ? 'relative translate-y-[-1px] overflow-hidden border-[#7ea6c7] bg-white/70 text-[#102134] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_24px_rgba(34,59,88,0.14)] ring-2 ring-[#dfeefa] after:absolute after:inset-x-3 after:bottom-1.5 after:h-[3px] after:rounded-full after:bg-[#7fb5df] dark:border-[#bdd0e3] dark:bg-[linear-gradient(180deg,rgba(234,241,249,0.88)_0%,rgba(219,229,241,0.86)_100%)] dark:text-[#102134] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_22px_rgba(18,30,44,0.14)] dark:ring-[#dfeefa] dark:after:bg-[#7fb5df]'
                  : 'border-[#cad3dd] bg-white/70 text-[#536171] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:-translate-y-0.5 hover:border-[#97a7b8] hover:bg-white hover:text-[#18202a] dark:border-[#98abc0] dark:bg-[linear-gradient(180deg,rgba(234,241,249,0.88)_0%,rgba(219,229,241,0.86)_100%)] dark:text-[#22364c] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] dark:hover:border-[#d7e4f2] dark:hover:bg-[linear-gradient(180deg,rgba(244,248,253,0.96)_0%,rgba(230,238,248,0.94)_100%)] dark:hover:text-[#132131]',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
