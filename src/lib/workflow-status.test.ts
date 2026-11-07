import { describe, expect, it } from 'vitest';

import { AppointmentAttendanceStatus, AppointmentStatus, PaymentStageStatus } from './constants';
import type { PaymentPlan, PaymentStage } from './types';
import { resolveAppointmentWorkflowStatus, resolvePaymentWorkflowStatus, resolveProjectWorkflowStatus } from './workflow-status';

describe('project status', () => {
  it.each(['requested', 'confirmed', 'in_progress', 'completed', undefined])(
    'keeps a draft For Ocular until Done Ocular is pressed (ocular: %s)',
    (ocularVisitStatus) => {
      expect(resolveProjectWorkflowStatus({ project: {
        status: 'draft', ocularAppointmentId: 'ocular-1', ocularVisitStatus,
      } })).toMatchObject({ label: 'For Ocular', stage: 'pending_ocular', isTerminal: false });
    },
  );

  it('shows For Ocular for a new project before the contract and ocular are done', () => {
    expect(resolveProjectWorkflowStatus({ project: { status: 'draft', contractStatus: 'missing' } }))
      .toMatchObject({ label: 'For Ocular', stage: 'pending_ocular' });
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
  it('does not label an office consultation Completed from attendance alone', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.CONFIRMED,
      type: 'office',
      attendanceStatus: AppointmentAttendanceStatus.COMPLETED,
      ocularFeeStatus: undefined,
      ocularFeePaid: false,
    })).toMatchObject({ key: 'appointment_confirmed', isTerminal: false });
  });

  it('labels an office consultation Completed once the appointment is completed', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.COMPLETED,
      type: 'office',
      attendanceStatus: AppointmentAttendanceStatus.COMPLETED,
      ocularFeeStatus: undefined,
      ocularFeePaid: false,
    })).toMatchObject({
      key: 'appointment_completed',
      label: 'Completed',
      tone: 'green',
      isTerminal: true,
    });
  });

  it('labels office appointments Requested, Assigned, then Confirmed', () => {
    const appointment = {
      status: AppointmentStatus.REQUESTED,
      type: 'office',
      ocularFeeStatus: undefined,
      ocularFeePaid: false,
    };

    expect(resolveAppointmentWorkflowStatus(appointment)).toMatchObject({
      key: 'appointment_pending',
      label: 'Requested',
    });
    expect(resolveAppointmentWorkflowStatus({
      ...appointment,
      status: AppointmentStatus.ASSIGNED,
      salesStaffId: 'sales-1',
    })).toMatchObject({
      key: 'appointment_assigned',
      label: 'Assigned',
    });
    expect(resolveAppointmentWorkflowStatus({
      ...appointment,
      status: AppointmentStatus.CONFIRMED,
      salesStaffId: 'sales-1',
    })).toMatchObject({
      key: 'appointment_confirmed',
      label: 'Confirmed',
    });
  });

  it('shows a no-show consultation as Completed with a No Show badge', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.COMPLETED,
      attendanceStatus: AppointmentAttendanceStatus.NO_SHOW,
      type: 'office',
      ocularFeeStatus: undefined,
      ocularFeePaid: false,
    })).toMatchObject({
      key: 'appointment_completed',
      label: 'Completed',
      isTerminal: true,
      secondaryKey: 'no_show',
      secondaryLabel: 'No Show',
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
      label: 'Completed',
    });
  });

  it('shows an unfinished visit as Confirmed even after its slot time has passed', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.IN_PROGRESS,
      type: 'ocular',
      date: '2026-08-28',
      slotCode: '15:00',
      ocularFeeStatus: undefined,
      ocularFeePaid: true,
    })).toMatchObject({
      key: 'appointment_confirmed',
      label: 'Confirmed',
      isTerminal: false,
    });
  });

  it.each([
    [AppointmentStatus.REQUESTED, undefined, 'Requested', undefined],
    [AppointmentStatus.REQUESTED, 'sales-1', 'Assigned', undefined],
    [AppointmentStatus.ASSIGNED, 'sales-1', 'Assigned', undefined],
    [AppointmentStatus.CONFIRMED, 'sales-1', 'Confirmed', undefined],
    [AppointmentStatus.PREPARING, 'sales-1', 'Confirmed', undefined],
    [AppointmentStatus.ON_THE_WAY, 'sales-1', 'Confirmed', undefined],
    [AppointmentStatus.ARRIVED_AT_SITE, 'sales-1', 'Confirmed', undefined],
    [AppointmentStatus.IN_PROGRESS, 'sales-1', 'Confirmed', undefined],
    [AppointmentStatus.RESCHEDULE_REQUESTED, 'sales-1', 'Confirmed', undefined],
    [AppointmentStatus.RESCHEDULE_REQUESTED, undefined, 'Requested', undefined],
    [AppointmentStatus.READY_FOR_OCULAR, 'sales-1', 'Completed', undefined],
    [AppointmentStatus.COMPLETED, 'sales-1', 'Completed', undefined],
    [AppointmentStatus.CANCELLED, undefined, 'Completed', 'Cancelled'],
    [AppointmentStatus.NO_SHOW, 'sales-1', 'Completed', 'No Show'],
  ])('shows %s (sales staff: %s) as %s', (status, salesStaffId, label, secondaryLabel) => {
    const result = resolveAppointmentWorkflowStatus({ status, salesStaffId });
    expect(result.label).toBe(label);
    expect(result.secondaryLabel).toBe(secondaryLabel);
    expect(['Requested', 'Assigned', 'Confirmed', 'Completed']).toContain(result.label);
  });

  it('keeps a ready-for-ocular consultation in the upcoming list', () => {
    expect(resolveAppointmentWorkflowStatus({ status: AppointmentStatus.READY_FOR_OCULAR }))
      .toMatchObject({ label: 'Completed', isTerminal: false });
  });

  it('no longer replaces the status with Awaiting Ocular Fee', () => {
    expect(resolveAppointmentWorkflowStatus({
      status: AppointmentStatus.REQUESTED,
      type: 'ocular',
      salesStaffId: 'sales-1',
      ocularFeeStatus: 'pending',
      ocularFeePaid: false,
    })).toMatchObject({ key: 'appointment_assigned', label: 'Assigned' });
  });
});
