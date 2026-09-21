import { describe, expect, it } from 'vitest';

import { DeliveryType, getDefaultDeliveryType, ServiceType } from './constants';

describe('getDefaultDeliveryType', () => {
  it.each([ServiceType.TABLE, ServiceType.CHAIR])(
    'defaults %s to shop-fabricated',
    (serviceType) => {
      expect(getDefaultDeliveryType(serviceType)).toBe(DeliveryType.SHOP_FABRICATED);
    },
  );

  it.each([
    ServiceType.RAILINGS,
    ServiceType.GRILLS,
    ServiceType.GATES,
    ServiceType.FENCES,
    ServiceType.KITCHEN_COUNTER,
    ServiceType.KITCHEN_CABINET,
    ServiceType.DOOR,
    ServiceType.WINDOW_FRAME,
    ServiceType.CANOPY,
    ServiceType.STAIRCASE,
    ServiceType.BALUSTRADE,
  ])('defaults %s to on-site installation', (serviceType) => {
    expect(getDefaultDeliveryType(serviceType)).toBe(DeliveryType.ON_SITE_INSTALLATION);
  });

  it.each([ServiceType.SHELVING, ServiceType.SIGNAGE, ServiceType.CUSTOM])(
    'leaves %s for the project to decide',
    (serviceType) => {
      expect(getDefaultDeliveryType(serviceType)).toBeUndefined();
    },
  );
});
