import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
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

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAvailableSlots, useAgentCreateAppointment } from '@/hooks/useAppointments';
import { useCustomerSearch, type CustomerSearchResult } from '@/hooks/useUsers';
import { AppointmentType, Role, SLOT_CODES, APPOINTMENT_TYPE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

/* ── Helpers ── */

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}



/* ── Schema ── */

const bookingSchema = z.object({
  type: z.literal(AppointmentType.OFFICE),
  date: z.string().min(1, 'Please select a date'),
  slotCode: z.string().min(1, 'Please select a time slot'),
  purpose: z.string().max(500).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

/* ── Component ── */

export function AgentBookAppointmentPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAppointmentAgent = !!user?.roles?.includes(Role.APPOINTMENT_AGENT);
  const canCreateOfficeForCustomer = isAppointmentAgent;

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
  const defaultDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      type: AppointmentType.OFFICE,
      date: defaultDate,
    },
  });

  const selectedType = watch('type');
  const selectedDate = watch('date');
  const selectedSlot = watch('slotCode');
  const minDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(selectedDate, selectedType);

  const createMutation = useAgentCreateAppointment();

  useEffect(() => {
    if (canCreateOfficeForCustomer) return;
    toast.error('Ocular visits are scheduled while creating a project.');
    navigate('/projects/create', { replace: true });
  }, [canCreateOfficeForCustomer, navigate]);

  const onSubmit = async (data: BookingForm) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer first.');
      return;
    }

    try {
      if (!canCreateOfficeForCustomer) {
        toast.error('Only appointment agents can create the first office consultation for a customer.');
        return;
      }

      await createMutation.mutateAsync({
        customerId: selectedCustomer._id,
        type: AppointmentType.OFFICE,
        date: data.date,
        slotCode: data.slotCode,
        purpose: data.purpose,
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
    return false;
  }, [
    createMutation.isPending,
    selectedCustomer,
    selectedSlot,
  ]);

  const inputClasses =
    'h-11 border-[#d2d2d7] bg-[#f5f5f7]/50 text-[#1d1d1f] focus:border-[#c8c8cd] focus:ring-[#6e6e73] dark:border-[#2f4563] dark:bg-[#162235] dark:text-slate-100 dark:focus:border-[#4f7097] dark:focus:ring-[#4f7097]/20';

  const sectionCardClassName =
    'rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.26)]';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-slate-100">
            Create Appointment
          </h1>
          <p className="text-sm text-[#6e6e73] dark:text-slate-400">
            Book an office consultation on behalf of a customer
          </p>
        </div>
      </div>

      {/* Step 1: Customer Search */}
      <Card className={sectionCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Select Customer</CardTitle>
          <CardDescription className="text-[#6e6e73] dark:text-slate-400">
            Search by name, email, or phone number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-700/35 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {selectedCustomer.firstName[0]}
                  {selectedCustomer.lastName[0]}
                </div>
                <div>
                  <p className="font-medium text-[#1d1d1f] dark:text-slate-100">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6e6e73] dark:text-slate-400">
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
                className="rounded-lg text-[#86868b] hover:text-[#6e6e73] dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b] dark:text-slate-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type a name, email, or phone..."
                  className="h-11 border-[#d2d2d7] bg-[#f5f5f7]/50 pl-10 focus:border-[#c8c8cd] focus:ring-[#6e6e73] dark:border-[#2f4563] dark:bg-[#162235] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#4f7097] dark:focus:ring-[#4f7097]/20"
                  autoFocus
                />
              </div>

              {isSearching && debouncedSearch.length >= 2 && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#86868b] dark:text-slate-500" />
                </div>
              )}

              {!isSearching && customers && customers.length === 0 && debouncedSearch.length >= 2 && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/50 py-8 text-center dark:border-white/8 dark:bg-white/[0.03]">
                  <User className="mx-auto h-8 w-8 text-[#c8c8cd] dark:text-slate-600" />
                  <p className="mt-2 text-sm text-[#6e6e73] dark:text-slate-400">
                    No customers found for &ldquo;{debouncedSearch}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-[#86868b] dark:text-slate-500">
                    Make sure the customer has created an account first
                  </p>
                </div>
              )}

              {!isSearching && customers && customers.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-[#c8c8cd]/50 divide-y divide-[#e8e8ed] dark:border-white/8 dark:divide-white/[0.06]">
                  {customers.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setSearchTerm('');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f5f5f7] dark:hover:bg-white/[0.04]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f0f5] text-xs font-medium text-[#6e6e73] dark:bg-[#1b283a] dark:text-slate-300">
                        {c.firstName[0]}
                        {c.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1d1d1f] dark:text-slate-100">
                          {c.firstName} {c.lastName}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-[#6e6e73] dark:text-slate-400">
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
                <p className="py-4 text-center text-sm text-[#86868b] dark:text-slate-500">
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
          <Card className={sectionCardClassName}>
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Visit Type & Date</CardTitle>
              <CardDescription className="text-[#6e6e73] dark:text-slate-400">
                Choose the appointment type and schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">Visit Type</Label>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                  {[
                    {
                      value: AppointmentType.OFFICE,
                      label: APPOINTMENT_TYPE_LABELS[AppointmentType.OFFICE],
                      desc: 'Customer visits the shop',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('type', AppointmentType.OFFICE)}
                      className={cn(
                        'rounded-xl border-2 p-4 text-left transition-all',
                        selectedType === opt.value
                          ? 'border-[#86868b] bg-[#f5f5f7]/50 ring-2 ring-[#d2d2d7] dark:border-[#5b7699] dark:bg-[#162235] dark:ring-[#4f7097]/30'
                          : 'border-[#d2d2d7] hover:border-[#c8c8cd] dark:border-[#2f4563] dark:bg-white/[0.02] dark:hover:border-[#456182]',
                      )}
                    >
                      <p className="font-medium text-[#1d1d1f] dark:text-slate-100">{opt.label}</p>
                      <p className="mt-0.5 text-xs text-[#6e6e73] dark:text-slate-400">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Ocular visits are scheduled from Create Project after the consultation is completed.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">
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

            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card className={sectionCardClassName}>
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Available Time Slots</CardTitle>
              <CardDescription className="text-[#6e6e73] dark:text-slate-400">
                {selectedDate
                  ? `Showing slots for ${format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy')}`
                  : 'Select a date first'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#6e6e73] dark:text-slate-500" />
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
                            ? 'border-[#86868b] bg-[#f5f5f7]/50 text-[#1d1d1f] ring-2 ring-[#d2d2d7] dark:border-[#5b7699] dark:bg-[#162235] dark:text-slate-100 dark:ring-[#4f7097]/30'
                            : available
                              ? 'border-[#d2d2d7] hover:border-[#c8c8cd] dark:border-[#2f4563] dark:bg-white/[0.02] dark:text-slate-200 dark:hover:border-[#456182]'
                              : 'cursor-not-allowed border-[#c8c8cd]/50 bg-[#f5f5f7] text-[#86868b] opacity-50 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-600 dark:opacity-100',
                        )}
                      >
                        <p className="text-sm font-medium">{formatSlotTime(slot)}</p>
                        {!available && (
                          <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">
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
          <Card className={sectionCardClassName}>
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Purpose (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                {...register('purpose')}
                placeholder="Briefly describe what the customer needs (e.g., kitchen countertop fabrication)..."
                className="w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]/50 px-4 py-3 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#c8c8cd] focus:outline-none focus:ring-2 focus:ring-[#6e6e73] dark:border-[#2f4563] dark:bg-[#162235] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#4f7097] dark:focus:ring-[#4f7097]/20"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="h-12 w-full rounded-xl [background-image:none] bg-[#1d1d1f] text-white shadow-sm hover:bg-[#2d2d2f] disabled:opacity-100 dark:border dark:border-white/12 dark:[background-image:none] dark:bg-[linear-gradient(180deg,#273649_0%,#18222f_100%)] dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.28)] dark:hover:bg-[linear-gradient(180deg,#314359_0%,#1d2938_100%)] dark:disabled:border-white/10 dark:disabled:bg-[#1b2432] dark:disabled:text-slate-500 dark:disabled:shadow-none"
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
