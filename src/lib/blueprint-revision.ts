import type { Blueprint, BlueprintDraft } from './types';

export function getBlueprintDraftChanges(
  blueprint: Blueprint | null | undefined,
  files: NonNullable<BlueprintDraft['files']>,
  quotation: BlueprintDraft['quotation'],
) {
  if (blueprint?.status !== 'revision_requested') return { files, quotation };
  if (blueprint.revisionComponent === 'costing') {
    return { files: { costing: files.costing }, quotation };
  }
  return { files: { blueprint: files.blueprint, design: files.design } };
}

export function getRevisionQuotation(blueprint: Blueprint): BlueprintDraft['quotation'] {
  const quotation = blueprint.quotation;
  if (!quotation) return undefined;
  return {
    ...quotation,
    internalCosts: quotation.internalCosts && Object.fromEntries(
      Object.entries(quotation.internalCosts).map(([key, value]) => [key, String(value)]),
    ),
    costPreset: quotation.costPreset && {
      ...quotation.costPreset,
      suggestedValues: undefined,
    },
    lineItems: quotation.lineItems?.map((item) => ({
      ...item, materials: String(item.materials), labor: String(item.labor),
    })),
    total: String(quotation.total),
    subtotal: String(quotation.subtotal ?? quotation.total),
    discount: String(quotation.discount ?? 0),
    fees: String(quotation.fees ?? 0),
    validityDays: String(quotation.validityDays ?? 30),
  };
}

export const DEFAULT_FREE_REVISIONS = 3;

/**
 * Revision numbering: a request on version N is revision N. The first `freeRevisionLimit`
 * revisions are free; each one after that needs a paid, non-refundable revision fee.
 */
export function getRevisionAllowance(version: number, freeRevisionLimit = DEFAULT_FREE_REVISIONS) {
  const revisionNumber = Math.max(1, Math.floor(version));
  return {
    revisionNumber,
    freeRemaining: Math.max(0, freeRevisionLimit - revisionNumber + 1),
    isPaid: revisionNumber > freeRevisionLimit,
  };
}
