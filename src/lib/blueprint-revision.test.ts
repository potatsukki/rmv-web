import { describe, expect, it } from 'vitest';
import { getBlueprintDraftChanges, getRevisionAllowance, getRevisionQuotation, toDraftDeliveryFee } from './blueprint-revision';
import type { Blueprint, BlueprintDraft } from './types';

const file = (key: string) => ({ key, name: key, size: 1, type: 'application/pdf', uploadedAt: '2026-10-04' });
const files: NonNullable<BlueprintDraft['files']> = { blueprint: file('new.pdf'), design: file('new.png'), costing: file('cost.pdf') };
const quotation = { total: '9999' };
const blueprint = (component?: 'blueprint' | 'costing') => ({
  _id: 'bp-1', status: 'revision_requested', revisionComponent: component,
} as Blueprint);

describe('blueprint revision draft changes', () => {
  it('omits quotation and costing files from blueprint-only and legacy revisions', () => {
    for (const component of [undefined, 'blueprint'] as const) {
      expect(getBlueprintDraftChanges(blueprint(component), files, quotation)).toEqual({
        files: { blueprint: files.blueprint, design: files.design },
      });
    }
  });
  it('omits blueprint and design files from costing-only revisions', () => {
    expect(getBlueprintDraftChanges(blueprint('costing'), files, quotation)).toEqual({
      files: { costing: files.costing }, quotation,
    });
  });
  it('keeps the initial submission intact', () => {
    expect(getBlueprintDraftChanges(null, files, quotation)).toEqual({ files, quotation });
  });
  it('restores existing material rows and pricing when starting a costing revision', () => {
    const bp = { ...blueprint('costing'), quotation: {
      total: 6000, validityDays: 45,
      lineItems: [{ label: 'Steel', quantity: 2, materials: 2500, labor: 500, amount: 6000 }],
    } };
    expect(getRevisionQuotation(bp)).toMatchObject({
      total: '6000', validityDays: '45',
      lineItems: [{ label: 'Steel', quantity: 2, materials: '2500', labor: '500' }],
    });
  });
});

describe('delivery fee in costing revisions', () => {
  const fee = {
    distanceKm: 25, haulingVehicle: 'truck', haulingTrips: 1, haulingTripCost: 2550, hauling: 2550,
    crewVehicle: 'l300', crewDays: 3, crewTripCost: 1400, crew: 4200, computedAmount: 6750, amount: 6750,
    ratesSnapshot: [],
  };

  it('keeps the vehicle choices and lets a computed amount follow the current rates', () => {
    expect(toDraftDeliveryFee(fee)).toEqual({
      enabled: true, haulingVehicle: 'truck', haulingTrips: '1', crewVehicle: 'l300', crewDays: '3', amount: '', overrideReason: '',
    });
  });

  it('keeps an amount the engineer changed, with its reason', () => {
    expect(toDraftDeliveryFee({ ...fee, amount: 5000, overrideReason: 'Shared trip' }))
      .toMatchObject({ amount: '5000', overrideReason: 'Shared trip' });
    expect(toDraftDeliveryFee({ ...fee, computedAmount: null, amount: 1800 })).toMatchObject({ amount: '1800' });
  });

  it('starts with delivery off when the revised quotation had none', () => {
    const bp = { ...blueprint('costing'), quotation: { total: 6000 } };
    expect(getRevisionQuotation(bp)?.deliveryFee).toMatchObject({ enabled: false });
    expect(getRevisionQuotation({ ...bp, quotation: { total: 12750, deliveryFee: fee } })?.deliveryFee)
      .toMatchObject({ enabled: true, haulingVehicle: 'truck' });
  });
});

describe('getRevisionAllowance', () => {
  it('keeps revisions 1 to 3 free and charges from revision 4', () => {
    expect(getRevisionAllowance(1)).toEqual({ revisionNumber: 1, freeRemaining: 3, isPaid: false });
    expect(getRevisionAllowance(3)).toEqual({ revisionNumber: 3, freeRemaining: 1, isPaid: false });
    expect(getRevisionAllowance(4)).toEqual({ revisionNumber: 4, freeRemaining: 0, isPaid: true });
    expect(getRevisionAllowance(6, 3)).toMatchObject({ revisionNumber: 6, isPaid: true });
  });
});

