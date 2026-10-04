import { expect, it } from 'vitest';
import { getDesignTemplates } from './design-templates';
import { cleanSalesNotes, combineSalesNotes } from './sales-notes';
import { SERVICE_TYPE_LABELS } from './constants';

it('recognizes every current catalog default without leaving generated sales notes', () => {
  for (const service of Object.keys(SERVICE_TYPE_LABELS)) {
    for (const template of getDesignTemplates(service)) {
      expect(cleanSalesNotes(template.initialDesignNotes), template.title).toBe('');
    }
  }
});

it('removes catalog defaults but preserves handwritten additions', () => {
  const generated = getDesignTemplates('railings')[0]!.initialDesignNotes;
  expect(cleanSalesNotes(generated)).toBe('');
  expect(cleanSalesNotes(`${generated}\n\nUse grade 316 near the coast.\nCustomer requested a wider gate.`))
    .toBe('Use grade 316 near the coast.\nCustomer requested a wider gate.');
});

it('keeps handwritten notes including changes to a template paragraph', () => {
  const edited = getDesignTemplates('railings')[0]!.initialDesignNotes.replace('Confirm final measurements', 'Sales confirmed final measurements');
  expect(cleanSalesNotes(edited)).toBe(edited);
  expect(cleanSalesNotes('Selected from the catalog; customer wants custom posts.')).toBe('Selected from the catalog; customer wants custom posts.');
  expect(cleanSalesNotes(undefined)).toBe('');
});

it('keeps distinct legacy handwritten notes when merging the flow into one textbox', () => {
  const generated = getDesignTemplates('railings')[0]!.initialDesignNotes;
  expect(combineSalesNotes(generated, 'Customer wants grade 316.', 'Customer wants grade 316.', 'Confirm ramp slope on site.'))
    .toBe('Customer wants grade 316.\n\nConfirm ramp slope on site.');
});
