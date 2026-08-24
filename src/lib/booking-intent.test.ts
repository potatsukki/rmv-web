import { describe, expect, it } from 'vitest';

import { buildBookingIntentPath } from '@/lib/booking-intent';

describe('booking intent URL', () => {
  it('includes the selected service and design references', () => {
    expect(buildBookingIntentPath({
      serviceType: 'kitchen_counter',
      serviceId: 'kitchen-counter',
      designId: 'corner-open-shelf',
      design: 'Corner Counter with Open Shelf',
      designImage: '/landing/services/kitchen-counter/corner.png',
    })).toBe(
      '/appointments/book?serviceType=kitchen_counter&serviceId=kitchen-counter&designId=corner-open-shelf&design=Corner+Counter+with+Open+Shelf&designImage=%2Flanding%2Fservices%2Fkitchen-counter%2Fcorner.png',
    );
  });

  it('omits blank optional values', () => {
    expect(buildBookingIntentPath({
      serviceType: 'railings',
      designId: '  ',
    })).toBe('/appointments/book?serviceType=railings');
  });
});
