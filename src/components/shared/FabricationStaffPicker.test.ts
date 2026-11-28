import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FabricationStaffPicker, deliveryConflict, effectiveWorkload, fabricatorRecommendation, latestTargetFinish,
  projectProgressLabel, sortForSchedule, targetFinishLabel, teamConflict, workloadWarnings,
} from './FabricationStaffPicker';
import type { FabricationStaffWorkload } from '@/lib/types';

function member(overrides: Partial<FabricationStaffWorkload>): FabricationStaffWorkload {
  return {
    _id: 'staff-1',
    firstName: 'Maria',
    lastName: 'Santos',
    workloadStatus: 'available',
    activeProjectCount: 0,
    activeProjects: [],
    ...overrides,
  };
}

const projectA = { _id: 'project-a', projectNumber: 'PRJ-2026-00001', title: 'Gate', status: 'fabrication', roles: ['lead' as const] };
const projectB = { _id: 'project-b', projectNumber: 'PRJ-2026-00002', title: 'Railings', status: 'payment_pending', roles: ['assistant' as const] };

describe('installation schedule list', () => {
  const staff: [FabricationStaffWorkload, FabricationStaffWorkload] = [
    member({ _id: 'march', firstName: 'Jose', lastName: 'Valdez', workloadStatus: 'busy', activeProjects: [{ ...projectA, currentStage: 'welding', stageIndex: 3, stageCount: 8, estimatedCompletionDate: '2026-03-30T00:00:00Z' }] }),
    member({ _id: 'november', firstName: 'Alie', lastName: 'Tyson', workloadStatus: 'busy', activeProjects: [{ ...projectB, estimatedCompletionDate: '2026-11-28T00:00:00Z' }] }),
  ];

  it('shows newer targets first with full dates in the schedule view', () => {
    const html = renderToStaticMarkup(createElement(FabricationStaffPicker, {
      staff, ariaLabel: 'Installation crew', listView: 'schedule',
    }));
    expect(html.indexOf('Alie Tyson')).toBeLessThan(html.indexOf('Jose Valdez'));
    expect(html).toContain('Target finish: Nov 28, 2026');
    expect(html).toContain('Target finish: Mar 30, 2026');
    expect(html).not.toContain('finishes ~');
  });

  it('preserves the server order and existing labels in the default team view', () => {
    const html = renderToStaticMarkup(createElement(FabricationStaffPicker, {
      staff, ariaLabel: 'Fabrication team',
    }));
    expect(html.indexOf('Jose Valdez')).toBeLessThan(html.indexOf('Alie Tyson'));
    expect(html).toContain('finishes ~Mar 30');
    expect(html).not.toContain('Target finish:');
  });

  it('sorts by the full date across years without mutating the server list', () => {
    const nextYear = member({ _id: 'next-year', activeProjects: [{ ...projectA, estimatedCompletionDate: '2027-03-01T00:00:00Z' }] });
    const original = [...staff, nextYear];
    expect(sortForSchedule(original).map((row) => row._id)).toEqual(['next-year', 'november', 'march']);
    expect(original.map((row) => row._id)).toEqual(['march', 'november', 'next-year']);
  });

  it('puts free staff first, undated work after dated work, and away staff last', () => {
    const undated = member({ _id: 'undated', activeProjects: [projectA] });
    const free = member({ _id: 'free' });
    const leave = member({ _id: 'leave', workloadStatus: 'on_leave', activeProjects: [{ ...projectA, estimatedCompletionDate: '2028-01-01' }] });
    const unavailable = member({ _id: 'unavailable', workloadStatus: 'unavailable' });
    expect(sortForSchedule([leave, undated, ...staff, unavailable, free]).map((row) => row._id))
      .toEqual(['free', 'november', 'march', 'undated', 'leave', 'unavailable']);
  });

  it('keeps equal targets in the existing server order', () => {
    const tie = member({ _id: 'tie', activeProjects: [{ ...projectA, estimatedCompletionDate: '2026-11-28T00:00:00Z' }] });
    expect(sortForSchedule([staff[1], tie, staff[0]]).map((row) => row._id)).toEqual(['november', 'tie', 'march']);
  });

  it('uses the latest target of the other projects and excludes the current project', () => {
    const multi = member({ activeProjects: [
      { ...projectA, estimatedCompletionDate: '2028-01-01' },
      { ...projectB, estimatedCompletionDate: '2026-11-28T00:00:00Z' },
      { ...projectA, _id: 'third', estimatedCompletionDate: '2026-03-30' },
    ] });
    expect(latestTargetFinish(multi, 'project-a')).toBe('2026-11-28T00:00:00Z');
    const onlyCurrent = member({ _id: 'current-only', activeProjects: [projectA] });
    expect(latestTargetFinish(onlyCurrent, 'project-a')).toBeNull();
    expect(sortForSchedule([staff[1], onlyCurrent], 'project-a').map((row) => row._id)).toEqual(['current-only', 'november']);
  });

  it('treats invalid target dates as unknown and labels them safely', () => {
    const invalid = member({ _id: 'invalid', activeProjects: [{ ...projectA, estimatedCompletionDate: 'invalid-date' }] });
    expect(latestTargetFinish(invalid)).toBeNull();
    expect(sortForSchedule([invalid, staff[0]]).map((row) => row._id)).toEqual(['march', 'invalid']);
    expect(targetFinishLabel('invalid-date', '2026-11-28')).toEqual({ text: 'Target finish: Not set', pastTarget: false });
    expect(targetFinishLabel(undefined, '2026-11-28').pastTarget).toBe(false);
  });

  it('labels past targets using the Manila day, with the year visible', () => {
    expect(targetFinishLabel('2026-03-30T00:00:00Z', '2026-11-28'))
      .toEqual({ text: 'Target finish: Mar 30, 2026', pastTarget: true });
    expect(targetFinishLabel('2026-11-28T00:00:00Z', '2026-11-28').pastTarget).toBe(false);
    expect(targetFinishLabel('2026-11-28T18:00:00Z', '2026-11-29'))
      .toEqual({ text: 'Target finish: Nov 29, 2026', pastTarget: false });
  });

  it('retains checkbox selection, exclusions and delivery conflict blocking in the schedule view', () => {
    const booked = member({ ...staff[0], deliveryDates: [{ projectId: 'other-project', date: '2026-11-28' }] });
    const html = renderToStaticMarkup(createElement(FabricationStaffPicker, {
      staff: [booked, staff[1], member({ _id: 'excluded', firstName: 'Hidden', lastName: 'Staff' })],
      ariaLabel: 'Installation crew', listView: 'schedule', onToggle: () => {},
      selectedIds: ['november'], excludeIds: ['excluded'],
      getBlockedReason: (row) => deliveryConflict(row, '2026-11-28'),
    }));
    expect(html).toContain('role="checkbox" aria-checked="true" aria-disabled="false"');
    expect(html).toContain('aria-disabled="true" disabled=""');
    expect(html).toContain('Delivery that day (another project)');
    expect(html).not.toContain('Hidden Staff');
  });
});

