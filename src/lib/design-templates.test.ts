import { describe, expect, it } from 'vitest';

import { getDesignTemplates } from './design-templates';
import { SERVICE_CATALOG, getServiceProjectReferences } from './service-catalog';
import { getServiceSpecificationSchema, mergeSpecificationsWithDefaults } from './service-specifications';

describe('project design templates', () => {
  it('shows all seven railing designs from the landing catalog', () => {
    expect(getDesignTemplates('railings')).toHaveLength(7);
  });

  it('mirrors every landing catalog design with its real image', () => {
    for (const service of SERVICE_CATALOG) {
      const references = getServiceProjectReferences(service);
      const templates = getDesignTemplates(service.serviceType);

      expect(templates.map((template) => ({
        id: template.id,
        title: template.title,
        imageUrl: template.imageUrl,
      }))).toEqual(references.map((project) => ({
        id: project.id,
        title: project.title,
        imageUrl: project.image,
      })));
    }
  });

  it('provides automation details for every selectable catalog design', () => {
    for (const service of SERVICE_CATALOG) {
      for (const template of getDesignTemplates(service.serviceType)) {
        expect(template.description.length, template.title).toBeGreaterThan(20);
        expect(template.material.length, template.title).toBeGreaterThan(0);
        expect(template.finish.length, template.title).toBeGreaterThan(0);
        expect(template.preferredDesign.length, template.title).toBeGreaterThan(0);
        expect(template, template.title).not.toHaveProperty('initialDesignNotes');
        expect(template.suggestedLineItems.length, template.title).toBeGreaterThan(0);
        expect(Object.keys(template.suggestedSpecifications || {}).length, template.title).toBeGreaterThan(0);
      }
    }
  });

  it('uses the requested railing balcony details', () => {
    const siteConditionFields = getServiceSpecificationSchema('railings')
      .sections.find((section) => section.key === 'siteConditions')
      ?.fields.map((field) => field.key);
    const specifications = mergeSpecificationsWithDefaults('railings', {
      siteConditions: {
        mountingSurface: 'Concrete balcony',
        balconyEdgeCondition: 'To confirm with customer',
      },
    });

    expect(specifications.siteConditions?.mountingSurface).toBe('Concrete Balcony');
    expect(siteConditionFields).not.toContain('balconyEdgeCondition');
    expect(specifications.siteConditions).not.toHaveProperty('balconyEdgeCondition');
  });

  it('fills missing catalog descriptions and project detail guides', () => {
    for (const service of SERVICE_CATALOG) {
      for (const project of service.projects) {
        expect(project.description?.length, project.title).toBeGreaterThan(20);
        expect(project.detailGroups?.length, project.title).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
