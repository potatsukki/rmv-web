import { useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, CheckCircle, XCircle, AlertTriangle, QrCode, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { usePendingPayments, useVerifyPayment, useDeclinePayment, useOverduePayments } from '@/hooks/usePayments';
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

// Helper to extract populated project/customer fields from pending payments
function getPaymentContext(p: any) {
  const proj = typeof p.projectId === 'object' ? p.projectId : null;
  const cust = proj?.customerId && typeof proj.customerId === 'object' ? proj.customerId : null;
  return {
    projectTitle: proj?.title || 'Unknown Project',
    customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Unknown Customer',
  };
}

export function CashierQueuePage() {
  const { data: payments, isLoading, isError, refetch } = usePendingPayments();
  const { data: overduePayments, isLoading: overdueLoading } = useOverduePayments();
  const verifyMutation = useVerifyPayment();
  const declineMutation = useDeclinePayment();

  const [verifyId, setVerifyId] = useState('');
  const [declineDialog, setDeclineDialog] = useState({ open: false, id: '' });
  const [declineReason, setDeclineReason] = useState('');

  const handleVerify = async () => {
    try {
      await verifyMutation.mutateAsync(verifyId);
      toast.success('Payment verified! The customer has been notified and the project will advance to the next stage.', { duration: 5000 });
      setVerifyId('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Verification failed'));
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await declineMutation.mutateAsync({ id: declineDialog.id, reason: declineReason });
      toast.success('Payment declined — the customer has been notified and can re-submit.', { duration: 5000 });
      setDeclineDialog({ open: false, id: '' });
      setDeclineReason('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Decline failed'));
    }
  };

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Cashier Queue</h1>
        <p className="text-[#6e6e73] text-sm">Review and verify payment submissions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl border-[#c8c8cd]/50">
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
              className="rounded-xl border-[#c8c8cd]/50 hover:shadow-md transition-shadow"
            >
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-[#1d1d1f]">
                    {getPaymentContext(p).customerName}
                  </p>
                  <p className="text-sm text-[#6e6e73]">
                    {getPaymentContext(p).projectTitle}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-[#1d1d1f]">{formatCurrency(Number(p.amountPaid))}</span>
                    {String(p.method) === 'qrph' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                        <QrCode className="h-3 w-3" /> QR Payment
                      </span>
                    ) : (
                      <span className="text-[#86868b] capitalize">
                        {String(p.method || '').replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {String(p.method) === 'qrph' && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Payment confirmed by PayMongo
                    </div>
                  )}
                  {p.referenceNumber && (
                    <p className="text-xs text-[#86868b] font-mono">Ref: {String(p.referenceNumber)}</p>
                  )}
                  <p className="text-xs text-[#86868b]">
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

      {/* ── Overdue Payments Section ── */}
      {!overdueLoading && overduePayments && overduePayments.length > 0 && (
        <Card className="rounded-xl border-red-200 bg-red-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Overdue Payments ({overduePayments.length})
            </CardTitle>
            <p className="text-xs text-red-600/70">Customers who have not paid after their stage was activated</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overduePayments.map((item) => (
                <div
                  key={`${item.projectId}-${item.stageId}`}
                  className="flex items-center justify-between rounded-lg border border-red-100 bg-white p-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-[#1d1d1f]">
                      {item.customerName}
                    </p>
                    <p className="text-sm text-[#6e6e73]">
                      {item.projectTitle} — {item.stageLabel}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#86868b]">
                      <span className="font-semibold text-red-600">
                        {formatCurrency(item.amount)}
                      </span>
                      <span>·</span>
                      <span>{item.daysSinceActivation} days overdue</span>
                      <span>·</span>
                      <span>{item.remindersSent} reminders sent</span>
                      {item.escalatedToCashier && (
                        <>
                          <span>·</span>
                          <span className="text-red-600 font-medium">Escalated</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Link to={`/projects/${item.projectId}`}>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 rounded-lg">
                      View Project
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verify Confirm */}
      {(() => {
        const verifyPayment = payments?.find((p) => String(p._id) === verifyId);
        return (
          <ConfirmDialog
            open={!!verifyId}
            onOpenChange={(open) => !open && setVerifyId('')}
            title="Verify Payment"
            description="Review the details below, then confirm to mark this payment as verified. A receipt will be generated."
            confirmLabel="Verify Payment"
            isLoading={verifyMutation.isPending}
            onConfirm={handleVerify}
          >
            {verifyPayment && (
              <div className="rounded-xl border border-[#e8e8ed] bg-[#f5f5f7]/50 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Customer</span>
                  <span className="font-medium text-[#1d1d1f]">{getPaymentContext(verifyPayment).customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Project</span>
                  <span className="font-medium text-[#1d1d1f]">{getPaymentContext(verifyPayment).projectTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Amount</span>
                  <span className="font-bold text-[#1d1d1f]">{formatCurrency(Number(verifyPayment.amountPaid))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Method</span>
                  <span className="capitalize text-[#1d1d1f]">{String(verifyPayment.method || '').replace('_', ' ')}</span>
                </div>
                {verifyPayment.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Reference</span>
                    <span className="font-mono text-xs text-[#1d1d1f]">{String(verifyPayment.referenceNumber)}</span>
                  </div>
                )}
                {String(verifyPayment.method) === 'qrph' && (
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-xs text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    This payment was confirmed by PayMongo
                  </div>
                )}
              </div>
            )}
          </ConfirmDialog>
        );
      })()}

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
            <DialogTitle className="text-[#1d1d1f]">Decline Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[#3a3a3e] text-[13px] font-medium">Reason</Label>
            <Input
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Why is this payment being declined?"
              className="h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#b8b8bd] focus:ring-[#6e6e73]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#d2d2d7] rounded-lg"
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
