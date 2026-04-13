import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  QrCode,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Banknote,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageError } from '@/components/shared/PageError';
import { useAppointment, useCreateOcularFeeCheckout, useVerifyOcularFeeCheckout, useSimulateOcularPayment, useRequestOcularCashPayment } from '@/hooks/useAppointments'; // ⚠️ useSimulateOcularPayment is TESTING ONLY

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export function PayOcularFeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: appt, isLoading, isError, refetch } = useAppointment(id!);
  const checkoutMutation = useCreateOcularFeeCheckout();
  const verifyMutation = useVerifyOcularFeeCheckout();
  // ⚠️ TESTING ONLY: simulate payment hook. Remove for production.
  const simulateMutation = useSimulateOcularPayment();
  // ⚠️ END TESTING ONLY
  const cashMutation = useRequestOcularCashPayment();

  const paymentStatus = searchParams.get('status');
  const feeStatus = appt?.ocularFeeStatus;
  const feeAmount = appt?.ocularFee ?? appt?.ocularFeeBreakdown?.total ?? 0;

  const [verifyTimedOut, setVerifyTimedOut] = useState(false);

  const handleManualVerify = useCallback(async () => {
    if (!id) return;
    try {
      const result = await verifyMutation.mutateAsync(id);
      if (result.verified) {
        toast.success('Payment confirmed!');
        refetch();
      } else {
        toast.error('Payment not yet confirmed. Please wait a moment and try again.');
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to verify payment. Please try again.'));
    }
  }, [id, verifyMutation, refetch]);

  // Auto-verify when returning from PayMongo with success status
  useEffect(() => {
    if (paymentStatus === 'success' && feeStatus !== 'verified') {
      setVerifyTimedOut(false);
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;
        // After 20 attempts (~60s), stop and show timeout UI
        if (attempts >= 20) {
          clearInterval(interval);
          setVerifyTimedOut(true);
          return;
        }

        // Call the active verify endpoint
        try {
          if (id) {
            const result = await verifyMutation.mutateAsync(id);
            if (result.verified) {
              clearInterval(interval);
              refetch();
            }
          }
        } catch {
          // Silently continue polling
        }
      }, 3000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [paymentStatus, feeStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePayNow = async () => {
    try {
      const result = await checkoutMutation.mutateAsync(id!);
      // Redirect to PayMongo checkout page
      window.location.href = result.checkoutUrl;
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create payment session. Please try again.'));
    }
  };

  // ⚠️ TESTING ONLY: Simulate payment without PayMongo. Remove for production.
  const handleSimulatePay = async () => {
    try {
      await simulateMutation.mutateAsync(id!);
      toast.success('Payment simulated!');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Simulation failed.'));
    }
  };
  // ⚠️ END TESTING ONLY

  const handleRequestCash = async () => {
    try {
      await cashMutation.mutateAsync(id!);
      toast.success('Cash payment requested! You will pay the sales staff during the visit.');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to request cash payment.'));
    }
  };

  if (isError) return <PageError onRetry={refetch} />;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!appt) return <PageError onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigate(`/appointments/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-card-foreground)]">
            Pay Ocular Fee
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Appointment on {format(new Date(appt.date), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Fee Summary */}
      <Card className="rounded-xl border-[#c8c8cd]/50 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--color-card-foreground)]">Fee Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--color-card-foreground)]">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Type</span>
            <span className="font-medium capitalize">{appt.type} visit</span>
          </div>
          {appt.formattedAddress && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Location</span>
              <span className="font-medium text-right max-w-[60%]">
                {appt.formattedAddress}
              </span>
            </div>
          )}
          {appt.distanceKm != null && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Distance</span>
              <span className="font-medium">{appt.distanceKm.toFixed(1)} km</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 dark:border-white/10 pt-2">
            <span className="font-semibold text-[var(--color-card-foreground)]">Total Ocular Fee</span>
            <span className="font-bold text-lg text-[var(--color-card-foreground)]">
              {formatCurrency(feeAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Verified ── */}
      {feeStatus === 'verified' && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20">
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">Payment Confirmed</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Your payment has been received. A sales staff will be assigned for your visit shortly.
              </p>
              <Button
                variant="prominent"
                className="mt-3 rounded-lg px-6 h-10"
                size="sm"
                onClick={() => navigate(`/appointments/${id}`)}
              >
                View Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Returned from PayMongo but not yet verified (polling/verifying) ── */}
      {paymentStatus === 'success' && feeStatus !== 'verified' && (
        <Card className="rounded-xl border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-3 p-5">
            {verifyTimedOut ? (
              <>
                <RefreshCw className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Verification Taking Longer Than Expected</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Your payment may still be processing. Click below to check again.
                  </p>
                  <Button
                    variant="prominent"
                    className="mt-3 rounded-lg px-6 h-10"
                    size="sm"
                    onClick={handleManualVerify}
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check Payment Status
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-300">Verifying Payment</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Please wait while we confirm your payment. Don&apos;t close this page.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Payment cancelled by user ── */}
      {paymentStatus === 'cancelled' && feeStatus === 'pending' && (
        <Card className="rounded-xl border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 p-5">
            <XCircle className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Payment Cancelled</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Your payment was not completed. You can try again below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Cash Payment Requested ── */}
      {feeStatus === 'cash_pending' && (
        <Card className="rounded-xl border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-3 p-5">
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-300">Cash Payment Requested</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                You chose to pay via cash. The assigned sales staff will collect {formatCurrency(feeAmount)} during your ocular visit.
              </p>
              <Button
                variant="prominent"
                className="mt-3 rounded-lg px-6 h-10"
                size="sm"
                onClick={() => navigate(`/appointments/${id}`)}
              >
                View Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pending: show pay buttons ── */}
      {(feeStatus === 'pending' || feeStatus === 'declined') && paymentStatus !== 'success' && (
        <>
          {/* Online Payment Option */}
          <Card className="rounded-xl border-[#c8c8cd]/50 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[var(--color-card-foreground)]">
                <QrCode className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                Pay Online
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pay instantly via QR code, e-wallet, or bank transfer through our secure payment gateway.
              </p>

              <Button
                variant="prominent"
                className="w-full h-12 rounded-xl text-base"
                onClick={handlePayNow}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing payment…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay {formatCurrency(feeAmount)} Now
                  </>
                )}
              </Button>

              {/* ⚠️ TESTING ONLY: Simulate payment button. Remove for production. */}
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-[#d2d2d7] text-slate-800 dark:border-emerald-500/50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 font-medium"
                onClick={handleSimulatePay}
                disabled={simulateMutation.isPending}
              >
                {simulateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Simulating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Simulate Payment (Test)
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                ⚠ Test button — marks as paid without real payment
              </p>
              {/* ⚠️ END TESTING ONLY */}
            </CardContent>
          </Card>

          {/* Cash Payment Option */}
          <Card className="rounded-xl border-[#c8c8cd]/50 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[var(--color-card-foreground)]">
                <Banknote className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                Pay via Cash
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pay the ocular fee in cash directly to the assigned sales staff during your visit.
                The amount will be collected and verified by our cashier.
              </p>

              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/50 dark:text-amber-400 dark:hover:bg-amber-500/10 font-medium"
                onClick={handleRequestCash}
                disabled={cashMutation.isPending}
              >
                {cashMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Requesting…
                  </>
                ) : (
                  <>
                    <Banknote className="mr-2 h-5 w-5" />
                    Request Cash Payment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
