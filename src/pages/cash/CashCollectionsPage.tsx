import { useState } from 'react';
import { format } from 'date-fns';
import { Wallet, AlertTriangle, Banknote, Loader2, MapPin, Clock, User, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import {
  useCashCollections,
  useCashDiscrepancies,
  useReceiveCash,
  useResolveDiscrepancy,
  useRecordCashCollection,
  usePendingCashAppointments,
} from '@/hooks/useCash';
import type { PendingCashAppointment } from '@/hooks/useCash';
import { useAuthStore } from '@/stores/auth.store';
import { Role, CashCollectionStatus, AppointmentStatus } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as Record<string, unknown>).response === 'object' &&
    (error as Record<string, unknown>).response !== null
  ) {
    const resp = (error as { response: { data?: { error?: { message?: string } } } }).response;
    if (resp.data?.error?.message) return resp.data.error.message;
  }
  return fallback;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

const formatSlotTime = (slot: string) => {
  const parts = slot.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export function CashCollectionsPage() {
  const { user } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiveDialog, setReceiveDialog] = useState({ open: false, id: '', amount: '' });
  const [resolveDialog, setResolveDialog] = useState({ open: false, id: '' });
  const [resolution, setResolution] = useState('');

  // Record dialog state
  const [recordDialog, setRecordDialog] = useState({ open: false, appointmentId: '', expectedAmount: 0, customerName: '' });
  const [recordAmount, setRecordAmount] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  const isCashier = user?.roles.some((r) => [Role.CASHIER, Role.ADMIN].includes(r));
  const isAdmin = user?.roles.some((r) => [Role.ADMIN].includes(r));

  const { data: pendingAppointments, isLoading: pendingLoading, isError: pendingError, refetch: pendingRefetch } = usePendingCashAppointments();
  const { data: collections, isLoading: collectionsLoading } = useCashCollections();
  const { data: discrepancies } = useCashDiscrepancies(!!isCashier);
  const receiveMutation = useReceiveCash();
  const resolveMutation = useResolveDiscrepancy();
  const recordMutation = useRecordCashCollection();

  const openRecordDialog = (appt: PendingCashAppointment) => {
    setRecordDialog({
      open: true,
      appointmentId: appt._id,
      expectedAmount: appt.ocularFee,
      customerName: appt.customerName ?? 'Customer',
    });
    setRecordAmount(String(appt.ocularFee));
    setRecordNotes('');
  };

  const handleRecord = async () => {
    const amt = parseFloat(recordAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await recordMutation.mutateAsync({
        appointmentId: recordDialog.appointmentId,
        amountCollected: amt,
        notes: recordNotes.trim() || undefined,
      });
      toast.success('Cash payment recorded successfully');
      setRecordDialog({ open: false, appointmentId: '', expectedAmount: 0, customerName: '' });
      setRecordAmount('');
      setRecordNotes('');
      setExpandedId(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to record cash payment'));
    }
  };

  const handleReceive = async () => {
    const amt = parseFloat(receiveDialog.amount);
    if (isNaN(amt) || amt < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await receiveMutation.mutateAsync({ id: receiveDialog.id, amountReceived: amt });
      toast.success('Cash received');
      setReceiveDialog({ open: false, id: '', amount: '' });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to receive cash'));
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) {
      toast.error('Enter a resolution');
      return;
    }
    try {
      await resolveMutation.mutateAsync({ id: resolveDialog.id, resolutionNotes: resolution });
      toast.success('Discrepancy resolved');
      setResolveDialog({ open: false, id: '' });
      setResolution('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to resolve'));
    }
  };

  if (pendingError) return <PageError onRetry={pendingRefetch} />;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Cash Flow</h1>
        <p className="text-[#6e6e73] text-sm mt-1">Manage pending cash payments and collections</p>
      </div>

      {/* ═══ Pending Cash Appointments ═══ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-[#6e6e73]" />
          <h2 className="text-lg font-semibold text-[#1d1d1f]">Pending Cash Payments</h2>
          {pendingAppointments && pendingAppointments.length > 0 && (
            <span className="ml-1 rounded-full bg-[#1d1d1f] px-2.5 py-0.5 text-xs font-medium text-white">
              {pendingAppointments.length}
            </span>
          )}
        </div>

        {pendingLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl border-[#e5e5ea]">
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !pendingAppointments?.length ? (
          <EmptyState
            icon={<Banknote className="h-8 w-8" />}
            title="No pending cash payments"
            description="Cash payments will appear here when customers choose cash for their ocular fee."
          />
        ) : (
          <div className="space-y-3">
            {pendingAppointments.map((appt) => {
              const isExpanded = expandedId === appt._id;
              const canRecord =
                appt.status === AppointmentStatus.ON_THE_WAY ||
                appt.status === AppointmentStatus.COMPLETED;

              return (
                <Card
                  key={appt._id}
                  className={`rounded-xl border transition-all ${
                    isExpanded ? 'border-[#1d1d1f]/20 shadow-md' : 'border-[#e5e5ea] hover:border-[#d2d2d7]'
                  }`}
                >
                  {/* Table Row */}
                  <button
                    type="button"
                    className="w-full p-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : appt._id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f0f5]">
                          <User className="h-5 w-5 text-[#6e6e73]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#1d1d1f] truncate">{appt.customerName ?? 'Unknown'}</p>
                          <p className="text-sm text-[#6e6e73] truncate">
                            {appt.date} &middot; {formatSlotTime(appt.slotCode)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="font-semibold text-[#1d1d1f]">{formatCurrency(appt.ocularFee)}</p>
                          <StatusBadge status={appt.status} />
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-[#6e6e73]" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-[#6e6e73]" />
                        )}
                      </div>
                    </div>
                    {/* Mobile: show amount + status below */}
                    <div className="flex items-center gap-2 mt-2 sm:hidden">
                      <p className="font-semibold text-[#1d1d1f] text-sm">{formatCurrency(appt.ocularFee)}</p>
                      <StatusBadge status={appt.status} />
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-[#e5e5ea] px-4 pb-4 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Customer Info */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase text-[#6e6e73] tracking-wider">Customer Details</h3>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              <User className="h-4 w-4 text-[#6e6e73] mt-0.5 shrink-0" />
                              <span className="text-sm text-[#1d1d1f]">{appt.customerName ?? 'N/A'}</span>
                            </div>
                            {appt.customerPhone && (
                              <div className="flex items-start gap-2.5">
                                <Phone className="h-4 w-4 text-[#6e6e73] mt-0.5 shrink-0" />
                                <span className="text-sm text-[#1d1d1f]">{appt.customerPhone}</span>
                              </div>
                            )}
                            {appt.formattedAddress && (
                              <div className="flex items-start gap-2.5">
                                <MapPin className="h-4 w-4 text-[#6e6e73] mt-0.5 shrink-0" />
                                <span className="text-sm text-[#1d1d1f]">{appt.formattedAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase text-[#6e6e73] tracking-wider">Ocular Fee Breakdown</h3>
                          <div className="space-y-2 text-sm">
                            {appt.ocularFeeBreakdown && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-[#6e6e73]">Base Fee</span>
                                  <span className="text-[#1d1d1f]">{formatCurrency(appt.ocularFeeBreakdown.baseFee)}</span>
                                </div>
                                {appt.ocularFeeBreakdown.additionalDistanceKm > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-[#6e6e73]">Additional Distance ({appt.ocularFeeBreakdown.additionalDistanceKm.toFixed(1)} km)</span>
                                    <span className="text-[#1d1d1f]">{formatCurrency(appt.ocularFeeBreakdown.additionalFee)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between border-t border-[#e5e5ea] pt-2 font-semibold">
                                  <span className="text-[#1d1d1f]">Total</span>
                                  <span className="text-[#1d1d1f]">{formatCurrency(appt.ocularFeeBreakdown.total)}</span>
                                </div>
                              </>
                            )}
                            {!appt.ocularFeeBreakdown && (
                              <div className="flex justify-between font-semibold">
                                <span className="text-[#1d1d1f]">Ocular Fee</span>
                                <span className="text-[#1d1d1f]">{formatCurrency(appt.ocularFee)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="mt-4 flex items-center gap-2 text-sm text-[#6e6e73]">
                        <Clock className="h-4 w-4" />
                        <span>Scheduled: {appt.date} at {formatSlotTime(appt.slotCode)}</span>
                      </div>

                      {/* Record Button */}
                      <div className="mt-4 pt-3 border-t border-[#e5e5ea]">
                        {canRecord ? (
                          <Button
                            onClick={() => openRecordDialog(appt)}
                            className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
                          >
                            <Banknote className="mr-2 h-4 w-4" />
                            Record Cash Payment
                          </Button>
                        ) : (
                          <p className="text-sm text-[#8e8e93] italic">
                            Cash can only be recorded when the appointment is &quot;On The Way&quot; or &quot;Completed&quot;.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Recorded Collections ═══ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#6e6e73]" />
          <h2 className="text-lg font-semibold text-[#1d1d1f]">Recorded Collections</h2>
        </div>

        {collectionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="rounded-xl border-[#e5e5ea]">
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !collections?.length ? (
          <Card className="rounded-xl border-[#e5e5ea]">
            <CardContent className="p-6 text-center text-sm text-[#8e8e93]">
              No collections recorded yet.
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border-[#e5e5ea]">
            <CardContent className="p-0">
              <div className="divide-y divide-[#e5e5ea]">
                {collections.map((c) => (
                  <div
                    key={String(c._id)}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[#f5f5f7]/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1d1d1f]">
                          {formatCurrency(Number(c.amountCollected))}
                        </p>
                        <StatusBadge status={String(c.status)} />
                      </div>
                      {c.amountReceived != null && (
                        <p className="text-sm text-[#6e6e73]">
                          Received: {formatCurrency(Number(c.amountReceived))}
                        </p>
                      )}
                      {c.salesStaffName ? (
                        <p className="text-xs text-[#8e8e93]">From {String(c.salesStaffName)}</p>
                      ) : null}
                      <p className="text-xs text-[#8e8e93]">
                        {c.createdAt
                          ? format(new Date(String(c.createdAt)), 'MMM d, yyyy h:mm a')
                          : ''}
                      </p>
                    </div>
                    {isCashier && c.status === CashCollectionStatus.COLLECTED && (
                      <Button
                        size="sm"
                        className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
                        onClick={() => setReceiveDialog({ open: true, id: String(c._id), amount: String(c.amountCollected) })}
                      >
                        Receive Cash
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══ Discrepancies ═══ */}
      {isAdmin && discrepancies && discrepancies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-[#1d1d1f]">Discrepancies</h2>
          </div>
          <Card className="rounded-xl border-red-100">
            <CardContent className="p-0">
              <div className="divide-y divide-red-100">
                {discrepancies.map((d) => (
                  <div
                    key={String(d._id)}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-red-600">
                        Difference: {formatCurrency(Number(d.difference))}
                      </p>
                      <p className="text-sm text-[#6e6e73]">
                        Collected: {formatCurrency(Number(d.amountCollected))} &middot; Received:{' '}
                        {formatCurrency(Number(d.amountReceived))}
                      </p>
                      {d.resolutionNotes ? (
                        <p className="text-sm text-emerald-600">
                          Resolved: {String(d.resolutionNotes)}
                        </p>
                      ) : null}
                    </div>
                    {!d.resolvedAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#d2d2d7] rounded-xl"
                        onClick={() => setResolveDialog({ open: true, id: String(d._id) })}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Receive Dialog ═══ */}
      <Dialog
        open={receiveDialog.open}
        onOpenChange={(open) => {
          if (!open) setReceiveDialog({ open: false, id: '', amount: '' });
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Receive Cash</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[#3a3a3e] text-[13px] font-medium">Amount Received</Label>
            <Input
              type="number"
              step="0.01"
              value={receiveDialog.amount}
              onChange={(e) => setReceiveDialog({ ...receiveDialog, amount: e.target.value })}
              placeholder="Enter actual amount received"
              className="h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-[#d2d2d7] rounded-xl"
              onClick={() => setReceiveDialog({ open: false, id: '', amount: '' })}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
              onClick={handleReceive}
              disabled={receiveMutation.isPending}
            >
              {receiveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Receiving...</> : 'Confirm Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Resolve Dialog ═══ */}
      <Dialog
        open={resolveDialog.open}
        onOpenChange={(open) => {
          setResolveDialog({ open, id: open ? resolveDialog.id : '' });
          if (!open) setResolution('');
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Resolve Discrepancy</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[#3a3a3e] text-[13px] font-medium">Resolution Notes</Label>
            <Input
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="How was this discrepancy resolved?"
              className="h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-[#d2d2d7] rounded-xl"
              onClick={() => setResolveDialog({ open: false, id: '' })}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resolving...</> : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Record Cash Payment Dialog ═══ */}
      <Dialog
        open={recordDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRecordDialog({ open: false, appointmentId: '', expectedAmount: 0, customerName: '' });
            setRecordAmount('');
            setRecordNotes('');
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Record Cash Payment</DialogTitle>
            <DialogDescription className="text-[#6e6e73]">
              Record cash collected from {recordDialog.customerName} for ocular fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[#3a3a3e] text-[13px] font-medium">Expected Amount</Label>
              <p className="text-lg font-semibold text-[#1d1d1f]">{formatCurrency(recordDialog.expectedAmount)}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#3a3a3e] text-[13px] font-medium">Amount Collected</Label>
              <Input
                type="number"
                step="0.01"
                value={recordAmount}
                onChange={(e) => setRecordAmount(e.target.value)}
                placeholder="Enter amount collected"
                className="h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#3a3a3e] text-[13px] font-medium">Notes (optional)</Label>
              <Textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="min-h-[80px] bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-[#d2d2d7]"
              onClick={() => {
                setRecordDialog({ open: false, appointmentId: '', expectedAmount: 0, customerName: '' });
                setRecordAmount('');
                setRecordNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
              onClick={handleRecord}
              disabled={recordMutation.isPending}
            >
              {recordMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recording...</> : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
