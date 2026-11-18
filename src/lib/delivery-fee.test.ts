import { describe, expect, it } from 'vitest';

import { describeDeliveryFee } from './delivery-fee';
import { EMPTY_DRAFT_DELIVERY_FEE } from './blueprint-revision';
import { getBilledDeliveryAmount } from '@/pages/projects/tabs/DeliveryFeeSection';
import type { DeliveryFeeEstimate } from './types';

const rates = [
  { key: 'l300', label: 'L300', baseFee: 800, baseCoveredKm: 10, perKmRate: 40 },
  { key: 'truck', label: 'Truck', baseFee: 1500, baseCoveredKm: 10, perKmRate: 70 },
];
const estimate: DeliveryFeeEstimate = {
  available: true,
  siteAddress: 'Antipolo',
  defaults: { haulingVehicle: 'truck', haulingTrips: 1, crewVehicle: 'l300', crewDays: 3 },
  breakdown: {
    distanceKm: 25, haulingVehicle: 'truck', haulingTrips: 1, haulingTripCost: 2550, hauling: 2550,
    crewVehicle: 'l300', crewDays: 3, crewTripCost: 1400, crew: 4200, computedAmount: 6750, ratesSnapshot: rates,
  },
  vehicles: rates,
};

describe('billed delivery amount', () => {
  it('uses the computed fee unless the engineer typed an amount', () => {
    expect(getBilledDeliveryAmount(EMPTY_DRAFT_DELIVERY_FEE, estimate)).toBe(6750);
    expect(getBilledDeliveryAmount({ ...EMPTY_DRAFT_DELIVERY_FEE, amount: '5000' }, estimate)).toBe(5000);
  });

  it('is zero when turned off or charged on another item', () => {
    expect(getBilledDeliveryAmount({ ...EMPTY_DRAFT_DELIVERY_FEE, enabled: false }, estimate)).toBe(0);
    expect(getBilledDeliveryAmount(EMPTY_DRAFT_DELIVERY_FEE, {
      available: false, reason: 'charged_on_other_item', message: '', vehicles: rates,
    })).toBe(0);
  });
});

describe('delivery fee label', () => {
  it('matches the contract wording', () => {
    expect(describeDeliveryFee({
      ...estimate.breakdown, amount: 6750,
    })).toBe('Delivery / Mobilization (25 km · Truck ×1 trip + crew 3 days)');
    expect(describeDeliveryFee({
      ...estimate.breakdown, distanceKm: null, haulingTrips: 0, crewDays: 0, amount: 1800,
    })).toBe('Delivery / Mobilization');
  });
});
