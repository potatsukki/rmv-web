import { expect, it } from 'vitest';
import { ServiceType } from './constants';
import { getFieldSuggestions, getServiceSpecificationSchema } from './service-specifications';
import { filterSuggestions } from '@/components/shared/SuggestionInput';

it('offers choices on every free-text specification field except free-form dimensions', () => {
  const missing = Object.values(ServiceType).flatMap((type) => getServiceSpecificationSchema(type).sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === 'text' && !getFieldSuggestions(field).length)
    .map((field) => field.key));
  expect([...new Set(missing)]).toEqual(['primaryDimension']);
});

it('picks field-specific choices before keyword rules', () => {
  expect(getFieldSuggestions({ key: 'roofingMaterial', type: 'text' })).toContain('Polycarbonate');
  expect(getFieldSuggestions({ key: 'stringerMaterial', type: 'text' })).toContain('Stainless 304');
  expect(getFieldSuggestions({ key: 'finishType', type: 'text' })).toContain('Powder Coated');
  expect(getFieldSuggestions({ key: 'railHeight', type: 'number' })).toEqual([]);
});

it('lists every option when the query is empty and filters while typing', () => {
  const options = ['Stainless 304', 'Mild Steel', 'Aluminum'];
  expect(filterSuggestions(options, '')).toEqual(options);
  expect(filterSuggestions(options, 'steel')).toEqual(['Mild Steel']);
});
