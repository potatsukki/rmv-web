import { AlertTriangle, Check, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FabricationStaffWorkload, FabricationWorkloadStatus } from '@/lib/types';

const STATUS_LABEL: Record<FabricationWorkloadStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  on_leave: 'On leave',
  unavailable: 'Unavailable',
};

const STATUS_CLASS: Record<FabricationWorkloadStatus, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  busy: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  on_leave: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  unavailable: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const ROLE_LABEL = { lead: 'Lead', assistant: 'Assistant', delivery_crew: 'Delivery crew' } as const;

function projectCountLabel(count: number) {
  return `${count} active project${count === 1 ? '' : 's'}`;
}

/**
 * A person's load without the project being assigned, so re-opening this project's own team
 * never shows its members as busy because of it. On Leave / Unavailable always stays.
 */
export function effectiveWorkload(member: FabricationStaffWorkload, currentProjectId?: string) {
  const projects = member.activeProjects.filter((project) => project._id !== currentProjectId);
  const status: FabricationWorkloadStatus = member.workloadStatus === 'on_leave' || member.workloadStatus === 'unavailable'
    ? member.workloadStatus
    : projects.length > 0 ? 'busy' : 'available';
  return { status, projects };
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
}

/** Fabrication staff with Available / Busy and their active projects; busy people stay selectable. */
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
              <span className="block truncate text-sm font-medium text-[#1d1d1f] dark:text-slate-100">
                {member.firstName} {member.lastName}
              </span>
              <span className="block text-xs text-[#6e6e73] dark:text-slate-400">
                {projects.length === 0
                  ? 'No active projects'
                  : projects
                    .map((project) => `${project.projectNumber || project.title} (${project.roles.map((role) => ROLE_LABEL[role]).join(', ')})`)
                    .join(' · ')}
                {member.availabilityNote && status !== 'available' && status !== 'busy' ? ` · ${member.availabilityNote}` : ''}
              </span>
            </span>
            <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold', STATUS_CLASS[status])}>
              {STATUS_LABEL[status]}
              {status === 'busy' ? ` · ${projects.length}` : ''}
            </span>
          </>
        );

        return onToggle ? (
          <button
            key={member._id}
            type="button"
            role={mode === 'single' ? 'radio' : 'checkbox'}
            aria-checked={selected}
            onClick={() => onToggle(member._id)}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f5f5f7] dark:hover:bg-slate-800',
              selected && 'bg-violet-50 dark:bg-violet-950/40',
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
