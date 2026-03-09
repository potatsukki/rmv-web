import { describe, expect, it } from 'vitest';
import { Role } from '@/lib/constants';
import type { Project, User } from '@/lib/types';
import {
  canManageFabricationUpdates,
  canViewFabricationUpdates,
  isAssignedEngineer,
  isAssignedFabricationMember,
} from '@/lib/project-access';

const baseProject: Project = {
  _id: 'project-1',
  appointmentId: 'appointment-1',
  customerId: 'customer-1',
  title: 'Test Project',
  status: 'fabrication',
  engineerIds: ['engineer-1'],
  fabricationLeadId: 'fabricator-1',
  fabricationAssistantIds: ['fabricator-2'],
  mediaKeys: [],
  createdAt: '2026-03-10T00:00:00.000Z',
  updatedAt: '2026-03-10T00:00:00.000Z',
};

function makeUser(id: string, roles: Role[]): User {
  return {
    _id: id,
    firstName: 'Test',
    lastName: 'User',
    email: `${id}@example.com`,
    roles,
    isEmailVerified: true,
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-03-10T00:00:00.000Z',
  };
}

describe('project access helpers', () => {
  it('detects assigned engineers and fabrication staff', () => {
    expect(isAssignedEngineer(baseProject, 'engineer-1')).toBe(true);
    expect(isAssignedEngineer(baseProject, 'engineer-2')).toBe(false);
    expect(isAssignedFabricationMember(baseProject, 'fabricator-1')).toBe(true);
    expect(isAssignedFabricationMember(baseProject, 'fabricator-2')).toBe(true);
    expect(isAssignedFabricationMember(baseProject, 'fabricator-3')).toBe(false);
  });

  it('allows only assigned fabrication staff to view fabrication updates', () => {
    expect(canViewFabricationUpdates(baseProject, makeUser('fabricator-1', [Role.FABRICATION_STAFF]))).toBe(true);
    expect(canViewFabricationUpdates(baseProject, makeUser('fabricator-3', [Role.FABRICATION_STAFF]))).toBe(false);
  });

  it('allows only assigned engineer or fabrication staff to manage fabrication updates', () => {
    expect(canManageFabricationUpdates(baseProject, makeUser('engineer-1', [Role.ENGINEER]))).toBe(true);
    expect(canManageFabricationUpdates(baseProject, makeUser('engineer-2', [Role.ENGINEER]))).toBe(false);
    expect(canManageFabricationUpdates(baseProject, makeUser('fabricator-2', [Role.FABRICATION_STAFF]))).toBe(true);
    expect(canManageFabricationUpdates(baseProject, makeUser('fabricator-3', [Role.FABRICATION_STAFF]))).toBe(false);
  });

  it('keeps admin access regardless of assignment', () => {
    expect(canViewFabricationUpdates(baseProject, makeUser('admin-1', [Role.ADMIN]))).toBe(true);
    expect(canManageFabricationUpdates(baseProject, makeUser('admin-1', [Role.ADMIN]))).toBe(true);
  });
});