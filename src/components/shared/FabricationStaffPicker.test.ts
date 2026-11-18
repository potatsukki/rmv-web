import { describe, expect, it } from 'vitest';
import { deliveryConflict, effectiveWorkload, teamConflict, workloadWarnings } from './FabricationStaffPicker';
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
});

describe('teamConflict (one active project per fabricator)', () => {
  const crewOnly = { _id: 'project-c', projectNumber: 'PRJ-2026-00003', title: 'Fence', status: 'fabrication', roles: ['delivery_crew' as const] };

  it('blocks a lead or assistant of another active project, naming it', () => {
    expect(teamConflict(member({ activeProjects: [projectA] }), 'project-x')).toBe('Already on PRJ-2026-00001 (Lead)');
    expect(teamConflict(member({ activeProjects: [projectB] }), 'project-x')).toBe('Already on PRJ-2026-00002 (Assistant)');
  });

  it('does not block for this project or for delivery crew duty elsewhere', () => {
    expect(teamConflict(member({ activeProjects: [projectA] }), 'project-a')).toBeNull();
    expect(teamConflict(member({ activeProjects: [crewOnly] }), 'project-x')).toBeNull();
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
});
