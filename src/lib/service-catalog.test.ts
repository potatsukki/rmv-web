import { describe, expect, it } from 'vitest';

import { buildBookingIntentPath } from '@/lib/booking-intent';
import {
  SERVICE_CATALOG,
  findServiceProjectReference,
  getServiceById,
  getServiceProjectReferences,
} from '@/lib/service-catalog';
import {
  getCustomerServiceDetails,
  LANDING_SERVICE_VARIANTS,
  toShortCustomerDescription,
} from '@/pages/LandingPage';

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

describe('customer-facing service details', () => {
  it('shows only the seven useful quotation details for a railing design', () => {
    const [railing] = LANDING_SERVICE_VARIANTS.railings ?? [];
    if (!railing) throw new Error('Missing railing design fixture');
    const details = getCustomerServiceDetails(railing.confirmationGroups);

    expect(details).toHaveLength(7);
    expect(details.map((item) => item.label)).toEqual([
      'Approximate Length',
      'Preferred Height',
      'Rail Count / Style',
      'Material & Finish',
      'Installation Location / Surface',
      'Site Photos',
      'Optional Add-ons',
    ]);
    expect(details.find((item) => item.label === 'Material & Finish')?.value).toContain(
      'Standard Stainless or Outdoor / Corrosion Resistant',
    );
    expect(details.find((item) => item.label === 'Installation Location / Surface')?.value).toBe(
      'Concrete / tile / steel base',
    );
    expect(JSON.stringify(details)).not.toMatch(/SS304|SS316|Post Spacing|Tube Size|Thickness \/ Gauge|Anchor Type/);
  });

  it('keeps every design summary short and free of fabrication-only fields', () => {
    for (const variants of Object.values(LANDING_SERVICE_VARIANTS)) {
      for (const variant of variants || []) {
        const details = getCustomerServiceDetails(variant.confirmationGroups);

        expect(details.length, variant.title).toBeGreaterThanOrEqual(5);
        expect(details.length, variant.title).toBeLessThanOrEqual(7);
        expect(JSON.stringify(details), variant.title).not.toMatch(
          /SS201|SS304|SS316|Post Spacing|Tube Size|Thickness \/ Gauge|Anchor Type|chemical anchors/i,
        );
      }
    }
  });

  it('limits customer descriptions to one short sentence', () => {
    expect(toShortCustomerDescription('First sentence. Second sentence with technical detail.')).toBe('First sentence.');
    expect(toShortCustomerDescription('A short description without punctuation')).toBe(
      'A short description without punctuation',
    );
  });
});
