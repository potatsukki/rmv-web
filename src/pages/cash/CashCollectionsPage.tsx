import { useState } from 'react';
import { format } from 'date-fns';
import { Wallet, AlertTriangle, Banknote, Loader2, MapPin, Clock, User, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { MAX_PAYMENT_AMOUNT } from '@/lib/money';

import { extractErrorMessage, extractItems } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnsiteCashDialog, type OnsiteCashTarget } from '@/components/shared/OnsiteCashDialog';
import { cashPersonName, describeCashCollection, describeCollectionReceipt, ONSITE_CASH_STATUSES } from '@/lib/onsite-cash';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { resolveAppointmentWorkflowStatus } from '@/lib/workflow-status';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import {
  useCashCollections,
  useCashDiscrepancies,
  useReceiveCash,
  useResolveDiscrepancy,
  usePendingCashAppointments,
} from '@/hooks/useCash';
import type { CashDiscrepancy, PendingCashAppointment } from '@/hooks/useCash';
import { useAuthStore } from '@/stores/auth.store';
import { Role, CashCollectionStatus } from '@/lib/constants';
import type { CashCollection } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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

  // The sales staff records the customer's cash for the ocular fee at the site.
  const [recordTarget, setRecordTarget] = useState<OnsiteCashTarget | null>(null);

  const isCashier = user?.roles.some((r) => [Role.CASHIER, Role.ADMIN].includes(r));
  const isAdmin = user?.roles.some((r) => [Role.ADMIN].includes(r));
  const isSalesStaff = user?.roles.includes(Role.SALES_STAFF);

  const { data: pendingAppointments, isLoading: pendingLoading, isError: pendingError, refetch: pendingRefetch } = usePendingCashAppointments();
  const { data: collections, isLoading: collectionsLoading } = useCashCollections();
  const { data: discrepancies } = useCashDiscrepancies(!!isCashier);
  const receiveMutation = useReceiveCash();
  const resolveMutation = useResolveDiscrepancy();

  const pendingCashList = extractItems<PendingCashAppointment>(pendingAppointments);
  const collectionList = extractItems<CashCollection>(collections);
  const discrepancyList = extractItems<CashDiscrepancy>(discrepancies);

  const openRecordDialog = (appt: PendingCashAppointment) => {
    setRecordTarget({
      kind: 'ocular',
      appointmentId: appt._id,
      amount: appt.ocularFee,
      customerAcknowledged: Boolean(appt.ocularFeeNonRefundableAckAt),
    });
  };

  const handleReceive = async () => {
    const amt = parseFloat(receiveDialog.amount);
    if (isNaN(amt) || amt < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amt > MAX_PAYMENT_AMOUNT) {
      toast.error('Amount is too large');
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

  const dialogContentClassName =
    'max-w-md rounded-2xl border border-[#d6d9df] bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(246,248,251,1)_100%)] text-[#111827] shadow-[0_28px_70px_rgba(15,23,42,0.18)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(9,14,22,1)_0%,rgba(6,10,17,1)_100%)] dark:text-slate-100 dark:shadow-[0_30px_80px_rgba(0,0,0,0.52)]';

  const inputClassName =
    'h-11 rounded-xl border-[#d2d2d7] bg-[#fdfdfe] text-[#1d1d1f] shadow-sm transition-all focus:border-[#c8c8cd] focus:ring-4 focus:ring-[#e8e8ed]/50 focus:ring-offset-0 dark:border-[#2f4563] dark:bg-[#0f172a] dark:text-slate-100 dark:hover:border-[#3d587d] dark:focus:border-[#4f7097] dark:focus:ring-[#4f7097]/20';

  const textareaClassName =
    'rounded-xl border-[#d2d2d7] bg-[#fdfdfe] text-[#1d1d1f] shadow-sm transition-all focus:border-[#c8c8cd] focus:ring-4 focus:ring-[#e8e8ed]/50 focus:ring-offset-0 dark:border-[#2f4563] dark:bg-[#0f172a] dark:text-slate-100 dark:hover:border-[#3d587d] dark:focus:border-[#4f7097] dark:focus:ring-[#4f7097]/20';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="metal-panel rounded-[1.75rem] p-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-slate-50">Cash Flow</h1>
        <p className="mt-1 text-sm text-[#616a74] dark:text-slate-300">Manage pending cash payments and collections</p>
      </div>

      {/* ═══ Pending Cash Appointments ═══ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-[#6e6e73] dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">Pending Cash Payments</h2>
          {pendingCashList.length > 0 && (
            <span className="ml-1 rounded-full bg-[#1d1d1f] px-2.5 py-0.5 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-950">
              {pendingCashList.length}
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
          ) : pendingCashList.length === 0 ? (
          <EmptyState
            icon={<Banknote className="h-8 w-8" />}
            title="No pending cash payments"
            description="Cash payments will appear here when customers choose cash for their ocular fee."
          />
        ) : (
          <div className="space-y-3">
              {pendingCashList.map((appt) => {
              const isExpanded = expandedId === appt._id;
              const canRecord = ONSITE_CASH_STATUSES.includes(appt.status);

              return (
                <Card
                  key={appt._id}
                  className={`metal-panel rounded-xl border transition-all ${
                    isExpanded ? 'border-[#1d1d1f]/20 shadow-md dark:border-slate-600' : 'border-[#e5e5ea] hover:border-[#d2d2d7] dark:border-slate-700 dark:hover:border-slate-500'
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
                        <div className="silver-sheen flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#2b3138]">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#1d1d1f] dark:text-slate-100 truncate">{appt.customerName ?? 'Unknown'}</p>
                          <p className="text-sm text-[#616a74] dark:text-slate-300 truncate">
                            {appt.date} &middot; {formatSlotTime(appt.slotCode)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="font-semibold text-[#1d1d1f] dark:text-slate-100">{formatCurrency(appt.ocularFee)}</p>
                          <StatusBadge status={resolveAppointmentWorkflowStatus(appt).key} label={resolveAppointmentWorkflowStatus(appt).label} />
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-[#6e6e73] dark:text-slate-300" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-[#6e6e73] dark:text-slate-300" />
                        )}
                      </div>
                    </div>
                    {/* Mobile: show amount + status below */}
                    <div className="flex items-center gap-2 mt-2 sm:hidden">
                      <p className="font-semibold text-[#1d1d1f] dark:text-slate-100 text-sm">{formatCurrency(appt.ocularFee)}</p>
                      <StatusBadge status={resolveAppointmentWorkflowStatus(appt).key} label={resolveAppointmentWorkflowStatus(appt).label} />
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-[#e5e5ea] px-4 pb-4 pt-3 dark:border-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Customer Info */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-slate-400">Customer Details</h3>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              <User className="mt-0.5 h-4 w-4 shrink-0 text-[#6e6e73] dark:text-slate-400" />
                              <span className="text-sm text-[#1d1d1f] dark:text-slate-100">{appt.customerName ?? 'N/A'}</span>
                            </div>
                            {appt.customerPhone && (
                              <div className="flex items-start gap-2.5">
                                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#6e6e73] dark:text-slate-400" />
                                <span className="text-sm text-[#1d1d1f] dark:text-slate-100">{appt.customerPhone}</span>
                              </div>
                            )}
                            {appt.formattedAddress && (
                              <div className="flex items-start gap-2.5">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6e6e73] dark:text-slate-400" />
                                <span className="text-sm text-[#1d1d1f] dark:text-slate-100">{appt.formattedAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-slate-400">Ocular Fee Breakdown</h3>
                          <div className="space-y-2 text-sm">
                            {appt.ocularFeeBreakdown && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-[#6e6e73] dark:text-slate-300">Base Fee</span>
                                  <span className="text-[#1d1d1f] dark:text-slate-100">{formatCurrency(appt.ocularFeeBreakdown.baseFee)}</span>
                                </div>
                                {appt.ocularFeeBreakdown.additionalDistanceKm > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-[#6e6e73] dark:text-slate-300">Additional Distance ({appt.ocularFeeBreakdown.additionalDistanceKm.toFixed(1)} km)</span>
                                    <span className="text-[#1d1d1f] dark:text-slate-100">{formatCurrency(appt.ocularFeeBreakdown.additionalFee)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between border-t border-[#e5e5ea] pt-2 font-semibold dark:border-slate-700">
                                  <span className="text-[#1d1d1f] dark:text-slate-100">Total</span>
                                  <span className="text-[#1d1d1f] dark:text-slate-100">{formatCurrency(appt.ocularFeeBreakdown.total)}</span>
                                </div>
                              </>
                            )}
                            {!appt.ocularFeeBreakdown && (
                              <div className="flex justify-between font-semibold">
                                <span className="text-[#1d1d1f] dark:text-slate-100">Ocular Fee</span>
                                <span className="text-[#1d1d1f] dark:text-slate-100">{formatCurrency(appt.ocularFee)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="mt-4 flex items-center gap-2 text-sm text-[#6e6e73] dark:text-slate-300">
                        <Clock className="h-4 w-4" />
                        <span>Scheduled: {appt.date} at {formatSlotTime(appt.slotCode)}</span>
                      </div>

                      {/* Record Button */}
                      <div className="mt-4 border-t border-[#e5e5ea] pt-3 dark:border-slate-700">
                        {!isSalesStaff ? (
                          <p className="text-sm italic text-[#8e8e93] dark:text-slate-400">
                            The sales staff records this cash at the site. If the customer pays at the office, record it in the Ocular Fee queue.
                          </p>
                        ) : canRecord ? (
                          <Button
                            variant="prominent"
                            onClick={() => openRecordDialog(appt)}
                            className="rounded-xl"
                          >
                            <Banknote className="mr-2 h-4 w-4" />
                            Record Cash Payment
                          </Button>
                        ) : (
                          <p className="text-sm italic text-[#8e8e93] dark:text-slate-400">
                            Record the cash once you are at the site (visit In Progress) or after the visit is completed.
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
          <Wallet className="h-5 w-5 text-[#6e6e73] dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">Recorded Collections</h2>
          {collectionList.length > 0 && (
            <span className="metal-pill ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-[#3a3a3e] dark:text-slate-100">
              {collectionList.length}
            </span>
          )}
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
          ) : collectionList.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" />}
              title="No collections recorded yet"
              description="Collected cash receipts will appear here once field payments are logged and handed off."
            />
        ) : (
          <Card className="metal-panel rounded-xl border-[#e5e5ea] dark:border-slate-700">
            <CardContent className="p-0">
              <div className="divide-y divide-[#e5e5ea] dark:divide-slate-700">
                  {collectionList.map((c) => (
                  <div
                    key={String(c._id)}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-[#f5f5f7]/50 dark:hover:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1d1d1f] dark:text-slate-100">
                          {formatCurrency(Number(c.amountCollected))}
                        </p>
                        <StatusBadge status={String(c.status)} />
                      </div>
                      <p className="text-sm text-[#3a3a3e] dark:text-slate-200">{describeCashCollection(c)}</p>
                      {c.amountReceived != null && (
                        <p className="text-sm text-[#6e6e73] dark:text-slate-300">
                          Received: {formatCurrency(Number(c.amountReceived))}
                        </p>
                      )}
                      {(c.salesStaffName || cashPersonName(c.salesStaffId)) ? (
                        <p className="text-xs text-[#8e8e93] dark:text-slate-400">
                          Collected by {c.salesStaffName || cashPersonName(c.salesStaffId)}
                        </p>
                      ) : null}
                      {describeCollectionReceipt(c) && (
                        <p className="text-xs text-[#8e8e93] dark:text-slate-400">{describeCollectionReceipt(c)}</p>
                      )}
                      <p className="text-xs text-[#8e8e93] dark:text-slate-400">
                        {c.createdAt
                          ? format(new Date(String(c.createdAt)), 'MMM d, yyyy h:mm a')
                          : ''}
                      </p>
                    </div>
                    {isCashier && c.status === CashCollectionStatus.COLLECTED && (
                      <Button
                        variant="prominent"
                        size="sm"
                        className="rounded-xl"
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
      {isAdmin && discrepancyList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">Discrepancies</h2>
            <span className="ml-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
              {discrepancyList.length}
            </span>
          </div>
          <Card className="rounded-xl border-red-100">
            <CardContent className="p-0">
              <div className="divide-y divide-red-100">
                {discrepancyList.map((d) => (
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
        <DialogContent className={dialogContentClassName}>
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f] dark:text-slate-100">Receive Cash</DialogTitle>
            <DialogDescription className="text-[#6e6e73] dark:text-slate-400">
              Verify and record the actual amount of cash received from the sales staff. When it matches, the customer's official receipt is issued.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">Amount Received</Label>
            <Input
              type="number"
              step="0.01"
              max={MAX_PAYMENT_AMOUNT}
              value={receiveDialog.amount}
              onChange={(e) => setReceiveDialog({ ...receiveDialog, amount: e.target.value })}
              placeholder="Enter actual amount received"
              className={inputClassName}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-[#d2d2d7] rounded-xl dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 h-10 px-6"
              onClick={() => setReceiveDialog({ open: false, id: '', amount: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="prominent"
              className="rounded-xl h-10 px-6"
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
        <DialogContent className={dialogContentClassName}>
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f] dark:text-slate-100">Resolve Discrepancy</DialogTitle>
            <DialogDescription className="text-[#6e6e73] dark:text-slate-400">
              Explain how this difference in cash collection was handled or corrected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">Resolution Notes</Label>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="How was this discrepancy resolved?"
              className={`${textareaClassName} min-h-[100px]`}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-[#d2d2d7] rounded-xl dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 h-10 px-6"
              onClick={() => setResolveDialog({ open: false, id: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="prominent"
              className="rounded-xl h-10 px-6"
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resolving...</> : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Record Cash Payment (sales staff, at the site) ═══ */}
      {recordTarget && (
        <OnsiteCashDialog
          target={recordTarget}
          open={Boolean(recordTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setRecordTarget(null);
              setExpandedId(null);
            }
          }}
        />
      )}
    </div>
  );
}
