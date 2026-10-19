import { useId, useState, type ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// An empty query lists every option, so a prefilled value never hides the choices
// (a native <datalist> filters by the current value and shows nothing).
export function filterSuggestions(options: readonly string[], query: string) {
  const needle = query.trim().toLowerCase();
  return needle ? options.filter((option) => option.toLowerCase().includes(needle)) : [...options];
}

type SuggestionInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'list'> & {
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
};

export function SuggestionInput({ value, options, onValueChange, className, disabled, ...props }: SuggestionInputProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const shown = filterSuggestions(options, query);

  function openList() {
    setQuery('');
    setActive(-1);
    setOpen(true);
  }

  function choose(option: string) {
    onValueChange(option);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        {...props}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        value={value}
        className={cn('pr-10', className)}
        onFocus={openList}
        onClick={() => !open && openList()}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onValueChange(event.target.value);
          setQuery(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) return openList();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive((current) => (current + step + shown.length) % Math.max(shown.length, 1));
          } else if (event.key === 'Enter' && open && shown[active]) {
            event.preventDefault();
            choose(shown[active]);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show options"
        disabled={disabled}
        onMouseDown={(event) => {
          event.preventDefault();
          if (open) setOpen(false);
          else openList();
        }}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground disabled:opacity-50"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && shown.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
        >
          {shown.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-2',
                index === active && 'bg-muted',
                option === value && 'font-semibold text-[#f5b400]',
              )}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
