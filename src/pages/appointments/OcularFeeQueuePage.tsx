import { useState } from 'react';
import { format } from 'date-fns';
import { QrCode, CheckCircle, XCircle, Eye, MapPin, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  usePendingOcularFees,
  useVerifyOcularFee,
  useDeclineOcularFee,
} from '@/hooks/useAppointments';
import { useGetDownloadUrl } from '@/hooks/useUploads';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

const statusBadge = (status?: string) => {
  switch (status) {
    case 'proof_submitted':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Proof Submitted
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Awaiting Payment
        </Badge>
      );
    case 'declined':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Declined</Badge>
      );
    case 'verified':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          Verified
        </Badge>
      );
    default:
      return null;
  }
};

export function OcularFeeQueuePage() {
  const { data: appointments, isLoading, isError, refetch } = usePendingOcularFees();
  const verifyMutation = useVerifyOcularFee();
  const declineMutation = useDeclineOcularFee();
  const getDownloadUrl = useGetDownloadUrl();

  const [verifyId, setVerifyId] = useState('');
  const [declineDialog, setDeclineDialog] = useState({ open: false, id: '' });
  const [declineReason, setDeclineReason] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [proofViewOpen, setProofViewOpen] = useState(false);

  const handleVerify = async () => {
    try {
      await verifyMutation.mutateAsync(verifyId);
      toast.success('Ocular fee verified');
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
      await declineMutation.mutateAsync({
        id: declineDialog.id,
        reason: declineReason,
      });
      toast.success('Ocular fee declined');
      setDeclineDialog({ open: false, id: '' });
      setDeclineReason('');
    } catch {
      toast.error('Decline failed');
    }
  };

  const handleViewProof = async (proofKey: string) => {
    try {
      const result = await getDownloadUrl.mutateAsync(proofKey);
      setProofImageUrl(result.downloadUrl);
      setProofViewOpen(true);
    } catch {
      toast.error('Failed to load proof image');
    }
  };

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
          Ocular Fee Queue
        </h1>
        <p className="text-[#6e6e73] text-sm">
          Review and verify ocular fee payments from customers
        </p>
      </div>

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
      ) : !appointments?.length ? (
        <EmptyState
          icon={<QrCode className="h-16 w-16" />}
          title="No pending ocular fees"
          description="All ocular fee submissions have been reviewed."
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card
              key={appt._id}
              className="rounded-xl border-[#c8c8cd]/50 hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5 space-y-3">
                {/* Customer & status row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-[#1d1d1f]">
                      {appt.customerName || 'Customer'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6e6e73]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(appt.date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {appt.formattedAddress || appt.address || 'N/A'}
                      </span>
                    </div>
                  </div>
                  {statusBadge(appt.ocularFeeStatus)}
                </div>

                {/* Fee details */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <span className="text-[#6e6e73]">Fee: </span>
                    <span className="font-semibold text-[#1d1d1f]">
                      {formatCurrency(
                        appt.ocularFee ?? appt.ocularFeeBreakdown?.total ?? 0,
                      )}
                    </span>
                  </div>
                  {appt.ocularFeeReferenceNumber && (
                    <div>
                      <span className="text-[#6e6e73]">Ref: </span>
                      <span className="font-medium">
                        {appt.ocularFeeReferenceNumber}
                      </span>
                    </div>
                  )}
                  {appt.distanceKm != null && (
                    <div>
                      <span className="text-[#6e6e73]">Distance: </span>
                      <span className="font-medium">
                        {appt.distanceKm.toFixed(1)} km
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {appt.ocularFeeProofKey && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-[#d2d2d7]"
                      onClick={() => handleViewProof(appt.ocularFeeProofKey!)}
                      disabled={getDownloadUrl.isPending}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View Proof
                    </Button>
                  )}
                  {appt.ocularFeeStatus === 'proof_submitted' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                        onClick={() => setVerifyId(appt._id)}
                        disabled={verifyMutation.isPending}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-lg"
                        onClick={() =>
                          setDeclineDialog({ open: true, id: appt._id })
                        }
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </>
                  )}
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
        title="Verify Ocular Fee"
        description="Confirm that this customer's ocular fee payment has been received. The appointment agent will then be able to assign a sales staff."
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
            <DialogTitle className="text-[#1d1d1f]">Decline Ocular Fee</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[#3a3a3e] text-[13px] font-medium">Reason</Label>
            <Input
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Why is this payment being declined?"
              className="h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]"
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

      {/* Proof Image Viewer */}
      <Dialog open={proofViewOpen} onOpenChange={setProofViewOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Payment Proof</DialogTitle>
          </DialogHeader>
          {proofImageUrl ? (
            <img
              src={proofImageUrl}
              alt="Payment proof"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
