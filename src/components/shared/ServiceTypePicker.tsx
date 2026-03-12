import { useState, useRef, useEffect } from 'react';
import {
  Fence,
  Grid3x3,
  DoorOpen,
  Armchair,
  ChefHat,
  Utensils,
  BookOpen,
  Frame,
  Umbrella,
  ArrowUpFromLine,
  PenTool,
  SquareAsterisk,
  Wrench,
  Layers,
  DoorClosed,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServiceType, SERVICE_TYPE_LABELS } from '@/lib/constants';

interface ServiceTypePickerProps {
  value: string;
  customValue?: string;
  onChange: (serviceType: string, customLabel?: string) => void;
  disabled?: boolean;
}

// Icon mapping for each service type
const SERVICE_TYPE_ICONS: Record<string, LucideIcon> = {
  [ServiceType.RAILINGS]: Fence,
  [ServiceType.GRILLS]: Grid3x3,
  [ServiceType.GATES]: DoorOpen,
  [ServiceType.FENCES]: Fence,
  [ServiceType.KITCHEN_COUNTER]: Utensils,
  [ServiceType.KITCHEN_CABINET]: ChefHat,
  [ServiceType.TABLE]: BookOpen,
  [ServiceType.CHAIR]: Armchair,
  [ServiceType.SHELVING]: Layers,
  [ServiceType.DOOR]: DoorClosed,
  [ServiceType.WINDOW_FRAME]: Frame,
  [ServiceType.CANOPY]: Umbrella,
  [ServiceType.STAIRCASE]: ArrowUpFromLine,
  [ServiceType.BALUSTRADE]: Fence,
  [ServiceType.SIGNAGE]: PenTool,
  [ServiceType.CUSTOM]: Wrench,
};

const SERVICE_TYPES = Object.values(ServiceType);

export function ServiceTypePicker({
  value,
  customValue,
  onChange,
  disabled = false,
}: ServiceTypePickerProps) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState(customValue || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (type: string) => {
    if (type === ServiceType.CUSTOM) {
      onChange(type, customInput);
    } else {
      onChange(type, undefined);
    }
    if (type !== ServiceType.CUSTOM) {
      setOpen(false);
    }
  };

  const displayLabel = value === ServiceType.CUSTOM
    ? (customValue || 'Custom')
    : (SERVICE_TYPE_LABELS[value] || 'Select service type');

  const Icon = SERVICE_TYPE_ICONS[value] || SquareAsterisk;

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <Label className="text-[13px] font-medium text-gray-700 dark:text-slate-300">
        Service Type
      </Label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-3 h-11 rounded-xl border px-3 text-sm transition-all text-left',
          'border-gray-200 bg-gray-50/50 hover:border-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#6e6e73]/20 dark:border-white/15 dark:bg-white/[0.05] dark:hover:border-white/30 dark:focus:ring-[#d6b36a]/30',
          disabled && 'opacity-50 cursor-not-allowed',
          !value && 'text-gray-400 dark:text-slate-500',
        )}
      >
        <div className="rounded-lg bg-[#f0f0f5] p-1.5 dark:bg-white/10">
          <Icon className="h-4 w-4 text-[#1d1d1f] dark:text-slate-100" />
        </div>
        <span className="flex-1 truncate font-medium text-gray-900 dark:text-slate-100">
          {displayLabel}
        </span>
        <svg className={cn('h-4 w-4 text-gray-400 transition-transform dark:text-slate-400', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover Grid */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-[340px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg p-3 animate-in fade-in-0 zoom-in-95 dark:border-white/15 dark:bg-[linear-gradient(180deg,rgba(17,23,30,0.98)_0%,rgba(9,13,18,0.98)_100%)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_TYPES.map((type) => {
              const TypeIcon = SERVICE_TYPE_ICONS[type] || SquareAsterisk;
              const isSelected = value === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelect(type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                    'hover:border-[#6e6e73] hover:bg-[#f0f0f5]/50 dark:hover:border-white/20 dark:hover:bg-white/[0.06]',
                    isSelected
                      ? 'border-[#1d1d1f] bg-[#f0f0f5] ring-2 ring-[#c8c8cd] dark:border-[#d6b36a]/35 dark:bg-[linear-gradient(180deg,rgba(255,248,235,0.92)_0%,rgba(230,216,190,0.82)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:ring-[#d6b36a]/12'
                      : 'border-gray-100 bg-gray-50/50 dark:border-white/8 dark:bg-white/[0.03]',
                  )}
                >
                  <TypeIcon
                    className={cn(
                      'h-5 w-5',
                      isSelected ? 'text-[#1d1d1f] dark:text-[#b8893c]' : 'text-gray-400 dark:text-slate-400',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[11px] font-semibold leading-tight',
                      isSelected ? 'text-[#1d1d1f] dark:text-[#6e4f1d]' : 'text-gray-600 dark:text-slate-300',
                    )}
                  >
                    {SERVICE_TYPE_LABELS[type]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom input */}
          {value === ServiceType.CUSTOM && (
            <div className="mt-3 border-t border-gray-100 pt-3 dark:border-white/10">
              <Input
                placeholder="Describe the custom service..."
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  onChange(ServiceType.CUSTOM, e.target.value);
                }}
                className="h-10 rounded-xl border-gray-200 text-sm dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
