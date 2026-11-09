import type { Project } from './types';
import {
  resolveProjectWorkflowStatus,
  type WorkflowStatusStage,
} from './workflow-status';

/** Project list filters. "active" means anything not completed or cancelled. */
export type ProjectListingStage =
  | 'active'
  | Extract<
    WorkflowStatusStage,
    'pending_ocular' | 'review' | 'design' | 'billing' | 'fabrication' | 'completed' | 'cancelled'
  >;

/** Filter labels shared by the Projects and Payments pages. */
export const PROJECT_STAGE_LABELS: Record<ProjectListingStage, string> = {
  active: 'Active',
  pending_ocular: 'Ocular',
  review: 'For Review',
  design: 'Design / Blueprint',
  billing: 'Billing',
  fabrication: 'Fabrication',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const LISTING_STAGES = Object.keys(PROJECT_STAGE_LABELS) as ProjectListingStage[];

export function isProjectListingStage(value: unknown): value is ProjectListingStage {
  return typeof value === 'string' && (LISTING_STAGES as string[]).includes(value);
}

/** Same rule as the server's stage filter, so client-side rows match server-filtered ones. */
export function matchesProjectStage(
  project: Project,
  stage: ProjectListingStage | '',
): boolean {
  if (!stage) return true;
  const projectStage = resolveProjectWorkflowStatus({ project }).stage;
  return stage === 'active'
    ? projectStage !== 'completed' && projectStage !== 'cancelled'
    : projectStage === stage;
}
