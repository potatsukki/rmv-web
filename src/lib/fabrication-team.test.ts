import { describe, expect, it } from 'vitest';
import {
  ASSISTANTS_CHANGED_NOTICE, autoAssignedLabel, canChangeFabricationTeam, canEditFabricationAssistants, fabricationTeamIds,
  fabricationTeamSnapshot, fabricationTeamWaitingText, personName, teamChangedSince, teamChangeNotice,
} from './fabrication-team';
import { ProjectStatus } from '@/lib/constants';

const lead = { _id: 'lead-1', firstName: 'Ana', lastName: 'Reyes' };
const project = (overrides: Record<string, unknown> = {}) => ({
  status: ProjectStatus.FABRICATION,
  fabricationLeadId: lead,
  fabricationAssistantIds: ['assistant-1', { _id: 'assistant-2', firstName: 'Ben', lastName: 'Cruz' }],
  fabricationAutoAssignedAt: null,
  ...overrides,
});

describe('fabrication team (auto-assigned lead, panel note 2026-11-27)', () => {
  it('reads the team as ids for pre-filling the forms', () => {
    expect(fabricationTeamIds(project())).toEqual({ leadId: 'lead-1', assistantIds: ['assistant-1', 'assistant-2'] });
    expect(fabricationTeamIds(project({ fabricationLeadId: undefined, fabricationAssistantIds: [] }))).toEqual({ leadId: '', assistantIds: [] });
  });

  it('lets only the lead pick assistants, while the project waits for payment or is in fabrication', () => {
    expect(canEditFabricationAssistants(project(), 'lead-1')).toBe(true);
    expect(canEditFabricationAssistants(project({ status: ProjectStatus.PAYMENT_PENDING }), 'lead-1')).toBe(true);
    expect(canEditFabricationAssistants(project(), 'assistant-2')).toBe(false);
    expect(canEditFabricationAssistants(project({ status: ProjectStatus.COMPLETED }), 'lead-1')).toBe(false);
    expect(canEditFabricationAssistants(project(), undefined)).toBe(false);
  });

  it('lets the assigned engineer or an admin change a team that still works on the project', () => {
    expect(canChangeFabricationTeam(project(), { isAssignedEngineer: true })).toBe(true);
    expect(canChangeFabricationTeam(project(), { isAdmin: true })).toBe(true);
    expect(canChangeFabricationTeam(project(), {})).toBe(false);
    expect(canChangeFabricationTeam(project({ fabricationLeadId: undefined }), { isAdmin: true })).toBe(false);
    expect(canChangeFabricationTeam(project({ status: ProjectStatus.COMPLETED }), { isAdmin: true })).toBe(false);
  });

  it('explains the automatic assignment on the assign card', () => {
    // The card title already says "Waiting for a fabricator", so the text does not repeat it.
    expect(fabricationTeamWaitingText(true)).toMatch(/^This project is in line for the next fabricator\./);
    expect(fabricationTeamWaitingText(true)).not.toContain('Waiting for a fabricator');
    expect(fabricationTeamWaitingText(true)).toContain('reaches Quality Check');
    expect(fabricationTeamWaitingText(false)).toContain('assigned automatically once the required downpayment');
  });

  it('labels a lead the system picked with the Manila time, and nothing for a team a person chose', () => {
    expect(autoAssignedLabel('2026-11-27T07:05:00.000Z')).toBe('Assigned automatically · Nov 27, 3:05 PM');
    expect(autoAssignedLabel(null)).toBeNull();
    expect(autoAssignedLabel('not a date')).toBeNull();
  });

  it('names a populated person and leaves bare ids blank', () => {
    expect(personName(lead)).toBe('Ana Reyes');
    expect(personName('lead-1')).toBe('');
  });
});

// QA 2026-11-28: no double assign, realtime (an open form follows the live team).
describe('team form follows the live team', () => {
  it('remembers the team the form opened on, with no lead as null', () => {
    expect(fabricationTeamSnapshot(project())).toEqual({ leadId: 'lead-1', assistantIds: ['assistant-1', 'assistant-2'] });
    expect(fabricationTeamSnapshot(project({ fabricationLeadId: undefined, fabricationAssistantIds: [] })))
      .toEqual({ leadId: null, assistantIds: [] });
  });

  it('sees a new lead or other assistants, but not the same team in another order', () => {
    const base = { leadId: null, assistantIds: [] };
    expect(teamChangedSince(base, { leadId: 'lead-1', assistantIds: [] })).toBe(true);
    expect(teamChangedSince({ leadId: 'lead-1', assistantIds: ['a', 'b'] }, { leadId: 'lead-1', assistantIds: ['b', 'a'] })).toBe(false);
    expect(teamChangedSince({ leadId: 'lead-1', assistantIds: ['a'] }, { leadId: 'lead-1', assistantIds: ['a', 'b'] })).toBe(true);
    expect(teamChangedSince(null, { leadId: 'lead-1', assistantIds: [] })).toBe(false);
  });

  it('says who leads now, and whether the system assigned them', () => {
    expect(teamChangeNotice(project({ fabricationAutoAssignedAt: '2026-11-28T01:00:00Z' }), 'Ana Reyes'))
      .toBe('The team was just changed automatically: the lead is now Ana Reyes. The form now shows the latest team.');
    expect(teamChangeNotice(project(), 'Ana Reyes'))
      .toBe('The team was just changed: the lead is now Ana Reyes. The form now shows the latest team.');
    expect(teamChangeNotice(project({ fabricationLeadId: undefined }), '')).toBe('The team was just changed. The form now shows the latest team.');
    expect(ASSISTANTS_CHANGED_NOTICE).toContain('latest team');
  });
});
