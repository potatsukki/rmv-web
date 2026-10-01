import { describe, expect, it } from 'vitest';

import { AppointmentAttendanceStatus, AppointmentStatus, PaymentStageStatus } from './constants';
import type { PaymentPlan } from './types';
import { resolveAppointmentWorkflowStatus, resolvePaymentWorkflowStatus } from './workflow-status';

function paymentPlan(stages: PaymentPlan['stages']): PaymentPlan {
  return {
    _id: 'plan-1',
    projectId: 'project-1',
    totalAmount: stages.reduce((total, stage) => total + stage.amount, 0),
    stages,
    isImmutable: true,
    createdAt: '2026-09-29T00:00:00.000Z',
  };
}

describe('resolvePaymentWorkflowStatus', () => {
  it('labels an incomplete downpayment with a recorded amount as partially paid', () => {
    const status = resolvePaymentWorkflowStatus([paymentPlan([{
      stageId: 'downpayment',
      label: 'Downpayment',
      percentage: 50,
      amount: 50_000,
      amountPaid: 20_000,
      remainingBalance: 30_000,
      status: PaymentStageStatus.PENDING,
    }])]);

    expect(status).toMatchObject({ key: 'partially_paid', label: 'Partially Paid' });
  });

  it('labels a completed required payment as fully paid', () => {
    const status = resolvePaymentWorkflowStatus([paymentPlan([{
      stageId: 'downpayment',
      label: 'Downpayment',
      percentage: 100,
      amount: 50_000,
      amountPaid: 50_000,
      remainingBalance: 0,
      status: PaymentStageStatus.VERIFIED,
    }])]);

    expect(status).toMatchObject({ key: 'paid', label: 'Fully Paid' });
  });
});

describe('resolveAppointmentWorkflowStatus', () => {
  it('labels a finished office consultation as Appointment Done', () => {
    const completedConsultation = {
      status: AppointmentStatus.CONFIRMED,
      type: 'office',
      attendanceStatus: AppointmentAttendanceStatus.COMPLETED,
      ocularFeeStatus: undefined,
      ocularFeePaid: false,
    };

    expect(resolveAppointmentWorkflowStatus(completedConsultation)).toMatchObject({
      key: 'appointment_done',
      label: 'Appointment Done',
      tone: 'green',
      isTerminal: true,
    });
  });

  it('keeps the existing completed label for ocular appointments', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.COMPLETED,
      type: 'ocular',
      ocularFeeStatus: undefined,
      ocularFeePaid: true,
    })).toMatchObject({
      key: 'appointment_completed',
      label: 'Appointment Completed',
    });
  });
});
