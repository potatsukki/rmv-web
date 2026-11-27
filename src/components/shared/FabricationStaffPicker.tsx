import { AlertTriangle, Check, Loader2, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FabricationStaffWorkload, FabricationWorkloadStatus } from '@/lib/types';

/** What a row shows: the server's status, or Finishing soon when every team project reached Quality Check. */
export type FabricationDisplayStatus = FabricationWorkloadStatus | 'finishing';

const STATUS_LABEL: Record<FabricationDisplayStatus, string> = {
  available: 'Available',
  finishing: 'Finishing soon',
  busy: 'Busy',
  on_leave: 'On leave',
  unavailable: 'Unavailable',
};

const STATUS_CLASS: Record<FabricationDisplayStatus, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  finishing: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  busy: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  on_leave: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  unavailable: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const ROLE_LABEL = { lead: 'Lead', assistant: 'Assistant', delivery_crew: 'Delivery crew' } as const;

type WorkloadProject = FabricationStaffWorkload['activeProjects'][number];

const isTeamProject = (project: WorkloadProject) => project.roles.some((role) => role === 'lead' || role === 'assistant');

function projectCountLabel(count: number) {
  return `${count} active project${count === 1 ? '' : 's'}`;
}

/**
 * A person's load without the project being assigned, so re-opening this project's own team
 * never shows its members as busy because of it. On Leave / Unavailable always stays. Someone
 * whose every team project reached Quality Check is "Finishing soon" and can take this project.
 */
export function effectiveWorkload(member: FabricationStaffWorkload, currentProjectId?: string): {
  status: FabricationDisplayStatus;
  projects: WorkloadProject[];
} {
  const projects = member.activeProjects.filter((project) => project._id !== currentProjectId);
  if (member.workloadStatus === 'on_leave' || member.workloadStatus === 'unavailable') {
    return { status: member.workloadStatus, projects };
  }
  if (projects.length === 0) return { status: 'available', projects };
  const teamProjects = projects.filter(isTeamProject);
  const finishing = teamProjects.length > 0 && teamProjects.every((project) => project.nearCompletion);
  return { status: finishing ? 'finishing' : 'busy', projects };
}

/**
 * Lead / assistant on another project still in the workshop. A fabricator works on one project in
 * the workshop at a time, so the team picker blocks them until that project reaches Quality Check.
 * Being on another delivery crew does not count. (An older server sends no nearCompletion: blocked.)
 */
export function teamConflict(member: FabricationStaffWorkload, currentProjectId?: string): string | null {
  const project = member.activeProjects.find((item) => item._id !== currentProjectId
    && !item.nearCompletion
    && isTeamProject(item));
  if (!project) return null;
  const role = project.roles.includes('lead') ? 'Lead' : 'Assistant';
  return `On ${project.projectNumber || project.title} (${role}) until it reaches Quality Check`;
}

const shortDate = (value: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).format(new Date(value));
const stageLabel = (stage: string) => stage.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

/** e.g. "PRJ-2026-00051 (Lead) · Quality Check 6/8 · finishes ~Nov 22". */
export function projectProgressLabel(project: WorkloadProject) {
  const roles = project.roles.map((role) => ROLE_LABEL[role]).join(', ');
  const parts = [`${project.projectNumber || project.title} (${roles})`];
  if (project.status === 'payment_pending') parts.push('waiting for payment');
  else if (project.currentStage && project.stageCount) parts.push(`${stageLabel(project.currentStage)} ${project.stageIndex}/${project.stageCount}`);
  if (project.estimatedCompletionDate) parts.push(`finishes ~${shortDate(project.estimatedCompletionDate)}`);
  return parts.join(' · ');
}

/**
 * Who to suggest for the team, among the rows that can be picked: someone free for workshop work
 * ("Recommended"), otherwise the one nearest completion ("Nearest completion": their project
 * reached Quality Check). The server lists the staff in that order. Nobody pickable → no badge.
 */
export function fabricatorRecommendation(
  staff: FabricationStaffWorkload[] | undefined,
  currentProjectId?: string,
  excludeIds: string[] = [],
): { id: string; label: string } | null {
  const candidates = (staff || []).filter((member) => !excludeIds.includes(member._id)
    && member.workloadStatus !== 'on_leave' && member.workloadStatus !== 'unavailable'
    && !teamConflict(member, currentProjectId));
  const free = candidates.find((member) => effectiveWorkload(member, currentProjectId).status !== 'finishing');
  if (free) return { id: free._id, label: 'Recommended' };
  const nearest = candidates[0];
  return nearest ? { id: nearest._id, label: 'Nearest completion' } : null;
}

/** Already out on another project's delivery / installation that day (a delivery takes the whole day). */
export function deliveryConflict(member: FabricationStaffWorkload, date: string, currentProjectId?: string): string | null {
  if (!date) return null;
  const other = (member.deliveryDates || []).find((item) => item.date === date && item.projectId !== currentProjectId);
  return other ? `Delivery that day (${other.projectNumber || 'another project'})` : null;
}

