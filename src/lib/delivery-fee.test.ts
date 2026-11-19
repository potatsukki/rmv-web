import { describe, expect, it } from 'vitest';

import { describeDeliveryFee, THIRD_PARTY_DELIVERY_LABEL } from './delivery-fee';
import { EMPTY_DRAFT_DELIVERY_FEE } from './blueprint-revision';
import { getBilledDeliveryAmount } from '@/pages/projects/tabs/DeliveryFeeSection';

const rates = [
  { key: 'l300', label: 'L300', baseFee: 800, baseCoveredKm: 10, perKmRate: 40 },
  { key: 'truck', label: 'Truck', baseFee: 1500, baseCoveredKm: 10, perKmRate: 70 },
];

describe('billed delivery amount', () => {
  it('bills the engineer\'s typed estimate as-is', () => {
    expect(getBilledDeliveryAmount({ ...EMPTY_DRAFT_DELIVERY_FEE, amount: '1,800' }, { chargedHere: true })).toBe(1800);
    expect(getBilledDeliveryAmount({ ...EMPTY_DRAFT_DELIVERY_FEE, amount: '' }, { chargedHere: true })).toBe(0);
    expect(getBilledDeliveryAmount({ ...EMPTY_DRAFT_DELIVERY_FEE, amount: '1500' })).toBe(1500);
  });

  it('is zero when turned off or charged on another item', () => {
    expect(getBilledDeliveryAmount({ ...EMPTY_DRAFT_DELIVERY_FEE, enabled: false, amount: '1500' }, { chargedHere: true })).toBe(0);
    expect(getBilledDeliveryAmount({ ...EMPTY_DRAFT_DELIVERY_FEE, amount: '1500' }, {
      chargedHere: false, primaryItemTitle: 'Railing', message: '',
    })).toBe(0);
  });
});

describe('delivery fee label', () => {
  it('labels manual third-party fees and keeps the contract wording of older computed fees', () => {
    const manual = {
      distanceKm: null, haulingTrips: 0, haulingTripCost: 0, hauling: 0, crewDays: 0, crewTripCost: 0, crew: 0,
      computedAmount: null, amount: 1800, ratesSnapshot: [],
    };
    expect(describeDeliveryFee(manual)).toBe(THIRD_PARTY_DELIVERY_LABEL);
    expect(describeDeliveryFee({
      ...manual, distanceKm: 25, haulingVehicle: 'truck', haulingTrips: 1, crewVehicle: 'l300', crewDays: 3, amount: 6750, ratesSnapshot: rates,
    })).toBe('Delivery / Mobilization (25 km · Truck ×1 trip + crew 3 days)');
  });
});
