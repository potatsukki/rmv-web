import { useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { GcashPayment } from '@/pages/payments/components/GcashPayment';
import { useAppointment, useCreateOcularFeeCheckout, useVerifyOcularFeeCheckout } from '@/hooks/useAppointments';
import { PageError } from '@/components/shared/PageError';
import { extractErrorMessage } from '@/lib/utils';

export function PayOcularFeePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: appointment, isLoading, isError, refetch } = useAppointment(id!);
  const createCheckout = useCreateOcularFeeCheckout();
  const verifyCheckout = useVerifyOcularFeeCheckout();
  const bookingId = appointment?.canonicalAppointmentId || appointment?._id;
  const returnedFromCheckout = searchParams.get('status') === 'success';
  const checkedReturnRef = useRef(false);

  // Coming back from PayMongo: confirm the payment once so it reaches the cashier even if the webhook is late.
  useEffect(() => {
    if (!returnedFromCheckout || !bookingId || checkedReturnRef.current) return;
    checkedReturnRef.current = true;
    verifyCheckout.mutate(bookingId, { onSettled: () => refetch() });
  }, [returnedFromCheckout, bookingId, verifyCheckout, refetch]);

  if (isLoading) return <p role="status">Loading booking…</p>;
  if (isError || !appointment || !bookingId) return <PageError onRetry={refetch} />;

  const amount = appointment.ocularFee ?? appointment.ocularFeeBreakdown?.total ?? 0;
  const qrPhAwaitingCashier = appointment.ocularFeePaymentMethod === 'qrph' && appointment.ocularFeeStatus === 'proof_submitted';

  async function startQrPhCheckout() {
    try {
      const { checkoutUrl } = await createCheckout.mutateAsync(bookingId!);
      window.location.assign(checkoutUrl);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Unable to open the QR Ph checkout.'));
    }
  }

  return <div className="mx-auto max-w-2xl space-y-5">
    <Button variant="ghost" asChild><Link to={`/appointments/${bookingId}`}><ArrowLeft className="mr-2 h-4 w-4" />Booking Details</Link></Button>
    <h1 className="text-2xl font-bold">Booking Payment</h1>
    {amount <= 0 ? <p>No payment is required for this booking.</p>
      : qrPhAwaitingCashier ? (
        <div role="status" className="space-y-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <h2 className="font-semibold">QR Ph payment received</h2>
          <p>Your payment for {appointment.appointmentNumber || 'this booking'} was received through PayMongo. The cashier will verify it shortly.</p>
          <p>Payment Status: Waiting for cashier verification</p>
        </div>
      ) : (
        <>
          {returnedFromCheckout && verifyCheckout.isPending && <p role="status" className="text-sm text-muted-foreground">Checking your QR Ph payment…</p>}
          <GcashPayment target={{ bookingId }} allowCash={false} onQrPhCheckout={startQrPhCheckout} />
          <p className="text-sm text-muted-foreground">Paying in cash at the RMV office? The cashier will record your payment there.</p>
        </>
      )}
  </div>;
}
