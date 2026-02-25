import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CreditCard, AlertTriangle, MapPin, QrCode, Zap, Banknote, Download, ScrollText, PenTool } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProjects } from '@/hooks/useProjects';
import {
  usePaymentPlan,
  usePaymentsByProject,
  useSubmitPaymentProof,
  useStageCheckout,
  useSimulateStagePayment,
  useRecordCashPayment,
} from '@/hooks/usePayments';
import { useAuthStore } from '@/stores/auth.store';
import { Role, PaymentStageStatus, PaymentMethod } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/shared/FileUpload';
import { useUnpaidOcularFees } from '@/hooks/useAppointments';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export function PaymentsPage() {
  const { user } = useAuthStore();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [proofDialog, setProofDialog] = useState<{
    open: boolean;
    stageId: string;
    amount: number;
  }>({ open: false, stageId: '', amount: 0 });
  const [method, setMethod] = useState<string>(PaymentMethod.GCASH);
  const [amountPaid, setAmountPaid] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [proofKey, setProofKey] = useState('');

  const { data: projects } = useProjects();
  const { data: plan, isLoading: planLoading } = usePaymentPlan(selectedProjectId);
  const { data: payments } = usePaymentsByProject(selectedProjectId);
  const submitProof = useSubmitPaymentProof();
  const stageCheckout = useStageCheckout();
  const simulatePayment = useSimulateStagePayment();
  const recordCash = useRecordCashPayment();

  const [cashDialog, setCashDialog] = useState<{ open: boolean; stageId: string; amount: number }>({
    open: false,
    stageId: '',
    amount: 0,
  });
  const [cashAmount, setCashAmount] = useState('');

  const location = useLocation();
  const isCustomer = user?.roles.includes(Role.CUSTOMER);
  const isCashier = user?.roles.some((r: string) => [Role.CASHIER, Role.ADMIN].includes(r as Role));
  const { data: unpaidOcularFees } = useUnpaidOcularFees();

  // Auto-select project: from navigation state or first project in list
  useEffect(() => {
    if (selectedProjectId) return;
    const stateProjectId = (location.state as { projectId?: string })?.projectId;
    if (stateProjectId) {
      setSelectedProjectId(stateProjectId);
    } else if (projects?.items && projects.items.length > 0) {
      setSelectedProjectId(String(projects.items[0]!._id));
    }
  }, [projects, selectedProjectId, location.state]);

  const selectedProject = projects?.items?.find(
    (p) => String(p._id) === selectedProjectId,
  );
  const contractSigned = !!selectedProject?.contractSignedAt;

  const handleSubmitProof = async () => {
    const amount = parseFloat(amountPaid);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await submitProof.mutateAsync({
        projectId: selectedProjectId,
        stageId: proofDialog.stageId,
        method,
        amountPaid: amount,
        referenceNumber: refNumber || undefined,
        proofKey: proofKey || undefined,
      });
      toast.success('Payment proof submitted');
      setProofDialog({ open: false, stageId: '', amount: 0 });
      resetForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Submission failed');
    }
  };

  const resetForm = () => {
    setMethod(PaymentMethod.GCASH);
    setAmountPaid('');
    setRefNumber('');
    setProofKey('');
  };

  const handleQrCheckout = async (stageId: string) => {
    try {
      const result = await stageCheckout.mutateAsync(stageId);
      window.open(result.checkoutUrl, '_blank');
      toast.success('QR checkout opened — complete payment in the new tab');
    } catch {
      toast.error('Failed to create checkout session');
    }
  };

  const handleSimulate = async (stageId: string) => {
    try {
      const result = await simulatePayment.mutateAsync(stageId);
      toast.success(`Payment simulated! Receipt: ${result.receiptNumber}`);
    } catch {
      toast.error('Simulation failed');
    }
  };

  const handleRecordCash = async () => {
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      const result = await recordCash.mutateAsync({
        stageId: cashDialog.stageId,
        amountPaid: amount,
      });
      toast.success(`Cash recorded! Receipt: ${result.receiptNumber}`);
      setCashDialog({ open: false, stageId: '', amount: 0 });
      setCashAmount('');
    } catch {
      toast.error('Failed to record cash payment');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payments</h1>
        <p className="text-gray-500 text-sm">
          {isCustomer ? 'Submit and track your payments' : 'View payment details by project'}
        </p>
      </div>

      {/* Unpaid Ocular Fees */}
      {isCustomer && unpaidOcularFees && unpaidOcularFees.length > 0 && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Unpaid Ocular Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-700">
              You have ocular inspection fees that need to be paid before your appointment can be confirmed.
            </p>
            {unpaidOcularFees.map((appt) => (
              <div
                key={String(appt._id)}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {format(new Date(appt.date), 'EEEE, MMMM d, yyyy')}
                  </p>
                  {appt.address && (
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {appt.address}
                    </p>
                  )}
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(appt.ocularFee ?? 0)}
                  </p>
                </div>
                <Button
                  asChild
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                >
                  <Link to={`/appointments/${appt._id}/pay-ocular-fee`}>
                    Pay Now
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Project Selector — Card-based */}
      <Card className="rounded-xl border-gray-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Select Project</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {projects?.items && projects.items.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {projects.items.map((p) => {
                const isSelected = String(p._id) === selectedProjectId;
                return (
                  <button
                    key={String(p._id)}
                    type="button"
                    onClick={() => setSelectedProjectId(String(p._id))}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200'
                        : 'border-gray-200 bg-gray-50/30 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>
                      {String(p.title)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {String(p.serviceType).replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={String(p.status)} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No projects found.</p>
          )}
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <EmptyState
          icon={<CreditCard className="h-16 w-16" />}
          title="Select a project"
          description="Choose a project above to view its payment plan."
        />
      ) : planLoading ? (
        <Card className="rounded-xl border-gray-100">
          <CardContent className="p-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : !plan ? (
        <EmptyState
          icon={<CreditCard className="h-16 w-16" />}
          title="No payment plan"
          description="A payment plan hasn't been created for this project yet."
        />
      ) : isCustomer && !contractSigned ? (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-3">
                <PenTool className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">Sign Your Contract First</h3>
                <p className="text-sm text-amber-700">
                  You must review and e-sign the project contract before making any payments.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
            >
              <Link to={`/projects/${selectedProjectId}`}>
                <ScrollText className="mr-1.5 h-4 w-4" />
                Go to Project &amp; Sign Contract
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Payment Plan */}
          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Payment Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.stages.map((stage) => (
                  <div
                    key={String(stage.stageId)}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-4 bg-gray-50/30 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{String(stage.label)}</p>
                      <p className="text-sm text-gray-500">
                        {String(stage.percentage)}% — {formatCurrency(Number(stage.amount))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={String(stage.status)} />
                      {isCustomer && stage.status === PaymentStageStatus.PENDING && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                            onClick={() => handleQrCheckout(String(stage.stageId))}
                            disabled={stageCheckout.isPending}
                          >
                            <QrCode className="mr-1.5 h-3.5 w-3.5" />
                            Pay via QR
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200 rounded-lg"
                            onClick={() =>
                              setProofDialog({
                                open: true,
                                stageId: String(stage.stageId),
                                amount: Number(stage.amount),
                              })
                            }
                          >
                            Upload Proof
                          </Button>
                          {import.meta.env.DEV && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600 hover:text-orange-700 rounded-lg"
                            onClick={() => handleSimulate(String(stage.stageId))}
                            disabled={simulatePayment.isPending}
                            title="DEV: Simulate payment"
                          >
                            <Zap className="mr-1 h-3.5 w-3.5" />
                            Simulate
                          </Button>
                          )}
                        </>
                      )}
                      {isCustomer && stage.status === PaymentStageStatus.DECLINED && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                            onClick={() => handleQrCheckout(String(stage.stageId))}
                            disabled={stageCheckout.isPending}
                          >
                            <QrCode className="mr-1.5 h-3.5 w-3.5" />
                            Pay via QR
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200 rounded-lg"
                            onClick={() =>
                              setProofDialog({
                                open: true,
                                stageId: String(stage.stageId),
                                amount: Number(stage.amount),
                              })
                            }
                          >
                            Resubmit Proof
                          </Button>
                        </>
                      )}
                      {isCashier && (stage.status === PaymentStageStatus.PENDING || stage.status === PaymentStageStatus.DECLINED) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          onClick={() =>
                            setCashDialog({
                              open: true,
                              stageId: String(stage.stageId),
                              amount: Number(stage.amount),
                            })
                          }
                        >
                          <Banknote className="mr-1.5 h-3.5 w-3.5" />
                          Record Cash
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          {payments && payments.length > 0 && (
            <Card className="rounded-xl border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={String(p._id)}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(p.amountPaid))}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {String(p.method || '').replace('_', ' ')}
                          {p.receiptNumber && ` · ${String(p.receiptNumber)}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.createdAt
                            ? format(new Date(String(p.createdAt)), 'MMM d, yyyy')
                            : ''}
                        </p>
                        {p.declineReason ? (
                          <p className="text-xs text-red-500">
                            Declined: {String(p.declineReason)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={String(p.status)} />
                        {p.status === 'verified' && p.receiptKey && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600 hover:text-orange-700 h-7 px-2"
                            onClick={async () => {
                              try {
                                const { data } = await api.get(`/payments/${p._id}/receipt-url`);
                                window.open(data.data.url, '_blank');
                              } catch {
                                toast.error('Failed to get receipt');
                              }
                            }}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Submit Proof Dialog */}
      <Dialog
        open={proofDialog.open}
        onOpenChange={(open) => {
          setProofDialog({
            open,
            stageId: open ? proofDialog.stageId : '',
            amount: open ? proofDialog.amount : 0,
          });
          if (!open) resetForm();
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Submit Payment Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 text-[13px] font-medium">Amount Due</Label>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(proofDialog.amount)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-[13px] font-medium">Payment Method</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
              >
                {Object.values(PaymentMethod).map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-[13px] font-medium">Amount Paid</Label>
              <Input
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                className="h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
              />
            </div>

            {method !== PaymentMethod.CASH && (
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-[13px] font-medium">
                  Reference Number
                </Label>
                <Input
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="Transaction reference #"
                  className="h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                />
              </div>
            )}

            <FileUpload
              folder="payment-proofs"
              accept="image/*,.pdf"
              maxSizeMB={5}
              maxFiles={1}
              label="Upload payment proof"
              onUploadComplete={(keys) => setProofKey(keys[0] || '')}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 rounded-lg"
              onClick={() => setProofDialog({ open: false, stageId: '', amount: 0 })}
            >
              Cancel
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 rounded-lg"
              onClick={handleSubmitProof}
              disabled={submitProof.isPending}
            >
              Submit Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Recording Dialog (Cashier) */}
      <Dialog
        open={cashDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCashDialog({ open: false, stageId: '', amount: 0 });
            setCashAmount('');
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Record Cash Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 text-[13px] font-medium">Amount Due</Label>
              <p className="text-lg font-bold text-emerald-700">
                {formatCurrency(cashDialog.amount)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-[13px] font-medium">Amount Received</Label>
              <Input
                type="number"
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0.00"
                className="h-11 bg-gray-50/50 border-gray-200 focus:border-emerald-300 focus:ring-emerald-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 rounded-lg"
              onClick={() => {
                setCashDialog({ open: false, stageId: '', amount: 0 });
                setCashAmount('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              onClick={handleRecordCash}
              disabled={recordCash.isPending}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
