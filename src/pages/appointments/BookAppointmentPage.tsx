import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, getDay, startOfDay, startOfMonth } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle, CheckCircle2, Loader2, Calendar, FileText, Image as ImageIcon, Info, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceTypePicker } from '@/components/shared/ServiceTypePicker';
import { useAvailableSlots, useRequestAppointment, useRequestReschedule } from '@/hooks/useAppointments';
import { useAppointments } from '@/hooks/useAppointments';
import { useHolidays } from '@/hooks/useConfig';
import { SLOT_CODES, ServiceType, APPOINTMENT_TYPE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  SERVICE_CATALOG,
  findServiceProjectReference,
  getServiceProjectReferences,
  type ServiceProjectReference,
} from '@/lib/service-catalog';

interface SelectedDesign {
  id: string;
  name: string;
  imageUrl: string;
  serviceId: string;
  serviceLabel: string;
  serviceType: ServiceType;
  description?: string;
  estimatedPrice?: string;
}

function toSelectedDesign(project: ServiceProjectReference): SelectedDesign {
  return {
    id: project.id,
    name: project.title,
    imageUrl: project.image,
    serviceId: project.serviceId,
    serviceLabel: project.serviceLabel,
    serviceType: project.serviceType,
    description: project.description,
    estimatedPrice: project.estimatedPrice,
  };
}

function getSafeDesignImage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.startsWith('/') && !value.startsWith('//') ? value : undefined;
}

function getInitialSelectedDesign(searchParams: URLSearchParams): SelectedDesign | null {
  const serviceType = searchParams.get('serviceType') || undefined;
  const serviceId = searchParams.get('serviceId') || undefined;
  const designId = searchParams.get('designId') || undefined;
  const designName = searchParams.get('design') || undefined;
  const designImage = getSafeDesignImage(searchParams.get('designImage') || undefined);
  if (!designId && !designName) return null;

  const catalogProject = findServiceProjectReference({
    serviceId,
    serviceType,
    designId,
    designName,
    designImage,
  });
  if (catalogProject) return toSelectedDesign(catalogProject);
  return null;
}

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


