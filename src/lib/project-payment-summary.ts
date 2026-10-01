import type { PaymentPlan } from './types';

export type ProjectPaymentReadiness = 'plan_missing' | 'payment_pending' | 'awaiting_verification' | 'verified';

export type ProjectPaymentSummaryItem = {
  id: string;
  label: string;
  totalAmount?: number;
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
    const parsedTotal = Number(plan?.totalAmount);
    const totalAmount = plan && Number.isFinite(parsedTotal) && parsedTotal >= 0
      ? parsedTotal
      : undefined;
    const readiness = getReadiness(plan);

    return {
      ...item,
      totalAmount,
      readiness,
      readinessLabel: READINESS_LABELS[readiness],
    };
  });

  return {
    rows,
    combinedTotal: rows.reduce((total, row) => total + (row.totalAmount ?? 0), 0),
    planCount: rows.filter((row) => row.readiness !== 'plan_missing').length,
    hasAllPlans: rows.length > 0 && rows.every((row) => row.readiness !== 'plan_missing'),
    allInitialPaymentsVerified: rows.length > 0 && rows.every((row) => row.readiness === 'verified'),
    outstandingRows: rows.filter((row) => row.readiness !== 'verified'),
  };
}
