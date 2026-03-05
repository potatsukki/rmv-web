import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, getDay, startOfDay } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, MapPin, Calendar, Clock, FileText, Info, Ruler, Package, Camera, AlertCircle, Video, PenTool, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ServiceTypePicker } from '@/components/shared/ServiceTypePicker';
import { LineItemsEditor } from '@/components/shared/LineItemsEditor';
import { SiteConditionsPanel } from '@/components/shared/SiteConditionsPanel';
import { PhotoUploadGrid } from '@/components/shared/PhotoUploadGrid';
import { useAvailableSlots, useRequestAppointment, useRequestReschedule, useSubmitSiteDetails } from '@/hooks/useAppointments';
import { AppointmentType, SLOT_CODES, ServiceType, MeasurementUnit, Environment } from '@/lib/constants';
import type { LineItem, SiteConditions } from '@/lib/types';
import {
  fetchOcularFeePreview,
  reverseGeocodeLocation,
  type MapPoint,
  type OcularFeePreview,
} from '@/lib/maps';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';

const MATERIAL_OPTIONS = [
  { value: 'stainless_201', label: 'Stainless 201' },
  { value: 'stainless_304', label: 'Stainless 304' },
  { value: 'stainless_316', label: 'Stainless 316' },
  { value: 'mild_steel', label: 'Mild Steel' },
  { value: 'galvanized_iron', label: 'Galvanized Iron (GI)' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'wrought_iron', label: 'Wrought Iron' },
  { value: 'glass', label: 'Glass' },
  { value: 'wood', label: 'Wood' },
];

const FINISH_OPTIONS = [
  { value: 'hairline', label: 'Hairline / Brushed' },
  { value: 'mirror', label: 'Mirror / Polished' },
  { value: 'matte', label: 'Matte' },
  { value: 'powder_coated', label: 'Powder Coated' },
  { value: 'painted', label: 'Painted' },
  { value: 'sandblasted', label: 'Sandblasted' },
  { value: 'pvd_rose_gold', label: 'Rose Gold (PVD)' },
  { value: 'pvd_gold', label: 'Gold (PVD)' },
  { value: 'pvd_black', label: 'Black (PVD)' },
];

const DEFAULT_SITE_CONDITIONS: SiteConditions = {
  environment: Environment.INDOOR,
};

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