const bookingSchema = z.object({
  type: z.literal('office'),
  date: z.string().min(1, 'Please select a date'),
  slotCode: z.string().min(1, 'Please select a time slot'),
  purpose: z.string().max(500).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export function BookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');
  const selectedServiceTypeParam = searchParams.get('serviceType');
  const selectedServiceIdParam = searchParams.get('serviceId');
  const initialSelectedDesign = useMemo(() => getInitialSelectedDesign(searchParams), [searchParams]);
  const initialBookingDate = useMemo(() => getNextValidBookingDate(), []);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      type: 'office',
      date: format(initialBookingDate, 'yyyy-MM-dd'),
    },
  });

  const selectedDate = watch('date');
  const selectedSlot = watch('slotCode');

  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialBookingDate));

  // Load restrictions for the year the customer is currently viewing.
  const visibleYear = String(visibleMonth.getFullYear());
  const { data: holidays } = useHolidays(visibleYear);

  const holidayDates = useMemo(() => {
    if (!holidays) return new Set<string>();
    return new Set(holidays.map((h) => h.date.slice(0, 10)));
  }, [holidays]);

  /** True when a calendar day should be disabled (too soon, weekend, or holiday). */
  const isDateDisabled = (day: Date): boolean => {
    const dow = getDay(day);
    if (dow === 0 || dow === 6) return true;
    if (startOfDay(day) < startOfDay(addDays(new Date(), 3))) return true;
    const dateStr = format(day, 'yyyy-MM-dd');
    if (holidayDates.has(dateStr)) return true;
    return false;
  };

  // Service types + notes state
  const [serviceTypes, setServiceTypes] = useState<string[]>(
    initialSelectedDesign ? [initialSelectedDesign.serviceType] : [],
  );
  const [serviceTypeCustom, setServiceTypeCustom] = useState(
    initialSelectedDesign?.serviceType === ServiceType.CUSTOM
      ? initialSelectedDesign.serviceLabel
      : '',
  );
  const [notes, setNotes] = useState('');
  const [selectedDesign, setSelectedDesign] = useState<SelectedDesign | null>(initialSelectedDesign);
  const initialCatalogService = SERVICE_CATALOG.find((service) => (
    service.id === selectedServiceIdParam || service.serviceType === selectedServiceTypeParam
  ));
  const [bookingMode, setBookingMode] = useState<'sample' | 'custom' | null>(() => (
    initialSelectedDesign
      ? 'sample'
      : searchParams.get('mode') === 'custom' || (selectedServiceTypeParam && !initialCatalogService)
        ? 'custom'
        : null
  ));
  const [activeServiceId, setActiveServiceId] = useState(
    initialSelectedDesign?.serviceId || initialCatalogService?.id || SERVICE_CATALOG[0]?.id || '',
  );
  const activeCatalogService = SERVICE_CATALOG.find((service) => service.id === activeServiceId);
  const activeSampleDesigns = activeCatalogService
    ? getServiceProjectReferences(activeCatalogService)
    : [];

  useEffect(() => {
    if (!selectedServiceTypeParam) return;
    if (serviceTypes.length > 0) return;
    const validType = Object.values(ServiceType).includes(selectedServiceTypeParam as ServiceType);
    if (!validType) return;

    setServiceTypes([selectedServiceTypeParam]);
    if (selectedServiceTypeParam === ServiceType.CUSTOM) {
      setServiceTypeCustom('Custom fabrication');
    }
  }, [selectedServiceTypeParam, serviceTypes]);

  const selectSampleDesign = (project: ServiceProjectReference) => {
    const design = toSelectedDesign(project);
    setBookingMode('sample');
    setSelectedDesign(design);
    setServiceTypes([design.serviceType]);
    setServiceTypeCustom('');

    const next = new URLSearchParams(searchParams);
    next.delete('mode');
    next.set('serviceType', design.serviceType);
    next.set('serviceId', design.serviceId);
    next.set('designId', design.id);
    next.set('design', design.name);
    next.set('designImage', design.imageUrl);
    setSearchParams(next, { replace: true });
  };

  const selectCustomMade = () => {
    setBookingMode('custom');
    setSelectedDesign(null);
    const next = new URLSearchParams(searchParams);
    next.set('mode', 'custom');
    next.delete('designId');
    next.delete('design');
    next.delete('designImage');
    setSearchParams(next, { replace: true });
  };

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    selectedDate,
    'office',
  );

  const activeAppointmentsQuery = useAppointments();

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
        { key: 'service', label: 'Design & Details', icon: FileText },
        { key: 'date', label: 'Date & Time', icon: Calendar },
        { key: 'review', label: 'Review', icon: CheckCircle },
      ];

  const [currentStep, setCurrentStep] = useState(0);
  const activeAppointment = useMemo(() => {
    if (rescheduleId) return undefined;

    return activeAppointmentsQuery.data?.items.find((appointment) => {
      if (appointment._id === rescheduleId) return false;

      return [
        'requested',
        'confirmed',
        'preparing',
        'on_the_way',
        'reschedule_requested',
      ].includes(appointment.status);
    });
  }, [activeAppointmentsQuery.data?.items, rescheduleId]);

  const canProceed = useMemo(() => {
    const stepKey = steps[currentStep]?.key;
    if (stepKey === 'service') {
      if (bookingMode === 'sample') return Boolean(selectedDesign);
      if (bookingMode === 'custom') {
        const hasCustomLabel = !serviceTypes.includes(ServiceType.CUSTOM) || Boolean(serviceTypeCustom.trim());
        return serviceTypes.length > 0 && hasCustomLabel && Boolean(notes.trim());
      }
      return false;
    }
    if (stepKey === 'date') return !!selectedDate && !!selectedSlot;
    if (stepKey === 'reason') return true;
    if (stepKey === 'review') return true;
    return false;
  }, [
    currentStep,
    steps,
    selectedDate,
    selectedSlot,
    bookingMode,
    selectedDesign,
    serviceTypes,
    serviceTypeCustom,
    notes,
  ]);

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
          serviceTypes: serviceTypes as import('@/lib/constants').ServiceType[],
          serviceTypeCustom: serviceTypeCustom || undefined,
          selectedDesignTemplateId: selectedDesign?.id,
          selectedDesignTemplateName: selectedDesign?.name,
          selectedDesignTemplateImageUrl: selectedDesign?.imageUrl,
        });

        toast.success('Appointment booked successfully!');
        navigate(
          bookingMode === 'custom'
            ? `/appointments/${result._id}/site-details`
            : `/appointments/${result._id}`,
        );
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

  const backButtonClassName =
    'rounded-xl border-[#d2d2d7] text-[#6e6e73] hover:text-[#1d1d1f] dark:border-white/[0.14] dark:bg-transparent dark:text-slate-400 dark:hover:border-white/[0.24] dark:hover:bg-white/[0.05] dark:hover:text-slate-200';

  const nextButtonClassName =
    'rounded-xl [background-image:none] bg-[#1d1d1f] text-white hover:bg-[#3a3a3e] disabled:opacity-50 dark:border dark:border-white/12 dark:[background-image:none] dark:bg-white dark:text-[#0f1923] dark:shadow-[0_8px_24px_rgba(0,0,0,0.38)] dark:hover:bg-slate-100 dark:hover:border-white/20 dark:disabled:border-white/10 dark:disabled:bg-white/[0.08] dark:disabled:text-slate-500 disabled:opacity-100';

  const submitButtonClassName = rescheduleId
    ? nextButtonClassName
    : 'rounded-xl border border-[#d7b267] bg-[linear-gradient(135deg,#f5dfab_0%,#ddb66a_42%,#b88233_100%)] text-[#24180b] shadow-[0_20px_40px_rgba(165,118,44,0.28),inset_0_1px_0_rgba(255,248,225,0.7)] hover:bg-[linear-gradient(135deg,#f8e6bb_0%,#e4c078_42%,#c38c3d_100%)] hover:text-[#1f1509] disabled:opacity-50 dark:border-[#d8bb72] dark:bg-[linear-gradient(180deg,rgba(255,247,225,0.98)_0%,rgba(240,210,132,0.96)_52%,rgba(214,166,58,0.94)_100%)] dark:text-[#1f1404] dark:shadow-[0_0_0_1px_rgba(216,187,114,0.34),0_18px_38px_rgba(196,145,45,0.32),inset_0_1px_0_rgba(255,255,255,0.62)] dark:hover:bg-[linear-gradient(180deg,rgba(255,250,234,1)_0%,rgba(244,216,141,0.98)_52%,rgba(221,174,64,0.96)_100%)] dark:hover:text-[#160d02] disabled:opacity-50';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (currentStep > 0 ? handleBack() : navigate(-1))}
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-slate-100">
            {rescheduleId ? 'Reschedule Appointment' : 'Book Appointment'}
          </h1>
          <p className="text-[#6e6e73] text-sm dark:text-slate-400">
            {rescheduleId
              ? 'Choose a new date and time'
              : `Book your ${(APPOINTMENT_TYPE_LABELS.office || 'Consultation').toLowerCase()} first`}
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
                  isActive && 'bg-[#f0f0f5] text-[#1d1d1f] ring-1 ring-[#d2d2d7] dark:bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(228,233,239,0.96)_100%)] dark:text-slate-950 dark:ring-white/25',
                  isCompleted && 'bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100 dark:bg-emerald-500/12 dark:text-emerald-200 dark:hover:bg-emerald-500/18',
                  !isActive && !isCompleted && 'text-[#86868b] dark:text-slate-400',
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={cn(
                  'h-px w-4 flex-shrink-0 mx-1',
                  idx < currentStep ? 'bg-emerald-300 dark:bg-emerald-400/60' : 'bg-[#d2d2d7] dark:bg-white/15',
                )} />
              )}
            </div>
          );
        })}
      </div>

      {!rescheduleId && activeAppointment && (
        <Card className="rounded-2xl border border-[#f3c7cf] bg-[linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(255,244,246,0.95)_55%,rgba(255,248,240,0.98)_100%)] shadow-sm dark:border-red-900/40 dark:bg-[linear-gradient(135deg,rgba(40,20,25,0.9)_0%,rgba(25,12,15,0.85)_100%)]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-white shadow-sm dark:bg-white/10 dark:text-red-200">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">You already have an active appointment</p>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#b42318] ring-1 ring-[#f3c7cf] dark:bg-red-500/20 dark:text-red-200 dark:ring-red-500/30">
                    Booking blocked
                  </span>
                </div>
                <p className="text-sm leading-6 text-[#6e6e73] dark:text-slate-300">
                  View or manage your current appointment before starting a new booking. This saves you from choosing dates and slots you cannot submit anyway.
                </p>
                <p className="text-xs text-[#86868b] dark:text-slate-400">
                  Current status: <span className="font-semibold capitalize text-[#1d1d1f] dark:text-slate-100">{activeAppointment.status.replace(/_/g, ' ')}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-white/80 bg-white/80 text-[#3a3a3e] shadow-sm hover:bg-white dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20 dark:hover:text-red-100"
              >
                <button type="button" onClick={() => navigate(`/appointments/${activeAppointment._id}`)}>
                  View Active Appointment
                </button>
              </Button>
              <Button
                asChild
                className="h-11 rounded-xl bg-[#1d1d1f] text-white shadow-sm hover:bg-[#2d2d2f] dark:bg-red-900/80 dark:text-red-50 dark:hover:bg-red-800"
              >
                <button type="button" onClick={() => navigate(`/appointments/book?reschedule=${activeAppointment._id}`)}>
                  Reschedule Instead
                </button>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Step: Design & Details */}
        {steps[currentStep]?.key === 'service' && (
          <div className="space-y-6">
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,23,30,0.9)_0%,rgba(8,12,18,0.96)_100%)]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Choose a Design</CardTitle>
                <CardDescription className="text-[#6e6e73] dark:text-slate-400">
                  Select one of RMV&apos;s sample designs, or choose Custom Made for a design built around your requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <button
                  type="button"
                  onClick={selectCustomMade}
                  className={cn(
                    'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition sm:p-5',
                    bookingMode === 'custom'
                      ? 'border-[#f5b400] bg-[#fff8df] ring-2 ring-[#f5b400]/25 dark:border-[#f5b400]/70 dark:bg-[#f5b400]/10'
                      : 'border-[#d2d2d7] bg-[#f8f9fb] hover:border-[#f5b400]/70 dark:border-white/12 dark:bg-white/[0.03] dark:hover:border-[#f5b400]/50',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1d1d1f] text-white dark:bg-white/10 dark:text-[#f5b400]">
                    <Wrench className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#1d1d1f] dark:text-slate-100">Custom Made</span>
                      {bookingMode === 'custom' && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#b77900] dark:text-[#f5b400]" />}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#6e6e73] dark:text-slate-400">
                      Tell us the service category and the design you want. Measurements and full specifications can be completed in the existing custom request flow.
                    </span>
                  </span>
                </button>

                <div className="space-y-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#3a3a3e] dark:text-slate-300">Sample Designs</p>
                    <p className="mt-1 text-xs text-[#86868b] dark:text-slate-500">Choose a category, then select the design you want to use as your starting reference.</p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {SERVICE_CATALOG.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setActiveServiceId(service.id)}
                        className={cn(
                          'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          activeCatalogService?.id === service.id
                            ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white dark:border-[#f5b400] dark:bg-[#f5b400] dark:text-[#090b0d]'
                            : 'border-[#d2d2d7] bg-white text-[#6e6e73] hover:border-[#86868b] dark:border-white/12 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/25',
                        )}
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {activeSampleDesigns.map((project) => {
                    const isSelected = bookingMode === 'sample' && selectedDesign?.id === project.id;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => selectSampleDesign(project)}
                        className={cn(
                          'group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/[0.03]',
                          isSelected
                            ? 'border-[#f5b400] ring-2 ring-[#f5b400]/25 dark:border-[#f5b400]/75'
                            : 'border-[#d2d2d7] hover:border-[#f5b400]/70 dark:border-white/12 dark:hover:border-[#f5b400]/45',
                        )}
                      >
                        <span className="relative block h-36 overflow-hidden bg-[#e8e8ed] dark:bg-slate-900">
                          <img src={project.image} alt={project.alt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                          {isSelected && (
                            <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#f5b400] text-[#090b0d] shadow-lg">
                              <CheckCircle2 className="h-5 w-5" />
                            </span>
                          )}
                        </span>
                        <span className="block p-3.5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#b77900] dark:text-[#f5b400]">{project.serviceLabel}</span>
                          <span className="mt-1 block text-sm font-semibold leading-5 text-[#1d1d1f] dark:text-slate-100">{project.title}</span>
                          {project.description && <span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-[#6e6e73] dark:text-slate-400">{project.description}</span>}
                          {project.estimatedPrice && <span className="mt-2 block text-xs font-semibold text-[#3a3a3e] dark:text-slate-300">{project.estimatedPrice}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {bookingMode === 'sample' && selectedDesign && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <img src={selectedDesign.imageUrl} alt={selectedDesign.name} className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Selected Design</p>
                        <p className="mt-1 truncate text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">{selectedDesign.name}</p>
                        <p className="mt-0.5 text-xs text-[#6e6e73] dark:text-slate-400">{selectedDesign.serviceLabel}</p>
                      </div>
                    </div>
                  </div>
                )}

                {bookingMode === 'custom' && (
                  <div className="space-y-5 rounded-2xl border border-[#d2d2d7] bg-[#f8f9fb] p-4 dark:border-white/12 dark:bg-white/[0.025]">
                    <ServiceTypePicker
                      value={serviceTypes}
                      customValue={serviceTypeCustom}
                      onChange={(types, custom) => {
                        setServiceTypes(types);
                        setServiceTypeCustom(custom || '');
                      }}
                    />
                  </div>
                )}

                {bookingMode && (
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">
                      {bookingMode === 'custom' ? 'Describe Your Custom Request' : 'Additional Notes'}{' '}
                      {bookingMode === 'sample' && <span className="text-[#86868b] dark:text-slate-500">(optional)</span>}
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={bookingMode === 'custom'
                        ? 'Describe the design, measurements you already know, preferred material, and any special requirements.'
                        : 'Add any changes or site details our team should know about this design.'}
                      className="min-h-[100px] rounded-xl border-[#d2d2d7] focus:border-[#9aa3ad] focus:ring-[#9aa3ad]/40 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#7f96b3] dark:focus:ring-[#7f96b3]/30"
                    />
                    <p className="text-xs text-[#86868b] dark:text-slate-500">
                      The first appointment is an office consultation. If a site visit is needed, RMV will schedule it after the consultation.
                    </p>
                  </div>
                )}

                {!bookingMode && (
                  <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-sky-500/20 dark:bg-sky-500/10">
                    <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-sky-300" />
                    <p className="text-sm text-blue-800 dark:text-sky-100/90">Select a sample design above or choose Custom Made to continue.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Date & Time */}
        {steps[currentStep]?.key === 'date' && (
          <>
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,23,30,0.9)_0%,rgba(8,12,18,0.96)_100%)]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Pick a Date</CardTitle>
                <CardDescription className="text-[#6e6e73] dark:text-slate-400">
                  Choose your preferred appointment date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#d2d2d7]/50 bg-[#f0f0f5]/70 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6e6e73] dark:text-slate-300" />
                  <div className="space-y-0.5 text-sm text-[#3a3a3e] dark:text-slate-300">
                    <p className="font-medium">Scheduling Rules</p>
                    <ul className="list-inside list-disc space-y-0.5 text-xs text-[#6e6e73] dark:text-slate-400">
                      <li>Appointments must be booked <span className="font-medium text-[#1d1d1f] dark:text-slate-100">at least 3 days</span> in advance</li>
                      <li>Weekends <span className="font-medium text-[#1d1d1f] dark:text-slate-100">(Saturday &amp; Sunday)</span> are not available</li>
                    </ul>
                  </div>
                </div>
                <div className="flex justify-center">
                  <CalendarUI
                    mode="single"
                    selected={selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined}
                    onSelect={(day) => {
                      if (!day) return;
                      const nextDate = format(day, 'yyyy-MM-dd');
                      if (nextDate !== selectedDate) setValue('slotCode', '');
                      setValue('date', nextDate);
                    }}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    disabled={isDateDisabled}
                    startMonth={startOfMonth(new Date())}
                    className="rounded-xl border border-[#c8c8cd]/50 dark:border-white/10 dark:bg-white/[0.02]"
                  />
                </div>
                {selectedDate && (
                  <p className="mt-3 text-center text-sm text-[#6e6e73] dark:text-slate-400">
                    Selected: <span className="font-medium text-[#1d1d1f] dark:text-slate-100">{format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy')}</span>
                  </p>
                )}
                {errors.date && <p className="text-sm text-red-500 mt-2">{errors.date.message}</p>}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,23,30,0.9)_0%,rgba(8,12,18,0.96)_100%)]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Select a Time Slot</CardTitle>
                <CardDescription className="text-[#6e6e73] dark:text-slate-400">
                  {selectedDate
                    ? `Showing slots for ${format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy')}`
                    : 'Select a date first'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#6e6e73] dark:text-slate-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {SLOT_CODES.map((slot) => {
                      const slotInfo = slotsData?.slots.find((entry) => entry.slotCode === slot);
                      const available = slotInfo?.available ?? false;
                      const blocked = (slotInfo as { blocked?: boolean })?.blocked ?? false;
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
                              ? 'border-[#86868b] bg-[#f5f5f7]/50 text-[#1d1d1f] ring-2 ring-[#d2d2d7] dark:border-[#d6b36a]/35 dark:bg-[linear-gradient(180deg,rgba(255,248,235,0.88)_0%,rgba(224,209,181,0.78)_100%)] dark:text-[#4a3617] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:ring-[#d6b36a]/12'
                              : available
                                ? 'border-[#d2d2d7] hover:border-[#c8c8cd] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.05]'
                                : 'cursor-not-allowed border-[#c8c8cd]/50 bg-[#f5f5f7] text-[#86868b] opacity-50 dark:border-white/8 dark:bg-white/[0.02] dark:text-slate-500',
                          )}
                        >
                          <p className="text-sm font-medium">{formatSlotTime(slot)}</p>
                          {available ? (
                            <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                              {remaining} staff available
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-red-400">
                              {blocked ? 'Blocked' : 'No staff available'}
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
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,23,30,0.9)_0%,rgba(8,12,18,0.96)_100%)]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Reason for Reschedule</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                {...register('purpose')}
                placeholder="Why are you rescheduling?"
                className="w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]/50 px-4 py-3 text-sm placeholder:text-[#86868b] focus:border-[#c8c8cd] focus:outline-none focus:ring-2 focus:ring-[#6e6e73] dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#d6b36a]/35 dark:focus:ring-[#d6b36a]/25"
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Step: Review & Confirm */}
        {steps[currentStep]?.key === 'review' && (
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,23,30,0.9)_0%,rgba(8,12,18,0.96)_100%)]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Review Your Booking</CardTitle>
              <CardDescription className="text-[#6e6e73] dark:text-slate-400">
                Confirm the details below before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bookingMode === 'sample' && selectedDesign && (
                <div className="overflow-hidden rounded-2xl border border-[#f5b400]/45 bg-[#fffaf0] dark:border-[#f5b400]/30 dark:bg-[#f5b400]/[0.07] sm:flex">
                  <img src={selectedDesign.imageUrl} alt={selectedDesign.name} className="h-44 w-full object-cover sm:h-auto sm:w-48" />
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b77900] dark:text-[#f5b400]">Selected Sample Design</p>
                    <p className="mt-2 text-base font-semibold text-[#1d1d1f] dark:text-slate-100">{selectedDesign.name}</p>
                    <p className="mt-1 text-sm text-[#6e6e73] dark:text-slate-400">{selectedDesign.serviceLabel}</p>
                    {selectedDesign.description && <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#6e6e73] dark:text-slate-400">{selectedDesign.description}</p>}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#86868b] dark:text-slate-500">Request</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">{bookingMode === 'sample' ? 'Existing sample design' : 'Custom made'}</p>
                </div>
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#86868b] dark:text-slate-500">Visit Type</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">{APPOINTMENT_TYPE_LABELS['office']}</p>
                </div>
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#86868b] dark:text-slate-500">Date</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">
                    {selectedDate ? format(new Date(`${selectedDate}T00:00:00`), 'MMMM d, yyyy') : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#86868b] dark:text-slate-500">Time Slot</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">
                    {selectedSlot ? formatSlotTime(selectedSlot) : '—'}
                  </p>
                </div>
                {serviceTypes && serviceTypes.length > 0 && (
                  <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#86868b] dark:text-slate-500">Service Category</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[#1d1d1f] dark:text-slate-100">
                      {serviceTypes.map(st => st === ServiceType.CUSTOM && serviceTypeCustom ? serviceTypeCustom : st.replace(/_/g, ' ')).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {notes && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#86868b] dark:text-slate-500">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#1d1d1f] dark:text-slate-100">{notes}</p>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-sky-500/20 dark:bg-sky-500/10">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-sky-300" />
                <p className="text-sm text-blue-800 dark:text-sky-100/90">
                  After the consultation, our team may schedule an ocular site visit if needed. Our sales staff will take measurements at your location.
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
              className={backButtonClassName}
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
                className={nextButtonClassName}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isPending || !selectedSlot}
                className={submitButtonClassName}
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
