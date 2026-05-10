import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, User, Phone, CreditCard, CheckCircle2, Users, FileText, Camera, Image, Loader2, Banknote, Info, AlertCircle, CalendarIcon, CalendarX } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage, cn } from '@/lib/utils';
import { fetchOcularFeePreview, type MapPoint, type OcularFeePreview } from '@/lib/maps';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import {
  useAppointment,
  useConfirmAppointment,
  useCancelAppointment,
  useUpdateVisitStatus,
  useUpdateConsultationAttendance,
  useAgentFinalizeOcular,
  useCustomerSubmitLocation,
} from '@/hooks/useAppointments';
import { useVisitReportsByAppointment } from '@/hooks/useVisitReports';

import { useAuthStore } from '@/stores/auth.store';
import { Role, AppointmentStatus, AppointmentAttendanceStatus, StaffAvailabilityStatus } from '@/lib/constants';
import { SERVICE_TYPE_LABELS } from '@/lib/constants';
import { Suspense, lazy, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';

const LazyLocationView = lazy(() =>
  import('@/components/maps/LocationView').then((module) => ({ default: module.LocationView })),
);

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { data: appt, isLoading, isError, refetch } = useAppointment(id!);

  const savedProfileLocation =
    user?.addressData?.lat != null && user?.addressData?.lng != null
      ? { lat: user.addressData.lat, lng: user.addressData.lng }
      : null;
  const savedProfileFormattedAddress = user?.addressData?.formattedAddress || '';

  const confirmMutation = useConfirmAppointment();
  const cancelMutation = useCancelAppointment();
  const visitStatusMutation = useUpdateVisitStatus();
  const attendanceMutation = useUpdateConsultationAttendance();

  const finalizeMutation = useAgentFinalizeOcular();
  const submitLocationMutation = useCustomerSubmitLocation();

  // Customer location submission state
  const [customerLocationPin, setCustomerLocationPin] = useState<MapPoint | null>(savedProfileLocation);
  const [customerAddress, setCustomerAddress] = useState(savedProfileFormattedAddress);
  const [feePreview, setFeePreview] = useState<OcularFeePreview | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  const isCustomer = user?.roles.includes(Role.CUSTOMER);
  const isAgent = user?.roles.includes(Role.APPOINTMENT_AGENT);
  const isSalesStaff = user?.roles.includes(Role.SALES_STAFF);
  const isAdmin = user?.roles.includes(Role.ADMIN);

  // Fetch visit reports — only for roles that have access (not customers)
  const canSeeVisitReports = isSalesStaff || isAdmin || user?.roles.includes(Role.ENGINEER) || isAgent;
  const { data: visitReports } = useVisitReportsByAppointment(canSeeVisitReports ? id! : '');

  // Sales staff assignment state (for agents/admins)
  const [salesStaffList, setSalesStaffList] = useState<{ 
    _id: string; 
    firstName: string; 
    lastName: string;
    availabilityStatus?: StaffAvailabilityStatus;
    activeShift?: { shiftStartAt: string; shiftEndAt?: string } | null;
    assignmentEligible?: boolean;
    assignmentBlockedReason?: string;
  }[]>([]);
  const [selectedSalesStaff, setSelectedSalesStaff] = useState<string>('');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');



  const canConfirmAppointment = !!(isAgent || isAdmin);
  const canFinalizeOcular = !!isSalesStaff;
  const canCompleteAppointment = !!user?.roles.includes(Role.SALES_STAFF);
  const isStaff = user?.roles.some((r) =>
    [Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN].includes(r),
  );
  // Philippines bounding box (rough)
  const PH_BOUNDS = { latMin: 4.5, latMax: 21.5, lngMin: 116.0, lngMax: 127.0 };

  useEffect(() => {
    if (!customerLocationPin && savedProfileLocation) {
      setCustomerLocationPin(savedProfileLocation);
    }

    if (!customerAddress && savedProfileFormattedAddress) {
      setCustomerAddress(savedProfileFormattedAddress);
    }
  }, [customerAddress, customerLocationPin, savedProfileFormattedAddress, savedProfileLocation]);

  // Live fee computation when customer moves pin
  useEffect(() => {
    if (!customerLocationPin) {
      setFeePreview(null);
      setFeeError(null);
      return;
    }
    const { lat, lng } = customerLocationPin;
    if (lat < PH_BOUNDS.latMin || lat > PH_BOUNDS.latMax || lng < PH_BOUNDS.lngMin || lng > PH_BOUNDS.lngMax) {
      setFeePreview(null);
      setFeeError('Location must be within the Philippines. Please select a valid land location.');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setFeeLoading(true);
      setFeeError(null);
      try {
        const preview = await fetchOcularFeePreview(customerLocationPin);
        if (!cancelled) setFeePreview(preview);
      } catch {
        if (!cancelled) {
          setFeePreview(null);
          setFeeError('Unable to calculate route to this location. Please select a reachable land location.');
        }
      } finally {
        if (!cancelled) setFeeLoading(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [customerLocationPin]);

  // Fetch sales staff list for consultation assignment
  useEffect(() => {
    if (canConfirmAppointment && appt?.date && appt?.slotCode) {
      const params = new URLSearchParams({
        date: appt.date,
        slotCode: appt.slotCode,
        appointmentId: id!,
      });
      
      api.get<ApiResponse<{ 
        _id: string; 
        firstName: string; 
        lastName: string;
        availabilityStatus?: StaffAvailabilityStatus;
        activeShift?: { shiftStartAt: string; shiftEndAt?: string } | null;
        assignmentEligible?: boolean;
        assignmentBlockedReason?: string;
      }[]>>(`/users/sales-staff?${params.toString()}`)
        .then(res => setSalesStaffList(res.data.data))
        .catch(() => {});
    }
  }, [canConfirmAppointment, appt?.date, appt?.slotCode, id]);

  if (isLoading) return <PageLoader />;
  if (isError || !appt) return <PageError onRetry={refetch} />;

  const isOcularAppointment = appt.type === 'ocular';
  const isReadyForOcularConsultation =
    appt.type === 'office'
    && (
      appt.status === AppointmentStatus.READY_FOR_OCULAR
      || (appt.status === AppointmentStatus.COMPLETED && appt.consultationReportSubmitted)
    );
  const hasCustomerSiteLocation = Boolean(appt.customerLocation);
  const canCustomerSubmitOcularLocation = Boolean(
    isCustomer
    && !hasCustomerSiteLocation
    && (
      (
        isOcularAppointment
        && [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED].includes(appt.status as AppointmentStatus)
      )
      || isReadyForOcularConsultation
    ),
  );
  const canStartOcularProgress = !isOcularAppointment || hasCustomerSiteLocation;
  const customerSiteLocationRequiredMessage = 'Customer site location is required before starting the ocular visit.';
  const customerCanManageAppointment =
    isCustomer &&
    [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.PREPARING].includes(
      appt.status as AppointmentStatus,
    );
  const customerCanReschedule =
    customerCanManageAppointment && appt.rescheduleCount < appt.maxReschedules;

  const handleConfirm = async () => {
    const staff = salesStaffList.find(s => s._id === selectedSalesStaff);
    if (!selectedSalesStaff || staff?.assignmentEligible === false) {
      toast.error(staff?.assignmentEligible === false 
        ? `Staff ineligible: ${staff.assignmentBlockedReason}` 
        : 'Please select a sales staff member to assign'
      );
      return;
    }
    try {
      await confirmMutation.mutateAsync({ id: id!, salesStaffId: selectedSalesStaff });
      toast.success(
        isOcularAppointment
          ? 'Appointment confirmed! The assigned sales staff has been notified and can proceed with the scheduled visit flow.'
          : 'Consultation confirmed! The assigned sales staff has been notified and can prepare for the office consultation.',
        { duration: 5000 },
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to confirm'));
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    try {
      await cancelMutation.mutateAsync({ id: id!, reason: cancelReason.trim() });
      toast.success('Appointment cancelled');
      setCancelOpen(false);
      setCancelReason('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to cancel'));
    }
  };

  const formatSlotTime = (slot: string) => {
    const parts = slot.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const formatConsultationWindow = (slot: string) => {
    const parts = slot.split(':').map(Number);
    const startHour = parts[0] ?? 0;
    const startMinute = parts[1] ?? 0;
    const endHour = startHour + 1;
    return `${formatSlotTime(`${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`)} - ${formatSlotTime(`${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`)}`;
  };

  const formatDateTime = (value?: string) =>
    value ? format(new Date(value), 'MMM d, yyyy h:mm a') : 'Not recorded';

  const recommendedOcularDateValue = appt.recommendedOcularDate
    ? appt.recommendedOcularDate.slice(0, 10)
    : undefined;
  const ocularVisitDateLabel = recommendedOcularDateValue || appt.date;
  const ocularVisitSlotLabel = appt.recommendedOcularSlot || appt.slotCode;
  const formattedOcularVisitDate = format(new Date(`${ocularVisitDateLabel}T00:00:00`), 'MMMM d, yyyy');
  const formattedOcularVisitTime = formatSlotTime(ocularVisitSlotLabel);

  const isOutsideConsultationWindow = (arrivalAt?: string) => {
    if (!arrivalAt) return false;
    const [hourRaw, minuteRaw] = appt.slotCode.split(':').map(Number);
    const hour = Number.isFinite(hourRaw) ? hourRaw ?? 0 : 0;
    const minute = Number.isFinite(minuteRaw) ? minuteRaw ?? 0 : 0;
    const windowEnd = new Date(`${appt.date}T${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`);
    return new Date(arrivalAt) > windowEnd;
  };

  const attendanceStatus = appt.attendanceStatus || AppointmentAttendanceStatus.SCHEDULED;
  const isOfficeConsultation = appt.type === 'office';
  const canSeeConsultationAttendance = Boolean(isOfficeConsultation && isSalesStaff);
  const assignedSalesStaffId = typeof appt.salesStaffId === 'string'
    ? appt.salesStaffId
    : appt.salesStaffId?._id;
  const canUpdateAttendance = Boolean(
    isOfficeConsultation &&
    (isAdmin || (isSalesStaff && assignedSalesStaffId === user?._id)),
  );

  const updateAttendance = async (
    action: 'check_in' | 'start' | 'complete' | 'no_show' | 'reschedule' | 'customer_declined',
  ) => {
    const notesRequired = action === 'no_show' || action === 'reschedule' || action === 'customer_declined';
    const notes = notesRequired
      ? window.prompt(
          action === 'no_show'
            ? 'Enter no-show notes'
            : action === 'customer_declined'
              ? 'Enter the reason the customer declined to proceed'
              : 'Enter reschedule reason',
        )
      : undefined;
    if (notesRequired && !notes?.trim()) {
      toast.error('Notes are required for this attendance action');
      return;
    }

    try {
      await attendanceMutation.mutateAsync({
        id: id!,
        action,
        notes: notes?.trim(),
      });
      toast.success(
        action === 'complete'
          ? 'Consultation attendance completed. You can now submit the consultation report.'
          : action === 'customer_declined'
            ? 'Consultation marked as customer declined. The workflow has been stopped.'
          : 'Consultation attendance updated',
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update attendance'));
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

  const getServiceTypeNames = (
    serviceTypes?: string[],
    fallbackServiceType?: string,
    serviceTypeCustom?: string,
  ) => {
    const normalized = (serviceTypes && serviceTypes.length > 0
      ? serviceTypes
      : fallbackServiceType
        ? [fallbackServiceType]
        : []
    )
      .map((serviceType) => (
        serviceType === 'custom'
          ? (serviceTypeCustom || 'Custom')
          : (SERVICE_TYPE_LABELS[serviceType] || serviceType)
      ))
      .filter(Boolean);

    return normalized;
  };

  const formatServiceTypeList = (
    serviceTypes?: string[],
    fallbackServiceType?: string,
    serviceTypeCustom?: string,
  ) => {
    const normalized = getServiceTypeNames(serviceTypes, fallbackServiceType, serviceTypeCustom);
    return normalized.length > 0 ? normalized.join(', ') : '';
  };

  const getServiceItemLabel = (
    serviceTypes?: string[],
    fallbackServiceType?: string,
    serviceTypeCustom?: string,
  ) => {
    const normalized = getServiceTypeNames(serviceTypes, fallbackServiceType, serviceTypeCustom);
    return normalized.length > 1 ? 'Items' : 'Item';
  };

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
  }) => (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-[#f0f0f5] dark:bg-slate-800/80 p-2 border border-black/5 dark:border-white/5">
        <Icon className="h-4 w-4 text-[#6e6e73] dark:text-slate-400" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">{label}</p>
        <p className="break-words text-sm text-[#6e6e73] dark:text-slate-200">{value}</p>
      </div>
    </div>
  );

  const MapPanelFallback = ({ message }: { message: string }) => (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#d2d2d7] dark:border-slate-700 bg-[#f5f5f7]/80 dark:bg-slate-800/80 px-5 py-8 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-[#6e6e73] dark:text-slate-400" />
      <p className="mt-3 text-sm font-medium text-[#1d1d1f] dark:text-slate-100">Loading map tools</p>
      <p className="mt-1 max-w-sm text-xs text-[#6e6e73] dark:text-slate-400">{message}</p>
    </div>
  );
  const sourcePath = `${location.pathname}${location.search}${location.hash}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/appointments')}
          className="rounded-xl text-[#6e6e73] dark:text-slate-300 hover:text-[#1d1d1f] dark:hover:text-slate-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-slate-100">
            Appointment Details
          </h1>
        </div>
        {isCustomer && appt.type === 'ocular' && !appt.ocularFeePaid && appt.ocularFeeStatus === 'pending' ? (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Awaiting Payment
          </span>
        ) : (
          <StatusBadge status={appt.status} />
        )}
      </div>

      {/* ── Status Guide Banner ── */}
      {appt.status === AppointmentStatus.REQUESTED && (
        <Card className="rounded-xl border border-[#d7dce3] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(246,248,251,0.98)_100%)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(18,24,34,0.94)_0%,rgba(9,14,22,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_34px_rgba(0,0,0,0.2)]">
          <CardContent className="flex items-start gap-3 px-4 py-3">
            <div className="metal-pill mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#66707b] dark:text-slate-300">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2f3740] dark:text-slate-100">Awaiting Confirmation</p>
              <p className="mt-0.5 text-xs text-[#69737d] dark:text-slate-400">
                {isCustomer
                  ? isOcularAppointment && !hasCustomerSiteLocation
                    ? 'Please submit your site location below so your assigned sales staff can finalize your appointment.'
                    : isOcularAppointment && !appt.ocularFeePaid
                    ? 'Please pay the ocular visit fee to proceed. Your assigned sales staff will finalize your appointment once payment is received.'
                    : 'Your appointment request has been received. An agent will review and confirm it shortly.'
                  : 'Review this appointment request and assign a sales staff member to confirm it.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {appt.status === AppointmentStatus.CONFIRMED && (
        <Card className="rounded-xl border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/40">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {isOcularAppointment ? 'Confirmed - Ready for Ocular Visit' : 'Confirmed - Office Consultation Scheduled'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-0.5">
                {isCustomer
                  ? isOcularAppointment
                    ? hasCustomerSiteLocation
                      ? 'Your ocular appointment is confirmed. The assigned sales staff will visit your site on the scheduled date.'
                      : 'Your ocular appointment is confirmed. Submit your site location below so we can calculate any required ocular fee before the visit starts.'
                    : 'Your consultation is confirmed. Please visit the RMV office on the scheduled date.'
                  : isOcularAppointment
                    ? 'Mark yourself as "On the Way" when heading to the site.'
                    : 'This consultation is scheduled at the RMV office. Review the customer details and prepare for the appointment.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {canCustomerSubmitOcularLocation && ![AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED].includes(appt.status as AppointmentStatus) && (
        <Card className="rounded-xl border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/40">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Site Location Required</p>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-0.5">
                Your consultation is ready for an ocular visit. Submit your site pin and official address below so we can calculate whether the ocular visit is free within Metro Manila or has an outside-area fee.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {appt.status === AppointmentStatus.ON_THE_WAY && (
        <Card className="rounded-xl border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                {isCustomer ? 'Our staff is on the way' : 'On the Way to Visit'}
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-200 mt-0.5">
                {isCustomer
                  ? 'The sales staff is on their way to your location. Please be available at the site.'
                  : 'You are on the way. Mark this appointment as "Arrived at Site" once you reach the location.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {appt.status === AppointmentStatus.ARRIVED_AT_SITE && (
        <Card className="rounded-xl border-cyan-200 bg-cyan-50/50 dark:border-cyan-900/60 dark:bg-cyan-950/40">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
                {isCustomer ? 'Staff Arrived at Site' : 'Arrived at Site'}
              </p>
              <p className="text-xs text-cyan-700 dark:text-cyan-200 mt-0.5">
                {isCustomer
                  ? 'The assigned sales staff has arrived at your location and will start the site visit shortly.'
                  : 'You have arrived at the site. Start the site visit when inspection begins.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {appt.status === AppointmentStatus.IN_PROGRESS && (
        <Card className="rounded-xl border-sky-200 bg-sky-50/50 dark:border-sky-900/60 dark:bg-sky-950/40">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Clock className="h-5 w-5 text-sky-600 dark:text-sky-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                {isCustomer ? 'Site Visit in Progress' : 'Site Visit in Progress'}
              </p>
              <p className="text-xs text-sky-700 dark:text-sky-200 mt-0.5">
                {isCustomer
                  ? 'The site visit inspection is currently ongoing.'
                  : 'Site visit is in progress. Complete and submit the final ocular visit report when done.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {appt.status === AppointmentStatus.COMPLETED && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Visit Completed</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-0.5">
                {isCustomer
                  ? 'The visit is complete. The sales staff will submit a visit report, which will automatically create your project.'
                  : 'Visit complete. Submit the visit report to generate the project for this customer.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {canSeeConsultationAttendance && (
        <Card className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:border-[#1d2734] dark:bg-[#121723] dark:shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
          <CardHeader className="pb-0 pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:bg-[#232a36] dark:text-[#8a9ab3] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-[22px] font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  Consultation Attendance
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Track and manage your consultation schedule
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-4 pt-6 sm:p-5 sm:pt-6">
            <div className="grid gap-0 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 sm:grid-cols-3 dark:border-white/5 dark:bg-[#161c28]">
              <div className="flex items-start gap-3 p-4 sm:border-r sm:border-slate-200 dark:sm:border-white/5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-[#232a36] dark:text-[#8a9ab3]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Attendance Status</p>
                  <div className="mt-2">
                    <StatusBadge status={attendanceStatus} />
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Your appointment is confirmed</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 sm:border-r sm:border-slate-200 dark:sm:border-white/5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-[#232a36] dark:text-[#8a9ab3]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Arrival</p>
                  <p className="mt-1 text-[17px] font-semibold text-slate-950 dark:text-slate-100">{formatDateTime(appt.actualArrivalAt)}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Check-in when you arrive</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-[#232a36] dark:text-[#8a9ab3]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed</p>
                  <p className="mt-1 text-[17px] font-semibold text-slate-950 dark:text-slate-100">{formatDateTime(appt.consultationCompletedAt)}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Will be updated after completion</p>
                </div>
              </div>
            </div>

            {appt.consultationStartedAt && (
              <InfoRow icon={Clock} label="Started" value={formatDateTime(appt.consultationStartedAt)} />
            )}
            {appt.attendanceNotes && (
              <div>
                <p className="text-[13px] font-medium text-slate-400">Attendance Notes</p>
                <p className="mt-1 text-sm text-slate-300">{appt.attendanceNotes}</p>
              </div>
            )}
            {attendanceStatus === AppointmentAttendanceStatus.LATE_ARRIVAL && (
              <div className="rounded-xl border border-orange-200/20 bg-orange-500/10 p-3 text-sm text-orange-200">
                Customer arrived after the grace period.
              </div>
            )}
            {attendanceStatus === AppointmentAttendanceStatus.CUSTOMER_DECLINED && (
              <div className="rounded-xl border border-red-200/20 bg-red-500/10 p-3 text-sm text-red-200">
                Customer declined to proceed during consultation. This appointment is cancelled and will not continue to the report workflow.
              </div>
            )}
            {isOutsideConsultationWindow(appt.actualArrivalAt) && (
              <div className="rounded-xl border border-red-200/20 bg-red-500/10 p-3 text-sm text-red-200">
                Customer is outside the booked consultation window. Continue only if the staff schedule allows it.
              </div>
            )}
            {canUpdateAttendance && (
              <div className="pt-1">
                {attendanceStatus === AppointmentAttendanceStatus.SCHEDULED && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updateAttendance('check_in')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[#4f77f2] bg-[#315bd8] px-6 text-sm font-semibold text-white transition-colors hover:border-[#5f86ff] hover:bg-[#3d68e8] disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Check In
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAttendance('reschedule')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:pointer-events-none disabled:opacity-50 dark:border-white/12 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/8 dark:hover:text-white"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Request Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAttendance('no_show')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-[#dc2626] transition-colors hover:bg-red-50 hover:text-[#b91c1c] disabled:pointer-events-none disabled:opacity-50 dark:border-white/12 dark:bg-transparent dark:text-[#ff6b63] dark:hover:bg-white/8 dark:hover:text-[#ff8a84]"
                    >
                      <CalendarX className="mr-2 h-4 w-4" />
                      Mark as No Show
                    </button>
                  </div>
                )}
                {[AppointmentAttendanceStatus.ON_TIME, AppointmentAttendanceStatus.LATE_ARRIVAL].includes(attendanceStatus as AppointmentAttendanceStatus) && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updateAttendance('start')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[#4f77f2] bg-[#315bd8] px-6 text-sm font-semibold text-white transition-colors hover:border-[#5f86ff] hover:bg-[#3d68e8] disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Start Consultation
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAttendance('reschedule')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:pointer-events-none disabled:opacity-50 dark:border-white/12 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/8 dark:hover:text-white"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Request Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAttendance('customer_declined')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-[#dc2626] transition-colors hover:bg-red-50 hover:text-[#b91c1c] disabled:pointer-events-none disabled:opacity-50 dark:border-white/12 dark:bg-transparent dark:text-[#ff6b63] dark:hover:bg-white/8 dark:hover:text-[#ff8a84]"
                    >
                      <CalendarX className="mr-2 h-4 w-4" />
                      Customer Declined
                    </button>
                  </div>
                )}
                {attendanceStatus === AppointmentAttendanceStatus.IN_PROGRESS && (
                  <div className="grid gap-4 pt-1 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateAttendance('complete')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-emerald-500 bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:border-emerald-400 hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Complete Consultation
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAttendance('customer_declined')}
                      disabled={attendanceMutation.isPending}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-[#dc2626] transition-colors hover:bg-red-50 hover:text-[#b91c1c] disabled:pointer-events-none disabled:opacity-50 dark:border-white/12 dark:bg-transparent dark:text-[#ff6b63] dark:hover:bg-white/8 dark:hover:text-[#ff8a84]"
                    >
                      <CalendarX className="h-4 w-4" />
                      Customer Declined
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {customerCanManageAppointment && (
        <Card className="overflow-hidden rounded-2xl border border-[#d5d8de] bg-[linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(247,249,251,0.98)_55%,rgba(240,244,248,0.98)_100%)] shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_55%,rgba(6,12,19,1)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.28)]">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="metal-pill flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#5c6672] ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_10px_22px_rgba(18,22,27,0.1)] dark:text-slate-400 dark:ring-white/8 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(0,0,0,0.22)]">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Manage This Appointment</p>
                </div>
                <p className="text-xs leading-5 text-[#6e6e73] dark:text-slate-400 sm:text-sm">
                  Need to free this slot so you can book again? You can reschedule or cancel this appointment here.
                </p>
              </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[#a7b8c8]/45 bg-[linear-gradient(180deg,rgba(246,249,252,0.96)_0%,rgba(226,234,242,0.92)_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5d7184] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-[#7aa6c8]/26 dark:bg-[linear-gradient(180deg,rgba(40,57,75,0.72)_0%,rgba(18,27,38,0.92)_100%)] dark:text-[#c5d8ea] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_20px_rgba(0,0,0,0.16)]">
                <span className="h-2 w-2 rounded-full bg-[#6f8faa] shadow-[0_0_0_3px_rgba(111,143,170,0.16)] dark:bg-[#8dc2ec] dark:shadow-[0_0_0_3px_rgba(141,194,236,0.14)]" />
                Current Booking
              </span>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
              {customerCanReschedule && (
                <Button
                  asChild
                  variant="outline"
                  className="h-11 w-full rounded-xl border-white/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-[#3a3a3e] dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-slate-700 sm:w-auto"
                >
                  <Link to={`/appointments/book?reschedule=${appt._id}`}>
                    Reschedule
                  </Link>
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => setCancelOpen(true)}
                className="h-11 w-full rounded-xl shadow-sm sm:w-auto"
              >
                Cancel Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Info */}
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Appointment Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={Clock}
              label="Date & Time"
              value={`${format(new Date(appt.date), 'EEEE, MMMM d, yyyy')} at ${isOfficeConsultation ? formatConsultationWindow(appt.slotCode) : formatSlotTime(appt.slotCode)}`}
            />

            <InfoRow
              icon={User}
              label="Type"
              value={`${appt.type.charAt(0).toUpperCase() + appt.type.slice(1)} Visit`}
            />

            {formatServiceTypeList(appt.serviceTypes, appt.serviceType, appt.serviceTypeCustom) && (
              <InfoRow
                icon={FileText}
                label={getServiceItemLabel(appt.serviceTypes, appt.serviceType, appt.serviceTypeCustom)}
                value={formatServiceTypeList(appt.serviceTypes, appt.serviceType, appt.serviceTypeCustom)}
              />
            )}

            {appt.purpose && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Purpose</p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300 mt-1">{appt.purpose}</p>
              </div>
            )}

            {appt.customerName && (
              <InfoRow icon={User} label="Customer" value={appt.customerName} />
            )}

            {appt.salesStaffName && (
              <InfoRow icon={Phone} label="Sales Staff" value={appt.salesStaffName} />
            )}

            {appt.address && (
              <InfoRow icon={MapPin} label="Address" value={appt.address} />
            )}

            {appt.distanceKm != null && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Distance</p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300">{appt.distanceKm.toFixed(1)} km</p>
              </div>
            )}

            {/* Customer pin location map — visible to staff/admin */}
            {!isCustomer && appt.customerLocation && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400 mb-2">Customer Pin Location</p>
                <Suspense fallback={<MapPanelFallback message="Loading the saved site pin preview for staff review." />}>
                  <LazyLocationView lat={appt.customerLocation.lat} lng={appt.customerLocation.lng} />
                </Suspense>
                <a
                  href={`https://www.google.com/maps?q=${appt.customerLocation.lat},${appt.customerLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex flex-wrap items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-300"
                >
                  <MapPin className="h-3 w-3" /> Open in Google Maps
                </a>
              </div>
            )}

            <div className="border-t border-[#e5e5ea] pt-4 dark:border-white/10">
              {appt.ocularFee != null && appt.ocularFee > 0 && (
                <div>
                  {appt.ocularFeePaid ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Ocular Fee</p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-[#1d1d1f] dark:text-slate-100 mt-1">
                        {formatCurrency(appt.ocularFee)}
                      </p>
                    </>
                  ) : appt.ocularFeeStatus === 'pending' && isCustomer ? (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[linear-gradient(135deg,rgba(18,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)] p-4 space-y-3 shadow-md shadow-black/5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Ocular Fee Required</p>
                        <p className="text-lg font-bold text-[#1d1d1f] dark:text-slate-100">{formatCurrency(appt.ocularFee)}</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Pay before your appointment can be confirmed.</p>
                      <div className="grid grid-cols-1 gap-2 rounded-lg border border-blue-200/70 bg-blue-50/70 p-3 sm:grid-cols-2 dark:border-blue-400/20 dark:bg-blue-500/10">
                        <div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-[#8dbcf2]">Ocular Visit Date</p>
                          <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">
                            {formattedOcularVisitDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-[#8dbcf2]">Ocular Visit Time</p>
                          <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">
                            {formattedOcularVisitTime}
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="prominent"
                        className="w-full h-11 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                      >
                        <Link to={`/appointments/${appt._id}/pay-ocular-fee`} className="text-inherit no-underline">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pay {formatCurrency(appt.ocularFee)}
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Ocular Fee</p>
                      <p className="text-lg font-semibold text-[#1d1d1f] dark:text-slate-100 mt-1">
                        {formatCurrency(appt.ocularFee)}
                      </p>
                    </>
                  )}
                  {appt.ocularFeeMethod && (
                    <p className="text-xs text-[#6e6e73] dark:text-slate-400 capitalize mt-1">
                      via {appt.ocularFeeMethod.replace('_', ' ')}
                    </p>
                  )}
                </div>
              )}

              {appt.status === AppointmentStatus.CANCELLED && (appt.cancelReason || appt.internalNotes) && (
                <div className="mt-4">
                  <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">
                    Customer reason for cancellation
                  </p>
                  <p className="text-sm text-[#6e6e73] dark:text-slate-300">
                    {appt.cancelReason || appt.internalNotes}
                  </p>
                </div>
              )}

              {appt.internalNotes && isStaff && appt.status !== AppointmentStatus.CANCELLED && (
                <div className="mt-4">
                  <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Internal Notes</p>
                  <p className="text-sm text-[#6e6e73] dark:text-slate-300">{appt.internalNotes}</p>
                </div>
              )}

              <div className="mt-4">
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Created</p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300">
                  {format(new Date(appt.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Customer: Submit Location for Ocular Visit */}
      {canCustomerSubmitOcularLocation && (
        <Card className="rounded-xl border-blue-200 bg-blue-50/50 shadow-sm dark:border-blue-500/30 dark:bg-blue-900/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-blue-900 dark:text-blue-100">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Submit Site Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-800 dark:text-blue-200/90">
              {isReadyForOcularConsultation ? (
                'Your consultation is ready for an ocular visit. We will use your saved profile address to calculate the visit fee and continue scheduling.'
              ) : (
                <>
                  An ocular visit has been scheduled for{' '}
                  <strong>{formattedOcularVisitDate}</strong>.
                  We will use your saved profile address to calculate the visit fee and finalize your appointment.
                </>
              )}
            </p>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-blue-200 bg-white p-3 sm:grid-cols-2 dark:border-[#35557d] dark:bg-[#0d1724]">
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-[#8dbcf2]">Ocular Visit Date</p>
                <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">
                  {formattedOcularVisitDate}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-[#8dbcf2]">Ocular Visit Time</p>
                <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">
                  {formattedOcularVisitTime}
                </p>
              </div>
            </div>
            {customerAddress ? (
              <div className="rounded-lg border border-blue-200 bg-white p-3 dark:border-[#35557d] dark:bg-[#0d1724]">
                <p className="text-xs font-medium text-blue-700 dark:text-[#8dbcf2]">Using profile address</p>
                <p className="mt-0.5 break-words text-sm text-[#3a3a3e] dark:text-slate-200">{customerAddress}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/35 dark:bg-amber-500/10">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  No saved pinned address found in your profile. Please add one in Account Profile before submitting ocular location.
                </p>
              </div>
            )}

            {/* Live fee preview */}
            {feeLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-[#8dbcf2]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating visit fee...
              </div>
            )}
            {feeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="text-sm text-red-700 dark:text-red-200">{feeError}</p>
              </div>
            )}
            {feePreview && !feeLoading && (
              <div className={`space-y-2 rounded-lg border p-4 ${feePreview.fee.isWithinNCR 
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/20' 
                : 'border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Ocular Visit Fee</p>
                  {feePreview.fee.isWithinNCR ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> FREE
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-amber-800 dark:text-amber-300">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(feePreview.fee.total)}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 text-xs text-[#6e6e73] dark:text-slate-200">
                  <p>Distance: {feePreview.route.distanceKm.toFixed(1)} km · ~{feePreview.route.durationMinutes} min drive</p>
                  {feePreview.fee.isWithinNCR ? (
                    <p className="text-emerald-700 dark:text-emerald-300 font-medium">Within Metro Manila — no ocular visit fee</p>
                  ) : (
                    <>
                      <p>Base fee: ₱{feePreview.fee.baseFee} (first {feePreview.fee.baseCoveredKm} km)</p>
                      {feePreview.fee.additionalDistanceKm > 0 && (
                        <p>Additional: ₱{feePreview.fee.perKmRate}/km × {feePreview.fee.additionalDistanceKm.toFixed(1)} km = ₱{feePreview.fee.additionalFee}</p>
                      )}
                      <p className="mt-1 font-semibold text-amber-700 dark:text-amber-300">Payment required before your appointment can be confirmed.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Submit / Pay button */}
            {feePreview && !feeLoading && !feeError && (
              (() => {
                const addressStructured = {
                  street: user?.addressData?.street?.trim() || '',
                  barangay: user?.addressData?.barangay?.trim() || '',
                  city: user?.addressData?.city?.trim() || '',
                  province: user?.addressData?.province?.trim() || '',
                  zip: user?.addressData?.zip?.trim() || '',
                };
                const handleSubmit = async (redirect?: boolean) => {
                  if (!customerLocationPin) return;
                  if (!addressStructured.city) {
                    toast.error('Please set your profile address first before submitting ocular location');
                    return;
                  }
                  try {
                    const updatedAppointment = await submitLocationMutation.mutateAsync({
                      id: id!,
                      customerLocation: customerLocationPin,
                      formattedAddress: customerAddress || undefined,
                      addressStructured,
                    });
                    if (redirect) {
                      navigate(`/appointments/${updatedAppointment._id}/pay-ocular-fee`);
                    } else if (updatedAppointment._id !== id) {
                      toast.success('Location submitted! Your ocular appointment is ready for sales to finalize.');
                      navigate(`/appointments/${updatedAppointment._id}`);
                    } else {
                      toast.success('Location submitted! Your assigned sales staff will finalize your appointment.');
                    }
                  } catch (err) {
                    toast.error(extractErrorMessage(err, 'Failed to submit location'));
                  }
                };
                return feePreview.fee.isWithinNCR ? (
                  <Button
                    variant="prominent"
                    onClick={() => handleSubmit(false)}
                    disabled={submitLocationMutation.isPending}
                    className="h-11 w-full rounded-xl font-semibold sm:w-auto"
                  >
                    {submitLocationMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Submit Site Location
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="prominent"
                    onClick={() => handleSubmit(true)}
                    disabled={submitLocationMutation.isPending}
                    className="h-11 w-full rounded-xl font-semibold sm:w-auto"
                  >
                    {submitLocationMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Submit & Pay Ocular Fee ({new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(feePreview.fee.total)})
                      </>
                    )}
                  </Button>
                );
              })()
            )}
          </CardContent>
        </Card>
      )}

      {isSalesStaff && appt.type === 'ocular' && !appt.customerLocation && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 lg:col-span-2">
          <CardContent className="flex items-start gap-3 py-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Waiting for Customer Location</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200/90">
                The customer must submit their site address and map pin before you can start the ocular site visit workflow.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer / Staff: Read-only view of submitted site details */}
      {appt.siteDetailsStatus === 'submitted' && appt.customerSiteDetails && (
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#6e6e73] dark:text-slate-400" />
              Customer Site Details
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Submitted
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formatServiceTypeList(
              appt.customerSiteDetails.serviceTypes,
              appt.customerSiteDetails.serviceType,
              appt.customerSiteDetails.serviceTypeCustom,
            ) && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">
                  {getServiceItemLabel(
                    appt.customerSiteDetails.serviceTypes,
                    appt.customerSiteDetails.serviceType,
                    appt.customerSiteDetails.serviceTypeCustom,
                  )}
                </p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300">
                  {formatServiceTypeList(
                    appt.customerSiteDetails.serviceTypes,
                    appt.customerSiteDetails.serviceType,
                    appt.customerSiteDetails.serviceTypeCustom,
                  )}
                </p>
              </div>
            )}

            {appt.customerSiteDetails.customerRequirements && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Customer Requirements</p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300 whitespace-pre-wrap">{appt.customerSiteDetails.customerRequirements}</p>
              </div>
            )}

            {appt.customerSiteDetails.lineItems && appt.customerSiteDetails.lineItems.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400 mb-1">Measurements</p>
                <div className="rounded-lg border border-[#c8c8cd]/50 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f5f5f7] text-[#6e6e73]">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium">Item</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">L</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">W</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">H</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f0f5]">
                      {appt.customerSiteDetails.lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-[#3a3a3e] dark:text-slate-300">{item.label || `Item ${i + 1}`}</td>
                          <td className="px-3 py-2 text-right text-[#6e6e73]">{item.length ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-[#6e6e73]">{item.width ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-[#6e6e73]">{item.height ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-[#6e6e73]">{item.quantity ?? 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {appt.customerSiteDetails.siteConditions && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400 mb-1">Site Conditions</p>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 text-sm">
                  {appt.customerSiteDetails.siteConditions.environment && (
                    <div>
                      <span className="text-[#6e6e73]">Environment:</span>{' '}
                      <span className="text-[#3a3a3e] dark:text-slate-300 capitalize">{appt.customerSiteDetails.siteConditions.environment}</span>
                    </div>
                  )}
                  {appt.customerSiteDetails.siteConditions.hasElectrical != null && (
                    <div>
                      <span className="text-[#6e6e73]">Electrical:</span>{' '}
                      <span className="text-[#3a3a3e] dark:text-slate-300">{appt.customerSiteDetails.siteConditions.hasElectrical ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {appt.customerSiteDetails.siteConditions.accessNotes && (
                    <div className="col-span-2">
                      <span className="text-[#6e6e73]">Access Notes:</span>{' '}
                      <span className="text-[#3a3a3e] dark:text-slate-300">{appt.customerSiteDetails.siteConditions.accessNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(appt.customerSiteDetails.materials || appt.customerSiteDetails.finishes || appt.customerSiteDetails.preferredDesign) && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400 mb-1">Materials & Design</p>
                <div className="space-y-1 text-sm">
                  {appt.customerSiteDetails.materials && (
                    <p><span className="text-[#6e6e73] dark:text-slate-400">Materials:</span> <span className="text-[#3a3a3e] dark:text-slate-300">{appt.customerSiteDetails.materials}</span></p>
                  )}
                  {appt.customerSiteDetails.finishes && (
                    <p><span className="text-[#6e6e73] dark:text-slate-400">Finishes:</span> <span className="text-[#3a3a3e] dark:text-slate-300">{appt.customerSiteDetails.finishes}</span></p>
                  )}
                  {appt.customerSiteDetails.preferredDesign && (
                    <p><span className="text-[#6e6e73] dark:text-slate-400">Preferred Design:</span> <span className="text-[#3a3a3e] dark:text-slate-300">{appt.customerSiteDetails.preferredDesign}</span></p>
                  )}
                </div>
              </div>
            )}

            {appt.customerSiteDetails.notes && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Additional Notes</p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300 whitespace-pre-wrap">{appt.customerSiteDetails.notes}</p>
              </div>
            )}

            {/* Photo / file count summary */}
            <div className="flex flex-wrap gap-3 pt-1">
              {appt.customerSiteDetails.photoKeys && appt.customerSiteDetails.photoKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#6e6e73] bg-[#f0f0f5] rounded-full px-3 py-1">
                  <Camera className="h-3.5 w-3.5" /> {appt.customerSiteDetails.photoKeys.length} photo(s)
                </span>
              )}
              {appt.customerSiteDetails.referenceImageKeys && appt.customerSiteDetails.referenceImageKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#6e6e73] bg-[#f0f0f5] rounded-full px-3 py-1">
                  <Image className="h-3.5 w-3.5" /> {appt.customerSiteDetails.referenceImageKeys.length} reference(s)
                </span>
              )}
              {appt.customerSiteDetails.videoKeys && appt.customerSiteDetails.videoKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#6e6e73] bg-[#f0f0f5] rounded-full px-3 py-1">
                  {appt.customerSiteDetails.videoKeys.length} video(s)
                </span>
              )}
              {appt.customerSiteDetails.sketchKeys && appt.customerSiteDetails.sketchKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#6e6e73] bg-[#f0f0f5] rounded-full px-3 py-1">
                  {appt.customerSiteDetails.sketchKeys.length} sketch(es)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent: Assign Sales Staff & Confirm */}
      {canConfirmAppointment && appt.status === AppointmentStatus.REQUESTED && appt.type !== 'ocular' && (
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.26)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Assign Sales Staff & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {salesStaffList.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/5 dark:border-amber-500/10 dark:text-amber-400">
                <Users className="h-4 w-4 shrink-0" />
                <span>No sales staff found. Please create one in the admin panel first.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Select a staff member</label>
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {salesStaffList.map((s) => {
                    const isSelected = selectedSalesStaff === s._id;
                    const isAvailable = s.availabilityStatus === StaffAvailabilityStatus.AVAILABLE;
                    const isBlocked = s.assignmentEligible === false;
                    
                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => setSelectedSalesStaff(s._id)}
                        className={cn(
                          "w-full flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all duration-200 border relative group",
                          isSelected
                            ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/20 dark:border-blue-400/40 dark:bg-blue-500/10"
                            : "border-transparent bg-[#f5f5f7] hover:bg-[#ebebed] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]",
                          isBlocked && !isSelected && "opacity-60"
                        )}
                      >
                        {isBlocked && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-600 uppercase dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400">
                            <AlertCircle className="h-3 w-3" />
                            {s.assignmentBlockedReason || 'Ineligible'}
                          </div>
                        )}
                        <div className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-[#e5e5ea] text-[#6e6e73] dark:bg-white/10 dark:text-slate-400"
                        )}>
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1d1d1f] dark:text-slate-100 text-[15px] truncate block">
                              {s.firstName} {s.lastName}
                            </span>
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isAvailable ? "bg-emerald-500" : "bg-slate-400"
                            )} />
                          </div>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-[11px] font-medium text-[#6e6e73] dark:text-slate-500 uppercase tracking-wider">
                              {(s.availabilityStatus || 'setup_required').replace(/_/g, ' ')}
                            </span>
                            {s.activeShift && (
                              <span className="text-[11px] text-[#8e8e93] dark:text-slate-400">
                                {s.activeShift.shiftEndAt
                                  ? `${format(new Date(s.activeShift.shiftStartAt), 'h:mm a')} - ${format(new Date(s.activeShift.shiftEndAt), 'h:mm a')}`
                                  : `Timed in ${format(new Date(s.activeShift.shiftStartAt), 'h:mm a')}`}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#6e6e73] dark:text-slate-500">
                  Only eligible staff members can be assigned to this appointment.
                </p>
              </div>
            )}
            <Button
              onClick={handleConfirm}
              disabled={
                confirmMutation.isPending || 
                !selectedSalesStaff || 
                salesStaffList.find(s => s._id === selectedSalesStaff)?.assignmentEligible === false
              }
              className="h-10 w-full rounded-xl [background-image:none] bg-emerald-600 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 dark:border dark:border-emerald-700/40 dark:[background-image:none] dark:bg-[#1f7a5b] dark:text-white dark:shadow-[0_12px_24px_rgba(16,97,71,0.24)] dark:hover:bg-[#248667] dark:hover:border-emerald-500/40 dark:disabled:border-white/10 dark:disabled:bg-[#1b2432] dark:disabled:text-slate-500 dark:disabled:shadow-none"
            >
              {confirmMutation.isPending ? 'Confirming...' : 'Confirm & Assign'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sales Staff: Finalize Ocular (for REQUESTED oculars where customer has submitted location) */}
      {canFinalizeOcular && appt.type === 'ocular' && appt.status === AppointmentStatus.REQUESTED && appt.customerLocation && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50 shadow-sm dark:border-[#295447] dark:bg-[linear-gradient(180deg,rgba(10,28,24,0.96)_0%,rgba(8,19,19,0.98)_100%)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-900 dark:text-emerald-200">Finalize Ocular Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-emerald-800 dark:text-emerald-100/85">
              Customer has submitted their location. Finalize this ocular visit to proceed with your on-site workflow.
            </p>
            {appt.address && (
              <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Customer Address</p>
                <p className="mt-0.5 break-words text-sm text-emerald-900 dark:text-slate-100">{appt.address}</p>
              </div>
            )}
            {appt.ocularFee != null && appt.ocularFee > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Ocular Fee</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-900 dark:text-slate-100">{formatCurrency(appt.ocularFee)}</p>
              </div>
            )}
            <Button
              variant="prominent"
              onClick={async () => {
                try {
                  await finalizeMutation.mutateAsync({ id: id! });
                  toast.success('Ocular visit finalized. You can now proceed with the site visit workflow.', { duration: 5000 });
                } catch (err) {
                  toast.error(extractErrorMessage(err, 'Failed to finalize ocular'));
                }
              }}
              disabled={finalizeMutation.isPending}
              className="h-11 w-full rounded-xl text-sm font-semibold sm:w-auto"
            >
              {finalizeMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalizing...</>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finalize & Confirm
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">

        {/* Sales staff: CONFIRMED → actions */}
        {canCompleteAppointment && appt.status === AppointmentStatus.CONFIRMED && (
          <>
            {visitReports && visitReports.length > 0 ? (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to={`/visit-reports/${visitReports[0]!._id}`} state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Go to Visit Report
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to="/visit-reports" state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
            {/* Ocular: CONFIRMED → On The Way */}
            {isOcularAppointment && (
              <Button
                onClick={() => {
                  if (!canStartOcularProgress) {
                    toast.error(customerSiteLocationRequiredMessage);
                    return;
                  }
                  visitStatusMutation.mutateAsync({ id: id!, status: 'on_the_way' }).then(() => toast.success('Status updated: On the Way — the customer has been notified.')).catch((err: unknown) => toast.error(extractErrorMessage(err, 'Failed to update')));
                }}
                disabled={visitStatusMutation.isPending || !canStartOcularProgress}
                className="rounded-xl [background-image:none] bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] dark:border dark:border-[#39577a] dark:[background-image:none] dark:bg-[#21364f] dark:text-[#e3efff] dark:shadow-[0_12px_24px_rgba(19,47,79,0.24)] dark:hover:bg-[#294465]"
              >
                {visitStatusMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'On The Way'}
              </Button>
            )}
          </>
        )}

        {/* Sales staff: ON_THE_WAY → Arrived at Site */}
        {canCompleteAppointment && appt.status === AppointmentStatus.ON_THE_WAY && (
          <>
            {visitReports && visitReports.length > 0 ? (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to={`/visit-reports/${visitReports[0]!._id}`} state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Go to Visit Report
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to="/visit-reports" state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
            {isOcularAppointment && (
              <Button
                onClick={() => {
                  if (!canStartOcularProgress) {
                    toast.error(customerSiteLocationRequiredMessage);
                    return;
                  }
                  visitStatusMutation.mutateAsync({ id: id!, status: 'arrived_at_site' }).then(() => toast.success('Status updated: Arrived at Site.')).catch((err: unknown) => toast.error(extractErrorMessage(err, 'Failed to update')));
                }}
                disabled={visitStatusMutation.isPending || !canStartOcularProgress}
                className="rounded-xl [background-image:none] bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] dark:border dark:border-[#39577a] dark:[background-image:none] dark:bg-[#21364f] dark:text-[#e3efff] dark:shadow-[0_12px_24px_rgba(19,47,79,0.24)] dark:hover:bg-[#294465]"
              >
                {visitStatusMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Arrived at Site'}
              </Button>
            )}
          </>
        )}

        {/* Sales staff: ARRIVED_AT_SITE → Start Site Visit */}
        {canCompleteAppointment && appt.status === AppointmentStatus.ARRIVED_AT_SITE && (
          <>
            {visitReports && visitReports.length > 0 ? (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to={`/visit-reports/${visitReports[0]!._id}`} state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Go to Visit Report
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to="/visit-reports" state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
            {isOcularAppointment && (
              <Button
                onClick={() => {
                  if (!canStartOcularProgress) {
                    toast.error(customerSiteLocationRequiredMessage);
                    return;
                  }
                  visitStatusMutation.mutateAsync({ id: id!, status: 'in_progress' }).then(() => toast.success('Status updated: Site Visit in Progress.')).catch((err: unknown) => toast.error(extractErrorMessage(err, 'Failed to update')));
                }}
                disabled={visitStatusMutation.isPending || !canStartOcularProgress}
                className="rounded-xl [background-image:none] bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] dark:border dark:border-[#39577a] dark:[background-image:none] dark:bg-[#21364f] dark:text-[#e3efff] dark:shadow-[0_12px_24px_rgba(19,47,79,0.24)] dark:hover:bg-[#294465]"
              >
                {visitStatusMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Start Site Visit'}
              </Button>
            )}
          </>
        )}

        {/* Sales staff: IN_PROGRESS → Visit Report link */}
        {canCompleteAppointment && appt.status === AppointmentStatus.IN_PROGRESS && (
          <>
            {visitReports && visitReports.length > 0 ? (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to={`/visit-reports/${visitReports[0]!._id}`} state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Go to Visit Report
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to="/visit-reports" state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
          </>
        )}

        {/* Sales staff: COMPLETED → Visit Report link */}
        {canCompleteAppointment && appt.status === AppointmentStatus.COMPLETED && (
          <>
            {visitReports && visitReports.length > 0 ? (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to={`/visit-reports/${visitReports[0]!._id}`} state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Go to Visit Report
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to="/visit-reports" state={{ from: sourcePath }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
          </>
        )}

        {isAdmin &&
          [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.PREPARING].includes(
            appt.status as AppointmentStatus,
          ) && (
            <>
              <Button
                variant="destructive"
                onClick={() => setCancelOpen(true)}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </>
          )}

        {/* Customer: Reschedule guidance card (on_the_way or completed) */}
        {isCustomer && appt.ocularFeePaid &&
          [AppointmentStatus.ON_THE_WAY, AppointmentStatus.COMPLETED].includes(appt.status as AppointmentStatus) && (
          <Card className="rounded-xl border-blue-200 bg-blue-50 w-full">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Visit Information</p>
                  <p className="mt-1 text-blue-700">
                    If you need to reschedule or have issues with the current visit, please contact us immediately:
                  </p>
                  <div className="mt-2 space-y-0.5 text-blue-600">
                    <p>Email: rmvstainless@gmail.com</p>
                    <p>Phone: 02-9506187 / 0945 285 2974</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sales Staff: Record Cash Payment (for cash_pending appointments) */}
        {canCompleteAppointment && appt.ocularFeeStatus === 'cash_pending' && (
          <Button
            onClick={() => navigate('/cash')}
            variant="prominent"
            className="rounded-xl h-10 px-6"
          >
            <Banknote className="mr-2 h-4 w-4" />
            Record Cash Payment
          </Button>
        )}
      </div>

      {/* Cancel with reason dialog */}
      <Dialog open={cancelOpen} onOpenChange={(open) => { setCancelOpen(open); if (!open) setCancelReason(''); }}>
        <DialogContent className="max-w-md rounded-2xl border border-[#d6d9df] bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(246,248,251,1)_100%)] text-[#111827] shadow-[0_28px_70px_rgba(15,23,42,0.18)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(9,14,22,1)_0%,rgba(6,10,17,1)_100%)] dark:text-slate-100 dark:shadow-[0_30px_80px_rgba(0,0,0,0.52)]">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f] dark:text-slate-100">Cancel Appointment</DialogTitle>
            <DialogDescription className="text-[#6e6e73] dark:text-slate-400">
              Please provide a reason for cancellation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium text-[#3a3a3e] dark:text-slate-300">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Schedule conflict, changed plans..."
              value={cancelReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
              className="min-h-[112px] rounded-2xl border border-[#cfd5dd] bg-[#ffffff] text-[#111827] placeholder:text-[#6b7280] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] focus-visible:ring-[#1f2937]/20 dark:border-white/14 dark:bg-[#0d1724] dark:text-slate-100 dark:placeholder:text-slate-500 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:focus-visible:ring-white/15"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => { setCancelOpen(false); setCancelReason(''); }}
              className="rounded-xl h-10 px-6 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              className="rounded-xl"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
