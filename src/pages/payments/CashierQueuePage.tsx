import { useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { usePendingPayments, useVerifyPayment, useDeclinePayment } from '@/hooks/usePayments';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export function CashierQueuePage() {
  const { data: payments, isLoading, isError, refetch } = usePendingPayments();
  const verifyMutation = useVerifyPayment();
  const declineMutation = useDeclinePayment();

  const [verifyId, setVerifyId] = useState('');
  const [declineDialog, setDeclineDialog] = useState({ open: false, id: '' });
  const [declineReason, setDeclineReason] = useState('');

  const handleVerify = async () => {
    try {
      await verifyMutation.mutateAsync(verifyId);
      toast.success('Payment verified');
      setVerifyId('');
    } catch {
      toast.error('Verification failed');
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await declineMutation.mutateAsync({ id: declineDialog.id, reason: declineReason });
      toast.success('Payment declined');
      setDeclineDialog({ open: false, id: '' });
      setDeclineReason('');
    } catch {
      toast.error('Decline failed');
    }
  };

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cashier Queue</h1>
        <p className="text-gray-500 text-sm">Review and verify payment submissions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl border-gray-100">
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !payments?.length ? (
        <EmptyState
          icon={<CreditCard className="h-16 w-16" />}
          title="No pending payments"
          description="All payment submissions have been reviewed."
        />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card
              key={String(p._id)}
              className="rounded-xl border-gray-100 hover:shadow-md transition-shadow"
            >
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(Number(p.amountPaid))}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {String(p.method || '').replace('_', ' ')}
                    {p.referenceNumber && ` · Ref: ${String(p.referenceNumber)}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.createdAt
                      ? format(new Date(String(p.createdAt)), 'MMM d, yyyy h:mm a')
                      : ''}
                  </p>
                  {Number(p.creditFromPrevious) > 0 && (
                    <p className="text-xs text-emerald-600">
                      Credit applied: {formatCurrency(Number(p.creditFromPrevious))}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                    onClick={() => setVerifyId(String(p._id))}
                    disabled={verifyMutation.isPending}
                  >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-lg"
                    onClick={() => setDeclineDialog({ open: true, id: String(p._id) })}
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Verify Confirm */}
      <ConfirmDialog
        open={!!verifyId}
        onOpenChange={(open) => !open && setVerifyId('')}
        title="Verify Payment"
        description="Confirm this payment has been received. A receipt will be generated."
        confirmLabel="Verify"
        isLoading={verifyMutation.isPending}
        onConfirm={handleVerify}
      />

      {/* Decline Dialog */}
      <Dialog
        open={declineDialog.open}
        onOpenChange={(open) => {
          setDeclineDialog({ open, id: open ? declineDialog.id : '' });
          if (!open) setDeclineReason('');
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Decline Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-gray-700 text-[13px] font-medium">Reason</Label>
            <Input
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Why is this payment being declined?"
              className="h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 rounded-lg"
              onClick={() => setDeclineDialog({ open: false, id: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-lg"
              onClick={handleDecline}
              disabled={declineMutation.isPending}
            >
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
