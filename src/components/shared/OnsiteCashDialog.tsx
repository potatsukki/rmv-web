import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollectDesignFeeOnSite, useCollectOcularFeeOnSite } from '@/hooks/useCash';
import { canSubmitOnsiteCash, onsiteCashCopy } from '@/lib/onsite-cash';
import { extractErrorMessage } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

export type OnsiteCashTarget =
  | { kind: 'ocular'; appointmentId: string; amount: number; customerAcknowledged: boolean }
  | { kind: 'design'; projectId: string; amount: number; customerAcknowledged: boolean };

/** Sales staff records the cash the customer handed over during the ocular visit. */
export function OnsiteCashDialog({
  target,
  open,
  onOpenChange,
}: {
  target: OnsiteCashTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const collectOcular = useCollectOcularFeeOnSite();
  const collectDesign = useCollectDesignFeeOnSite();
  const [acknowledgedInPerson, setAcknowledgedInPerson] = useState(false);
  const [notes, setNotes] = useState('');
  const copy = onsiteCashCopy(target.kind);
  const isPending = collectOcular.isPending || collectDesign.isPending;
  const canSubmit = canSubmitOnsiteCash(target.customerAcknowledged, acknowledgedInPerson);

  const close = () => {
    setAcknowledgedInPerson(false);
    setNotes('');
    onOpenChange(false);
  };

  const submit = async () => {
    if (!canSubmit) {
      toast.error('Confirm the customer acknowledged the fee is non-refundable');
      return;
    }
    const body = {
      customerAcknowledgedInPerson: target.customerAcknowledged ? undefined : acknowledgedInPerson,
      notes: notes.trim() || undefined,
    };
    try {
      const result = target.kind === 'ocular'
        ? await collectOcular.mutateAsync({ appointmentId: target.appointmentId, ...body })
        : await collectDesign.mutateAsync({ projectId: target.projectId, ...body });
      toast.success(`Cash recorded${result.collectionNumber ? ` · Collection No. ${result.collectionNumber}` : ''}. Turn the cash over to the cashier for the official receipt.`);
      close();
    } catch (error) {
      toast.error(extractErrorMessage(error, `Failed to record the ${copy.fee}`));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount received</p>
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(target.amount)}</p>
          </div>
          {!target.customerAcknowledged && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledgedInPerson}
                onChange={(event) => setAcknowledgedInPerson(event.target.checked)}
              />
              <span>{copy.acknowledgment}</span>
            </label>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="onsite-cash-notes">Notes (optional)</Label>
            <Textarea
              id="onsite-cash-notes"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Paid in exact amount"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || !canSubmit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Received {formatCurrency(target.amount)} cash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
