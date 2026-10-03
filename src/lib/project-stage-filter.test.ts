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
});
