import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAvailableSlots, useAgentCreateAppointment, useAgentCreateOcular } from '@/hooks/useAppointments';
import { useCustomerSearch, type CustomerSearchResult } from '@/hooks/useUsers';
import { AppointmentType, SLOT_CODES } from '@/lib/constants';
import type { MapPoint } from '@/lib/maps';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';

/* ── Helpers ── */

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
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
  const [searchParams] = useSearchParams();
  const ocularForCustomerId = searchParams.get('ocularFor');
  const recommendedDate = searchParams.get('recommendedDate');
  const recommendedSlot = searchParams.get('recommendedSlot');
  const isOcularMode = !!ocularForCustomerId;

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
  const defaultDate = recommendedDate && recommendedDate >= format(addDays(new Date(), 3), 'yyyy-MM-dd')
    ? recommendedDate
    : format(addDays(new Date(), 3), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      type: isOcularMode ? 'ocular' : 'office',
      date: defaultDate,
      ...(recommendedSlot && { slotCode: recommendedSlot }),
    },
  });

  const selectedType = watch('type');
  const selectedDate = watch('date');
  const selectedSlot = watch('slotCode');
  const minDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');

  const [selectedLocation, setSelectedLocation] = useState<MapPoint | null>(null);
  const [formattedAddress, setFormattedAddress] = useState('');

  const isOcularBooking = selectedType === AppointmentType.OCULAR;

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(selectedDate, selectedType);

  const createMutation = useAgentCreateAppointment();
  const createOcularMutation = useAgentCreateOcular();

  // Auto-fetch customer when ocularFor param is present
  useEffect(() => {
    if (ocularForCustomerId && !selectedCustomer) {
      api.get<ApiResponse<CustomerSearchResult>>(`/users/customers/${ocularForCustomerId}`)
        .then(res => setSelectedCustomer(res.data.data))
        .catch(() => toast.error('Failed to load customer'));
    }
  }, [ocularForCustomerId]);

  // Reset location state when switching away from ocular
  useEffect(() => {
    if (!isOcularBooking) {
      setSelectedLocation(null);
      setFormattedAddress('');
    }
  }, [isOcularBooking]);

  const onSubmit = async (data: BookingForm) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer first.');
      return;
    }

    try {
      if (data.type === AppointmentType.OCULAR) {
        // New flow: create ocular without location, customer provides later
        await createOcularMutation.mutateAsync({
          customerId: selectedCustomer._id,
          date: data.date,
          slotCode: data.slotCode,
        });
        toast.success(
          `Ocular scheduled for ${selectedCustomer.firstName} ${selectedCustomer.lastName}. Customer will provide their location.`,
        );
      } else {
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
      }

      navigate('/appointments');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to create appointment'));
    }
  };

  const submitDisabled = useMemo(() => {
    if ((createMutation.isPending || createOcularMutation.isPending) || !selectedSlot || !selectedCustomer) return true;
    return false;
  }, [
    createMutation.isPending,
    createOcularMutation.isPending,
    selectedCustomer,
    selectedSlot,
  ]);

  const inputClasses =
    'h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            {isOcularMode ? 'Schedule Ocular Visit' : 'Create Appointment'}
          </h1>
          <p className="text-[#6e6e73] text-sm">
            {isOcularMode
              ? 'Customer will provide location after booking'
              : 'Book an appointment on behalf of a customer'}
          </p>
        </div>
      </div>

      {/* Step 1: Customer Search */}
      <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#1d1d1f]">Select Customer</CardTitle>
          <CardDescription className="text-[#6e6e73]">
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
                  <p className="font-medium text-[#1d1d1f]">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6e6e73]">
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
                className="rounded-lg text-[#86868b] hover:text-[#6e6e73]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868b]" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type a name, email, or phone..."
                  className="h-11 pl-10 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]"
                  autoFocus
                />
              </div>

              {isSearching && debouncedSearch.length >= 2 && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#86868b]" />
                </div>
              )}

              {!isSearching && customers && customers.length === 0 && debouncedSearch.length >= 2 && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/50 py-8 text-center">
                  <User className="mx-auto h-8 w-8 text-[#c8c8cd]" />
                  <p className="mt-2 text-sm text-[#6e6e73]">
                    No customers found for &ldquo;{debouncedSearch}&rdquo;
                  </p>
                  <p className="text-xs text-[#86868b] mt-1">
                    Make sure the customer has created an account first
                  </p>
                </div>
              )}

              {!isSearching && customers && customers.length > 0 && (
                <div className="divide-y divide-[#e8e8ed] rounded-xl border border-[#c8c8cd]/50 overflow-hidden">
                  {customers.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setSearchTerm('');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f5f5f7]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f0f5] text-[#6e6e73] font-medium text-xs">
                        {c.firstName[0]}
                        {c.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1d1d1f] truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-[#6e6e73]">
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
                <p className="text-center text-sm text-[#86868b] py-4">
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
          {/* Pre-filled recommendation banner */}
          {(recommendedDate || recommendedSlot) && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Pre-filled from consultation recommendation</p>
                <p className="mt-0.5 text-blue-600">
                  {recommendedDate && `Date: ${recommendedDate}`}
                  {recommendedDate && recommendedSlot && ' · '}
                  {recommendedSlot && `Time: ${formatSlotTime(recommendedSlot)}`}
                </p>
              </div>
            </div>
          )}
          {/* Visit Type & Date */}
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Visit Type & Date</CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Choose the appointment type and schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#3a3a3e]">Visit Type</Label>
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
                          ? 'border-[#86868b] bg-[#f5f5f7]/50 ring-2 ring-[#d2d2d7]'
                          : 'border-[#d2d2d7] hover:border-[#c8c8cd]',
                      )}
                    >
                      <p className="font-medium text-[#1d1d1f]">{opt.label}</p>
                      <p className="mt-0.5 text-xs text-[#6e6e73]">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-[13px] font-medium text-[#3a3a3e]">
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

              {/* Ocular info banner */}
              {isOcularBooking && (
                <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-3.5">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">No location needed yet</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      After scheduling, the customer will be notified to provide their site location. You will finalize the visit once they submit it.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Available Time Slots</CardTitle>
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
              {errors.slotCode && (
                <p className="mt-2 text-sm text-red-500">{errors.slotCode.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Purpose */}
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Purpose (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                {...register('purpose')}
                placeholder="Briefly describe what the customer needs (e.g., kitchen countertop fabrication)..."
                className="w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]/50 px-4 py-3 text-sm placeholder:text-[#86868b] focus:border-[#c8c8cd] focus:outline-none focus:ring-2 focus:ring-[#6e6e73]"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#1d1d1f] text-white shadow-sm hover:bg-[#2d2d2f]"
            size="lg"
            disabled={submitDisabled}
          >
            {(createMutation.isPending || createOcularMutation.isPending) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {isOcularBooking
              ? `Schedule Ocular for ${selectedCustomer.firstName}`
              : `Create Appointment for ${selectedCustomer.firstName}`}
          </Button>
        </form>
      )}
    </div>
  );
}