describe('effectiveWorkload', () => {
  it('is available with no active projects', () => {
    expect(effectiveWorkload(member({})).status).toBe('available');
  });

  it('is busy with projects other than the one being assigned', () => {
    const busy = member({ workloadStatus: 'busy', activeProjectCount: 2, activeProjects: [projectA, projectB] });
    expect(effectiveWorkload(busy, 'project-a')).toEqual({ status: 'busy', projects: [projectB] });
  });

  it('does not count the project being assigned against its own team', () => {
    const onlyThisProject = member({ workloadStatus: 'busy', activeProjectCount: 1, activeProjects: [projectA] });
    expect(effectiveWorkload(onlyThisProject, 'project-a').status).toBe('available');
  });

  it('keeps on leave even with no projects', () => {
    expect(effectiveWorkload(member({ workloadStatus: 'on_leave' })).status).toBe('on_leave');
  });

  it('is finishing soon when every other team project reached Quality Check', () => {
    const atQc = { ...projectA, nearCompletion: true };
    const crewOnly = { _id: 'project-c', projectNumber: 'PRJ-2026-00003', title: 'Fence', status: 'fabrication', roles: ['delivery_crew' as const] };
    expect(effectiveWorkload(member({ workloadStatus: 'busy', activeProjects: [atQc, crewOnly] }), 'project-x').status).toBe('finishing');
    expect(effectiveWorkload(member({ workloadStatus: 'busy', activeProjects: [atQc, projectB] }), 'project-x').status).toBe('busy');
    // Only delivery crew duty elsewhere: still shown as busy, like before.
    expect(effectiveWorkload(member({ workloadStatus: 'busy', activeProjects: [crewOnly] }), 'project-x').status).toBe('busy');
  });
});

