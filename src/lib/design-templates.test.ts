import { describe, expect, it } from 'vitest';

import { getDesignTemplates } from './design-templates';
import { SERVICE_CATALOG, getServiceProjectReferences } from './service-catalog';

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
        expect(template.initialDesignNotes.length, template.title).toBeGreaterThan(20);
        expect(template.suggestedLineItems.length, template.title).toBeGreaterThan(0);
        expect(Object.keys(template.suggestedSpecifications || {}).length, template.title).toBeGreaterThan(0);
      }
    }
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
