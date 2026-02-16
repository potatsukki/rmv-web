import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays } from 'date-fns';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAvailableSlots, useRequestAppointment, useRequestReschedule } from '@/hooks/useAppointments';
import { AppointmentType, SLOT_CODES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const bookingSchema = z.object({
  type: z.enum(['office', 'ocular']),
  date: z.string().min(1, 'Please select a date'),
  slotCode: z.string().min(1, 'Please select a time slot'),
  purpose: z.string().max(500).optional(),
  address: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export function BookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      type: 'office',
      date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    },
  });

  const selectedType = watch('type');
  const selectedDate = watch('date');
  const selectedSlot = watch('slotCode');

  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    selectedDate,
    selectedType,
  );

  const requestMutation = useRequestAppointment();
  const rescheduleMutation = useRequestReschedule();

  const onSubmit = async (data: BookingForm) => {
    try {
      if (rescheduleId) {
        if (!data.purpose?.trim()) {
          toast.error('Please provide a reason for rescheduling');
          return;
        }
        await rescheduleMutation.mutateAsync({
          id: rescheduleId,
          newDate: data.date,
          newSlotCode: data.slotCode,
          reason: data.purpose,
        });
        toast.success('Reschedule request submitted!');
      } else {
        await requestMutation.mutateAsync(data);
        toast.success('Appointment booked successfully!');
      }
      navigate('/appointments');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Booking failed');
    }
  };

  const isPending = requestMutation.isPending || rescheduleMutation.isPending;

  const inputClasses =
    'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl text-gray-500 hover:text-gray-900"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {rescheduleId ? 'Reschedule Appointment' : 'Book Appointment'}
          </h1>
          <p className="text-gray-500 text-sm">
            {rescheduleId
              ? 'Choose a new date and time'
              : 'Schedule a consultation with RMV Stainless Steel'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Type & Date */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Visit Type & Date</CardTitle>
            <CardDescription className="text-gray-500">
              Choose how and when you'd like to meet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Selection */}
            {!rescheduleId && (
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-gray-700">Visit Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: AppointmentType.OFFICE,
                      label: 'Office Visit',
                      desc: 'Visit our shop',
                    },
                    {
                      value: AppointmentType.OCULAR,
                      label: 'Ocular Visit',
                      desc: 'We visit your site',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('type', opt.value)}
                      className={cn(
                        'rounded-xl border-2 p-4 text-left transition-all',
                        selectedType === opt.value
                          ? 'border-orange-400 bg-orange-50/50 ring-2 ring-orange-100'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <p className="font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <Label
                htmlFor="date"
                className="text-[13px] font-medium text-gray-700"
              >
                Date
              </Label>
              <Input
                id="date"
                type="date"
                min={minDate}
                {...register('date')}
                className={inputClasses}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            {/* Ocular Address */}
            {selectedType === AppointmentType.OCULAR && !rescheduleId && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="address"
                  className="text-[13px] font-medium text-gray-700"
                >
                  Site Address
                </Label>
                <Input
                  id="address"
                  placeholder="Full address for the ocular visit"
                  {...register('address')}
                  className={inputClasses}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Time Slot */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Available Time Slots</CardTitle>
            <CardDescription className="text-gray-500">
              {selectedDate
                ? `Showing slots for ${format(new Date(selectedDate + 'T00:00:00'), 'MMMM d, yyyy')}`
                : 'Select a date first'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {SLOT_CODES.map((slot) => {
                  const slotInfo = slotsData?.slots.find((s) => s.slotCode === slot);
                  const available = slotInfo?.available ?? false;
                  const remaining = slotInfo?.remaining ?? 0;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!available}
                      onClick={() => setValue('slotCode', slot)}
                      className={cn(
                        'rounded-xl border-2 p-3 text-center transition-all',
                        selectedSlot === slot
                          ? 'border-orange-400 bg-orange-50/50 text-orange-700 ring-2 ring-orange-100'
                          : available
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400 opacity-50',
                      )}
                    >
                      <p className="text-sm font-medium">{slot}</p>
                      {available && (
                        <p className="text-xs text-gray-500 mt-0.5">{remaining} left</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.slotCode && (
              <p className="mt-2 text-sm text-red-500">{errors.slotCode.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Purpose */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              {rescheduleId ? 'Reason for Reschedule' : 'Purpose (Optional)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              {...register('purpose')}
              placeholder={
                rescheduleId
                  ? 'Why are you rescheduling?'
                  : 'Briefly describe what you need (e.g., kitchen countertop fabrication)...'
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-12 shadow-sm"
          size="lg"
          disabled={isPending || !selectedSlot}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          {rescheduleId ? 'Submit Reschedule Request' : 'Book Appointment'}
        </Button>
      </form>
    </div>
  );
}
