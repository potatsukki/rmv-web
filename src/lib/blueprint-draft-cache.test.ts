import { describe, expect, it } from 'vitest';

import {
  getBlueprintDraftCacheKey,
  resolveBlueprintDraftCache,
} from './blueprint-draft-cache';

const defaults = {
  quotInternalCosts: {
    estimatedMaterials: '',
    fabricationWork: '',
    finishingPolishing: '',
    installation: '',
    deliveryMobilization: '',
    overheadMisc: '',
    markupProfit: '',
  },
  quotValidityDays: '30',
  quotSystemDuration: '1-2 Weeks',
};

describe('blueprint draft cache isolation', () => {
  it('keeps revision drafts separate from the initial submission and earlier revisions', () => {
    const revisionKey = getBlueprintDraftCacheKey('project-1', 'item-1', 'blueprint', 'bp-1:blueprint');
    expect(revisionKey).not.toBe(getBlueprintDraftCacheKey('project-1', 'item-1', 'blueprint'));
    expect(revisionKey).not.toBe(getBlueprintDraftCacheKey('project-1', 'item-1', 'blueprint', 'bp-2:blueprint'));
  });
  it('uses a separate cache scope for every project item and workspace', () => {
    expect(getBlueprintDraftCacheKey('project-1', 'item-railings', 'blueprint'))
      .not.toBe(getBlueprintDraftCacheKey('project-1', 'item-grills', 'blueprint'));
    expect(getBlueprintDraftCacheKey('project-1', 'item-railings', 'blueprint'))
      .not.toBe(getBlueprintDraftCacheKey('project-1', 'item-railings', 'costing'));
  });

  it('hydrates a new item with a complete empty form instead of prior item values', () => {
    expect(resolveBlueprintDraftCache(null, defaults)).toEqual({
      blueprintFileMeta: null,
      designFileMeta: null,
      costingFileMeta: null,
      quotMaterialCosts: [{ material: '', amount: '' }],
      ...defaults,
    });
  });

  it('does not retain omitted file fields from a partial item cache', () => {
    const railingsCost = JSON.stringify({
      quotInternalCosts: { estimatedMaterials: '18000' },
    });

    expect(resolveBlueprintDraftCache(railingsCost, defaults)).toMatchObject({
      blueprintFileMeta: null,
      designFileMeta: null,
      costingFileMeta: null,
      quotInternalCosts: {
        estimatedMaterials: '18000',
        fabricationWork: '',
      },
    });
  });

  it('restores material and amount rows for engineer costing', () => {
    const cached = JSON.stringify({
      quotMaterialCosts: [
        { material: 'Stainless steel sheet', amount: '12500' },
        { material: 'Welding rods', amount: '1800' },
      ],
    });

    expect(resolveBlueprintDraftCache(cached, defaults).quotMaterialCosts).toEqual([
      { material: 'Stainless steel sheet', amount: '12500' },
      { material: 'Welding rods', amount: '1800' },
    ]);
  });
});
