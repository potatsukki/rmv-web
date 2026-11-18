import type { Blueprint, BlueprintDraft, DraftDeliveryFee, QuotationDeliveryFee } from './types';

/** Empty strings mean "use the server defaults" (vehicle, trips, crew days, computed amount). */
export const EMPTY_DRAFT_DELIVERY_FEE: DraftDeliveryFee = {
  enabled: true,
  haulingVehicle: '',
  haulingTrips: '',
  crewVehicle: '',
  crewDays: '',
  amount: '',
  overrideReason: '',
};

/** Prefills a costing revision with the delivery choices of the quotation being revised. */
export function toDraftDeliveryFee(fee?: QuotationDeliveryFee | null): DraftDeliveryFee {
  if (!fee) return { ...EMPTY_DRAFT_DELIVERY_FEE };
  const overridden = typeof fee.computedAmount !== 'number' || Boolean(fee.overrideReason);
  return {
    enabled: true,
    haulingVehicle: fee.haulingVehicle || '',
    haulingTrips: String(fee.haulingTrips ?? ''),
    crewVehicle: fee.crewVehicle || '',
    crewDays: String(fee.crewDays ?? ''),
    // Keep a manual amount; a computed one is recomputed from the current rates.
    amount: overridden ? String(fee.amount) : '',
    overrideReason: fee.overrideReason || '',
  };
}

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
    deliveryFee: quotation.deliveryFee
      ? toDraftDeliveryFee(quotation.deliveryFee)
      // An older quotation without a delivery fee stays without one unless the engineer turns it on.
      : { ...EMPTY_DRAFT_DELIVERY_FEE, enabled: false },
    validityDays: String(quotation.validityDays ?? 30),
    workingDays: quotation.workingDays ? String(quotation.workingDays) : '',
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
