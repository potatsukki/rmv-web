import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
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
  FileText,
  Briefcase,
  MapPin,
  Route,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const canonicalAppointmentId = appt?.canonicalAppointmentId || appt?._id;
  const isStaleAppointmentLink = Boolean(canonicalAppointmentId && canonicalAppointmentId !== id);

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

  if (isStaleAppointmentLink && canonicalAppointmentId) {
    navigate(`/appointments/${canonicalAppointmentId}/pay-ocular-fee`, { replace: true });
    return null;
  }

  const appointmentDetailsPath = `/appointments/${canonicalAppointmentId || id}`;
  const feeDetailRows = [
    {
      icon: Briefcase,
      label: 'Type',
      value: `${appt.type === 'ocular' ? 'Ocular' : appt.type} Visit`,
    },
    ...(appt.formattedAddress
      ? [{
          icon: MapPin,
          label: 'Location',
          value: appt.formattedAddress,
        }]
      : []),
    ...(appt.distanceKm != null
      ? [{
          icon: Route,
          label: 'Distance',
          value: `${appt.distanceKm.toFixed(1)} km`,
        }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-2 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 h-8 w-8 rounded-lg border border-white/10 bg-slate-900/70 text-slate-200 hover:bg-slate-800 dark:bg-slate-900/80"
          onClick={() => navigate(appointmentDetailsPath)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-card-foreground)]">
            Pay Ocular Fee
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Appointment on {format(new Date(appt.date), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Fee Summary */}
      <Card className="overflow-hidden rounded-xl border border-slate-200/70 bg-white/80 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(18,28,42,0.96)_0%,rgba(9,17,27,0.98)_100%)] dark:shadow-black/20">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-white/10">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
              <FileText className="h-5 w-5" />
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">Fee Details</p>
          </div>
          <div className="divide-y divide-slate-200/70 px-5 dark:divide-white/10">
            {feeDetailRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="grid grid-cols-[2.5rem_minmax(8rem,14rem)_1fr] items-center gap-4 py-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
                <span className="text-right text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                  {value}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[2.5rem_minmax(8rem,14rem)_1fr] items-center gap-4 py-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                <CreditCard className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total Ocular Fee</span>
              <span className="text-right text-2xl font-black text-blue-600 dark:text-blue-300">
              {formatCurrency(feeAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Verified ── */}
      {feeStatus === 'verified' && (
        <Card className="overflow-hidden rounded-xl border border-emerald-400/30 bg-emerald-50/80 shadow-xl shadow-emerald-950/5 dark:bg-[linear-gradient(135deg,rgba(5,45,36,0.72)_0%,rgba(9,27,28,0.96)_100%)] dark:shadow-black/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400 text-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="h-9 w-9" />
              </span>
              <div>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Payment Confirmed</p>
                <p className="mt-1 text-sm leading-relaxed text-emerald-800/80 dark:text-emerald-100/75">
                Your payment has been received. A sales staff will be assigned for your visit shortly.
                </p>
              </div>
            </div>
            <div className="mt-5 border-t border-emerald-600/20 pt-4">
              <Button
                variant="default"
                className="h-11 rounded-lg bg-[linear-gradient(180deg,#1f8f63_0%,#146347_100%)] px-6 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_24px_rgba(10,86,58,0.28)] hover:bg-[linear-gradient(180deg,#24a36f_0%,#16754f_100%)] dark:bg-[linear-gradient(180deg,#1f8f63_0%,#146347_100%)] dark:text-white dark:hover:bg-[linear-gradient(180deg,#24a36f_0%,#16754f_100%)]"
                size="sm"
                onClick={() => navigate(appointmentDetailsPath)}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                View Appointment
                <ChevronRight className="ml-3 h-4 w-4" />
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
                onClick={() => navigate(appointmentDetailsPath)}
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
            <CardContent className="space-y-4 p-5">
              <p className="flex items-center gap-2 text-base font-bold text-[var(--color-card-foreground)]">
                <QrCode className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                Pay Online
              </p>
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
            <CardContent className="space-y-4 p-5">
              <p className="flex items-center gap-2 text-base font-bold text-[var(--color-card-foreground)]">
                <Banknote className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                Pay via Cash
              </p>
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
