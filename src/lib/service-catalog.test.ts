import { describe, expect, it } from 'vitest';

import { buildBookingIntentPath } from '@/lib/booking-intent';
import {
  SERVICE_CATALOG,
  findServiceProjectReference,
  getServiceById,
  getServiceProjectReferences,
} from '@/lib/service-catalog';
import {
  FEATURED_SERVICES,
  getCustomerServiceDetails,
  LANDING_SERVICE_VARIANTS,
  SERVICE_DETAIL_METADATA,
  toShortCustomerDescription,
} from '@/pages/LandingPage';
import { ServiceType } from '@/lib/constants';

describe('service project references', () => {
  it('uses title case for custom fabrication design names', () => {
    const customService = getServiceById('custom');

    expect(customService?.projects.slice(0, 4).map((project) => project.title)).toEqual([
      'Stainless Storage Cabinet',
      'Food Cart Kiosk Frame',
      'Utility Frame',
      'Stainless Work Table',
    ]);
  });

  it('shows only the fence design under Fences (the gate photos belong to Gates)', () => {
    const fenceService = getServiceById('fences');

    expect(fenceService?.projects.map((project) => project.title)).toEqual(['Custom Metal Fence']);
  });

  it('shows only the staircase design under Staircase (the railing photos belong to Railings)', () => {
    const staircaseService = getServiceById('staircase');

    expect(staircaseService?.projects.map((project) => project.title)).toEqual(['Stainless Staircase Installation']);
  });

  it('shows every service only its own photos, on the service page and in Book Appointment', () => {
    const borrowed: string[] = [];

    for (const service of SERVICE_CATALOG) {
      for (const project of service.projects) {
        const ownPhoto = project.image === service.coverImage
          || project.image.startsWith(`/landing/services/${service.id}/`);
        if (!ownPhoto) borrowed.push(`${service.id}: ${project.title} (${project.image})`);
      }
    }

    expect(borrowed).toEqual([]);
  });

  it('creates stable design references from the centralized catalog', () => {
    const service = getServiceById('railings');
    expect(service).toBeDefined();

    const [project] = getServiceProjectReferences(service!);
    expect(project).toMatchObject({
      id: 'railings-commercial-stainless-guardrail',
      serviceId: 'railings',
      serviceType: 'railings',
      image: '/landing/services/railings/01-commercial-stainless-guardrail.jpg',
    });
  });

  it('resolves a landing variant by its catalog-owned image', () => {
    const project = findServiceProjectReference({
      serviceId: 'kitchen-cabinet',
      designId: 'tall-storage',
      designName: 'Tall Stainless Storage Cabinet',
      designImage: '/landing/services/kitchen-cabinet/01-kitchen-cabinet-tall-storage.jpg',
    });

    expect(project?.title).toBe('Tall Storage Cabinet');
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

describe('landing Our Services modal', () => {
  it('has modal details for every service card, so no card opens an empty dialog', () => {
    const missing = FEATURED_SERVICES
      .filter((service) => !SERVICE_DETAIL_METADATA[service.type])
      .map((service) => service.type);

    expect(missing).toEqual([]);
  });

  it('shows the Staircase and Fences price ranges', () => {
    expect(SERVICE_DETAIL_METADATA[ServiceType.STAIRCASE]?.estimatedPrice).toBe('₱80,000 – ₱250,000 per project');
    expect(SERVICE_DETAIL_METADATA[ServiceType.FENCES]?.estimatedPrice).toBe('₱30,000 – ₱150,000 per project');
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
