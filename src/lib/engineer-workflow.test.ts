import { describe, expect, it } from 'vitest';

import { getEngineerWorkflowState } from './engineer-workflow';

describe('getEngineerWorkflowState', () => {
  it('shows engineer work needed when the submission is incomplete', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: false,
      engineerSubmissionComplete: false,
      hasCustomerApprovedDesignAndBilling: false,
    })).toBe('needs_engineer_work');
  });

  it('waits for customer approval after a complete engineer submission', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: false,
      engineerSubmissionComplete: true,
      hasCustomerApprovedDesignAndBilling: false,
    })).toBe('waiting_customer_approval');
  });

  it('unlocks team assignment after customer approval without waiting for payment', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: false,
      engineerSubmissionComplete: true,
      hasCustomerApprovedDesignAndBilling: true,
    })).toBe('ready_for_team_assignment');
  });

  it('shows assigned once a fabrication lead exists', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: true,
      engineerSubmissionComplete: false,
      hasCustomerApprovedDesignAndBilling: false,
    })).toBe('team_assigned');
  });
});
