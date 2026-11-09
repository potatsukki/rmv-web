import { describe, expect, it } from 'vitest';

import { ProjectStatus } from './constants';
import { matchesProjectStage } from './project-stage-filter';
import type { Project } from './types';

function project(status: ProjectStatus, itemStatuses: ProjectStatus[]): Project {
  return {
    status,
    items: itemStatuses.map((itemStatus, index) => ({
      _id: `item-${index}`,
      projectId: 'project-1',
      serviceType: 'railings',
      title: `Item ${index + 1}`,
      status: itemStatus,
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
    })),
  } as Project;
}

describe('matchesProjectStage', () => {
  it('lists an ocular draft under Ocular until finalized', () => {
    const pending = { ...project(ProjectStatus.DRAFT, []), ocularAppointmentId: 'ocular-1', contractStatus: 'missing' } as Project;
    expect(matchesProjectStage(pending, 'pending_ocular')).toBe(true);
    expect(matchesProjectStage(pending, 'design')).toBe(false);
    expect(matchesProjectStage({ ...pending, status: ProjectStatus.SUBMITTED }, 'pending_ocular')).toBe(false);
  });
  it('routes a blueprint project with a payment-pending item to Billing', () => {
    const mixedProject = project(ProjectStatus.BLUEPRINT, [
      ProjectStatus.PAYMENT_PENDING,
      ProjectStatus.BLUEPRINT,
    ]);

    expect(matchesProjectStage(mixedProject, 'billing')).toBe(true);
    expect(matchesProjectStage(mixedProject, 'design')).toBe(false);
  });

  it('keeps a blueprint project without payment-pending items in Design', () => {
    const blueprintProject = project(ProjectStatus.BLUEPRINT, [ProjectStatus.BLUEPRINT]);

    expect(matchesProjectStage(blueprintProject, 'design')).toBe(true);
    expect(matchesProjectStage(blueprintProject, 'billing')).toBe(false);
  });

  it('lists submitted projects under For Review', () => {
    const submitted = project(ProjectStatus.SUBMITTED, [ProjectStatus.SUBMITTED]);

    expect(matchesProjectStage(submitted, 'review')).toBe(true);
    expect(matchesProjectStage(submitted, 'design')).toBe(false);
  });

  it('treats Active as anything not completed or cancelled', () => {
    expect(matchesProjectStage(project(ProjectStatus.DRAFT, []), 'active')).toBe(true);
    expect(matchesProjectStage(project(ProjectStatus.PAYMENT_PENDING, []), 'active')).toBe(true);
    expect(matchesProjectStage(project(ProjectStatus.COMPLETED, []), 'active')).toBe(false);
    expect(matchesProjectStage(project(ProjectStatus.FABRICATION, [ProjectStatus.COMPLETED]), 'active')).toBe(false);
    expect(matchesProjectStage(project(ProjectStatus.CANCELLED, []), 'active')).toBe(false);
  });
});
