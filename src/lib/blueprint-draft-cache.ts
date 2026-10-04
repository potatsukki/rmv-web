import type { QuotationInternalCosts } from './types';

export type BlueprintDraftFileCache = {
  name: string;
  type: string;
  size: number;
  key: string;
  uploadedAt: string;
};

export type BlueprintMaterialCostCache = {
  material: string;
  amount: string;
};

export type BlueprintTabDraftCache = {
  blueprintFileMeta: BlueprintDraftFileCache | null;
  designFileMeta: BlueprintDraftFileCache | null;
  costingFileMeta: BlueprintDraftFileCache | null;
  quotInternalCosts: QuotationInternalCosts<string>;
  quotMaterialCosts: BlueprintMaterialCostCache[];
  quotValidityDays: string;
  quotSystemDuration: string;
};

type DraftCacheDefaults = Pick<
  BlueprintTabDraftCache,
  'quotInternalCosts' | 'quotValidityDays' | 'quotSystemDuration'
>;

export function getBlueprintDraftCacheKey(
  projectId: string,
  projectItemId: string | undefined,
  mode: 'blueprint' | 'costing',
  revisionScope?: string,
) {
  return `blueprint-tab-cache:v2:${projectId}:${projectItemId || 'legacy'}:${mode}${revisionScope ? `:${revisionScope}` : ''}`;
}

export function resolveBlueprintDraftCache(
  raw: string | null,
  defaults: DraftCacheDefaults,
): BlueprintTabDraftCache {
  let cached: Partial<BlueprintTabDraftCache> = {};

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        cached = parsed as Partial<BlueprintTabDraftCache>;
      }
    } catch {
      // Treat malformed or outdated cache entries as an empty item draft.
    }
  }

  const cachedInternalCosts = cached.quotInternalCosts;
  const cachedMaterialCosts = Array.isArray(cached.quotMaterialCosts)
    ? cached.quotMaterialCosts.filter((item): item is BlueprintMaterialCostCache => (
      Boolean(item)
      && typeof item.material === 'string'
      && typeof item.amount === 'string'
    ))
    : [];

  return {
    blueprintFileMeta: cached.blueprintFileMeta ?? null,
    designFileMeta: cached.designFileMeta ?? null,
    costingFileMeta: cached.costingFileMeta ?? null,
    quotInternalCosts: {
      ...defaults.quotInternalCosts,
      ...(cachedInternalCosts && typeof cachedInternalCosts === 'object'
        ? cachedInternalCosts
        : {}),
    },
    quotMaterialCosts: cachedMaterialCosts.length > 0
      ? cachedMaterialCosts
      : [{ material: '', amount: '' }],
    quotValidityDays: typeof cached.quotValidityDays === 'string'
      ? cached.quotValidityDays
      : defaults.quotValidityDays,
    quotSystemDuration: typeof cached.quotSystemDuration === 'string'
      ? cached.quotSystemDuration
      : defaults.quotSystemDuration,
  };
}
