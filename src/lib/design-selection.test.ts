import { describe, expect, it } from 'vitest';
import { getReportItemCategory, getReportItemKey, getReportItemLabel, hasDesignSelection, toggleDesignSelection } from './design-selection';

describe('multi-category design selection', () => {
  const railing = { id: 'commercial', serviceId: 'railings', name: 'Commercial Railing' };
  const gate = { id: 'commercial', serviceId: 'gates', name: 'Commercial Gate' };

  it('keeps selections from different categories, even when their local IDs match', () => {
    const selected = toggleDesignSelection(toggleDesignSelection([], railing), gate);

    expect(selected).toEqual([railing, gate]);
    expect(hasDesignSelection(selected, railing)).toBe(true);
    expect(hasDesignSelection(selected, gate)).toBe(true);
  });

  it('toggles only the selected design in its own category', () => {
    const selected = toggleDesignSelection([railing, gate], railing);

    expect(selected).toEqual([gate]);
  });
});

describe('visit report items (one item per selected design)', () => {
  const cart = {
    serviceType: 'custom',
    serviceTypeCustom: 'Custom Fabrication',
    selectedDesignTemplateId: 'custom-food-cart-kiosk-frame',
    selectedDesignTemplateName: 'Food Cart Kiosk Frame',
  };

  it('labels a design-backed item with its design name and keeps the category', () => {
    expect(getReportItemLabel(cart)).toBe('Food Cart Kiosk Frame');
    expect(getReportItemCategory(cart)).toBe('Custom Fabrication');
  });

  it('falls back to the service label when the item has no design', () => {
    expect(getReportItemLabel({ serviceType: 'gates' })).toBe('Gates');
    expect(getReportItemLabel({ serviceType: 'custom', serviceTypeCustom: 'Custom Item' })).toBe('Custom Item');
  });

  it('keys items by design so several custom designs stay separate', () => {
    const cabinet = { ...cart, selectedDesignTemplateId: 'custom-stainless-storage-cabinet' };
    expect(getReportItemKey(cart)).not.toBe(getReportItemKey(cabinet));
    expect(getReportItemKey({ serviceType: 'gates' })).toBe('type:gates');
  });
});
