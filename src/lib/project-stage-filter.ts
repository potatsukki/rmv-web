import type { Project } from './types';
import {
  resolveProjectWorkflowStatus,
  type WorkflowStatusStage,
} from './workflow-status';

export type ProjectListingStage = Extract<
  WorkflowStatusStage,
  'design' | 'billing' | 'fabrication' | 'completed' | 'cancelled'
>;

export function matchesProjectStage(
  project: Project,
  stage: ProjectListingStage | '',
): boolean {
  return !stage || resolveProjectWorkflowStatus({ project }).stage === stage;
}
