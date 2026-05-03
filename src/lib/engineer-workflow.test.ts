import { describe, expect, it } from 'vitest';

import { getEngineerWorkflowState } from './engineer-workflow';

describe('getEngineerWorkflowState', () => {
  it('shows engineer work needed when the submission is incomplete', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: false,
      engineerSubmissionComplete: false,
      hasCustomerApprovedDesignAndBilling: false,
      canStartFabricationSetup: false,
    })).toBe('needs_engineer_work');
  });

  it('waits for customer approval after a complete engineer submission', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: false,
      engineerSubmissionComplete: true,
      hasCustomerApprovedDesignAndBilling: false,
      canStartFabricationSetup: false,
    })).toBe('waiting_customer_approval');
  });

  it('waits for payment verification after customer approval', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: false,
      engineerSubmissionComplete: true,
      hasCustomerApprovedDesignAndBilling: true,
      canStartFabricationSetup: false,
    })).toBe('waiting_customer_payment');
  });

  it('unlocks team assignment after payment verification', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: false,
      engineerSubmissionComplete: true,
      hasCustomerApprovedDesignAndBilling: true,
      canStartFabricationSetup: true,
    })).toBe('ready_for_team_assignment');
  });

  it('shows assigned once a fabrication lead exists', () => {
    expect(getEngineerWorkflowState({
      hasFabLead: true,
      engineerSubmissionComplete: false,
      hasCustomerApprovedDesignAndBilling: false,
      canStartFabricationSetup: false,
    })).toBe('team_assigned');
  });
});
