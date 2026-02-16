import { useState } from 'react';
import { format } from 'date-fns';
import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProjects } from '@/hooks/useProjects';
import { usePaymentPlan, usePaymentsByProject, useSubmitPaymentProof } from '@/hooks/usePayments';
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

  const isCustomer = user?.roles.includes(Role.CUSTOMER);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payments</h1>
        <p className="text-gray-500 text-sm">
          {isCustomer ? 'Submit and track your payments' : 'View payment details by project'}
        </p>
      </div>

      {/* Project Selector */}
      <Card className="rounded-xl border-gray-100">
        <CardContent className="p-4">
          <Label className="text-gray-700 text-[13px] font-medium">Select Project</Label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
          >
            <option value="">Choose a project...</option>
            {projects?.items.map((p) => (
              <option key={String(p._id)} value={String(p._id)}>
                {String(p.title)}
              </option>
            ))}
          </select>
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
                    <div className="flex items-center gap-3">
                      <StatusBadge status={String(stage.status)} />
                      {isCustomer && stage.status === PaymentStageStatus.PENDING && (
                        <Button
                          size="sm"
                          className="bg-gray-900 hover:bg-gray-800 rounded-lg"
                          onClick={() =>
                            setProofDialog({
                              open: true,
                              stageId: String(stage.stageId),
                              amount: Number(stage.amount),
                            })
                          }
                        >
                          Pay
                        </Button>
                      )}
                      {isCustomer && stage.status === PaymentStageStatus.DECLINED && (
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
                          Resubmit
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
                      <StatusBadge status={String(p.status)} />
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
    </div>
  );
}
