import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeeBreakdownCard } from '@/components/shared/FeeBreakdownCard';
import { GcashPayment } from '@/pages/payments/components/GcashPayment';
import {
  usePendingFees,
  useProjectFeeSummary,
  useRecordDesignFee,
  useRecordRevisionFee,
  type FeePaymentMethod,
} from '@/hooks/useProjects';
import type { PendingDesignFeeProject } from '@/lib/types';
import { extractErrorMessage } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

/** Which fee the cashier is recording. Design fees may need the in-person non-refundable acknowledgment. */
export type FeeToRecord =
  | { kind: 'design'; projectId: string; amount: number; customerAcknowledged: boolean; title?: string }
  | { kind: 'revision'; blueprintId: string; amount: number; revisionNumber: number; title?: string };

export function RecordFeeDialog({
  fee,
  open,
  onOpenChange,
}: {
  fee: FeeToRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recordDesignFee = useRecordDesignFee();
  const recordRevisionFee = useRecordRevisionFee();
  const [method, setMethod] = useState<FeePaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [acknowledgedInPerson, setAcknowledgedInPerson] = useState(false);
  const isPending = recordDesignFee.isPending || recordRevisionFee.isPending;
  const needsReference = method !== 'cash';
  const needsInPersonAck = fee.kind === 'design' && !fee.customerAcknowledged;
  const label = fee.kind === 'design' ? 'Design Fee' : `Revision Fee (Revision ${fee.revisionNumber})`;

  const submit = async () => {
    if (needsReference && !referenceNumber.trim()) {
      toast.error('Enter the GCash or bank reference number');
      return;
    }
    if (needsInPersonAck && !acknowledgedInPerson) {
      toast.error('Confirm the customer acknowledged the fee is non-refundable');
      return;
    }
    try {
      const result = fee.kind === 'design'
        ? await recordDesignFee.mutateAsync({
          id: fee.projectId, method, referenceNumber, customerAcknowledgedInPerson: needsInPersonAck,
        })
        : await recordRevisionFee.mutateAsync({ blueprintId: fee.blueprintId, method, referenceNumber });
      toast.success(`${label} recorded. Receipt ${result.receiptNumber}.`);
      setReferenceNumber('');
      setAcknowledgedInPerson(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, `Failed to record the ${label.toLowerCase()}`));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record {label}</DialogTitle>
          <DialogDescription>
            Confirm that {formatCurrency(fee.amount)} was received{fee.title ? ` for "${fee.title}"` : ''}. A receipt is emailed to the customer and the engineer can start the work.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fee-method">Payment method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as FeePaymentMethod)}>
              <SelectTrigger id="fee-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {needsReference && (
            <div className="space-y-1.5">
              <Label htmlFor="fee-reference">Reference number</Label>
              <Input
                id="fee-reference"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="e.g. 1234 567 890"
              />
            </div>
          )}
          {needsInPersonAck && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledgedInPerson}
                onChange={(event) => setAcknowledgedInPerson(event.target.checked)}
              />
              <span>The customer has not confirmed in the app. I confirm the customer acknowledged in person that this fee is non-refundable.</span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || (needsInPersonAck && !acknowledgedInPerson)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record {formatCurrency(fee.amount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Payments-tab fee section: breakdown for customer/cashier/admin/sales, plus the cashier's record actions. */
export function DesignFeePanel({
  projectId,
  isCustomer,
  canRecord,
}: {
  projectId: string;
  isCustomer: boolean;
  canRecord: boolean;
}) {
  const { data: summary, isLoading, isError } = useProjectFeeSummary(projectId);
  const [feeToRecord, setFeeToRecord] = useState<FeeToRecord | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading fee breakdown…</p>;
  if (isError || !summary) return null;

  const designFeePending = summary.designFee.status === 'pending';
  const acknowledgedAt = summary.designFee.acknowledgedAt;
  const pendingRevisions = summary.revisionFees.items.filter((item) => item.status === 'pending');

  return (
    <div className="space-y-3">
      {designFeePending && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {isCustomer
                  ? `A non-refundable design fee of ${formatCurrency(summary.designFee.amount)} is due before the blueprint starts. Pay it below with GCash, or in cash at the RMV cashier. It will be deducted from your final payment.`
                  : `Design fee of ${formatCurrency(summary.designFee.amount)} is unpaid. The blueprint cannot start until the cashier records it.`}
              </p>
            </div>
            {canRecord && (
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => setFeeToRecord({
                  kind: 'design', projectId, amount: summary.designFee.amount, customerAcknowledged: Boolean(acknowledgedAt),
                })}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Record Design Fee
              </Button>
            )}
          </div>
          {acknowledgedAt ? (
            <p className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Customer acknowledged the fee is non-refundable on {format(new Date(acknowledgedAt), 'MMM d, yyyy h:mm a')}.
            </p>
          ) : isCustomer ? null : (
            <p className="text-xs">The customer has not confirmed the non-refundable notice in the app yet.</p>
          )}
          {isCustomer && (
            <GcashPayment
              target={{ stageId: `design-fee-${projectId}` }}
              requireNonRefundableAck={!acknowledgedAt}
              nonRefundableNotice={`I understand the ${formatCurrency(summary.designFee.amount)} design fee is non-refundable once paid.`}
            />
          )}
        </div>
      )}
      {pendingRevisions.map((item) => (
        <div
          key={item.blueprintId}
          className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {isCustomer
                ? `Revision ${item.revisionNumber} has a non-refundable fee of ${formatCurrency(item.amount)}. Pay it at the RMV cashier so the engineer can start the revision.`
                : `Revision ${item.revisionNumber} fee of ${formatCurrency(item.amount)} is unpaid. The engineer cannot start the revision until it is recorded.`}
            </p>
          </div>
          {canRecord && (
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => setFeeToRecord({
                kind: 'revision', blueprintId: item.blueprintId, amount: item.amount, revisionNumber: item.revisionNumber,
              })}
            >
              <Wallet className="mr-2 h-4 w-4" />
              Record Revision Fee
            </Button>
          )}
        </div>
      ))}
      <FeeBreakdownCard summary={summary} />
      {canRecord && feeToRecord && (
        <RecordFeeDialog
          fee={feeToRecord}
          open={Boolean(feeToRecord)}
          onOpenChange={(open) => { if (!open) setFeeToRecord(null); }}
        />
      )}
    </div>
  );
}

