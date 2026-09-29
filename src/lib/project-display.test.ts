import { describe, expect, it } from 'vitest';

import { getItemScopedProjectValue } from './project-display';

describe('getItemScopedProjectValue', () => {
  it('does not copy the primary project value into another item', () => {
    expect(getItemScopedProjectValue(undefined, 'Canopy notes', true)).toBeUndefined();
    expect(getItemScopedProjectValue([], [{ label: 'Canopy roof', quantity: 1 }], true)).toEqual([]);
  });

  it('keeps the legacy project fallback for a single-item project', () => {
    expect(getItemScopedProjectValue(undefined, 'Canopy notes', false)).toBe('Canopy notes');
  });

  it('uses the selected item value when it exists', () => {
    expect(getItemScopedProjectValue('Railings notes', 'Canopy notes', true)).toBe('Railings notes');
  });
});
