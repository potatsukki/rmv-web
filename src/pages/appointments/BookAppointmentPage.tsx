import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, MapPin, Calendar, Clock, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { LocationPicker } from '@/components/maps/LocationPicker';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAvailableSlots, useRequestAppointment, useRequestReschedule } from '@/hooks/useAppointments';
import { AppointmentType, SLOT_CODES } from '@/lib/constants';
import {
  fetchOcularFeePreview,
  reverseGeocodeLocation,
  type MapPoint,
  type OcularFeePreview,
} from '@/lib/maps';
import { cn } from '@/lib/utils';

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

const bookingSchema = z.object({
  type: z.enum(['office', 'ocular']),
  date: z.string().min(1, 'Please select a date'),
  slotCode: z.string().min(1, 'Please select a time slot'),
  purpose: z.string().max(500).optional(),
  street: z.string().max(200).optional(),
  barangay: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  zip: z.string().max(10).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

function currency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'error' in error.response.data &&
    typeof error.response.data.error === 'object' &&
    error.response.data.error !== null &&
    'message' in error.response.data.error &&
    typeof error.response.data.error.message === 'string'
  ) {
    return error.response.data.error.message;
  }
  return fallback;
}

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
      date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    },
  });

  const selectedType = watch('type');
  const selectedDate = watch('date');
  const selectedSlot = watch('slotCode');
  const minDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');

  const [selectedLocation, setSelectedLocation] = useState<MapPoint | null>(null);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [feePreview, setFeePreview] = useState<OcularFeePreview | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  const isOcularBooking = selectedType === AppointmentType.OCULAR && !rescheduleId;

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    selectedDate,
    selectedType,
  );

  const requestMutation = useRequestAppointment();
  const rescheduleMutation = useRequestReschedule();
  const isPending = requestMutation.isPending || rescheduleMutation.isPending;

  useEffect(() => {
    if (!isOcularBooking) {
      setSelectedLocation(null);
      setFormattedAddress('');
      setFeePreview(null);
      setFeeError(null);
      setIsFeeLoading(false);
      setIsAddressLoading(false);
    }
  }, [isOcularBooking]);

  useEffect(() => {
    if (!isOcularBooking) return;

    if (!selectedLocation) {
      setFormattedAddress('');
      setFeePreview(null);
      setFeeError(null);
      setIsFeeLoading(false);
      setIsAddressLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setFeeError(null);
      setIsFeeLoading(true);
      setIsAddressLoading(true);

      try {
        const [preview, address] = await Promise.all([
          fetchOcularFeePreview(selectedLocation),
          reverseGeocodeLocation(selectedLocation).catch(() => ''),
        ]);

        if (cancelled) return;
        setFeePreview(preview);
        if (address) {
          setFormattedAddress(address);
        }
      } catch (error) {
        if (cancelled) return;
        setFeePreview(null);
        setFeeError(extractErrorMessage(error, 'Failed to compute ocular fee for this location.'));
      } finally {
        if (!cancelled) {
          setIsFeeLoading(false);
          setIsAddressLoading(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOcularBooking, selectedLocation]);

  const handleLocationChange = (location: MapPoint, addressHint?: string) => {
    setSelectedLocation(location);
    setFeeError(null);
    if (addressHint) {
      setFormattedAddress(addressHint);
    }
  };

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
        if (data.type === AppointmentType.OCULAR) {
          if (!selectedLocation) {
            toast.error('Please pin your site location on the map.');
            return;
          }
          if (!feePreview || isFeeLoading) {
            toast.error('Please wait while we compute your ocular fee.');
            return;
          }
          if (feeError) {
            toast.error(feeError);
            return;
          }
        }

        const addressStructured = (data.street || data.barangay || data.city)
          ? {
              street: data.street || '',
              barangay: data.barangay || '',
              city: data.city || '',
              province: data.province || '',
              zip: data.zip || '',
            }
          : undefined;

        const result = await requestMutation.mutateAsync({
          type: data.type,
          date: data.date,
          slotCode: data.slotCode,
          purpose: data.purpose,
          customerLocation: selectedLocation ?? undefined,
          formattedAddress: formattedAddress || undefined,
          addressStructured,
        });

        // If outside NCR, redirect to ocular fee payment page
        if (
          data.type === AppointmentType.OCULAR &&
          feePreview &&
          !feePreview.fee.isWithinNCR
        ) {
          toast.success('Appointment booked! Please pay the ocular fee to proceed.');
          navigate(`/appointments/${result._id}/pay-ocular-fee`);
          return;
        }

        // Redirect to site details page so customer can provide pre-visit info
        toast.success('Appointment booked! Please provide your site details.');
        navigate(`/appointments/${result._id}/site-details`);
        return;
      }

      navigate('/appointments');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Booking failed'));
    }
  };

  const isOutsideNcr = !!(feePreview && !feePreview.fee.isWithinNCR);

  const submitDisabled = useMemo(() => {
    if (isPending || !selectedSlot) return true;
    if (!isOcularBooking) return false;
    if (!selectedLocation) return true;
    if (isFeeLoading) return true;
    if (!!feeError) return true;
    if (!feePreview) return true;
    return false;
  }, [feeError, feePreview, isFeeLoading, isOcularBooking, isPending, selectedLocation, selectedSlot]);

  const inputClasses =
    'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

  // ── Step Wizard Logic ──
  const isOcular = selectedType === AppointmentType.OCULAR && !rescheduleId;
  const steps = rescheduleId
    ? [
        { key: 'date', label: 'Date & Time', icon: Calendar },
        { key: 'reason', label: 'Reason', icon: FileText },
      ]
    : isOcular
      ? [
          { key: 'type', label: 'Visit Type', icon: Clock },
          { key: 'date', label: 'Date & Time', icon: Calendar },
          { key: 'location', label: 'Location', icon: MapPin },
          { key: 'review', label: 'Review', icon: CheckCircle },
        ]
      : [
          { key: 'type', label: 'Visit Type', icon: Clock },
          { key: 'date', label: 'Date & Time', icon: Calendar },
          { key: 'address', label: 'Address', icon: MapPin },
          { key: 'review', label: 'Review', icon: CheckCircle },
        ];

  const [currentStep, setCurrentStep] = useState(0);

  const canProceed = useMemo(() => {
    const stepKey = steps[currentStep]?.key;
    if (stepKey === 'type') return !!selectedType;
    if (stepKey === 'date') return !!selectedDate && !!selectedSlot;
    if (stepKey === 'location') return !!selectedLocation && !isFeeLoading && !feeError && !!feePreview;
    if (stepKey === 'address') return true; // optional fields
    if (stepKey === 'reason') return true;
    if (stepKey === 'review') return true;
    return false;
  }, [currentStep, steps, selectedType, selectedDate, selectedSlot, selectedLocation, isFeeLoading, feeError, feePreview]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
  };
  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (currentStep > 0 ? handleBack() : navigate(-1))}
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
                  isActive && 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
                  isCompleted && 'bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100',
                  !isActive && !isCompleted && 'text-gray-400',
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={cn(
                  'h-px w-4 flex-shrink-0 mx-1',
                  idx < currentStep ? 'bg-emerald-300' : 'bg-gray-200',
                )} />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step: Visit Type */}
        {steps[currentStep]?.key === 'type' && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">How would you like to meet?</CardTitle>
              <CardDescription className="text-gray-500">
                Select your preferred consultation type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    value: AppointmentType.OFFICE,
                    label: 'Office Visit',
                    desc: 'Come to our shop in Malabon City for a face-to-face consultation.',
                  },
                  {
                    value: AppointmentType.OCULAR,
                    label: 'Ocular Visit',
                    desc: 'We visit your site to take measurements and assess the work area.',
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('type', opt.value)}
                    className={cn(
                      'rounded-xl border-2 p-5 text-left transition-all',
                      selectedType === opt.value
                        ? 'border-orange-400 bg-orange-50/50 ring-2 ring-orange-100'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <p className="font-semibold text-gray-900">{opt.label}</p>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Date & Time */}
        {steps[currentStep]?.key === 'date' && (
          <>
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Pick a Date</CardTitle>
                <CardDescription className="text-gray-500">
                  Appointments must be booked at least 3 days in advance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <CalendarUI
                    mode="single"
                    selected={selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined}
                    onSelect={(day) => {
                      if (day) setValue('date', format(day, 'yyyy-MM-dd'));
                    }}
                    disabled={(day) => day < addDays(new Date(), 3)}
                    fromMonth={new Date()}
                    className="rounded-xl border border-gray-100"
                  />
                </div>
                {selectedDate && (
                  <p className="text-center text-sm text-gray-500 mt-3">
                    Selected: <span className="font-medium text-gray-900">{format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy')}</span>
                  </p>
                )}
                {errors.date && <p className="text-sm text-red-500 mt-2">{errors.date.message}</p>}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Select a Time Slot</CardTitle>
                <CardDescription className="text-gray-500">
                  {selectedDate
                    ? `Showing slots for ${format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy')}`
                    : 'Select a date first'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
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
                              ? 'border-orange-400 bg-orange-50/50 text-orange-700 ring-2 ring-orange-100'
                              : available
                                ? 'border-gray-200 hover:border-gray-300'
                                : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400 opacity-50',
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

        {/* Step: Location (ocular only) */}
        {steps[currentStep]?.key === 'location' && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Pin Your Location</CardTitle>
              <CardDescription className="text-gray-500">
                Drop a pin on the map where the work will take place. Ocular visits within Metro Manila are free.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationPicker value={selectedLocation} onChange={handleLocationChange} />

              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Resolved Address
                </p>
                {isAddressLoading ? (
                  <p className="mt-1 text-sm text-gray-500">Resolving address...</p>
                ) : (
                  <p className="mt-1 text-sm text-gray-700">
                    {formattedAddress || 'Address will appear after you pin a location.'}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Ocular Fee Preview
                </p>

                {!selectedLocation && (
                  <p className="mt-2 text-sm text-gray-500">
                    Pin your location to calculate distance and fee.
                  </p>
                )}

                {selectedLocation && isFeeLoading && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating distance and fee...
                  </div>
                )}

                {selectedLocation && !isFeeLoading && feeError && (
                  <p className="mt-2 text-sm text-red-500">{feeError}</p>
                )}

                {feePreview && !isFeeLoading && !feeError && (
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <p>
                      Distance from shop: <strong>{feePreview.route.distanceKm.toFixed(2)} km</strong>
                    </p>
                    {feePreview.fee.isWithinNCR ? (
                      <p className="rounded-md bg-emerald-50 px-3 py-2 font-medium text-emerald-700">
                        Ocular Visit Fee: FREE (within Metro Manila)
                      </p>
                    ) : (
                      <div className="space-y-1.5 rounded-md bg-amber-50 px-3 py-2">
                        <p>Base Fee: <strong>{currency(feePreview.fee.baseFee)}</strong></p>
                        <p>Additional Distance: {feePreview.fee.additionalDistanceKm.toFixed(2)} km</p>
                        <p>Additional Fee: <strong>{currency(feePreview.fee.additionalFee)}</strong></p>
                        <p className="pt-1 font-semibold text-gray-900">
                          Estimated Ocular Fee: {currency(feePreview.fee.total)}
                        </p>
                      </div>
                    )}

                    {!feePreview.fee.isWithinNCR && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-800">
                          Ocular fee payment required via QRPH
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                          Your location is outside Metro Manila. After booking, you will be
                          redirected to pay the ocular fee of{' '}
                          <strong>{currency(feePreview.fee.total)}</strong> via QRPH.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Structured Address Fields */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Detailed Address</CardTitle>
              <CardDescription className="text-gray-500">
                Provide your complete address so our team can easily find your location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-[13px] font-medium text-gray-700">Street / House No.</Label>
                <Input id="street" {...register('street')} placeholder="e.g. 123 Rizal St." className={inputClasses} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="barangay" className="text-[13px] font-medium text-gray-700">Barangay</Label>
                  <Input id="barangay" {...register('barangay')} placeholder="e.g. Brgy. San Jose" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-[13px] font-medium text-gray-700">City / Municipality</Label>
                  <Input id="city" {...register('city')} placeholder="e.g. Malabon City" className={inputClasses} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="province" className="text-[13px] font-medium text-gray-700">Province</Label>
                  <Input id="province" {...register('province')} placeholder="e.g. Metro Manila" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip" className="text-[13px] font-medium text-gray-700">Zip Code</Label>
                  <Input id="zip" {...register('zip')} placeholder="e.g. 1470" className={inputClasses} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Address (office visits) */}
        {steps[currentStep]?.key === 'address' && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Your Address</CardTitle>
              <CardDescription className="text-gray-500">
                Provide your address so we can plan site visits or deliveries if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="street-office" className="text-[13px] font-medium text-gray-700">Street / House No.</Label>
                <Input id="street-office" {...register('street')} placeholder="e.g. 123 Rizal St." className={inputClasses} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="barangay-office" className="text-[13px] font-medium text-gray-700">Barangay</Label>
                  <Input id="barangay-office" {...register('barangay')} placeholder="e.g. Brgy. San Jose" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city-office" className="text-[13px] font-medium text-gray-700">City / Municipality</Label>
                  <Input id="city-office" {...register('city')} placeholder="e.g. Malabon City" className={inputClasses} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="province-office" className="text-[13px] font-medium text-gray-700">Province</Label>
                  <Input id="province-office" {...register('province')} placeholder="e.g. Metro Manila" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip-office" className="text-[13px] font-medium text-gray-700">Zip Code</Label>
                  <Input id="zip-office" {...register('zip')} placeholder="e.g. 1470" className={inputClasses} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Reason (reschedule only) */}
        {steps[currentStep]?.key === 'reason' && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Reason for Reschedule</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                {...register('purpose')}
                placeholder="Why are you rescheduling?"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Step: Review & Confirm */}
        {steps[currentStep]?.key === 'review' && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Review Your Booking</CardTitle>
              <CardDescription className="text-gray-500">
                Confirm the details below before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Visit Type</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {selectedType === AppointmentType.OFFICE ? 'Office Visit' : 'Ocular Visit'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {selectedDate ? format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy') : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Time Slot</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {selectedSlot ? formatSlotTime(selectedSlot) : '—'}
                  </p>
                </div>
                {isOcular && formattedAddress && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Location</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 leading-snug">{formattedAddress}</p>
                  </div>
                )}
                {isOcular && feePreview && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 sm:col-span-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ocular Fee</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {feePreview.fee.isWithinNCR ? 'FREE' : currency(feePreview.fee.total)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">Purpose (Optional)</Label>
                <textarea
                  {...register('purpose')}
                  placeholder="Briefly describe what you need (e.g., kitchen countertop fabrication)..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              className="flex-1 h-12 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              disabled={!canProceed}
              onClick={handleNext}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-1 h-12 rounded-xl bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
              size="lg"
              disabled={submitDisabled}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {rescheduleId
                ? 'Submit Reschedule Request'
                : isOutsideNcr
                  ? 'Book & Pay Ocular Fee'
                  : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
