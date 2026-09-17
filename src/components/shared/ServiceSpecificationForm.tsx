import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getServiceSpecificationSchema, type SpecificationField, type SpecificationSectionKey } from '@/lib/service-specifications';
import type { ServiceSpecifications } from '@/lib/types';

interface ServiceSpecificationFormProps {
  serviceType?: string;
  value?: ServiceSpecifications;
  onChange: (next: ServiceSpecifications) => void;
  disabled?: boolean;
  sections?: SpecificationSectionKey[];
}

function fieldValue(
  source: ServiceSpecifications | undefined,
  section: SpecificationSectionKey,
  key: string,
) {
  return source?.[section]?.[key];
}

function updateSpecValue(
  current: ServiceSpecifications | undefined,
  section: SpecificationSectionKey,
  key: string,
  value: string | number | boolean,
) {
  const next: ServiceSpecifications = { ...(current || {}) };
  next[section] = {
    ...(next[section] || {}),
    [key]: value,
  };
  return next;
}

function resolvePlaceholder(field: SpecificationField) {
  if (field.placeholder) return field.placeholder;
  const label = field.label.toLowerCase();
  if (field.type === 'select') return `Select ${label}`;
  return `Enter ${label}`;
}

function FieldControl({
  field,
  section,
  value,
  onChange,
  disabled,
}: {
  field: SpecificationField;
  section: SpecificationSectionKey;
  value?: ServiceSpecifications;
  onChange: (next: ServiceSpecifications) => void;
  disabled: boolean;
}) {
  const raw = fieldValue(value, section, field.key);
  const id = `${section}.${field.key}`;

  if (field.type === 'checkbox') {
    return (
      <div className="space-y-1.5">
        <div className="h-[18px]" aria-hidden="true" />
        <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-white/15 dark:bg-white/[0.05]">
          <input
            type="checkbox"
            checked={Boolean(raw)}
            onChange={(e) => onChange(updateSpecValue(value, section, field.key, e.target.checked))}
            disabled={disabled}
            className="h-4 w-4 rounded border-[#c8c8cd] accent-[#6e6e73] focus:ring-[#6e6e73]/20 dark:border-white/20"
          />
          <span className="text-gray-700 dark:text-slate-300">{field.label}</span>
        </label>
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-[12px] font-medium text-gray-600 dark:text-slate-400">
          {field.label}{field.required ? ' *' : ''}
        </Label>
        <Select
          value={typeof raw === 'string' ? raw : ''}
          onValueChange={(next) => onChange(updateSpecValue(value, section, field.key, next))}
          disabled={disabled}
        >
          <SelectTrigger
            id={id}
            className="h-10 rounded-lg border-gray-200 bg-white text-sm text-gray-900 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:border-white/30 dark:focus:ring-[#d6b36a]/20"
          >
            <SelectValue placeholder={resolvePlaceholder(field)} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-[12px] font-medium text-gray-600 dark:text-slate-400">
          {field.label}{field.required ? ' *' : ''}
        </Label>
        <Textarea
          id={id}
          value={typeof raw === 'string' ? raw : ''}
          onChange={(e) => onChange(updateSpecValue(value, section, field.key, e.target.value))}
          placeholder={resolvePlaceholder(field)}
          disabled={disabled}
          rows={2}
          className="min-h-[72px] rounded-lg border-gray-200 text-sm dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
    );
  }

  const isNumber = field.type === 'number';
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[12px] font-medium text-gray-600 dark:text-slate-400">
        {field.label}{field.unit ? ` (${field.unit})` : ''}{field.required ? ' *' : ''}
      </Label>
      <Input
        id={id}
        type={isNumber ? 'number' : 'text'}
        step={isNumber ? '0.01' : undefined}
        value={isNumber ? (typeof raw === 'number' ? raw : '') : (typeof raw === 'string' ? raw : '')}
        onChange={(e) => onChange(updateSpecValue(
          value,
          section,
          field.key,
          isNumber ? (e.target.value ? Number(e.target.value) : '') : e.target.value,
        ))}
        placeholder={resolvePlaceholder(field)}
        disabled={disabled}
        className="h-10 rounded-lg border-gray-200 text-sm dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>
  );
}

export function ServiceSpecificationForm({
  serviceType,
  value,
  onChange,
  disabled = false,
  sections,
}: ServiceSpecificationFormProps) {
  const schema = getServiceSpecificationSchema(serviceType);

  return (
    <div className="space-y-5">
      {schema.sections.filter((section) => !sections || sections.includes(section.key)).map((section) => (
        <div key={section.key} className="space-y-3 rounded-xl border border-[#d8dee6] bg-[#f8fafc] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{section.label}</p>
            {section.warningMessage && (
              <span className="text-xs text-amber-700 dark:text-amber-300">{section.warningMessage}</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={`${section.key}.${field.key}`} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <FieldControl
                  field={field}
                  section={section.key}
                  value={value}
                  onChange={onChange}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
