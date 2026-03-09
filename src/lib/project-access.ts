import { Role } from '@/lib/constants';
import type { Project, User } from '@/lib/types';

function getUserId(value: string | { _id: string } | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value._id;
}

export function isAssignedEngineer(project: Project, userId?: string | null): boolean {
  if (!userId) return false;

  return project.engineerIds.some((engineer) => getUserId(engineer as string | { _id: string }) === userId);
}

export function isAssignedFabricationMember(project: Project, userId?: string | null): boolean {
  if (!userId) return false;

  return [project.fabricationLeadId, ...project.fabricationAssistantIds].some(
    (member) => getUserId(member as string | { _id: string } | undefined) === userId,
  );
}

export function canManageFabricationUpdates(project: Project, user: User | null): boolean {
  if (!user) return false;

  if (user.roles.includes(Role.ADMIN)) return true;
  if (user.roles.includes(Role.ENGINEER)) return isAssignedEngineer(project, user._id);
  if (user.roles.includes(Role.FABRICATION_STAFF)) {
    return isAssignedFabricationMember(project, user._id);
  }

  return false;
}

export function canViewFabricationUpdates(project: Project, user: User | null): boolean {
  if (!user) return false;

  if (user.roles.includes(Role.FABRICATION_STAFF)) {
    return isAssignedFabricationMember(project, user._id) || user.roles.includes(Role.ADMIN);
  }

  return true;
}