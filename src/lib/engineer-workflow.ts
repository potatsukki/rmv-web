export type EngineerWorkflowState =
  | 'needs_engineer_work'
  | 'waiting_customer_approval'
  | 'waiting_customer_payment'
  | 'ready_for_team_assignment'
  | 'team_assigned';

type EngineerWorkflowStateInput = {
  hasFabLead: boolean;
  engineerSubmissionComplete: boolean;
  hasCustomerApprovedDesignAndBilling: boolean;
  canStartFabricationSetup: boolean;
};

export function getEngineerWorkflowState({
  hasFabLead,
  engineerSubmissionComplete,
  hasCustomerApprovedDesignAndBilling,
  canStartFabricationSetup,
}: EngineerWorkflowStateInput): EngineerWorkflowState {
  if (hasFabLead) return 'team_assigned';
  if (!engineerSubmissionComplete) return 'needs_engineer_work';
  if (!hasCustomerApprovedDesignAndBilling) return 'waiting_customer_approval';
  if (!canStartFabricationSetup) return 'waiting_customer_payment';
  return 'ready_for_team_assignment';
}
