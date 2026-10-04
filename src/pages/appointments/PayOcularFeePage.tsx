import { useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GcashPayment } from '@/pages/payments/components/GcashPayment';
import { useAppointment } from '@/hooks/useAppointments';
import { PageError } from '@/components/shared/PageError';

export function PayOcularFeePage() {
  const { id } = useParams<{ id: string }>();
  const { data: appointment, isLoading, isError, refetch } = useAppointment(id!);
  if (isLoading) return <p role="status">Loading booking?</p>;
  if (isError || !appointment) return <PageError onRetry={refetch} />;
  const bookingId = appointment.canonicalAppointmentId || appointment._id;
  return <div className="mx-auto max-w-2xl space-y-5">
    <Button variant="ghost" asChild><Link to={`/appointments/${bookingId}`}><ArrowLeft className="mr-2 h-4 w-4" />Booking Details</Link></Button>
    <h1 className="text-2xl font-bold">Booking Payment</h1>
    {(appointment.ocularFee ?? appointment.ocularFeeBreakdown?.total ?? 0) > 0
      ? <GcashPayment target={{ bookingId }} />
      : <p>No payment is required for this booking.</p>}
  </div>;
}
