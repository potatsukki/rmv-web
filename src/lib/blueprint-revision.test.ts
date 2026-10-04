import { describe, expect, it } from 'vitest';
import { getBlueprintDraftChanges, getRevisionQuotation } from './blueprint-revision';
import type { Blueprint, BlueprintDraft } from './types';

const file = (key: string) => ({ key, name: key, size: 1, type: 'application/pdf', uploadedAt: '2026-10-04' });
const files: NonNullable<BlueprintDraft['files']> = { blueprint: file('new.pdf'), design: file('new.png'), costing: file('cost.pdf') };
const quotation = { total: '9999' };
const blueprint = (component?: 'blueprint' | 'costing') => ({
  _id: 'bp-1', status: 'revision_requested', revisionComponent: component,
} as Blueprint);

describe('blueprint revision draft changes', () => {
  it('omits quotation and costing files from blueprint-only and legacy revisions', () => {
    for (const component of [undefined, 'blueprint'] as const) {
      expect(getBlueprintDraftChanges(blueprint(component), files, quotation)).toEqual({
        files: { blueprint: files.blueprint, design: files.design },
      });
    }
  });
  it('omits blueprint and design files from costing-only revisions', () => {
    expect(getBlueprintDraftChanges(blueprint('costing'), files, quotation)).toEqual({
      files: { costing: files.costing }, quotation,
    });
  });
  it('keeps the initial submission intact', () => {
    expect(getBlueprintDraftChanges(null, files, quotation)).toEqual({ files, quotation });
  });
  it('restores existing material rows and pricing when starting a costing revision', () => {
    const bp = { ...blueprint('costing'), quotation: {
      total: 6000, validityDays: 45,
      lineItems: [{ label: 'Steel', quantity: 2, materials: 2500, labor: 500, amount: 6000 }],
    } };
    expect(getRevisionQuotation(bp)).toMatchObject({
      total: '6000', validityDays: '45',
      lineItems: [{ label: 'Steel', quantity: 2, materials: '2500', labor: '500' }],
    });
  });
});
