import { useState } from 'react';
import { AlertTriangle, Loader2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeeBreakdownCard } from '@/components/shared/FeeBreakdownCard';
import { usePendingDesignFees, useProjectFeeSummary, useRecordDesignFee } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PendingDesignFeeProject } from '@/lib/types';
import { extractErrorMessage } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

type DesignFeeMethod = 'cash' | 'gcash' | 'bank_transfer';

export function RecordDesignFeeDialog({
  projectId,
  amount,
  open,
  onOpenChange,
}: {
  projectId: string;
  amount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recordDesignFee = useRecordDesignFee();
  const [method, setMethod] = useState<DesignFeeMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const needsReference = method !== 'cash';

  const submit = async () => {
    if (needsReference && !referenceNumber.trim()) {
      toast.error('Enter the GCash or bank reference number');
      return;
    }
    try {
      const result = await recordDesignFee.mutateAsync({ id: projectId, method, referenceNumber });
      toast.success(`Design fee recorded. Receipt ${result.receiptNumber}.`);
      setReferenceNumber('');
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to record the design fee'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Design Fee Payment</DialogTitle>
          <DialogDescription>
            Confirm that {formatCurrency(amount)} was received. A receipt is emailed to the customer and the engineer can start the blueprint.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="design-fee-method">Payment method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as DesignFeeMethod)}>
              <SelectTrigger id="design-fee-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {needsReference && (
            <div className="space-y-1.5">
              <Label htmlFor="design-fee-reference">Reference number</Label>
              <Input
                id="design-fee-reference"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="e.g. 1234 567 890"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={recordDesignFee.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={recordDesignFee.isPending}>
            {recordDesignFee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record {formatCurrency(amount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Payments-tab fee section: breakdown for customer/cashier/admin/sales, plus the cashier's record action. */
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
  const [recordOpen, setRecordOpen] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading fee breakdown…</p>;
  if (isError || !summary) return null;

  const designFeePending = summary.designFee.status === 'pending';

  return (
    <div className="space-y-3">
      {designFeePending && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {isCustomer
                ? `A design fee of ${formatCurrency(summary.designFee.amount)} is due before the blueprint starts. Pay at the RMV cashier (cash, GCash, or bank transfer). It is deducted once from your total project cost.`
                : `Design fee of ${formatCurrency(summary.designFee.amount)} is unpaid. The blueprint cannot start until the cashier records it.`}
            </p>
          </div>
          {canRecord && (
            <Button type="button" size="sm" onClick={() => setRecordOpen(true)} className="shrink-0">
              <Wallet className="mr-2 h-4 w-4" />
              Record Design Fee
            </Button>
          )}
        </div>
      )}
      <FeeBreakdownCard summary={summary} />
      {canRecord && designFeePending && (
        <RecordDesignFeeDialog
          projectId={projectId}
          amount={summary.designFee.amount}
          open={recordOpen}
          onOpenChange={setRecordOpen}
        />
      )}
    </div>
  );
}

function customerName(project: PendingDesignFeeProject) {
  const customer = project.customerId;
  if (!customer || typeof customer === 'string') return 'Customer';
  return `${customer.firstName} ${customer.lastName}`.trim();
}

/** Cashier list of projects whose design fee is waiting for payment. */
export function DesignFeeQueue() {
  const { data: items = [], isLoading } = usePendingDesignFees();
  const [selected, setSelected] = useState<PendingDesignFeeProject | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Design Fees</CardTitle>
        <CardDescription>Projects waiting for the design fee before the blueprint can start.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading design fees…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending design fees.</p>
        ) : items.map((project) => (
          <div
            key={project._id}
            className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{project.title}</p>
              <p className="text-xs text-muted-foreground">
                {[project.projectNumber, customerName(project)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold tabular-nums">{formatCurrency(project.designFee.amount)}</p>
              <Button type="button" size="sm" onClick={() => setSelected(project)}>
                <Wallet className="mr-2 h-4 w-4" />
                Record
              </Button>
            </div>
          </div>
        ))}
        {selected && (
          <RecordDesignFeeDialog
            projectId={selected._id}
            amount={selected.designFee.amount}
            open={Boolean(selected)}
            onOpenChange={(open) => { if (!open) setSelected(null); }}
          />
        )}
      </CardContent>
    </Card>
  );
}

