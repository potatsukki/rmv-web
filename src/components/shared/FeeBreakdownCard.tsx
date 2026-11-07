import { Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { ProjectFeeSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const DESIGN_FEE_STATUS_LABEL: Record<string, string> = {
  pending: 'Due before blueprint',
  verified: 'Paid',
  not_charged: 'Not charged',
};

const OCULAR_FEE_STATUS_LABEL: Record<string, string> = {
  verified: 'Paid',
  pending: 'Unpaid',
  cash_pending: 'Cash to collect',
  proof_submitted: 'Awaiting verification',
  declined: 'Declined',
};

function Row({
  label,
  value,
  hint,
  status,
  statusLabel,
  tone = 'default',
  emphasized = false,
}: {
  label: string;
  value: string;
  hint?: string;
  status?: string;
  statusLabel?: string;
  tone?: 'default' | 'credit' | 'muted';
  emphasized?: boolean;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 py-2.5', emphasized && 'pt-3')}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm text-foreground', emphasized && 'font-semibold')}>{label}</p>
          {status && <StatusBadge status={status} label={statusLabel} />}
        </div>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <p
        className={cn(
          'shrink-0 text-sm tabular-nums',
          emphasized && 'text-base font-semibold',
          tone === 'credit' && 'text-emerald-700 dark:text-emerald-300',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Customer / cashier / admin fee breakdown. Every amount comes from the server fee summary, so the
 * design fee credit and the ocular fee are counted exactly once.
 */
export function FeeBreakdownCard({ summary, className }: { summary: ProjectFeeSummary; className?: string }) {
  const { designFee, ocularFee } = summary;
  const showDesignFee = designFee.status !== 'not_required';
  const ocularIsCredited = ocularFee.treatment === 'credit';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          Fee Breakdown
        </CardTitle>
        <CardDescription>Project cost, fees, credits, and payments for this project.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          <Row
            label="Project Cost"
            value={summary.projectCost === null ? 'Pending costing' : formatCurrency(summary.projectCost)}
            hint={summary.projectCost === null ? 'Shown after the engineer\'s quotation is approved.' : undefined}
            tone={summary.projectCost === null ? 'muted' : 'default'}
          />
          {summary.installmentSurcharge > 0 && (
            <Row
              label="Installment Surcharge"
              value={formatCurrency(summary.installmentSurcharge)}
              hint="Applied to the project cost after the design fee credit."
            />
          )}
          {showDesignFee && (
            <Row
              label="Design Fee"
              value={designFee.status === 'not_charged' ? formatCurrency(0) : formatCurrency(designFee.amount)}
              hint={designFee.status === 'not_charged'
                ? 'Not charged because the project did not continue.'
                : `Layout and blueprint preparation. Paid before the blueprint starts. Non-refundable.${designFee.receiptNumber ? ` Receipt ${designFee.receiptNumber}.` : ''}`}
              status={designFee.status}
              statusLabel={DESIGN_FEE_STATUS_LABEL[designFee.status]}
            />
          )}
          {summary.designFeeCredit > 0 && (
            <Row
              label="Design Fee Credit"
              value={`−${formatCurrency(summary.designFeeCredit)}`}
              hint={summary.hasPaymentPlan
                ? 'Deducted once from your payment plan.'
                : 'Will be deducted once from your payment plan.'}
              tone="credit"
            />
          )}
          {ocularFee.applies ? (
            <Row
              label="Ocular Fee"
              value={formatCurrency(ocularFee.amount)}
              hint={`Outside Metro Manila travel fee, non-refundable. ${ocularFee.tollNote}`}
              status={ocularFee.status}
              statusLabel={OCULAR_FEE_STATUS_LABEL[ocularFee.status]}
            />
          ) : (
            <Row label="Ocular Fee" value="Free" hint="No travel fee within Metro Manila or without an ocular visit." tone="muted" />
          )}
          {ocularIsCredited && summary.ocularFeeCredit > 0 && (
            <Row
              label="Ocular Fee Credit"
              value={`−${formatCurrency(summary.ocularFeeCredit)}`}
              hint="Deducted once from your payment plan."
              tone="credit"
            />
          )}
          {summary.revisionFees.count > 0 && (
            <Row
              label="Revision Fees"
              value={formatCurrency(summary.revisionFees.amount)}
              hint={`${summary.revisionFees.count} paid revision${summary.revisionFees.count === 1 ? '' : 's'} beyond the free ones. Non-refundable.`}
              status={summary.revisionFees.pending > 0 ? 'pending' : 'verified'}
              statusLabel={summary.revisionFees.pending > 0 ? `${formatCurrency(summary.revisionFees.pending)} unpaid` : 'Paid'}
            />
          )}
          <Row label="Total Amount Due" value={formatCurrency(summary.totalAmountDue)} emphasized />
          <Row label="Payments Received" value={formatCurrency(summary.paymentsReceived)} tone="credit" />
          <Row label="Remaining Balance" value={formatCurrency(summary.remainingBalance)} emphasized />
        </div>
      </CardContent>
    </Card>
  );
}
