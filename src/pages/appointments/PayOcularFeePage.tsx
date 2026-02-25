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
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageError } from '@/components/shared/PageError';
import { useAppointment, useCreateOcularFeeCheckout, useVerifyOcularFeeCheckout, useSimulateOcularPayment } from '@/hooks/useAppointments'; // ⚠️ useSimulateOcularPayment is TESTING ONLY

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
    } catch {
      toast.error('Failed to verify payment. Please try again.');
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
    } catch {
      toast.error('Failed to create payment session. Please try again.');
    }
  };

  // ⚠️ TESTING ONLY: Simulate payment without PayMongo. Remove for production.
  const handleSimulatePay = async () => {
    try {
      await simulateMutation.mutateAsync(id!);
      toast.success('Payment simulated!');
      refetch();
    } catch {
      toast.error('Simulation failed.');
    }
  };
  // ⚠️ END TESTING ONLY

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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Pay Ocular Fee
          </h1>
          <p className="text-sm text-gray-500">
            Appointment on {format(new Date(appt.date), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Fee Summary */}
      <Card className="rounded-xl border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-700">Fee Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="font-medium capitalize">{appt.type} visit</span>
          </div>
          {appt.formattedAddress && (
            <div className="flex justify-between">
              <span className="text-gray-500">Location</span>
              <span className="font-medium text-right max-w-[60%]">
                {appt.formattedAddress}
              </span>
            </div>
          )}
          {appt.distanceKm != null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Distance</span>
              <span className="font-medium">{appt.distanceKm.toFixed(1)} km</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold text-gray-900">Total Ocular Fee</span>
            <span className="font-bold text-lg text-orange-600">
              {formatCurrency(feeAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Verified ── */}
      {feeStatus === 'verified' && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800">Payment Confirmed</p>
              <p className="text-sm text-emerald-700">
                Your payment has been received. A sales staff will be assigned for your visit shortly.
              </p>
              <Button
                className="mt-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
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
        <Card className="rounded-xl border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 p-5">
            {verifyTimedOut ? (
              <>
                <RefreshCw className="h-8 w-8 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">Verification Taking Longer Than Expected</p>
                  <p className="text-sm text-amber-700">
                    Your payment may still be processing. Click below to check again.
                  </p>
                  <Button
                    className="mt-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
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
                <Loader2 className="h-8 w-8 text-blue-600 shrink-0 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-800">Verifying Payment</p>
                  <p className="text-sm text-blue-700">
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
        <Card className="rounded-xl border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-5">
            <XCircle className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Payment Cancelled</p>
              <p className="text-sm text-amber-700">
                Your payment was not completed. You can try again below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pending: show pay button ── */}
      {feeStatus === 'pending' && paymentStatus !== 'success' && (
        <Card className="rounded-xl border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-gray-700">
              <QrCode className="h-5 w-5 text-orange-500" />
              Pay via QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Scan the QR code with your banking app to complete your payment.
            </p>

            <Button
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-base font-semibold"
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
              className="w-full h-12 border-dashed border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-base font-semibold"
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
            <p className="text-xs text-center text-gray-400">
              ⚠ Test button — marks as paid without real payment
            </p>
            {/* ⚠️ END TESTING ONLY */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