/** One line per selected person who is not simply available. Assigning them is still allowed. */
export function workloadWarnings(
  staff: FabricationStaffWorkload[] | undefined,
  selectedIds: string[],
  currentProjectId?: string,
): string[] {
  return (staff || [])
    .filter((member) => selectedIds.includes(member._id))
    .flatMap((member) => {
      const { status, projects } = effectiveWorkload(member, currentProjectId);
      const name = `${member.firstName} ${member.lastName}`.trim();
      if (status === 'on_leave') return [`${name} is on leave.`];
      if (status === 'unavailable') return [`${name} is marked unavailable.`];
      if (status === 'busy') return [`${name} already has ${projectCountLabel(projects.length)}.`];
      return [];
    });
}

interface FabricationStaffPickerProps {
  staff: FabricationStaffWorkload[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  ariaLabel: string;
  /** Left out, the list is read-only (availability only). */
  onToggle?: (staffId: string) => void;
  selectedIds?: string[];
  mode?: 'single' | 'multi';
  /** People not offered in this list (e.g. the lead in the assistants list). */
  excludeIds?: string[];
  currentProjectId?: string;
  emptyText?: string;
  className?: string;
  /** A reason makes the row unselectable (e.g. already on another project). Selected rows stay removable. */
  getBlockedReason?: (member: FabricationStaffWorkload) => string | null;
  /** Badge on one suggested person (see fabricatorRecommendation). */
  recommendation?: { id: string; label: string } | null;
}

/** Fabrication staff with Available / Busy and their active projects. Blocked people can't be picked. */
export function FabricationStaffPicker({
  staff,
  isLoading,
  isError,
  ariaLabel,
  onToggle,
  selectedIds = [],
  mode = 'multi',
  excludeIds = [],
  currentProjectId,
  emptyText = 'No fabrication staff found.',
  className,
  getBlockedReason,
  recommendation,
}: FabricationStaffPickerProps) {
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-[#6e6e73] dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking who is available…
      </p>
    );
  }
  if (isError) {
    return <p className="text-xs text-red-600 dark:text-red-400">Unable to load fabrication staff availability.</p>;
  }

  const members = (staff || []).filter((member) => !excludeIds.includes(member._id));
  if (members.length === 0) {
    return <p className="text-xs text-[#86868b] dark:text-slate-400">{emptyText}</p>;
  }

  return (
    <div
      role={onToggle ? (mode === 'single' ? 'radiogroup' : 'group') : 'list'}
      aria-label={ariaLabel}
      className={cn(
        'max-h-64 overflow-y-auto rounded-lg border border-[#d2d2d7] bg-white divide-y divide-[#e8e8ed] dark:border-slate-700 dark:bg-slate-900 dark:divide-slate-700',
        className,
      )}
    >
      {members.map((member) => {
        const { status, projects } = effectiveWorkload(member, currentProjectId);
        const selected = selectedIds.includes(member._id);
        const blockedReason = getBlockedReason?.(member) ?? null;
        // A blocked person who is already selected can still be unselected.
        const disabled = Boolean(blockedReason) && !selected;
        const body = (
          <>
            {onToggle && (
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center border',
                  mode === 'single' ? 'rounded-full' : 'rounded',
                  selected ? 'border-violet-500 bg-violet-500' : 'border-[#c8c8cd] dark:border-slate-600',
                )}
              >
                {selected && <Check className="h-3 w-3 text-white" />}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium text-[#1d1d1f] dark:text-slate-100">
                <span className="truncate">{member.firstName} {member.lastName}</span>
                {recommendation?.id === member._id && (
                  <span className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
                    {recommendation.label}
                  </span>
                )}
              </span>
              <span className="block text-xs text-[#6e6e73] dark:text-slate-400">
                {projects.length === 0
                  ? 'No active projects'
                  : projects.map(projectProgressLabel).join(' | ')}
                {member.availabilityNote && (status === 'on_leave' || status === 'unavailable') ? ` · ${member.availabilityNote}` : ''}
              </span>
              {blockedReason && (
                <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  {blockedReason}
                </span>
              )}
            </span>
            <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold', STATUS_CLASS[status])}>
              {STATUS_LABEL[status]}
            </span>
          </>
        );

        return onToggle ? (
          <button
            key={member._id}
            type="button"
            role={mode === 'single' ? 'radio' : 'checkbox'}
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => onToggle(member._id)}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f5f5f7] dark:hover:bg-slate-800',
              selected && 'bg-violet-50 dark:bg-violet-950/40',
              disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent',
            )}
          >
            {body}
          </button>
        ) : (
          <div key={member._id} role="listitem" className="flex items-center gap-3 px-3 py-2.5">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Amber notice for selected people who are busy or away. It never blocks the assignment. */
export function FabricationWorkloadWarning({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/35 dark:bg-amber-500/10">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
      <div className="text-xs text-amber-800 dark:text-amber-200">
        {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        <p className="mt-0.5 font-medium">You can still assign them.</p>
      </div>
    </div>
  );
}
