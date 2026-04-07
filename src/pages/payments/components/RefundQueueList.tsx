import { useState } from 'react';
import { format } from 'date-fns';
import { RotateCcw, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage, extractItems } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useRefundRequests, useApproveRefund, useDenyRefund } from '@/hooks/useRefunds';
import type { RefundRequest } from '@/lib/types';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export function RefundQueueList() {
  const { data, isLoading, isError, refetch } = useRefundRequests({ status: 'pending', limit: '50' });
  const approveMutation = useApproveRefund();
  const denyMutation = useDenyRefund();

  const [approveId, setApproveId] = useState('');
  const [denyDialog, setDenyDialog] = useState({ open: false, id: '' });
  const [denialReason, setDenialReason] = useState('');

  const refundRequests = extractItems<RefundRequest>(data);

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(approveId);
      toast.success('Refund approved');
      setApproveId('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to approve refund'));
    }
  };

  const handleDeny = async () => {
    if (!denialReason.trim()) {
      toast.error('Please provide a reason for denial');
      return;
    }
    try {
      await denyMutation.mutateAsync({ id: denyDialog.id, denialReason: denialReason.trim() });
      toast.success('Refund denied');
      setDenyDialog({ open: false, id: '' });
      setDenialReason('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to deny refund'));
    }
  };

  const getCustomerName = (r: RefundRequest) => {
    if (typeof r.customerId === 'object') {
      return `${r.customerId.firstName} ${r.customerId.lastName}`;
    }
    return r.customerId;
  };

  const getCustomerContact = (r: RefundRequest) => {
    if (typeof r.customerId === 'object') {
      return { email: r.customerId.email, phone: r.customerId.phone };
    }
    return {};
  };

  if (isError) {
    return (
      <Card className="rounded-none sm:rounded-xl">
        <CardContent className="p-6 text-center text-sm text-red-500">
          Failed to load refund requests queue.
          <Button variant="link" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-x-0 border-t-4 border-t-[#c49a62] sm:rounded-xl sm:border-x">
      <CardHeader className="px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-[#c49a62]" />
          <CardTitle className="text-lg text-[#161b22] dark:text-slate-100">Refund Requests Queue</CardTitle>
        </div>
        <p className="text-xs text-[#4f5a67] dark:text-slate-300">
          Manage pending refund requests from customers.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : refundRequests.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<RotateCcw className="h-8 w-8 text-[#7b8794] dark:text-slate-400" />}
              title="No pending requests"
              description="You have no refund requests requiring review."
            />
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--color-border)]">
            {refundRequests.map((r) => {
              const contact = getCustomerContact(r);
              return (
                <div key={r._id} className="p-4 sm:p-5 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-[var(--text-metal-color)] font-medium">
                          {format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-2xl font-bold text-[#1d1d1f] dark:text-slate-100">
                            {formatCurrency(r.amount)}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[#1d1d1f] dark:text-slate-200">
                            <User className="h-4 w-4 text-[var(--text-metal-color)]" />
                            {getCustomerName(r)}
                          </p>
                          {contact.phone && (
                            <p className="mt-0.5 flex items-center gap-2 text-sm text-[var(--text-metal-color)] pl-6">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </p>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm">
                          <p className="text-xs font-semibold text-[var(--text-metal-color)] uppercase tracking-wider mb-2">Dest. Account</p>
                          <p><span className="text-[var(--text-metal-color)]">Method:</span> <span className="font-medium text-[#1d1d1f] dark:text-slate-200">{r.refundMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}</span></p>
                          <p><span className="text-[var(--text-metal-color)]">Name:</span> <span className="font-medium text-[#1d1d1f] dark:text-slate-200">{r.accountName}</span></p>
                          <p><span className="text-[var(--text-metal-color)]">No:</span> <span className="font-medium text-[#1d1d1f] dark:text-slate-200">{r.accountNumber}</span></p>
                          {r.bankName && <p><span className="text-[var(--text-metal-color)]">Bank:</span> <span className="font-medium text-[#1d1d1f] dark:text-slate-200">{r.bankName}</span></p>}
                        </div>
                      </div>

                      <div className="bg-[#fcf8f3] dark:bg-amber-900/10 border border-[#f0e1cf] dark:border-amber-900/30 rounded-lg p-3">
                        <p className="text-xs font-semibold text-[#8f6d3b] dark:text-amber-500 uppercase tracking-wider mb-1">Customer Notes</p>
                        <p className="text-sm text-[#3a3a3e] dark:text-slate-300">{r.reason}</p>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0 sm:pl-4 sm:border-l border-[color:var(--color-border)]">
                      <Button
                        size="sm"
                        className="bg-[#234b32] hover:bg-[#1a3825] text-white flex-1"
                        onClick={() => setApproveId(r._id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#cb8b86] text-[#87544f] hover:bg-[#fbefed] flex-1"
                        onClick={() => setDenyDialog({ open: true, id: r._id })}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!approveId} onOpenChange={(open) => !open && setApproveId('')}>
        <DialogContent className="metal-panel-strong sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Approve Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this refund? The status will update, and the customer will be notified. Actual fund transfer must still be completed by finance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setApproveId('')}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={denyDialog.open} onOpenChange={(open) => !open && setDenyDialog({ open: false, id: '' })}>
        <DialogContent className="metal-panel-strong sm:max-w-md rounded-2xl border border-[#cb8b86]/30">
          <DialogHeader>
            <DialogTitle className="text-[#87544f]">Deny Refund</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this refund request. The customer will see this message.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="reason" className="text-xs font-semibold text-[#87544f]">Denial Reason</Label>
            <Textarea
              id="reason"
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="e.g. Design fees are non-refundable after deliverables are sent."
              className="mt-1.5 focus-visible:ring-[#cb8b86]"
            />
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setDenyDialog({ open: false, id: '' })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={denyMutation.isPending || !denialReason.trim()}
              className="bg-[#9a625c] hover:bg-[#87544f]"
            >
              {denyMutation.isPending ? 'Denying...' : 'Deny Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
