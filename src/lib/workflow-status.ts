import { AppointmentAttendanceStatus, AppointmentStatus, PaymentStageStatus, ProjectStatus } from '@/lib/constants';
import type { Blueprint, PaymentPlan, PaymentStage, Project, ProjectItem } from '@/lib/types';

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
  /** Status key for an extra badge, e.g. the no-show outcome of a completed consultation. */
  secondaryKey?: string;
}

const terminalStatuses = new Set(['completed', 'cancelled', 'no_show', 'done']);

// Loose on purpose: list, search, and cash views all pass their own appointment shapes.
type AppointmentWorkflowInput = {
  status?: string | null;
  attendanceStatus?: string | null;
  salesStaffId?: unknown;
  type?: string;
  ocularFeeStatus?: string;
  ocularFeePaid?: boolean;
  date?: string;
  slotCode?: string;
};

/** The four appointment statuses the UI shows; the database keeps the detailed ones. */
export const APPOINTMENT_STATUS_GROUPS = ['requested', 'assigned', 'confirmed', 'completed'] as const;
export type AppointmentStatusGroup = (typeof APPOINTMENT_STATUS_GROUPS)[number];

const CONFIRMED_APPOINTMENT_STATUSES = new Set<string>([
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PREPARING,
  AppointmentStatus.ON_THE_WAY,
  AppointmentStatus.ARRIVED_AT_SITE,
  AppointmentStatus.IN_PROGRESS,
]);

export function formatWorkflowStatusLabel(status?: string) {
  if (!status) return 'In Review';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isVerifiedStage(stage: PaymentStage) {
  return String(stage.status) === PaymentStageStatus.VERIFIED;
}

/**
 * True once the first payment stage (down payment, or the single full payment) of every plan is
 * verified. Mirrors the server's allProjectItemsHaveFirstPaymentVerified.
 */
export function isInitialPaymentVerified(plans: Array<PaymentPlan | null | undefined> = []) {
  const validPlans = plans.filter((plan): plan is PaymentPlan => Boolean(plan?.stages?.length));
  return validPlans.length > 0 && validPlans.every((plan) => isVerifiedStage(plan.stages[0]!));
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

const STATUS_GROUP_BY_KEY: Record<string, AppointmentStatusGroup> = {
  appointment_pending: 'requested',
  appointment_assigned: 'assigned',
  appointment_confirmed: 'confirmed',
  appointment_completed: 'completed',
};

/** Which of the four displayed statuses an appointment falls under. */
export function resolveAppointmentStatusGroup(appointment: AppointmentWorkflowInput): AppointmentStatusGroup {
  return STATUS_GROUP_BY_KEY[resolveAppointmentWorkflowStatus(appointment).key] ?? 'requested';
}

/**
 * Every role sees four appointment statuses: Requested, Assigned, Confirmed, Completed.
 * Visit steps (preparing, on the way, in progress) show as Confirmed; cancelled and no-show
 * close as Completed with an outcome badge. Keep in sync with the server's status groups.
 */
export function resolveAppointmentWorkflowStatus(
  appointment: AppointmentWorkflowInput,
): WorkflowStatus {
  const status = String(appointment.status || '');
  const hasSalesStaff = Boolean(appointment.salesStaffId);
  const completed = (extra: Partial<WorkflowStatus> = {}): WorkflowStatus => ({
    key: 'appointment_completed', label: 'Completed', tone: 'green', stage: 'completed', isTerminal: true, ...extra,
  });

  if (status === AppointmentStatus.CANCELLED) {
    return completed({ secondaryKey: 'cancelled', secondaryLabel: 'Cancelled' });
  }
  if (status === AppointmentStatus.NO_SHOW) {
    return completed({ secondaryKey: 'no_show', secondaryLabel: 'No Show' });
  }
  if (status === AppointmentStatus.COMPLETED) {
    const attendance = String(appointment.attendanceStatus || '');
    if (attendance === AppointmentAttendanceStatus.NO_SHOW) {
      return completed({ secondaryKey: attendance, secondaryLabel: 'No Show' });
    }
    if (attendance === AppointmentAttendanceStatus.CUSTOMER_DECLINED) {
      return completed({ secondaryKey: attendance, secondaryLabel: 'Customer Declined' });
    }
    return completed();
  }
  // The consultation is finished, but the customer still has the ocular step ahead.
  if (status === AppointmentStatus.READY_FOR_OCULAR) {
    return completed({ isTerminal: false });
  }
  if (
    CONFIRMED_APPOINTMENT_STATUSES.has(status)
    || (status === AppointmentStatus.RESCHEDULE_REQUESTED && hasSalesStaff)
  ) {
    return { key: 'appointment_confirmed', label: 'Confirmed', tone: 'blue', stage: 'appointment', isTerminal: false };
  }
  if (status === AppointmentStatus.ASSIGNED || (status === AppointmentStatus.REQUESTED && hasSalesStaff)) {
    return { key: 'appointment_assigned', label: 'Assigned', tone: 'cyan', stage: 'appointment', isTerminal: false };
  }
  return { key: 'appointment_pending', label: 'Requested', tone: 'yellow', stage: 'appointment', isTerminal: false };
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
  /** Down payment (or full payment) verified; pass it where the payment plan is loaded. */
  initialPaymentVerified?: boolean;
}): WorkflowStatus {
  const projectStatus = String(input.item?.status || input.project?.status || '');
  const itemStatuses = input.project?.items?.map((item) => String(item.status)) || [];
  const allItemsCompleted = itemStatuses.length > 0 && itemStatuses.every((status) => status === ProjectStatus.COMPLETED);
  const anyItemFabrication = itemStatuses.some((status) => status === ProjectStatus.FABRICATION);
  const anyItemPaymentPending = itemStatuses.some((status) => status === ProjectStatus.PAYMENT_PENDING);

  if (projectStatus === ProjectStatus.CANCELLED) {
    return { key: 'cancelled', label: 'Cancelled', tone: 'red', stage: 'cancelled', isTerminal: true };
  }

  // A new project stays "For Ocular" (contract → ocular visit) until sales presses Done Ocular,
  // which submits it and shows "For Review".
  if (input.project?.status === ProjectStatus.DRAFT) {
    return { key: 'for_ocular', label: 'For Ocular', tone: 'green', stage: 'pending_ocular', isTerminal: false };
  }

  if (projectStatus === ProjectStatus.COMPLETED || allItemsCompleted) {
    return { key: 'completed', label: 'Completed', tone: 'green', stage: 'completed', isTerminal: true };
  }

  if (projectStatus === ProjectStatus.FABRICATION || anyItemFabrication) {
    return { key: 'for_fabrication', label: 'For Fabrication', tone: 'orange', stage: 'fabrication', isTerminal: false };
  }

  if (projectStatus === ProjectStatus.APPROVED || projectStatus === ProjectStatus.PAYMENT_PENDING || anyItemPaymentPending) {
    // Paid, but fabrication starts only once a fabrication team is assigned.
    if (input.initialPaymentVerified) {
      return { key: 'for_fabrication_team', label: 'For Fabrication Team Assignment', tone: 'cyan', stage: 'billing', isTerminal: false };
    }
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
