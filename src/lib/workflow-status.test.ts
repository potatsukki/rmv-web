import { describe, expect, it } from 'vitest';

import { AppointmentAttendanceStatus, AppointmentStatus, PaymentStageStatus } from './constants';
import type { PaymentPlan, PaymentStage } from './types';
import { resolveAppointmentWorkflowStatus, resolvePaymentWorkflowStatus, resolveProjectWorkflowStatus } from './workflow-status';

describe('project status', () => {
  it('shows For Review once the ocular visit is done, while the draft stays in the Ocular stage', () => {
    expect(resolveProjectWorkflowStatus({ project: {
      status: 'draft', ocularAppointmentId: 'ocular-1', ocularVisitStatus: 'completed',
    } })).toMatchObject({ label: 'For Review', stage: 'pending_ocular', isTerminal: false });
  });

  it.each(['requested', 'confirmed', 'in_progress', undefined])('shows For Ocular before visit completion (%s)', (ocularVisitStatus) => {
    expect(resolveProjectWorkflowStatus({ project: {
      status: 'draft', ocularAppointmentId: 'ocular-1', ocularVisitStatus,
    } })).toMatchObject({ label: 'For Ocular', stage: 'pending_ocular', isTerminal: false });
  });

  // Payment progress no longer changes the project status; it has its own badge.
  it.each([
    ['submitted', 'For Review', 'review'],
    ['blueprint', 'For Blueprint & Costing', 'design'],
    ['approved', 'For Down Payment', 'billing'],
    ['payment_pending', 'For Down Payment', 'billing'],
    ['fabrication', 'For Fabrication', 'fabrication'],
    ['completed', 'Completed', 'completed'],
  ])('labels a %s project as %s', (status, label, stage) => {
    expect(resolveProjectWorkflowStatus({ project: { status, contractStatus: 'uploaded' } })).toMatchObject({ label, stage });
  });

  it('shows the revision request while engineering revises the quotation', () => {
    expect(resolveProjectWorkflowStatus({ blueprint: { status: 'revision_requested' } }))
      .toMatchObject({ label: 'Revision Requested', tone: 'orange' });
  });
});

type StageInput = Partial<PaymentStage> & Pick<PaymentStage, 'status'>;

function paymentPlan(stages: StageInput[]): PaymentPlan {
  const fullStages = stages.map((stage, index) => ({
    stageId: `stage-${index + 1}`, label: `Stage ${index + 1}`, percentage: 0, amount: 1000, ...stage,
  }));
  return {
    _id: 'plan-1',
    projectId: 'project-1',
    totalAmount: fullStages.reduce((total, stage) => total + stage.amount, 0),
    stages: fullStages,
    isImmutable: true,
    createdAt: '2026-09-29T00:00:00.000Z',
  };
}

const { PENDING, PROOF_SUBMITTED, VERIFIED } = PaymentStageStatus;
const due = '2026-10-27T00:00:00.000Z';

describe('resolvePaymentWorkflowStatus', () => {
  it.each([
    ['No Payment', [{ status: PENDING, activatedAt: due }, { status: PENDING }, { status: PENDING }]],
    ['Payment Received, Awaiting Cashier Verification', [{ status: PROOF_SUBMITTED, activatedAt: due }, { status: PENDING }, { status: PENDING }]],
    ['Down Payment Paid', [{ status: VERIFIED, activatedAt: due }, { status: PENDING }, { status: PENDING }]],
    ['For Second Payment', [{ status: VERIFIED, activatedAt: due }, { status: PENDING, activatedAt: due }, { status: PENDING }]],
    ['Partially Paid', [{ status: VERIFIED, activatedAt: due }, { status: VERIFIED, activatedAt: due }, { status: PENDING }]],
    ['For Final Payment', [{ status: VERIFIED, activatedAt: due }, { status: VERIFIED, activatedAt: due }, { status: PENDING, activatedAt: due }]],
    ['Fully Paid', [{ status: VERIFIED }, { status: VERIFIED }, { status: VERIFIED }]],
    ['No Payment', [{ status: PENDING, activatedAt: due }]],
    ['Fully Paid', [{ status: VERIFIED, activatedAt: due }]],
  ] as Array<[string, StageInput[]]>)('labels the plan %s', (label, stages) => {
    expect(resolvePaymentWorkflowStatus([paymentPlan(stages)])).toMatchObject({ label });
  });

  it('keeps a partial cash amount before any verified stage as partially paid', () => {
    expect(resolvePaymentWorkflowStatus([paymentPlan([
      { status: PENDING, amount: 50_000, amountPaid: 20_000, remainingBalance: 30_000 },
    ])])).toMatchObject({ key: 'partially_paid', label: 'Partially Paid' });
  });
});

describe('resolveAppointmentWorkflowStatus', () => {
  it('labels a finished office consultation as Appointment Completed', () => {
    const completedConsultation = {
      status: AppointmentStatus.CONFIRMED,
      type: 'office',
      attendanceStatus: AppointmentAttendanceStatus.COMPLETED,
      ocularFeeStatus: undefined,
      ocularFeePaid: false,
    };

    expect(resolveAppointmentWorkflowStatus(completedConsultation)).toMatchObject({
      key: 'appointment_completed',
      label: 'Appointment Completed',
      tone: 'green',
      isTerminal: true,
    });
  });

  it('labels an appointment Pending until a sales staff is assigned, then Confirmed', () => {
    const appointment = {
      status: AppointmentStatus.CONFIRMED,
      type: 'office',
      ocularFeeStatus: undefined,
      ocularFeePaid: false,
    };

    expect(resolveAppointmentWorkflowStatus(appointment)).toMatchObject({
      key: 'appointment_pending',
      label: 'Appointment Pending',
    });
    expect(resolveAppointmentWorkflowStatus({ ...appointment, salesStaffId: 'sales-1' })).toMatchObject({
      key: 'appointment_confirmed',
      label: 'Appointment Confirmed',
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

  it('labels a stale in-progress appointment as Appointment Completed after its slot', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.IN_PROGRESS,
      type: 'ocular',
      date: '2026-08-28',
      slotCode: '15:00',
      ocularFeeStatus: undefined,
      ocularFeePaid: true,
    }, new Date('2026-10-01T08:40:00.000Z'))).toMatchObject({
      key: 'appointment_completed',
      label: 'Appointment Completed',
      tone: 'green',
      isTerminal: true,
    });
  });

  it('keeps an appointment In Progress until its one-hour slot ends', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.IN_PROGRESS,
      type: 'ocular',
      date: '2026-10-01',
      slotCode: '16:00',
      ocularFeeStatus: undefined,
      ocularFeePaid: true,
    }, new Date('2026-10-01T08:40:00.000Z'))).toMatchObject({
      key: 'in_progress',
      label: 'Appointment In Progress',
      isTerminal: false,
    });
  });
});
