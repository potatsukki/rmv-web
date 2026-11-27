import { ProjectStatus } from '@/lib/constants';
import type { Project } from '@/lib/types';

// Panel note 2026-11-27: the system assigns the lead (a free fabricator, otherwise the one whose
// project reached Quality Check), the lead adds assistants, and the engineer / admin can change it.

type TeamProject = Pick<Project, 'status' | 'fabricationLeadId' | 'fabricationAssistantIds' | 'fabricationAutoAssignedAt'>;
type PersonRef = string | { _id: string; firstName?: string; lastName?: string } | null | undefined;

/** While the team still works on the project: waiting for payment or in fabrication. */
const TEAM_EDITABLE_STATUSES: string[] = [ProjectStatus.PAYMENT_PENDING, ProjectStatus.FABRICATION];

const idOf = (person: PersonRef) => (typeof person === 'string' ? person : person?._id ?? '');

/** The current lead and assistants as ids, to pre-fill Change Team / Add Assistants. */
export function fabricationTeamIds(project: TeamProject | undefined | null) {
  return {
    leadId: idOf(project?.fabricationLeadId),
    assistantIds: (project?.fabricationAssistantIds || []).map(idOf).filter(Boolean),
  };
}

/** The project's own lead fabricator picks the assistants while the team still works on it. */
export function canEditFabricationAssistants(project: TeamProject | undefined | null, userId?: string) {
  return Boolean(
    project && userId
    && fabricationTeamIds(project).leadId === userId
    && TEAM_EDITABLE_STATUSES.includes(project.status),
  );
}

/** The assigned engineer or an admin can change a team that still works on the project. */
export function canChangeFabricationTeam(
  project: TeamProject | undefined | null,
  viewer: { isAssignedEngineer?: boolean; isAdmin?: boolean },
) {
  return Boolean(
    project && (viewer.isAssignedEngineer || viewer.isAdmin)
    && fabricationTeamIds(project).leadId
    && TEAM_EDITABLE_STATUSES.includes(project.status),
  );
}

/** The assign card's text while the project has no lead yet (the paid card's title says "Waiting for a fabricator"). */
export function fabricationTeamWaitingText(paymentVerified: boolean) {
  return paymentVerified
    ? 'This project is in line for the next fabricator. The system assigns a lead as soon as one is free or their current project reaches Quality Check. You can also assign the team now.'
    : 'A lead is assigned automatically once the required downpayment or full payment is verified: a free fabricator first, otherwise the one nearest completion. You can also assign the team now.';
}

/** "Assigned automatically · Nov 27, 3:05 PM" (Manila time), or null when a person chose the team. */
export function autoAssignedLabel(at?: string | null) {
  if (!at) return null;
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  const when = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
  return `Assigned automatically · ${when}`;
}

/** "Ana Reyes" for a populated person, '' for a bare id. */
export function personName(person: PersonRef) {
  if (!person || typeof person === 'string') return '';
  return `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim();
}
