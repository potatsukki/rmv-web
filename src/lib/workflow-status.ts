import { AppointmentAttendanceStatus, AppointmentStatus, PaymentStageStatus, ProjectStatus } from '@/lib/constants';
import type { Appointment, Blueprint, PaymentPlan, PaymentStage, Project, ProjectItem } from '@/lib/types';

export type WorkflowStatusStage =
  | 'appointment'
  | 'pending_ocular'
  | 'design'
  | 'billing'
  | 'fabrication'
  | 'completed'
  | 'cancelled'
  | 'review';

export type WorkflowStatusTone =
  | 'gray'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'orange'
  | 'indigo'
  | 'cyan';

export interface WorkflowStatus {
  key: string;
  label: string;
  tone: WorkflowStatusTone;
  stage: WorkflowStatusStage;
  isTerminal: boolean;
  secondaryLabel?: string;
}

const terminalStatuses = new Set(['completed', 'cancelled', 'no_show', 'done']);
const APPOINTMENT_SLOT_DURATION_MS = 60 * 60 * 1000;

type AppointmentWorkflowInput = Pick<
  Appointment,
  'status' | 'attendanceStatus' | 'ocularFeeStatus' | 'ocularFeePaid' | 'type'
> & Partial<Pick<Appointment, 'date' | 'slotCode' | 'salesStaffId'>>;

function hasElapsedAppointmentSlot(
  appointment: Pick<AppointmentWorkflowInput, 'date' | 'slotCode'>,
  now: Date,
) {
  if (!appointment.date || !appointment.slotCode) return false;

  const start = new Date(`${appointment.date.slice(0, 10)}T${appointment.slotCode}:00+08:00`);
  if (Number.isNaN(start.getTime())) return false;

  return now.getTime() >= start.getTime() + APPOINTMENT_SLOT_DURATION_MS;
}

