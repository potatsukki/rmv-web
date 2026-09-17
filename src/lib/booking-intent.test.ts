import { describe, expect, it } from 'vitest';

import { buildAppointmentPurpose, buildBookingIntentPath } from '@/lib/booking-intent';

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

describe('appointment request from a selected design', () => {
  it('automatically describes the design the customer wants made', () => {
    expect(buildAppointmentPurpose('Commercial Stainless Guardrail')).toBe(
      'I would like to have this design made: Commercial Stainless Guardrail.',
    );
  });

  it('keeps additional customer instructions after the design request', () => {
    expect(buildAppointmentPurpose('Commercial Stainless Guardrail', '  Install beside the entrance.  ')).toBe(
      'I would like to have this design made: Commercial Stainless Guardrail.\n\nInstall beside the entrance.',
    );
  });

  it('keeps custom booking notes without a selected design', () => {
    expect(buildAppointmentPurpose(undefined, 'Custom L-shaped counter')).toBe('Custom L-shaped counter');
    expect(buildAppointmentPurpose()).toBe('');
  });
});
