import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, getDay, startOfDay } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Calendar, FileText, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceTypePicker } from '@/components/shared/ServiceTypePicker';
import { useAvailableSlots, useRequestAppointment, useRequestReschedule } from '@/hooks/useAppointments';
import { SLOT_CODES, ServiceType } from '@/lib/constants';
import { cn } from '@/lib/utils';

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

/** Return the earliest bookable weekday (at least 3 days from today, skipping Sat/Sun). */
function getNextValidBookingDate(): Date {
  let candidate = addDays(new Date(), 3);
  while (getDay(candidate) === 0 || getDay(candidate) === 6) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/** True when a calendar day should be disabled (too soon or weekend). */
function isDateDisabled(day: Date): boolean {
  const dow = getDay(day);
  if (dow === 0 || dow === 6) return true;
  if (startOfDay(day) < startOfDay(addDays(new Date(), 3))) return true;
  return false;
}

const bookingSchema = z.object({
  date: z.string().min(1, 'Please select a date'),
  slotCode: z.string().min(1, 'Please select a time slot'),
  purpose: z.string().max(500).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export function BookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: format(getNextValidBookingDate(), 'yyyy-MM-dd'),
    },
  });

  const selectedDate = watch('date');
  const selectedSlot = watch('slotCode');

  // Service type + notes state
  const [serviceType, setServiceType] = useState(ServiceType.CUSTOM as string);
  const [serviceTypeCustom, setServiceTypeCustom] = useState('');
  const [notes, setNotes] = useState('');

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    selectedDate,
    'office', // always office
  );

  const requestMutation = useRequestAppointment();
  const rescheduleMutation = useRequestReschedule();
  const isPending = requestMutation.isPending || rescheduleMutation.isPending;

  // ── Step Wizard Logic ──
  const steps = rescheduleId
    ? [
        { key: 'date', label: 'Date & Time', icon: Calendar },
        { key: 'reason', label: 'Reason', icon: FileText },
      ]
    : [
        { key: 'service', label: 'Service & Notes', icon: FileText },
        { key: 'date', label: 'Date & Time', icon: Calendar },
        { key: 'review', label: 'Review', icon: CheckCircle },
      ];

  const [currentStep, setCurrentStep] = useState(0);

  const canProceed = useMemo(() => {
    const stepKey = steps[currentStep]?.key;
    if (stepKey === 'service') return true; // service type has default, notes optional
    if (stepKey === 'date') return !!selectedDate && !!selectedSlot;
    if (stepKey === 'reason') return true;
    if (stepKey === 'review') return true;
    return false;
  }, [currentStep, steps, selectedDate, selectedSlot]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
  };
  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const onSubmit = async () => {
    try {
      if (rescheduleId) {
        const purpose = watch('purpose');
        if (!purpose?.trim()) {
          toast.error('Please provide a reason for rescheduling');
          return;
        }
        await rescheduleMutation.mutateAsync({
          id: rescheduleId,
          newDate: selectedDate,
          newSlotCode: selectedSlot,
          reason: purpose,
        });
        toast.success('Reschedule request submitted!');
        navigate('/appointments');
      } else {
        const result = await requestMutation.mutateAsync({
          type: 'office',
          date: selectedDate,
          slotCode: selectedSlot,
          purpose: notes || undefined,
          serviceType: serviceType as import('@/lib/constants').ServiceType,
          serviceTypeCustom: serviceTypeCustom || undefined,
        });

        toast.success('Appointment booked successfully!');
        navigate(`/appointments/${result._id}`);
      }
    } catch (error: unknown) {
      const apiError = (error as {
        response?: {
          data?: {
            error?: {
              code?: string;
              message?: string;
              details?: { activeAppointmentId?: unknown };
            };
          };
        };
      })?.response?.data?.error;
      const activeAppointmentId =
        typeof apiError?.details?.activeAppointmentId === 'string'
          ? apiError.details.activeAppointmentId
          : undefined;

      if (!rescheduleId && apiError?.code === 'DUPLICATE_ENTRY' && activeAppointmentId) {
        toast.error(`${extractErrorMessage(error, 'Booking failed')} Redirecting you to that appointment now.`, {
          duration: 5000,
        });
        navigate(`/appointments/${activeAppointmentId}`);
        return;
      }

      toast.error(extractErrorMessage(error, 'Booking failed'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (currentStep > 0 ? handleBack() : navigate(-1))}
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            {rescheduleId ? 'Reschedule Appointment' : 'Book Office Consultation'}
          </h1>
          <p className="text-[#6e6e73] text-sm">
            {rescheduleId
              ? 'Choose a new date and time'
              : 'Schedule a consultation at our Quezon City office'}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => idx < currentStep && setCurrentStep(idx)}
                disabled={idx > currentStep}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all w-full justify-center',
                  isActive && 'bg-[#f0f0f5] text-[#1d1d1f] ring-1 ring-[#d2d2d7]',
                  isCompleted && 'bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100',
                  !isActive && !isCompleted && 'text-[#86868b]',
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={cn(
                  'h-px w-4 flex-shrink-0 mx-1',
                  idx < currentStep ? 'bg-emerald-300' : 'bg-[#d2d2d7]',
                )} />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Step: Service & Notes */}
        {steps[currentStep]?.key === 'service' && (
          <div className="space-y-6">
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f]">What do you need?</CardTitle>
                <CardDescription className="text-[#6e6e73]">
                  Select the type of fabrication service and add any notes for our team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ServiceTypePicker
                  value={serviceType}
                  customValue={serviceTypeCustom}
                  onChange={(type, custom) => {
                    setServiceType(type);
                    setServiceTypeCustom(custom || '');
                  }}
                />
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#3a3a3e]">
                    Additional Notes <span className="text-[#86868b]">(optional)</span>
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe what you're looking for (e.g., stainless steel railings for 2nd floor balcony, kitchen countertop with L-shape)..."
                    className="min-h-[100px] rounded-xl border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]"
                  />
                  <p className="text-xs text-[#86868b]">
                    Our sales staff will discuss all the details during your office consultation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Date & Time */}
        {steps[currentStep]?.key === 'date' && (
          <>
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f]">Pick a Date</CardTitle>
                <CardDescription className="text-[#6e6e73]">
                  Choose your preferred appointment date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-[#f0f0f5]/70 border border-[#d2d2d7]/50 p-3.5">
                  <Info className="h-4 w-4 text-[#6e6e73] mt-0.5 shrink-0" />
                  <div className="text-sm text-[#3a3a3e] space-y-0.5">
                    <p className="font-medium">Scheduling Rules</p>
                    <ul className="list-disc list-inside text-xs text-[#6e6e73] space-y-0.5">
                      <li>Appointments must be booked <span className="font-medium text-[#1d1d1f]">at least 3 days</span> in advance</li>
                      <li>Weekends <span className="font-medium text-[#1d1d1f]">(Saturday &amp; Sunday)</span> are not available</li>
                    </ul>
                  </div>
                </div>
                <div className="flex justify-center">
                  <CalendarUI
                    mode="single"
                    selected={selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined}
                    onSelect={(day) => {
                      if (day) setValue('date', format(day, 'yyyy-MM-dd'));
                    }}
                    disabled={isDateDisabled}
                    fromMonth={new Date()}
                    className="rounded-xl border border-[#c8c8cd]/50"
                  />
                </div>
                {selectedDate && (
                  <p className="text-center text-sm text-[#6e6e73] mt-3">
                    Selected: <span className="font-medium text-[#1d1d1f]">{format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy')}</span>
                  </p>
                )}
                {errors.date && <p className="text-sm text-red-500 mt-2">{errors.date.message}</p>}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f]">Select a Time Slot</CardTitle>
                <CardDescription className="text-[#6e6e73]">
                  {selectedDate
                    ? `Showing slots for ${format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy')}`
                    : 'Select a date first'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#6e6e73]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {SLOT_CODES.map((slot) => {
                      const slotInfo = slotsData?.slots.find((entry) => entry.slotCode === slot);
                      const available = slotInfo?.available ?? false;
                      const blocked = (slotInfo as { blocked?: boolean })?.blocked ?? false;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!available}
                          onClick={() => setValue('slotCode', slot)}
                          className={cn(
                            'rounded-xl border-2 p-3 text-center transition-all',
                            selectedSlot === slot
                              ? 'border-[#86868b] bg-[#f5f5f7]/50 text-[#1d1d1f] ring-2 ring-[#d2d2d7]'
                              : available
                                ? 'border-[#d2d2d7] hover:border-[#c8c8cd]'
                                : 'cursor-not-allowed border-[#c8c8cd]/50 bg-[#f5f5f7] text-[#86868b] opacity-50',
                          )}
                        >
                          <p className="text-sm font-medium">{formatSlotTime(slot)}</p>
                          {!available && (
                            <p className="mt-0.5 text-xs text-red-400">
                              {blocked ? 'Blocked' : 'Unavailable'}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.slotCode && <p className="mt-2 text-sm text-red-500">{errors.slotCode.message}</p>}
              </CardContent>
            </Card>
          </>
        )}

        {/* Step: Reason (reschedule only) */}
        {steps[currentStep]?.key === 'reason' && (
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Reason for Reschedule</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                {...register('purpose')}
                placeholder="Why are you rescheduling?"
                className="w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]/50 px-4 py-3 text-sm placeholder:text-[#86868b] focus:border-[#c8c8cd] focus:outline-none focus:ring-2 focus:ring-[#6e6e73]"
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Step: Review & Confirm */}
        {steps[currentStep]?.key === 'review' && (
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Review Your Booking</CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Confirm the details below before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Visit Type</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">Office Consultation</p>
                </div>
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Date</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                    {selectedDate ? format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy') : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Time Slot</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                    {selectedSlot ? formatSlotTime(selectedSlot) : '—'}
                  </p>
                </div>
                {serviceType && (
                  <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                    <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Service Type</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d1d1f] capitalize">
                      {serviceType === ServiceType.CUSTOM && serviceTypeCustom ? serviceTypeCustom : serviceType.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}
              </div>

              {notes && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Notes</p>
                  <p className="mt-1 text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">{notes}</p>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-3.5">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">
                  After the consultation, our agent will schedule an ocular site visit if needed. Our sales staff will take measurements at your location.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 pt-2">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="rounded-xl border-[#d2d2d7] text-[#6e6e73] hover:text-[#1d1d1f]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <div className="ml-auto">
            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="rounded-xl bg-[#1d1d1f] text-white hover:bg-[#3a3a3e] disabled:opacity-50"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isPending || !selectedSlot}
                className="rounded-xl bg-[#1d1d1f] text-white hover:bg-[#3a3a3e] disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {rescheduleId ? 'Submit Reschedule Request' : 'Book Appointment'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