export function formatWorkflowStatusLabel(status?: string) {
  if (!status) return 'In Review';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isVerifiedStage(stage: PaymentStage) {
  return String(stage.status) === PaymentStageStatus.VERIFIED;
}

function billingStatus(key: string, label: string, tone: WorkflowStatusTone): WorkflowStatus {
  return { key, label, tone, stage: 'billing', isTerminal: false };
}

/**
 * Payment progress for the plan: No Payment, Down Payment Paid, For Second Payment (due at
 * Welding/Assembly), Partially Paid, For Final Payment (due at Quality Check), Fully Paid.
 */
export function resolvePaymentWorkflowStatus(plans: Array<PaymentPlan | null | undefined> = []): WorkflowStatus {
  const validPlans = plans.filter((plan): plan is PaymentPlan => Boolean(plan?.stages?.length));
  const stages = validPlans.flatMap((plan) => plan.stages);

  if (stages.length > 0 && stages.every(isVerifiedStage)) {
    return { ...billingStatus('paid', 'Fully Paid', 'green'), secondaryLabel: 'All payment stages verified' };
  }
  if (stages.some((stage) => String(stage.status) === PaymentStageStatus.PROOF_SUBMITTED)) {
    return billingStatus('payment_for_verification', 'Payment Received, Awaiting Cashier Verification', 'blue');
  }

  // Item plans are paid together, so describe the one that is furthest behind.
  const plan = validPlans.reduce<PaymentPlan | undefined>((behind, current) => (
    !behind || current.stages.filter(isVerifiedStage).length < behind.stages.filter(isVerifiedStage).length ? current : behind
  ), undefined);
  const paidCount = plan ? plan.stages.filter(isVerifiedStage).length : 0;

  if (paidCount === 0) {
    // A partial cash amount before any stage is verified still counts as money received.
    const hasPartialAmount = stages.some((stage) => {
      const amountPaid = Number(stage.amountPaid || 0);
      const remainingBalance = stage.remainingBalance == null
        ? Math.max(Number(stage.amount || 0) - amountPaid, 0)
        : Number(stage.remainingBalance);
      return amountPaid > 0 && remainingBalance > 0;
    });
    return hasPartialAmount
      ? billingStatus('partially_paid', 'Partially Paid', 'cyan')
      : billingStatus('no_payment', 'No Payment', 'yellow');
  }

  const nextStage = plan!.stages.find((stage) => !isVerifiedStage(stage));
  if (nextStage?.activatedAt) {
    if (nextStage === plan!.stages[plan!.stages.length - 1]) {
      return billingStatus('for_final_payment', 'For Final Payment', 'orange');
    }
    // ponytail: plans with more than three stages show their middle dues as Partially Paid.
    if (paidCount === 1) return billingStatus('for_second_payment', 'For Second Payment', 'orange');
  }
  return paidCount === 1
    ? billingStatus('down_payment_paid', 'Down Payment Paid', 'cyan')
    : billingStatus('partially_paid', 'Partially Paid', 'cyan');
}

export function resolveAppointmentWorkflowStatus(
  appointment: AppointmentWorkflowInput,
  now = new Date(),
): WorkflowStatus {
  const status = String(appointment.status || '');

  if (status === AppointmentStatus.CANCELLED) {
    return { key: 'cancelled', label: 'Cancelled', tone: 'red', stage: 'cancelled', isTerminal: true };
  }
  if (status === AppointmentStatus.NO_SHOW) {
    return { key: 'no_show', label: 'No Show', tone: 'gray', stage: 'cancelled', isTerminal: true };
  }
  if (status === AppointmentStatus.READY_FOR_OCULAR) {
    return { key: 'ready_for_ocular', label: 'Ready for Ocular', tone: 'purple', stage: 'appointment', isTerminal: false };
  }
  if (
    appointment.type === 'office'
    && appointment.attendanceStatus === AppointmentAttendanceStatus.COMPLETED
  ) {
    return { key: 'appointment_completed', label: 'Appointment Completed', tone: 'green', stage: 'completed', isTerminal: true };
  }
  if (status === AppointmentStatus.COMPLETED) {
    return { key: 'appointment_completed', label: 'Appointment Completed', tone: 'green', stage: 'completed', isTerminal: true };
  }
  if (
    (status === AppointmentStatus.IN_PROGRESS
      || appointment.attendanceStatus === AppointmentAttendanceStatus.IN_PROGRESS)
    && hasElapsedAppointmentSlot(appointment, now)
  ) {
    return { key: 'appointment_completed', label: 'Appointment Completed', tone: 'green', stage: 'completed', isTerminal: true };
  }
  if (appointment.type === 'ocular' && appointment.ocularFeeStatus === 'pending' && !appointment.ocularFeePaid) {
    return { key: 'awaiting_ocular_fee', label: 'Awaiting Ocular Fee', tone: 'orange', stage: 'billing', isTerminal: false };
  }
  // Confirmed once the appointment agent assigns a sales staff; pending until then.
  if (status === AppointmentStatus.REQUESTED || status === AppointmentStatus.CONFIRMED) {
    return appointment.salesStaffId
      ? { key: 'appointment_confirmed', label: 'Appointment Confirmed', tone: 'blue', stage: 'appointment', isTerminal: false }
      : { key: 'appointment_pending', label: 'Appointment Pending', tone: 'yellow', stage: 'appointment', isTerminal: false };
  }
  if (status === AppointmentStatus.RESCHEDULE_REQUESTED) {
    return { key: 'reschedule_requested', label: 'Reschedule Requested', tone: 'orange', stage: 'appointment', isTerminal: false };
  }

  return {
    key: status || 'appointment_in_review',
    label: status ? `Appointment ${formatWorkflowStatusLabel(status)}` : 'Appointment In Review',
    tone: status === AppointmentStatus.IN_PROGRESS ? 'indigo' : 'cyan',
    stage: 'appointment',
    isTerminal: terminalStatuses.has(status),
  };
}

/**
 * Project progress from the project status alone; payment progress is shown separately by
 * resolvePaymentWorkflowStatus. For Ocular, For Review, For Blueprint & Costing, For Down Payment,
 * For Fabrication (down payment verified and a team assigned), then Completed.
 */
export function resolveProjectWorkflowStatus(input: {
  project?: Pick<Project, 'status' | 'contractStatus' | 'items' | 'ocularAppointmentId' | 'ocularVisitStatus'> | null;
  item?: Pick<ProjectItem, 'status'> | null;
  blueprint?: Pick<Blueprint, 'status'> | null;
}): WorkflowStatus {
  const projectStatus = String(input.item?.status || input.project?.status || '');
  const itemStatuses = input.project?.items?.map((item) => String(item.status)) || [];
  const allItemsCompleted = itemStatuses.length > 0 && itemStatuses.every((status) => status === ProjectStatus.COMPLETED);
  const anyItemFabrication = itemStatuses.some((status) => status === ProjectStatus.FABRICATION);
  const anyItemPaymentPending = itemStatuses.some((status) => status === ProjectStatus.PAYMENT_PENDING);

  if (projectStatus === ProjectStatus.CANCELLED) {
    return { key: 'cancelled', label: 'Cancelled', tone: 'red', stage: 'cancelled', isTerminal: true };
  }

  if (input.project?.status === ProjectStatus.DRAFT && input.project.ocularAppointmentId) {
    return input.project.ocularVisitStatus === AppointmentStatus.COMPLETED
      ? { key: 'for_review', label: 'For Review', tone: 'blue', stage: 'pending_ocular', isTerminal: false }
      : { key: 'for_ocular', label: 'For Ocular', tone: 'green', stage: 'pending_ocular', isTerminal: false };
  }

  if (projectStatus === ProjectStatus.COMPLETED || allItemsCompleted) {
    return { key: 'completed', label: 'Completed', tone: 'green', stage: 'completed', isTerminal: true };
  }

  if (projectStatus === ProjectStatus.FABRICATION || anyItemFabrication) {
    return { key: 'for_fabrication', label: 'For Fabrication', tone: 'orange', stage: 'fabrication', isTerminal: false };
  }

  if (projectStatus === ProjectStatus.APPROVED || projectStatus === ProjectStatus.PAYMENT_PENDING || anyItemPaymentPending) {
    return { key: 'for_down_payment', label: 'For Down Payment', tone: 'yellow', stage: 'billing', isTerminal: false };
  }

  if (input.blueprint?.status === 'revision_requested') {
    return { key: 'revision_requested', label: 'Revision Requested', tone: 'orange', stage: 'design', isTerminal: false };
  }

  if (projectStatus === ProjectStatus.BLUEPRINT || input.blueprint) {
    return { key: 'for_blueprint_costing', label: 'For Blueprint & Costing', tone: 'blue', stage: 'design', isTerminal: false };
  }

  if (input.project?.contractStatus === 'missing') {
    return { key: 'contract_required', label: 'Contract Required', tone: 'yellow', stage: 'review', isTerminal: false };
  }

  if (!projectStatus || projectStatus === ProjectStatus.SUBMITTED) {
    return { key: 'for_review', label: 'For Review', tone: 'blue', stage: 'review', isTerminal: false };
  }

  return {
    key: projectStatus,
    label: formatWorkflowStatusLabel(projectStatus),
    tone: 'gray',
    stage: 'review',
    isTerminal: terminalStatuses.has(projectStatus),
  };
}

export function resolveBlueprintWorkflowStatus(blueprint?: Pick<Blueprint, 'status' | 'quotationReviewStatus' | 'blueprintApproved' | 'costingApproved'> | null): WorkflowStatus {
  if (!blueprint) {
    return { key: 'preparing_blueprint', label: 'Preparing Blueprint', tone: 'blue', stage: 'design', isTerminal: false };
  }
  if (blueprint.status === 'revision_requested') {
    return { key: 'revision_requested', label: 'Revision Requested', tone: 'orange', stage: 'design', isTerminal: false };
  }
  if (blueprint.blueprintApproved && blueprint.costingApproved) {
    return { key: 'design_billing_approved', label: 'Design & Billing Approved', tone: 'green', stage: 'design', isTerminal: false };
  }
  if (blueprint.quotationReviewStatus === 'sent_to_customer') {
    return { key: 'review_design_billing', label: 'Review Design & Billing', tone: 'purple', stage: 'design', isTerminal: false };
  }
  return { key: 'preparing_blueprint', label: 'Preparing Blueprint', tone: 'blue', stage: 'design', isTerminal: false };
}

export function statusKeyForBadge(status: WorkflowStatus) {
  return status.key;
}