/** Return the earliest bookable weekday (at least 3 days from today, skipping Sat/Sun). */
function getNextValidBookingDate(): Date {
  let candidate = addDays(new Date(), 3);
  // Advance past any weekend
  while (getDay(candidate) === 0 || getDay(candidate) === 6) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/** True when a calendar day should be disabled (too soon or weekend). */
function isDateDisabled(day: Date): boolean {
  const dow = getDay(day);
  if (dow === 0 || dow === 6) return true; // Saturday / Sunday
  if (startOfDay(day) < startOfDay(addDays(new Date(), 3))) return true; // < 3 days ahead
  return false;
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

export function BookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');
  const user = useAuthStore((s) => s.user);

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
      date: format(getNextValidBookingDate(), 'yyyy-MM-dd'),
      street: user?.addressData?.street || '',
      barangay: user?.addressData?.barangay || '',
      city: user?.addressData?.city || '',
      province: user?.addressData?.province || '',
      zip: user?.addressData?.zip || '',
    },
  });

  const selectedType = watch('type');
  const selectedDate = watch('date');
  const selectedSlot = watch('slotCode');
  const watchStreet = watch('street');
  const watchBarangay = watch('barangay');
  const watchCity = watch('city');

  const [selectedLocation, setSelectedLocation] = useState<MapPoint | null>(
    user?.addressData?.lat && user?.addressData?.lng
      ? { lat: user.addressData.lat, lng: user.addressData.lng }
      : null,
  );
  const [formattedAddress, setFormattedAddress] = useState(
    user?.addressData?.formattedAddress || '',
  );
  const [feePreview, setFeePreview] = useState<OcularFeePreview | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [ocularFeePaymentChoice, setOcularFeePaymentChoice] = useState<'online' | 'cash'>('online');

  const isOcularBooking = selectedType === AppointmentType.OCULAR && !rescheduleId;

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    selectedDate,
    selectedType,
  );

  const requestMutation = useRequestAppointment();
  const rescheduleMutation = useRequestReschedule();
  const submitSiteDetailsMutation = useSubmitSiteDetails();
  const isPending = requestMutation.isPending || rescheduleMutation.isPending || submitSiteDetailsMutation.isPending;

  // ── Site Details state ──
  const [siteServiceType, setSiteServiceType] = useState(ServiceType.CUSTOM as string);
  const [siteServiceTypeCustom, setSiteServiceTypeCustom] = useState('');
  const [siteRequirements, setSiteRequirements] = useState('');
  const [siteNotes, setSiteNotes] = useState('');
  const [siteMeasurementUnit, setSiteMeasurementUnit] = useState(MeasurementUnit.CM as string);
  const [siteLineItems, setSiteLineItems] = useState<LineItem[]>([]);
  const [siteMaterials, setSiteMaterials] = useState('');
  const [siteFinishes, setSiteFinishes] = useState('');
  const [sitePreferredDesign, setSitePreferredDesign] = useState('');
  const [siteSiteConditions, setSiteSiteConditions] = useState<SiteConditions>(DEFAULT_SITE_CONDITIONS);
  const [sitePhotoKeys, setSitePhotoKeys] = useState<string[]>([]);
  const [siteVideoKeys, setSiteVideoKeys] = useState<string[]>([]);
  const [siteSketchKeys, setSiteSketchKeys] = useState<string[]>([]);
  const [siteReferenceImageKeys, setSiteReferenceImageKeys] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Fetch signed download URLs for uploaded files so the Review step can display thumbnails
  const allFileKeys = useMemo(
    () => [...sitePhotoKeys, ...siteVideoKeys, ...siteSketchKeys, ...siteReferenceImageKeys],
    [sitePhotoKeys, siteVideoKeys, siteSketchKeys, siteReferenceImageKeys],
  );

  useEffect(() => {
    const keysNeedingUrl = allFileKeys.filter((k) => !previewUrls[k]);
    if (keysNeedingUrl.length === 0) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < keysNeedingUrl.length; i++) {
        if (cancelled) break;
        // Stagger requests to avoid 429 rate-limit errors
        if (i > 0) await new Promise((r) => setTimeout(r, 350));
        const fileKey = keysNeedingUrl[i]!;
        try {
          const { data } = await api.post<ApiResponse<{ downloadUrl: string }>>(
            '/uploads/signed-download-url',
            { key: fileKey },
          );
          if (!cancelled) {
            setPreviewUrls((prev) => ({ ...prev, [fileKey]: data.data.downloadUrl }));
          }
        } catch {
          // silently ignore – Review will just show icon
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFileKeys.join(',')]);

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
        if (data.type !== AppointmentType.OCULAR && !siteRequirements.trim()) {
          toast.error('Please provide details about what you need.');
          return;
        }

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
          purpose: siteRequirements || data.purpose,
          customerLocation: selectedLocation ?? undefined,
          formattedAddress: formattedAddress || undefined,
          addressStructured,
          ocularFeePaymentChoice: isOutsideNcr ? ocularFeePaymentChoice : undefined,
        });

        // Always auto-submit site details for office visits (details step is mandatory).
        // For ocular visits, submit only if the customer entered anything.
        const isOffice = data.type === AppointmentType.OFFICE;
        const hasAnySiteData =
          siteRequirements || siteNotes || siteLineItems.length > 0 ||
          sitePhotoKeys.length > 0 || siteVideoKeys.length > 0 ||
          siteSketchKeys.length > 0 || siteReferenceImageKeys.length > 0 ||
          siteServiceType || siteMaterials || siteFinishes || sitePreferredDesign;

        if (isOffice || hasAnySiteData) {
          try {
            await submitSiteDetailsMutation.mutateAsync({
              id: result._id,
              serviceType: siteServiceType || undefined,
              serviceTypeCustom: siteServiceType === ServiceType.CUSTOM ? siteServiceTypeCustom : undefined,
              measurementUnit: siteMeasurementUnit || undefined,
              lineItems: siteLineItems.length > 0 ? siteLineItems : undefined,
              siteConditions: siteSiteConditions,
              materials: siteMaterials || undefined,
              finishes: siteFinishes || undefined,
              preferredDesign: sitePreferredDesign || undefined,
              customerRequirements: siteRequirements || undefined,
              notes: siteNotes || undefined,
              photoKeys: sitePhotoKeys.length > 0 ? sitePhotoKeys : undefined,
              videoKeys: siteVideoKeys.length > 0 ? siteVideoKeys : undefined,
              sketchKeys: siteSketchKeys.length > 0 ? siteSketchKeys : undefined,
              referenceImageKeys: siteReferenceImageKeys.length > 0 ? siteReferenceImageKeys : undefined,
            });
          } catch (err) {
            console.error('[BookAppointment] Site details auto-submit failed:', err);
            toast.success('Appointment booked! You can update your site details later.');
            navigate(`/appointments/${result._id}`);
            return;
          }
        }

        // If outside NCR with online payment, redirect to ocular fee payment page
        if (
          data.type === AppointmentType.OCULAR &&
          feePreview &&
          !feePreview.fee.isWithinNCR
        ) {
          if (ocularFeePaymentChoice === 'cash') {
            toast.success('Appointment booked! The sales staff will collect the ocular fee in cash during the visit.');
            navigate(`/appointments/${result._id}`);
            return;
          }
          toast.success('Appointment booked! Please pay the ocular fee to proceed.');
          navigate(`/appointments/${result._id}/pay-ocular-fee`);
          return;
        }

        toast.success('Appointment booked successfully!');
        navigate(`/appointments/${result._id}`);
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
    'h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]';

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
          { key: 'details', label: 'Details', icon: FileText },
          { key: 'review', label: 'Review', icon: CheckCircle },
        ]
      : [
          { key: 'type', label: 'Visit Type', icon: Clock },
          { key: 'date', label: 'Date & Time', icon: Calendar },
          { key: 'address', label: 'Address', icon: MapPin },
          { key: 'details', label: 'Details', icon: FileText },
          { key: 'review', label: 'Review', icon: CheckCircle },
        ];

  const [currentStep, setCurrentStep] = useState(0);

  const canProceed = useMemo(() => {
    const stepKey = steps[currentStep]?.key;
    if (stepKey === 'type') return !!selectedType;
    if (stepKey === 'date') return !!selectedDate && !!selectedSlot;
    if (stepKey === 'location') return !!selectedLocation && !isFeeLoading && !feeError && !!feePreview;
    if (stepKey === 'address') return true; // address is optional for office visits
    if (stepKey === 'details') return isOcular ? true : !!(siteRequirements.trim());
    if (stepKey === 'reason') return true;
    if (stepKey === 'review') return true;
    return false;
  }, [currentStep, steps, selectedType, selectedDate, selectedSlot, selectedLocation, isFeeLoading, feeError, feePreview, siteRequirements]);

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
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            {rescheduleId ? 'Reschedule Appointment' : 'Book Appointment'}
          </h1>
          <p className="text-[#6e6e73] text-sm">
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
        {/* Step: Visit Type */}
        {steps[currentStep]?.key === 'type' && (
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">How would you like to meet?</CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Select your preferred consultation type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    value: AppointmentType.OFFICE,
                    label: 'Office Visit',
                    desc: 'Come to our shop in Quezon City for a face-to-face consultation.',
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
                        ? 'border-[#86868b] bg-[#f5f5f7]/50 ring-2 ring-[#d2d2d7]'
                        : 'border-[#d2d2d7] hover:border-[#c8c8cd]',
                    )}
                  >
                    <p className="font-semibold text-[#1d1d1f]">{opt.label}</p>
                    <p className="mt-1 text-sm text-[#6e6e73] leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
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
                {/* Booking rules notice */}
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

        {/* Step: Location (ocular only) */}
        {steps[currentStep]?.key === 'location' && (
          <>
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Pin Your Location</CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Drop a pin on the map where the work will take place. Ocular visits within Metro Manila are free.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationPicker value={selectedLocation} onChange={handleLocationChange} />

              <div className="rounded-lg border border-[#d2d2d7] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
                  Resolved Address
                </p>
                {isAddressLoading ? (
                  <p className="mt-1 text-sm text-[#6e6e73]">Resolving address...</p>
                ) : (
                  <p className="mt-1 text-sm text-[#3a3a3e]">
                    {formattedAddress || 'Address will appear after you pin a location.'}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-[#d2d2d7] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
                  Ocular Fee Preview
                </p>

                {!selectedLocation && (
                  <p className="mt-2 text-sm text-[#6e6e73]">
                    Pin your location to calculate distance and fee.
                  </p>
                )}

                {selectedLocation && isFeeLoading && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#6e6e73]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating distance and fee...
                  </div>
                )}

                {selectedLocation && !isFeeLoading && feeError && (
                  <p className="mt-2 text-sm text-red-500">{feeError}</p>
                )}

                {feePreview && !isFeeLoading && !feeError && (
                  <div className="mt-3 space-y-2 text-sm text-[#3a3a3e]">
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
                        <p className="pt-1 font-semibold text-[#1d1d1f]">
                          Estimated Ocular Fee: {currency(feePreview.fee.total)}
                        </p>
                      </div>
                    )}

                    {!feePreview.fee.isWithinNCR && (
                      <div className="mt-3 space-y-3">
                        {/* Payment Choice */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                          <p className="text-sm font-semibold text-amber-800">
                            Ocular fee payment required
                          </p>
                          <p className="text-xs text-amber-700">
                            Your location is outside Metro Manila. An ocular fee of{' '}
                            <strong>{currency(feePreview.fee.total)}</strong> is required. Choose how you'd like to pay:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setOcularFeePaymentChoice('online')}
                              className={cn(
                                'rounded-lg border-2 p-3 text-left transition-all text-sm',
                                ocularFeePaymentChoice === 'online'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                  : 'border-[#d2d2d7] bg-white text-[#3a3a3e] hover:border-[#86868b]',
                              )}
                            >
                              <p className="font-semibold">Pay Online</p>
                              <p className="text-xs mt-0.5 opacity-75">Pay via QRPH after booking</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOcularFeePaymentChoice('cash')}
                              className={cn(
                                'rounded-lg border-2 p-3 text-left transition-all text-sm',
                                ocularFeePaymentChoice === 'cash'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                  : 'border-[#d2d2d7] bg-white text-[#3a3a3e] hover:border-[#86868b]',
                              )}
                            >
                              <p className="font-semibold">Pay Cash</p>
                              <p className="text-xs mt-0.5 opacity-75">Pay the sales staff on visit day</p>
                            </button>
                          </div>
                        </div>

                        {/* Refund Policy Banner */}
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-sm font-semibold text-blue-800">Refund Policy</p>
                          <p className="mt-1 text-xs text-blue-700">
                            Refund requests are available after payment and before the sales staff
                            is on the way. Once the visit has started, please contact the admin
                            directly for assistance.
                          </p>
                          <div className="mt-2 text-xs text-blue-600 space-y-0.5">
                            <p>Email: rmvstainless@gmail.com</p>
                            <p>Phone: 02-9506187 / 0945 285 2974</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Structured Address Fields */}
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Detailed Address</CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Provide your complete address so our team can easily find your location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-[13px] font-medium text-[#3a3a3e]">Street / House No.</Label>
                <Input id="street" {...register('street')} placeholder="e.g. 123 Rizal St." className={inputClasses} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="barangay" className="text-[13px] font-medium text-[#3a3a3e]">Barangay</Label>
                  <Input id="barangay" {...register('barangay')} placeholder="e.g. Brgy. San Jose" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-[13px] font-medium text-[#3a3a3e]">City / Municipality</Label>
                  <Input id="city" {...register('city')} placeholder="e.g. Quezon City" className={inputClasses} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="province" className="text-[13px] font-medium text-[#3a3a3e]">Province</Label>
                  <Input id="province" {...register('province')} placeholder="e.g. Metro Manila" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip" className="text-[13px] font-medium text-[#3a3a3e]">Zip Code</Label>
                  <Input id="zip" {...register('zip')} placeholder="e.g. 1118" className={inputClasses} />
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {/* Step: Address (office visits) */}
        {steps[currentStep]?.key === 'address' && (
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Your Address <span className="text-xs font-normal text-[#86868b]">(optional)</span></CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Optionally provide your address for deliveries. You can skip this step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="street-office" className="text-[13px] font-medium text-[#3a3a3e]">Street / House No.</Label>
                <Input id="street-office" {...register('street')} placeholder="e.g. 123 Rizal St." className={inputClasses} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="barangay-office" className="text-[13px] font-medium text-[#3a3a3e]">Barangay</Label>
                  <Input id="barangay-office" {...register('barangay')} placeholder="e.g. Brgy. San Jose" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city-office" className="text-[13px] font-medium text-[#3a3a3e]">City / Municipality</Label>
                  <Input id="city-office" {...register('city')} placeholder="e.g. Quezon City" className={inputClasses} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="province-office" className="text-[13px] font-medium text-[#3a3a3e]">Province</Label>
                  <Input id="province-office" {...register('province')} placeholder="e.g. Metro Manila" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip-office" className="text-[13px] font-medium text-[#3a3a3e]">Zip Code</Label>
                  <Input id="zip-office" {...register('zip')} placeholder="e.g. 1118" className={inputClasses} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Details for Sales Staff */}
        {steps[currentStep]?.key === 'details' && (
          <div className="space-y-6">
            {/* Office visit measurement warning banner */}
            {!isOcular && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </span>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-amber-800">Provide accurate measurements</p>
                  <p className="text-sm text-amber-700">
                    Since this is an <span className="font-medium">office visit</span>, our staff will not be able to measure your space on-site. Please enter the most accurate dimensions you have — incorrect measurements may affect the final quotation and fabrication outcome.
                  </p>
                  <p className="text-sm text-amber-600">
                    Not sure about your measurements?{' '}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(0)}
                      className="font-medium underline underline-offset-2 hover:text-amber-800 transition-colors"
                    >
                      Switch to an ocular visit instead
                    </button>{' '}
                    and our staff will measure on-site.
                  </p>
                </div>
              </div>
            )}

            {/* Service Type + Requirements side-by-side */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1d1d1f]">Service Type</CardTitle>
                  <CardDescription className="text-[#6e6e73]">
                    What type of fabrication do you need?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ServiceTypePicker
                    value={siteServiceType}
                    customValue={siteServiceTypeCustom}
                    onChange={(type, custom) => {
                      setSiteServiceType(type);
                      setSiteServiceTypeCustom(custom || '');
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1d1d1f]">Your Requirements</CardTitle>
                  <CardDescription className="text-[#6e6e73]">
                    Describe what you need and any special notes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#3a3a3e]">
                      What do you need? {!isOcular && <span className="text-red-500">*</span>}
                    </Label>
                    <Textarea
                      value={siteRequirements}
                      onChange={(e) => setSiteRequirements(e.target.value)}
                      placeholder="Describe what you're looking for (e.g., kitchen countertop with L-shape, stainless steel railings for 2nd floor balcony)..."
                      className="min-h-[80px] rounded-xl border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]"
                    />
                    {!isOcular && !siteRequirements.trim() && (
                      <p className="text-xs text-[#86868b]">This field is required so our staff can prepare for your appointment.</p>
                    )}
                    {isOcular && (
                      <p className="text-xs text-[#86868b]">Optional — add any notes for our team if you'd like.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#3a3a3e]">
                      Additional Notes
                    </Label>
                    <Textarea
                      value={siteNotes}
                      onChange={(e) => setSiteNotes(e.target.value)}
                      placeholder="Any other details you'd like to share..."
                      className="min-h-[80px] rounded-xl border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Measurements */}
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
                  <Ruler className="h-5 w-5 text-[#86868b]" />
                  Measurements
                </CardTitle>
                <CardDescription className="text-[#6e6e73]">
                  If you have approximate measurements, add them here — the sales staff will verify during the consultation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineItemsEditor
                  items={siteLineItems}
                  unit={siteMeasurementUnit}
                  onItemsChange={setSiteLineItems}
                  onUnitChange={setSiteMeasurementUnit}
                />
              </CardContent>
            </Card>

            {/* Site Conditions */}
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
                  <MapPin className="h-5 w-5 text-[#86868b]" />
                  Site Conditions
                </CardTitle>
                <CardDescription className="text-[#6e6e73]">
                  Describe the conditions at your installation site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SiteConditionsPanel
                  value={siteSiteConditions}
                  onChange={setSiteSiteConditions}
                />
              </CardContent>
            </Card>

            {/* Materials & Design */}
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
                  <Package className="h-5 w-5 text-[#86868b]" />
                  Materials & Design Preference
                </CardTitle>
                <CardDescription className="text-[#6e6e73]">
                  Tell us your preferred materials and design style
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#3a3a3e]">Materials</Label>
                  <Select value={siteMaterials} onValueChange={setSiteMaterials}>
                    <SelectTrigger className="h-11 rounded-xl border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] focus:ring-1 focus:ring-[#f0f0f5] focus:ring-offset-0 focus:border-[#c8c8cd] w-full">
                      <SelectValue placeholder="Select material..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#d2d2d7] bg-white shadow-lg">
                      {MATERIAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-lg cursor-pointer text-sm py-2.5 focus:bg-[#f0f0f5] focus:text-[#1d1d1f] data-[highlighted]:bg-[#f0f0f5] data-[highlighted]:text-[#1d1d1f]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#3a3a3e]">Finishes</Label>
                  <Select value={siteFinishes} onValueChange={setSiteFinishes}>
                    <SelectTrigger className="h-11 rounded-xl border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] focus:ring-1 focus:ring-[#f0f0f5] focus:ring-offset-0 focus:border-[#c8c8cd] w-full">
                      <SelectValue placeholder="Select finish..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#d2d2d7] bg-white shadow-lg">
                      {FINISH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-lg cursor-pointer text-sm py-2.5 focus:bg-[#f0f0f5] focus:text-[#1d1d1f] data-[highlighted]:bg-[#f0f0f5] data-[highlighted]:text-[#1d1d1f]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#3a3a3e]">Preferred Design</Label>
                  <Input
                    value={sitePreferredDesign}
                    onChange={(e) => setSitePreferredDesign(e.target.value)}
                    placeholder="e.g., Modern minimalist"
                    className="h-11 rounded-xl border-[#d2d2d7]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Photos & Attachments */}
            <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
                  <Camera className="h-5 w-5 text-[#86868b]" />
                  Photos & Attachments
                </CardTitle>
                <CardDescription className="text-[#6e6e73]">
                  Upload site photos and reference images to help our team prepare.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isOcular && (
                  <div className="mb-4 rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-[#6e6e73]" />
                      <p className="text-xs font-medium text-[#3a3a3e]">
                        <span className="text-red-600">*</span> Site Photos and Reference Images are required for office appointments
                      </p>
                    </div>
                  </div>
                )}
                <PhotoUploadGrid
                  photoKeys={sitePhotoKeys}
                  videoKeys={siteVideoKeys}
                  sketchKeys={siteSketchKeys}
                  referenceImageKeys={siteReferenceImageKeys}
                  onPhotoKeysChange={setSitePhotoKeys}
                  onVideoKeysChange={setSiteVideoKeys}
                  onSketchKeysChange={setSiteSketchKeys}
                  onReferenceImageKeysChange={setSiteReferenceImageKeys}
                />
              </CardContent>
            </Card>
          </div>
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
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                    {selectedType === AppointmentType.OFFICE ? 'Office Visit' : 'Ocular Visit'}
                  </p>
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
                {!isOcular && (watchStreet || watchCity) && (
                  <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                    <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Address</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d1d1f] leading-snug">
                      {[watchStreet, watchBarangay, watchCity, watch('province'), watch('zip')].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {isOcular && formattedAddress && (
                  <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                    <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Location</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d1d1f] leading-snug">{formattedAddress}</p>
                  </div>
                )}
                {isOcular && feePreview && (
                  <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                    <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Ocular Fee</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                      {feePreview.fee.isWithinNCR ? 'FREE' : currency(feePreview.fee.total)}
                    </p>
                  </div>
                )}
                {isOcular && feePreview && !feePreview.fee.isWithinNCR && (
                  <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                    <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Payment Method</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                      {ocularFeePaymentChoice === 'cash' ? 'Cash (on visit day)' : 'Online (QRPH)'}
                    </p>
                  </div>
                )}
              </div>

              {siteRequirements && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Requirements</p>
                  <p className="mt-1 text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">{siteRequirements}</p>
                </div>
              )}
              {siteServiceType && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Service Type</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] capitalize">
                    {siteServiceType === ServiceType.CUSTOM && siteServiceTypeCustom ? siteServiceTypeCustom : siteServiceType.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              {siteLineItems.length > 0 && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">
                    Measurements ({siteMeasurementUnit})
                  </p>
                  <div className="mt-2 space-y-2">
                    {siteLineItems.map((item, idx) => {
                      const dims = [
                        item.length != null && `L: ${item.length}`,
                        item.width != null && `W: ${item.width}`,
                        item.height != null && `H: ${item.height}`,
                        item.area != null && `Area: ${item.area}`,
                        item.thickness != null && `T: ${item.thickness}`,
                      ].filter(Boolean).join(' × ');
                      return (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-[#86868b] font-medium shrink-0">{idx + 1}.</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1d1d1f]">
                              {item.label}
                              {item.quantity > 1 && (
                                <span className="ml-1.5 text-xs font-normal text-[#6e6e73]">×{item.quantity}</span>
                              )}
                            </p>
                            {dims && (
                              <p className="text-xs text-[#6e6e73] mt-0.5">{dims}</p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-[#86868b] mt-0.5 italic">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {siteMaterials && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Material</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                    {MATERIAL_OPTIONS.find((o) => o.value === siteMaterials)?.label || siteMaterials}
                  </p>
                </div>
              )}
              {siteFinishes && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Finish</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                    {FINISH_OPTIONS.find((o) => o.value === siteFinishes)?.label || siteFinishes}
                  </p>
                </div>
              )}
              {sitePreferredDesign && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Design Style</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">{sitePreferredDesign}</p>
                </div>
              )}
              {(sitePhotoKeys.length > 0 || siteReferenceImageKeys.length > 0 || siteVideoKeys.length > 0 || siteSketchKeys.length > 0) && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider mb-3">Attachments</p>
                  <div className="space-y-4">
                    {/* Site Photos */}
                    {sitePhotoKeys.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Camera className="h-3.5 w-3.5 text-[#6e6e73]" />
                          <span className="text-xs font-medium text-[#6e6e73]">
                            Site Photos ({sitePhotoKeys.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {sitePhotoKeys.map((key) => {
                            const url = previewUrls[key];
                            return url ? (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setLightboxUrl(url)}
                                className="relative aspect-square overflow-hidden rounded-lg border border-[#c8c8cd]/50 hover:ring-2 hover:ring-[#6e6e73]/40 transition-all cursor-pointer"
                              >
                                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              </button>
                            ) : (
                              <div key={key} className="flex aspect-square items-center justify-center rounded-lg border border-[#c8c8cd]/50 bg-[#f0f0f5]">
                                <Camera className="h-4 w-4 text-[#86868b]" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Reference Images */}
                    {siteReferenceImageKeys.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                          <span className="text-xs font-medium text-[#6e6e73]">
                            Reference Images ({siteReferenceImageKeys.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {siteReferenceImageKeys.map((key) => {
                            const url = previewUrls[key];
                            return url ? (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setLightboxUrl(url)}
                                className="relative aspect-square overflow-hidden rounded-lg border border-[#c8c8cd]/50 hover:ring-2 hover:ring-purple-400/40 transition-all cursor-pointer"
                              >
                                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              </button>
                            ) : (
                              <div key={key} className="flex aspect-square items-center justify-center rounded-lg border border-[#c8c8cd]/50 bg-[#f0f0f5]">
                                <ImageIcon className="h-4 w-4 text-[#86868b]" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Videos */}
                    {siteVideoKeys.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-xs font-medium text-[#6e6e73]">
                            Videos ({siteVideoKeys.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {siteVideoKeys.map((key) => {
                            const url = previewUrls[key];
                            return url ? (
                              <div key={key} className="relative overflow-hidden rounded-lg border border-[#c8c8cd]/50 bg-black">
                                <video
                                  src={url}
                                  controls
                                  preload="metadata"
                                  className="w-full max-h-48 object-contain rounded-lg"
                                />
                              </div>
                            ) : (
                              <div key={key} className="flex aspect-video items-center justify-center rounded-lg border border-[#c8c8cd]/50 bg-[#f0f0f5]">
                                <Video className="h-5 w-5 text-[#86868b]" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Sketches */}
                    {siteSketchKeys.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <PenTool className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs font-medium text-[#6e6e73]">
                            Sketches ({siteSketchKeys.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {siteSketchKeys.map((key) => {
                            const url = previewUrls[key];
                            return url ? (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setLightboxUrl(url)}
                                className="relative aspect-square overflow-hidden rounded-lg border border-[#c8c8cd]/50 hover:ring-2 hover:ring-emerald-400/40 transition-all cursor-pointer"
                              >
                                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              </button>
                            ) : (
                              <div key={key} className="flex aspect-square items-center justify-center rounded-lg border border-[#c8c8cd]/50 bg-[#f0f0f5]">
                                <PenTool className="h-4 w-4 text-[#86868b]" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {siteNotes && (
                <div className="rounded-xl border border-[#c8c8cd]/50 bg-[#f5f5f7]/30 p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Additional Notes</p>
                  <p className="mt-1 text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">{siteNotes}</p>
                </div>
              )}
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
              className="flex-1 h-12 rounded-xl bg-[#1d1d1f] text-white hover:bg-[#2d2d2f]"
              disabled={!canProceed}
              onClick={handleNext}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-12 rounded-xl bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] shadow-sm"
              size="lg"
              disabled={submitDisabled}
              onClick={handleSubmit(onSubmit)}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {rescheduleId
                ? 'Submit Reschedule Request'
                : isOutsideNcr
                  ? ocularFeePaymentChoice === 'cash'
                    ? 'Confirm Booking (Cash)'
                    : 'Book & Pay Ocular Fee'
                  : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </form>

      {/* Lightbox overlay for image previews */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
            aria-label="Close preview"
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
