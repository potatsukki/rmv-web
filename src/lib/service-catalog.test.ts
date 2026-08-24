import { describe, expect, it } from 'vitest';

import { buildBookingIntentPath } from '@/lib/booking-intent';
import {
  SERVICE_CATALOG,
  findServiceProjectReference,
  getServiceById,
  getServiceProjectReferences,
} from '@/lib/service-catalog';
import { LANDING_SERVICE_VARIANTS } from '@/pages/LandingPage';

describe('service project references', () => {
  it('creates stable design references from the centralized catalog', () => {
    const service = getServiceById('railings');
    expect(service).toBeDefined();

    const [project] = getServiceProjectReferences(service!);
    expect(project).toMatchObject({
      id: 'railings-commercial-stainless-guardrail',
      serviceId: 'railings',
      serviceType: 'railings',
      image: '/landing/services/railings/01-commercial-stainless-guardrail.png',
    });
  });

  it('resolves a landing variant by its catalog-owned image', () => {
    const project = findServiceProjectReference({
      serviceId: 'kitchen-cabinet',
      designId: 'tall-storage',
      designName: 'Tall Stainless Storage Cabinet',
      designImage: '/landing/services/kitchen-cabinet/01-kitchen-cabinet-tall-storage.png',
    });

    expect(project?.title).toBe('Tall storage cabinet');
  });

  it('does not treat arbitrary query data as a catalog design', () => {
    expect(findServiceProjectReference({
      serviceType: 'railings',
      designId: 'made-up-design',
      designName: 'Made Up Design',
      designImage: '/landing/services/railings/not-in-catalog.png',
    })).toBeUndefined();
  });

  it('resolves every selectable landing variant after booking-query continuation', () => {
    const unresolved: string[] = [];

    for (const [serviceType, variants] of Object.entries(LANDING_SERVICE_VARIANTS)) {
      const service = SERVICE_CATALOG.find((item) => item.serviceType === serviceType);
      expect(service, `Missing catalog service for ${serviceType}`).toBeDefined();

      for (const variant of variants || []) {
        const bookingPath = buildBookingIntentPath({
          serviceType,
          serviceId: service!.id,
          designId: variant.id,
          design: variant.title,
          designImage: variant.image,
        });
        const query = new URL(bookingPath, 'https://rmv.local').searchParams;
        const project = findServiceProjectReference({
          serviceId: query.get('serviceId') || undefined,
          serviceType: query.get('serviceType') || undefined,
          designId: query.get('designId') || undefined,
          designName: query.get('design') || undefined,
          designImage: query.get('designImage') || undefined,
        });

        if (project?.image !== variant.image) {
          unresolved.push(`${serviceType}/${variant.id}`);
        }
      }
    }

    expect(unresolved).toEqual([]);
  });
});
