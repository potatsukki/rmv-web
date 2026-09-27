import { describe, expect, it } from 'vitest';
import { hasDesignSelection, toggleDesignSelection } from './design-selection';

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
