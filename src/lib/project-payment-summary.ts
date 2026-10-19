import type { PaymentPlan } from './types';

export type ProjectPaymentReadiness = 'plan_missing' | 'payment_pending' | 'awaiting_verification' | 'verified';

export type ProjectPaymentSummaryItem = {
  id: string;
  label: string;
  totalAmount?: number;
  /** The item is paid through one project-level plan shared by every item. */
  inCombinedPlan: boolean;
  readiness: ProjectPaymentReadiness;
  readinessLabel: string;
};

type ProjectPaymentItem = {
  id: string;
  label: string;
};

const READINESS_LABELS: Record<ProjectPaymentReadiness, string> = {
  plan_missing: 'Payment plan not created',
  payment_pending: 'First payment not yet verified',
  awaiting_verification: 'First payment awaiting cashier verification',
  verified: 'First payment verified',
};

function getReadiness(plan?: PaymentPlan): ProjectPaymentReadiness {
  if (!plan) return 'plan_missing';

  const firstStageStatus = String(plan.stages?.[0]?.status || '');
  if (firstStageStatus === 'verified') return 'verified';
  if (firstStageStatus === 'proof_submitted') return 'awaiting_verification';
  return 'payment_pending';
}

export function summarizeProjectPaymentPlans(
  items: ProjectPaymentItem[],
  plans: Array<PaymentPlan | undefined>,
) {
  const rows: ProjectPaymentSummaryItem[] = items.map((item, index) => {
    const plan = plans[index];
    const inCombinedPlan = Boolean(plan && !plan.projectItemId && items.length > 1);
    const parsedTotal = Number(plan?.totalAmount);
    const totalAmount = plan && !inCombinedPlan && Number.isFinite(parsedTotal) && parsedTotal >= 0
      ? parsedTotal
      : undefined;
    const readiness = getReadiness(plan);

    return {
      ...item,
      totalAmount,
      inCombinedPlan,
      readiness,
      readinessLabel: READINESS_LABELS[readiness],
    };
  });

  return {
    rows,
    // Every item query returns the same combined plan, so count each plan once.
    combinedTotal: [...new Map(plans.flatMap((plan) => plan ? [[plan._id, plan] as const] : [])).values()]
      .reduce((total, plan) => total + (Number.isFinite(Number(plan.totalAmount)) ? Number(plan.totalAmount) : 0), 0),
    planCount: rows.filter((row) => row.readiness !== 'plan_missing').length,
    hasAllPlans: rows.length > 0 && rows.every((row) => row.readiness !== 'plan_missing'),
    allInitialPaymentsVerified: rows.length > 0 && rows.every((row) => row.readiness === 'verified'),
    outstandingRows: rows.filter((row) => row.readiness !== 'verified'),
  };
}
