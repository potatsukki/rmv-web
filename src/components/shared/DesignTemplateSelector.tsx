import { CheckCircle2, Images, FileText } from 'lucide-react';

import { getDesignTemplates, type DesignTemplate } from '@/lib/design-templates';
import { cn } from '@/lib/utils';

interface DesignTemplateSelectorProps {
  serviceType?: string;
  selectedTemplateId?: string;
  onSelect: (template: DesignTemplate) => void;
  disabled?: boolean;
}

export function DesignTemplateSelector({
  serviceType,
  selectedTemplateId,
  onSelect,
  disabled = false,
}: DesignTemplateSelectorProps) {
  const templates = getDesignTemplates(serviceType);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200">
          <Images className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Design Selection</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Pick a pre-made design. The generated project fields remain editable.
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {templates.map((template) => {
          const selected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(template)}
              className={cn(
                'group relative w-[240px] shrink-0 overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all',
                'hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_32px_rgba(37,99,235,0.16)] focus:outline-none focus:ring-2 focus:ring-blue-400/60',
                'dark:bg-slate-950/70 dark:hover:border-blue-400/45 dark:hover:shadow-[0_18px_36px_rgba(37,99,235,0.18)]',
                selected
                  ? 'border-blue-500 ring-2 ring-blue-400/35 dark:border-blue-300'
                  : 'border-gray-200 dark:border-white/10',
                disabled && 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-sm',
              )}
            >
              <div className="flex h-[144px] items-center justify-center border-b border-gray-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:border-white/10 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-sm dark:border-blue-500/25 dark:bg-slate-900 dark:text-blue-300">
                  <FileText className="h-7 w-7" />
                </div>
                {selected && (
                  <div className="absolute right-3 top-3 rounded-full bg-blue-500 p-1.5 text-white shadow-lg">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <p className="text-sm font-semibold text-gray-950 dark:text-slate-100">{template.title}</p>
                <p className="line-clamp-2 text-xs text-gray-500 dark:text-slate-400">Pre-made design option for customer selection.</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