describe('teamConflict (one project in the workshop per fabricator)', () => {
  const crewOnly = { _id: 'project-c', projectNumber: 'PRJ-2026-00003', title: 'Fence', status: 'fabrication', roles: ['delivery_crew' as const] };

  it('blocks a lead or assistant of another project still in the workshop, naming it', () => {
    expect(teamConflict(member({ activeProjects: [projectA] }), 'project-x')).toBe('On PRJ-2026-00001 (Lead) until it reaches Quality Check');
    expect(teamConflict(member({ activeProjects: [projectB] }), 'project-x')).toBe('On PRJ-2026-00002 (Assistant) until it reaches Quality Check');
  });

  it('does not block for this project, a project at Quality Check or later, or delivery crew duty elsewhere', () => {
    expect(teamConflict(member({ activeProjects: [projectA] }), 'project-a')).toBeNull();
    expect(teamConflict(member({ activeProjects: [{ ...projectA, nearCompletion: true }] }), 'project-x')).toBeNull();
    expect(teamConflict(member({ activeProjects: [crewOnly] }), 'project-x')).toBeNull();
  });

  // QA 2026-11-28: Change Team of an old project (at QC) whose lead already took the next one.
  it('never blocks someone already on this team, even with another project in the workshop', () => {
    const oldAtQc = { ...projectA, nearCompletion: true };
    const next = { _id: 'project-n', projectNumber: 'PRJ-2026-00009', title: 'Stairs', status: 'fabrication', roles: ['lead' as const] };
    expect(teamConflict(member({ activeProjects: [oldAtQc, next] }), 'project-a')).toBeNull();
    // Only delivery crew on this project does not count as being on its team.
    const crewHere = { ...projectA, roles: ['delivery_crew' as const] };
    expect(teamConflict(member({ activeProjects: [crewHere, next] }), 'project-a')).toBe('On PRJ-2026-00009 (Lead) until it reaches Quality Check');
  });

  it('never recommends a current member who is busy in the workshop elsewhere', () => {
    const oldAtQc = { ...projectA, nearCompletion: true };
    const next = { _id: 'project-n', projectNumber: 'PRJ-2026-00009', title: 'Stairs', status: 'fabrication', roles: ['lead' as const] };
    const busyLead = member({ _id: 'lead', workloadStatus: 'busy', activeProjects: [oldAtQc, next] });
    const free = member({ _id: 'free' });
    expect(fabricatorRecommendation([busyLead, free], 'project-a')).toEqual({ id: 'free', label: 'Recommended' });
    expect(fabricatorRecommendation([busyLead], 'project-a')).toBeNull();
  });
});

describe('deliveryConflict (a delivery takes the whole day)', () => {
  const withDelivery = member({ deliveryDates: [{ projectId: 'project-b', projectNumber: 'PRJ-2026-00002', date: '2026-11-25' }] });

  it('blocks crew already out on another project that day', () => {
    expect(deliveryConflict(withDelivery, '2026-11-25', 'project-x')).toBe('Delivery that day (PRJ-2026-00002)');
  });

  it('allows another day, this project, or no date yet', () => {
    expect(deliveryConflict(withDelivery, '2026-11-26', 'project-x')).toBeNull();
    expect(deliveryConflict(withDelivery, '2026-11-25', 'project-b')).toBeNull();
    expect(deliveryConflict(withDelivery, '', 'project-x')).toBeNull();
  });
});

