import { AppointmentStatus, PaymentStageStatus, ProjectStatus } from '@/lib/constants';
import type { Appointment, Blueprint, PaymentPlan, Project, ProjectItem } from '@/lib/types';

export type WorkflowStatusStage =
  | 'appointment'
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

export function formatWorkflowStatusLabel(status?: string) {
  if (!status) return 'In Review';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasUnpaidStage(plan?: PaymentPlan | null) {
  return Boolean(plan?.stages?.some((stage) => String(stage.status) !== PaymentStageStatus.VERIFIED));
}

export function resolvePaymentWorkflowStatus(plans: Array<PaymentPlan | null | undefined> = []): WorkflowStatus {
  const validPlans = plans.filter((plan): plan is PaymentPlan => Boolean(plan));
  const stages = validPlans.flatMap((plan) => plan.stages || []);

  if (!stages.length) {
    return {
      key: 'payment_pending',
      label: 'Payment Required',
      tone: 'yellow',
      stage: 'billing',
      isTerminal: false,
    };
  }

  const verifiedCount = stages.filter((stage) => String(stage.status) === PaymentStageStatus.VERIFIED).length;
  if (verifiedCount === stages.length) {
    return {
      key: 'paid',
      label: 'Paid',
      tone: 'green',
      stage: 'billing',
      isTerminal: false,
      secondaryLabel: 'All payment stages verified',
    };
  }

  if (stages.some((stage) => String(stage.status) === PaymentStageStatus.PROOF_SUBMITTED)) {
    return {
      key: 'payment_for_verification',
      label: 'Payment Received, Awaiting Cashier Verification',
      tone: 'blue',
      stage: 'billing',
      isTerminal: false,
    };
  }

  if (verifiedCount > 0) {
    return {
      key: 'partially_paid',
      label: 'Partially Paid',
      tone: 'cyan',
      stage: 'billing',
      isTerminal: false,
    };
  }

  return {
    key: 'payment_required',
    label: 'Payment Required',
    tone: 'yellow',
    stage: 'billing',
    isTerminal: false,
  };
}

export function resolveAppointmentWorkflowStatus(appointment: Pick<Appointment, 'status' | 'ocularFeeStatus' | 'ocularFeePaid' | 'type'>): WorkflowStatus {
  const status = String(appointment.status || '');

  if (status === AppointmentStatus.CANCELLED) {
    return { key: 'cancelled', label: 'Cancelled', tone: 'red', stage: 'cancelled', isTerminal: true };
  }
  if (status === AppointmentStatus.NO_SHOW) {
    return { key: 'no_show', label: 'No Show', tone: 'gray', stage: 'cancelled', isTerminal: true };
  }
  if (status === AppointmentStatus.COMPLETED) {
    return { key: 'appointment_completed', label: 'Appointment Completed', tone: 'green', stage: 'completed', isTerminal: true };
  }
  if (appointment.type === 'ocular' && appointment.ocularFeeStatus === 'pending' && !appointment.ocularFeePaid) {
    return { key: 'awaiting_ocular_fee', label: 'Awaiting Ocular Fee', tone: 'orange', stage: 'billing', isTerminal: false };
  }
  if (status === AppointmentStatus.REQUESTED) {
    return { key: 'appointment_requested', label: 'Appointment Requested', tone: 'yellow', stage: 'appointment', isTerminal: false };
  }
  if (status === AppointmentStatus.CONFIRMED) {
    return { key: 'appointment_confirmed', label: 'Appointment Confirmed', tone: 'blue', stage: 'appointment', isTerminal: false };
  }
  if (status === AppointmentStatus.READY_FOR_OCULAR) {
    return { key: 'ready_for_ocular', label: 'Ready for Ocular', tone: 'purple', stage: 'appointment', isTerminal: false };
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

export function resolveProjectWorkflowStatus(input: {
  project?: Pick<Project, 'status' | 'contractStatus' | 'items'> | null;
  item?: Pick<ProjectItem, 'status'> | null;
  blueprint?: Pick<Blueprint, 'status' | 'quotationReviewStatus' | 'blueprintApproved' | 'costingApproved' | 'quotation'> | null;
  paymentPlans?: Array<PaymentPlan | null | undefined>;
  isCustomer?: boolean;
}): WorkflowStatus {
  const projectStatus = String(input.item?.status || input.project?.status || '');
  const itemStatuses = input.project?.items?.map((item) => String(item.status)) || [];
  const allItemsCompleted = itemStatuses.length > 0 && itemStatuses.every((status) => status === ProjectStatus.COMPLETED);
  const anyItemFabrication = itemStatuses.some((status) => status === ProjectStatus.FABRICATION);
  const anyItemPaymentPending = itemStatuses.some((status) => status === ProjectStatus.PAYMENT_PENDING);
  const paymentStatus = resolvePaymentWorkflowStatus(input.paymentPlans);
  const hasPaymentPlans = Boolean(input.paymentPlans?.some(Boolean));

  if (projectStatus === ProjectStatus.CANCELLED) {
    return { key: 'cancelled', label: 'Cancelled', tone: 'red', stage: 'cancelled', isTerminal: true };
  }

  if (projectStatus === ProjectStatus.COMPLETED || allItemsCompleted) {
    return { key: 'completed', label: 'Completed', tone: 'green', stage: 'completed', isTerminal: true };
  }

  if (projectStatus === ProjectStatus.FABRICATION || anyItemFabrication) {
    return { key: 'in_fabrication', label: 'In Fabrication', tone: 'orange', stage: 'fabrication', isTerminal: false };
  }

  if (hasPaymentPlans) {
    if (paymentStatus.key === 'paid') {
      return { ...paymentStatus, key: 'paid', label: 'Paid', secondaryLabel: 'Ready for fabrication assignment' };
    }
    if (paymentStatus.key === 'payment_for_verification') return paymentStatus;
    if (paymentStatus.key === 'partially_paid') return paymentStatus;
    if (hasUnpaidStage(input.paymentPlans?.find(Boolean))) return paymentStatus;
  }

  if (projectStatus === ProjectStatus.PAYMENT_PENDING || anyItemPaymentPending) {
    return { key: 'payment_required', label: 'Payment Required', tone: 'yellow', stage: 'billing', isTerminal: false };
  }

  if (
    input.blueprint?.quotationReviewStatus === 'sent_to_customer'
    && (!input.blueprint.blueprintApproved || !input.blueprint.costingApproved)
  ) {
    return {
      key: 'review_design_billing',
      label: 'Review Design & Billing',
      tone: 'purple',
      stage: 'design',
      isTerminal: false,
    };
  }

  if (projectStatus === ProjectStatus.BLUEPRINT || input.blueprint) {
    return {
      key: 'preparing_blueprint',
      label: input.blueprint?.status === 'revision_requested' ? 'Revision Requested' : 'Preparing Blueprint',
      tone: input.blueprint?.status === 'revision_requested' ? 'orange' : 'blue',
      stage: 'design',
      isTerminal: false,
    };
  }

  if (input.project?.contractStatus === 'missing') {
    return { key: 'contract_required', label: 'Contract Required', tone: 'yellow', stage: 'review', isTerminal: false };
  }

  if (projectStatus === ProjectStatus.APPROVED) {
    return { key: 'review_design_billing', label: 'Review Design & Billing', tone: 'purple', stage: 'design', isTerminal: false };
  }

  return {
    key: projectStatus || 'in_review',
    label: projectStatus === ProjectStatus.SUBMITTED ? 'In Review' : formatWorkflowStatusLabel(projectStatus || 'in_review'),
    tone: projectStatus === ProjectStatus.SUBMITTED ? 'blue' : 'gray',
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
