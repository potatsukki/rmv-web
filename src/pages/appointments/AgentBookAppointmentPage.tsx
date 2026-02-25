import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Search,
  User,
  Mail,
  Phone,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { LocationPicker } from '@/components/maps/LocationPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAvailableSlots, useAgentCreateAppointment } from '@/hooks/useAppointments';
import { useCustomerSearch, type CustomerSearchResult } from '@/hooks/useUsers';
import { AppointmentType, SLOT_CODES } from '@/lib/constants';
import {
  fetchOcularFeePreview,
  reverseGeocodeLocation,
  type MapPoint,
  type OcularFeePreview,
} from '@/lib/maps';
import { cn } from '@/lib/utils';

/* ── Helpers ── */

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

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

/* ── Schema ── */

const bookingSchema = z.object({
  type: z.enum(['office', 'ocular']),
  date: z.string().min(1, 'Please select a date'),
  slotCode: z.string().min(1, 'Please select a time slot'),
  purpose: z.string().max(500).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

/* ── Component ── */

export function AgentBookAppointmentPage() {
  const navigate = useNavigate();

  /* ── Step 1: Customer Search ── */
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: customers, isLoading: isSearching } = useCustomerSearch(debouncedSearch);

  /* ── Step 2: Booking Form ── */
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

  const [selectedLocation, setSelectedLocation] = useState<MapPoint | null>(null);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [feePreview, setFeePreview] = useState<OcularFeePreview | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  const isOcularBooking = selectedType === AppointmentType.OCULAR;

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(selectedDate, selectedType);

  const createMutation = useAgentCreateAppointment();

  // Ocular fee preview
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
    if (!isOcularBooking || !selectedLocation) {
      setFormattedAddress('');
      setFeePreview(null);
      setFeeError(null);
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
        if (address) setFormattedAddress(address);
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
    if (addressHint) setFormattedAddress(addressHint);
  };

  const onSubmit = async (data: BookingForm) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer first.');
      return;
    }

    if (data.type === AppointmentType.OCULAR) {
      if (!selectedLocation) {
        toast.error("Please pin the customer's site location on the map.");
        return;
      }
      if (!feePreview || isFeeLoading) {
        toast.error('Please wait while we compute the ocular fee.');
        return;
      }
      if (feeError) {
        toast.error(feeError);
        return;
      }
    }

    try {
      await createMutation.mutateAsync({
        customerId: selectedCustomer._id,
        type: data.type,
        date: data.date,
        slotCode: data.slotCode,
        purpose: data.purpose,
        customerLocation: selectedLocation ?? undefined,
        formattedAddress: formattedAddress || undefined,
      });

      toast.success(
        `Appointment created for ${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
      );
      navigate('/appointments');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to create appointment'));
    }
  };

  const submitDisabled = useMemo(() => {
    if (createMutation.isPending || !selectedSlot || !selectedCustomer) return true;
    if (!isOcularBooking) return false;
    if (!selectedLocation) return true;
    if (isFeeLoading) return true;
    if (!!feeError) return true;
    if (!feePreview) return true;
    return false;
  }, [
    createMutation.isPending,
    feeError,
    feePreview,
    isFeeLoading,
    isOcularBooking,
    selectedCustomer,
    selectedLocation,
    selectedSlot,
  ]);

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
            Create Appointment
          </h1>
          <p className="text-gray-500 text-sm">
            Book an appointment on behalf of a customer
          </p>
        </div>
      </div>

      {/* Step 1: Customer Search */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Select Customer</CardTitle>
          <CardDescription className="text-gray-500">
            Search by name, email, or phone number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                  {selectedCustomer.firstName[0]}
                  {selectedCustomer.lastName[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedCustomer.email}
                    </span>
                    {selectedCustomer.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedCustomer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSearchTerm('');
                }}
                className="rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type a name, email, or phone..."
                  className="h-11 pl-10 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                  autoFocus
                />
              </div>

              {isSearching && debouncedSearch.length >= 2 && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}

              {!isSearching && customers && customers.length === 0 && debouncedSearch.length >= 2 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 py-8 text-center">
                  <User className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No customers found for &ldquo;{debouncedSearch}&rdquo;
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Make sure the customer has created an account first
                  </p>
                </div>
              )}

              {!isSearching && customers && customers.length > 0 && (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                  {customers.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setSearchTerm('');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-medium text-xs">
                        {c.firstName[0]}
                        {c.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {c.email}
                          </span>
                          {c.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              {c.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {debouncedSearch.length < 2 && !customers && (
                <p className="text-center text-sm text-gray-400 py-4">
                  Type at least 2 characters to search
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Booking form (shown after selecting customer) */}
      {selectedCustomer && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Visit Type & Date */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Visit Type & Date</CardTitle>
              <CardDescription className="text-gray-500">
                Choose the appointment type and schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-gray-700">Visit Type</Label>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                  {[
                    {
                      value: AppointmentType.OFFICE,
                      label: 'Office Visit',
                      desc: 'Customer visits the shop',
                    },
                    {
                      value: AppointmentType.OCULAR,
                      label: 'Ocular Visit',
                      desc: 'Staff visits customer site',
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
                      <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-[13px] font-medium text-gray-700">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={minDate}
                  {...register('date')}
                  className={inputClasses}
                />
                {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
              </div>

              {/* Ocular location picker */}
              {isOcularBooking && (
                <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  <div className="space-y-1">
                    <Label className="text-[13px] font-medium text-gray-700">Customer&apos;s Site Location</Label>
                    <p className="text-sm text-gray-500">
                      Ocular visits are free within Metro Manila. Locations outside NCR have a
                      transportation fee.
                    </p>
                  </div>

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
                        Pin the location to calculate distance and fee.
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
                          Distance from shop:{' '}
                          <strong>{feePreview.route.distanceKm.toFixed(2)} km</strong>
                        </p>

                        {feePreview.fee.isWithinNCR ? (
                          <p className="rounded-md bg-emerald-50 px-3 py-2 font-medium text-emerald-700">
                            Ocular Visit Fee: FREE (within Metro Manila)
                          </p>
                        ) : (
                          <div className="space-y-1.5 rounded-md bg-amber-50 px-3 py-2">
                            <p>
                              Base Fee: <strong>{currency(feePreview.fee.baseFee)}</strong>
                            </p>
                            <p>
                              Additional Distance: {feePreview.fee.additionalDistanceKm.toFixed(2)}{' '}
                              km
                            </p>
                            <p>
                              Additional Fee:{' '}
                              <strong>{currency(feePreview.fee.additionalFee)}</strong>
                            </p>
                            <p className="pt-1 font-semibold text-gray-900">
                              Estimated Ocular Fee: {currency(feePreview.fee.total)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Available Time Slots</CardTitle>
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
              {errors.slotCode && (
                <p className="mt-2 text-sm text-red-500">{errors.slotCode.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Purpose */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Purpose (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                {...register('purpose')}
                placeholder="Briefly describe what the customer needs (e.g., kitchen countertop fabrication)..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gray-900 text-white shadow-sm hover:bg-gray-800"
            size="lg"
            disabled={submitDisabled}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Create Appointment for {selectedCustomer.firstName}
          </Button>
        </form>
      )}
    </div>
  );
}
