import { useState } from 'react';
import { format } from 'date-fns';
import { RotateCcw, CheckCircle, XCircle, User, Phone, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { extractErrorMessage, extractItems } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageError } from '@/components/shared/PageError';
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

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Denied', value: 'denied' },
];

export function RefundQueuePage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (statusFilter !== 'all') params.status = statusFilter;
  if (searchQuery.trim()) params.search = searchQuery.trim();

  const { data, isLoading, isError, refetch } = useRefundRequests(params);
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

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Refund Requests</h1>
        <p className="text-[#6e6e73] mt-1 text-sm">Review and process customer refund requests</p>
      </div>

      <CollectionToolbar
        title="Find the right refund request"
        description="Search customers or refund reasons, then narrow the queue by decision state."
        searchPlaceholder="Search by customer name, reason..."
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl border-[#c8c8cd]/50">
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : refundRequests.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-8 w-8" />}
          title={statusFilter === 'pending' ? 'No pending refund requests' : 'No refund requests found'}
          description={
            statusFilter === 'pending'
              ? 'New customer refund requests will appear here once a payment issue needs review.'
              : 'Try adjusting the current search or decision filter to find the request you need.'
          }
        />
      ) : (
        <div className="space-y-3">
          {refundRequests.map((r) => {
            const contact = getCustomerContact(r);

            return (
              <Card key={r._id} className="rounded-xl border-[#c8c8cd]/50 hover:border-[#c8c8cd] transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 text-[#6e6e73] shrink-0" />
                        <span className="font-semibold text-[#1d1d1f] truncate">{getCustomerName(r)}</span>
                      </div>
                      <StatusBadge status={r.status} className="shrink-0 text-[10px]" />
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-[#6e6e73]">Amount: </span>
                        <span className="font-semibold text-[#1d1d1f]">{formatCurrency(r.amount)}</span>
                      </div>
                      <div>
                        <span className="text-[#6e6e73]">Method: </span>
                        <span className="font-medium text-[#1d1d1f]">{r.refundMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}</span>
                      </div>
                      <div>
                        <span className="text-[#6e6e73]">Account: </span>
                        <span className="text-[#3a3a3e]">{r.accountName} — {r.accountNumber}</span>
                      </div>
                      {r.bankName && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-[#6e6e73]" />
                          <span className="text-[#3a3a3e]">{r.bankName}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div>
                          <span className="text-[#6e6e73]">Email: </span>
                          <span className="text-[#3a3a3e]">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-[#6e6e73]" />
                          <span className="text-[#3a3a3e]">{contact.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    <div className="text-sm">
                      <span className="text-[#6e6e73]">Reason: </span>
                      <span className="text-[#3a3a3e]">{r.reason}</span>
                    </div>

                    {/* Denial reason if denied */}
                    {r.status === 'denied' && r.denialReason && (
                      <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                        <span className="text-red-700 font-medium">Denial reason: </span>
                        <span className="text-red-600">{r.denialReason}</span>
                      </div>
                    )}

                    {/* Footer: date + actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#f0f0f2]">
                      <div className="flex items-center gap-3 text-xs text-[#86868b]">
                        <span>{format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}</span>
                        {typeof r.appointmentId === 'string' ? (
                          <Link to={`/appointments/${r.appointmentId}`} className="text-blue-600 hover:underline">
                            View Appointment
                          </Link>
                        ) : (
                          <Link to={`/appointments/${r.appointmentId._id}`} className="text-blue-600 hover:underline">
                            View Appointment
                          </Link>
                        )}
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDenyDialog({ open: true, id: r._id })}
                            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setApproveId(r._id)}
                            className="rounded-xl bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {(data?.totalPages ?? 1) > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl"
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-[#6e6e73]">
                Page {data?.page ?? 1} of {data?.totalPages ?? 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= (data?.totalPages ?? 1)}
                className="rounded-xl"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Approve Confirmation */}
      <Dialog open={!!approveId} onOpenChange={(open) => { if (!open) setApproveId(''); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Approve Refund</DialogTitle>
            <DialogDescription className="text-[#6e6e73]">
              Confirm that this refund has been processed. The appointment's ocular fee status will be marked as refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveId('')} className="rounded-xl border-[#d2d2d7]">
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={denyDialog.open} onOpenChange={(open) => { if (!open) { setDenyDialog({ open: false, id: '' }); setDenialReason(''); } }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Deny Refund</DialogTitle>
            <DialogDescription className="text-[#6e6e73]">
              Please provide a reason for denying this refund request. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="denial-reason" className="text-sm font-medium text-[#3a3a3e]">Reason for denial</Label>
            <Textarea
              id="denial-reason"
              placeholder="e.g., Visit already completed, outside refund period..."
              value={denialReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDenialReason(e.target.value)}
              className="min-h-[80px] bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDenyDialog({ open: false, id: '' }); setDenialReason(''); }} className="rounded-xl border-[#d2d2d7]">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={denyMutation.isPending || !denialReason.trim()}
              className="rounded-xl"
            >
              {denyMutation.isPending ? 'Denying...' : 'Deny Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