function customerName(customer: PendingDesignFeeProject['customerId']) {
  if (!customer || typeof customer === 'string') return 'Customer';
  return `${customer.firstName} ${customer.lastName}`.trim();
}

function FeeRow({
  title,
  subtitle,
  amount,
  badge,
  onRecord,
}: {
  title: string;
  subtitle: string;
  amount: number;
  badge: string;
  onRecord: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{badge} · {subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold tabular-nums">{formatCurrency(amount)}</p>
        <Button type="button" size="sm" onClick={onRecord}>
          <Wallet className="mr-2 h-4 w-4" />
          Record
        </Button>
      </div>
    </div>
  );
}

/** Cashier list of design and revision fees waiting for payment. */
export function DesignFeeQueue() {
  const { data, isLoading } = usePendingFees();
  const [feeToRecord, setFeeToRecord] = useState<FeeToRecord | null>(null);
  const designFees = data?.designFees || [];
  const revisionFees = data?.revisionFees || [];
  const isEmpty = !designFees.length && !revisionFees.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project Fees</CardTitle>
        <CardDescription>Design and revision fees waiting for payment. The engineer can start once you record them.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading fees…</p>
        ) : isEmpty ? (
          <p className="text-sm text-muted-foreground">No pending design or revision fees.</p>
        ) : (
          <>
            {designFees.map((project) => (
              <FeeRow
                key={`design-${project._id}`}
                title={project.title}
                subtitle={[project.projectNumber, customerName(project.customerId)].filter(Boolean).join(' · ')}
                amount={project.designFee.amount}
                badge="Design fee"
                onRecord={() => setFeeToRecord({
                  kind: 'design',
                  projectId: project._id,
                  amount: project.designFee.amount,
                  customerAcknowledged: Boolean(project.designFee.acknowledgedAt),
                  title: project.title,
                })}
              />
            ))}
            {revisionFees.map((item) => (
              <FeeRow
                key={`revision-${item.blueprintId}`}
                title={item.project.title}
                subtitle={[item.project.projectNumber, customerName(item.project.customerId)].filter(Boolean).join(' · ')}
                amount={item.revisionFee.amount}
                badge={`Revision ${item.revisionFee.revisionNumber} fee`}
                onRecord={() => setFeeToRecord({
                  kind: 'revision',
                  blueprintId: item.blueprintId,
                  amount: item.revisionFee.amount,
                  revisionNumber: item.revisionFee.revisionNumber,
                  title: item.project.title,
                })}
              />
            ))}
          </>
        )}
        {feeToRecord && (
          <RecordFeeDialog
            fee={feeToRecord}
            open={Boolean(feeToRecord)}
            onOpenChange={(open) => { if (!open) setFeeToRecord(null); }}
          />
        )}
      </CardContent>
    </Card>
  );
}