describe('nearest to completion', () => {
  const atQualityCheck = {
    ...projectA, currentStage: 'quality_check', stageIndex: 6, stageCount: 8, progressPercent: 75, nearCompletion: true,
    estimatedCompletionDate: '2026-11-22T09:00:00.000Z',
  };
  const atWelding = { ...projectA, _id: 'project-w', projectNumber: 'PRJ-2026-00009', currentStage: 'welding', stageIndex: 3, stageCount: 8, nearCompletion: false };

  it('shows the stage and target finish of a busy fabricator', () => {
    expect(projectProgressLabel(atQualityCheck)).toBe('PRJ-2026-00001 (Lead) · Quality Check 6/8 · finishes ~Nov 22');
    expect(projectProgressLabel(projectB)).toBe('PRJ-2026-00002 (Assistant) · waiting for payment');
  });

  it('recommends someone free now, otherwise the one nearest completion', () => {
    const nearest = member({ _id: 'nearest', workloadStatus: 'busy', activeProjects: [atQualityCheck] });
    const welding = member({ _id: 'welding', workloadStatus: 'busy', activeProjects: [atWelding] });
    const free = member({ _id: 'free' });
    const away = member({ _id: 'away', workloadStatus: 'on_leave' });

    expect(fabricatorRecommendation([free, nearest, welding], 'project-x')).toEqual({ id: 'free', label: 'Recommended' });
    // The server lists the ones whose project reached Quality Check first, nearest completion first.
    expect(fabricatorRecommendation([nearest, welding, away], 'project-x')).toEqual({ id: 'nearest', label: 'Nearest completion' });
    expect(fabricatorRecommendation([free, nearest], 'project-x', ['free'])).toEqual({ id: 'nearest', label: 'Nearest completion' });
    expect(fabricatorRecommendation([away], 'project-x')).toBeNull();
  });

  it('never puts the badge on a row that cannot be picked', () => {
    const welding = member({ _id: 'welding', workloadStatus: 'busy', activeProjects: [atWelding] });
    const waitingForPayment = member({ _id: 'payment', workloadStatus: 'busy', activeProjects: [projectB] });
    expect(fabricatorRecommendation([welding, waitingForPayment], 'project-x')).toBeNull();
    // The team being changed does not count against its own members.
    expect(fabricatorRecommendation([welding], 'project-w')).toEqual({ id: 'welding', label: 'Recommended' });
  });
});

describe('workloadWarnings', () => {
  const staff = [
    member({ _id: 'free' }),
    member({ _id: 'busy', firstName: 'Juan', lastName: 'Cruz', workloadStatus: 'busy', activeProjectCount: 2, activeProjects: [projectA, projectB] }),
    member({ _id: 'leave', firstName: 'Ana', lastName: 'Reyes', workloadStatus: 'on_leave' }),
  ];

  it('warns only about selected people who are busy or away', () => {
    expect(workloadWarnings(staff, ['free', 'busy', 'leave'])).toEqual([
      'Juan Cruz already has 2 active projects.',
      'Ana Reyes is on leave.',
    ]);
  });

  it('has no warning when nobody selected is busy', () => {
    expect(workloadWarnings(staff, ['free'])).toEqual([]);
    expect(workloadWarnings(undefined, ['busy'])).toEqual([]);
  });

  it('has no warning for someone finishing soon (their project reached Quality Check)', () => {
    const finishing = member({ _id: 'finishing', workloadStatus: 'busy', activeProjects: [{ ...projectA, nearCompletion: true }] });
    expect(workloadWarnings([finishing], ['finishing'], 'project-x')).toEqual([]);
  });
});
