import { describe, expect, it } from 'vitest';
import { getDesignTemplates } from '@/lib/design-templates';
import { pickServiceType, serviceTypeOfDesign, toServiceTypeKey } from './service-type-key';

describe('toServiceTypeKey', () => {
  it.each([
    ['railings', 'railings'],
    ['Railings', 'railings'],
    ['Kitchen Counter', 'kitchen_counter'],
    ['kitchen-counter', 'kitchen_counter'],
    ['', undefined],
    ['Spaceship', undefined],
  ])('maps %s to %s', (value, expected) => {
    expect(toServiceTypeKey(value)).toBe(expected);
  });
});

describe('pickServiceType', () => {
  it('takes the first known service and skips custom when a real one exists', () => {
    expect(pickServiceType([undefined, 'custom', 'Railings'])).toBe('railings');
    expect(pickServiceType(['custom'])).toBe('custom');
    expect(pickServiceType([undefined, 'Unknown'])).toBeUndefined();
  });

  it('finds the service of a selected design', () => {
    const railingDesign = getDesignTemplates('railings')[0]!;
    expect(serviceTypeOfDesign(railingDesign.id)).toBe('railings');
    expect(pickServiceType([undefined, serviceTypeOfDesign(railingDesign.id)])).toBe('railings');
  });
});
