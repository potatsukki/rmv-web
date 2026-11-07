import { SERVICE_TYPE_LABELS } from '@/lib/constants';
import { getDesignTemplates } from '@/lib/design-templates';

// Older records can hold a label ("Railings") or a snake_case guess instead of the key.
export function toServiceTypeKey(value?: string | null): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (SERVICE_TYPE_LABELS[raw]) return raw;
  const lower = raw.toLowerCase();
  const snake = lower.replace(/[\s-]+/g, '_');
  if (SERVICE_TYPE_LABELS[snake]) return snake;
  return Object.keys(SERVICE_TYPE_LABELS).find((key) => SERVICE_TYPE_LABELS[key]!.toLowerCase() === lower);
}

export function serviceTypeOfDesign(designId?: string | null): string | undefined {
  if (!designId) return undefined;
  return Object.keys(SERVICE_TYPE_LABELS).find((key) => getDesignTemplates(key).some((template) => template.id === designId));
}

/** First real service among the candidates; custom only when nothing else matches. */
export function pickServiceType(candidates: Array<string | null | undefined>): string | undefined {
  const keys = candidates.map(toServiceTypeKey).filter((key): key is string => Boolean(key));
  return keys.find((key) => key !== 'custom') || keys[0];
}
