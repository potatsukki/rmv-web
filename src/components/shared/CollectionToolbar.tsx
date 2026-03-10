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
    <div className={cn('rounded-2xl border border-[#c8c8cd]/50 bg-white/75 p-4 shadow-sm backdrop-blur-sm', className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f]">{title}</p>
            <p className="text-xs text-[#86868b]">{description}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <div className={cn('relative w-full', searchWidthClassName)}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                aria-label={searchAriaLabel ?? searchPlaceholder}
                className="h-11 rounded-xl border-[#d2d2d7] bg-white pl-10 pr-4 text-sm focus:border-[#b8b8bd] focus:ring-[#6e6e73]"
              />
            </div>
            {action}
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label={filterGroupLabel}>
          <Filter className="mr-1 hidden h-4 w-4 flex-shrink-0 text-[#86868b] md:block" />
          {filters.map((filter) => (
            <button
              type="button"
              key={filter.value || '__all'}
              onClick={() => onFilterChange(filter.value)}
              aria-pressed={activeFilter === filter.value}
              className={cn(
                'whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e6e73] focus-visible:ring-offset-2',
                activeFilter === filter.value
                  ? 'bg-[#1d1d1f] text-white shadow-sm'
                  : 'bg-[#f0f0f5] text-[#6e6e73] hover:bg-[#e8e8ed] hover:text-[#3a3a3e]',
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