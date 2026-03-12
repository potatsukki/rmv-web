import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, User, Phone, CreditCard, CheckCircle2, Users, FileText, Camera, Image, Loader2, RotateCcw, Mail, Banknote, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage, extractLocalDateValue } from '@/lib/utils';
import { reverseGeocodeLocation, fetchOcularFeePreview, type MapPoint, type OcularFeePreview } from '@/lib/maps';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import {
  useAppointment,
  useConfirmAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useMarkNoShow,
  useUpdateVisitStatus,
  useRefundOcularFee,
  useAgentFinalizeOcular,
  useCustomerSubmitLocation,
} from '@/hooks/useAppointments';
import { useVisitReportsByAppointment } from '@/hooks/useVisitReports';
import { useSubmitRefundRequest, useMyRefundRequests } from '@/hooks/useRefunds';
import { useAuthStore } from '@/stores/auth.store';
import { Role, AppointmentStatus } from '@/lib/constants';
import { SERVICE_TYPE_LABELS } from '@/lib/constants';
import { Suspense, lazy, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ApiResponse, Appointment } from '@/lib/types';

const LazyLocationPicker = lazy(() =>
  import('@/components/maps/LocationPicker').then((module) => ({ default: module.LocationPicker })),
);

const LazyLocationView = lazy(() =>
  import('@/components/maps/LocationView').then((module) => ({ default: module.LocationView })),
);

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: appt, isLoading, isError, refetch } = useAppointment(id!);

  const savedProfileLocation =
    user?.addressData?.lat != null && user?.addressData?.lng != null
      ? { lat: user.addressData.lat, lng: user.addressData.lng }
      : null;
  const savedProfileFormattedAddress = user?.addressData?.formattedAddress || '';

  const confirmMutation = useConfirmAppointment();
  const completeMutation = useCompleteAppointment();
  const cancelMutation = useCancelAppointment();
  const noShowMutation = useMarkNoShow();
  const visitStatusMutation = useUpdateVisitStatus();
  const refundMutation = useRefundOcularFee();
  const finalizeMutation = useAgentFinalizeOcular();
  const submitLocationMutation = useCustomerSubmitLocation();

  // Customer location submission state
  const [customerLocationPin, setCustomerLocationPin] = useState<MapPoint | null>(savedProfileLocation);
  const [customerAddress, setCustomerAddress] = useState(savedProfileFormattedAddress);
  const [feePreview, setFeePreview] = useState<OcularFeePreview | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  // Official address state — pre-filled from user profile
  const [addrStreet, setAddrStreet] = useState(user?.addressData?.street ?? '');
  const [addrBarangay, setAddrBarangay] = useState(user?.addressData?.barangay ?? '');
  const [addrCity, setAddrCity] = useState(user?.addressData?.city ?? '');
  const [addrProvince, setAddrProvince] = useState(user?.addressData?.province ?? '');
  const [addrZip, setAddrZip] = useState(user?.addressData?.zip ?? '');

  const isCustomer = user?.roles.includes(Role.CUSTOMER);
  const isAgent = user?.roles.includes(Role.APPOINTMENT_AGENT);
  const isSalesStaff = user?.roles.includes(Role.SALES_STAFF);
  const isAdmin = user?.roles.includes(Role.ADMIN);

  // Fetch visit reports — only for roles that have access (not customers)
  const canSeeVisitReports = isSalesStaff || isAdmin || user?.roles.includes(Role.ENGINEER) || isAgent;
  const { data: visitReports } = useVisitReportsByAppointment(canSeeVisitReports ? id! : '');

  // Refund request
  const submitRefundMutation = useSubmitRefundRequest();
  const { data: myRefundRequests } = useMyRefundRequests(!!isCustomer);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [selectedSalesStaff, setSelectedSalesStaff] = useState('');
  const [finalizeSalesStaff, setFinalizeSalesStaff] = useState('');
  const [salesStaffList, setSalesStaffList] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);
  const [previousStaff, setPreviousStaff] = useState<{ _id: string; name: string } | null>(null);
  const [previousStaffLoading, setPreviousStaffLoading] = useState(false);

  // Customer refund request form state
  const [customerRefundOpen, setCustomerRefundOpen] = useState(false);
  const [customerRefundReason, setCustomerRefundReason] = useState('');
  const [customerRefundMethod, setCustomerRefundMethod] = useState<'gcash' | 'bank_transfer'>('gcash');
  const [customerRefundAccountName, setCustomerRefundAccountName] = useState('');
  const [customerRefundAccountNumber, setCustomerRefundAccountNumber] = useState('');
  const [customerRefundBankName, setCustomerRefundBankName] = useState('');

  const canConfirmAppointment = !!(isAgent || isAdmin);
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

  // Fetch sales staff list when the agent views a requested appointment
  useEffect(() => {
    if (canConfirmAppointment) {
      api.get<ApiResponse<{ _id: string; firstName: string; lastName: string }[]>>('/users/sales-staff')
        .then(res => setSalesStaffList(res.data.data))
        .catch(() => {});
    }
  }, [canConfirmAppointment]);

  // Auto-detect previous consultation's sales staff for ocular appointments
  useEffect(() => {
    if (!canConfirmAppointment || !appt || appt.type !== 'ocular') return;
    setPreviousStaffLoading(true);
    api.get<ApiResponse<{ items: Appointment[] }>>('/appointments', { params: { customerId: appt.customerId, type: 'office', limit: 5, sortBy: 'date', sortOrder: 'desc' } })
      .then(res => {
        const items = res.data.data?.items || [];
        const found = items.find((a: Appointment) => a.salesStaffId && a.salesStaffName);
        if (found?.salesStaffId && found?.salesStaffName) {
          setPreviousStaff({ _id: found.salesStaffId, name: found.salesStaffName });
          setFinalizeSalesStaff(found.salesStaffId);
        }
      })
      .catch(() => {})
      .finally(() => setPreviousStaffLoading(false));
  }, [canConfirmAppointment, appt?.customerId, appt?.type]);

  if (isLoading) return <PageLoader />;
  if (isError || !appt) return <PageError onRetry={refetch} />;

  const customerCanManageAppointment =
    isCustomer &&
    [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.PREPARING].includes(
      appt.status as AppointmentStatus,
    );
  const customerCanReschedule =
    customerCanManageAppointment && appt.rescheduleCount < appt.maxReschedules;

  const handleConfirm = async () => {
    if (!selectedSalesStaff) {
      toast.error('Please select a sales staff member to assign');
      return;
    }
    try {
      await confirmMutation.mutateAsync({ id: id!, salesStaffId: selectedSalesStaff });
      toast.success(
        'Appointment confirmed! The assigned sales staff has been notified and can proceed with the scheduled visit flow.',
        { duration: 5000 },
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to confirm'));
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync(id!);
      toast.success(
        appt.type === 'ocular'
          ? 'Appointment completed! Sales staff can now submit the ocular report to update the project for engineering review.'
          : 'Appointment completed! Sales staff can now submit the consultation report to create the draft project and hand off to ocular scheduling.',
        { duration: 5000 },
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to complete'));
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

  const handleNoShow = async () => {
    try {
      await noShowMutation.mutateAsync(id!);
      toast.success('Marked as no-show');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to mark as no-show'));
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

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

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
      <div className="mt-0.5 rounded-lg bg-[#f0f0f5] dark:bg-slate-800 p-2">
        <Icon className="h-4 w-4 text-[#6e6e73] dark:text-slate-400" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">{label}</p>
        <p className="text-sm text-[#6e6e73] dark:text-slate-300">{value}</p>
      </div>
    </div>
  );

  const SummaryCard = ({
    label,
    value,
    tone = 'default',
  }: {
    label: string;
    value: string;
    tone?: 'default' | 'accent';
  }) => (
    <div
      className={tone === 'accent'
        ? 'rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 p-4 shadow-sm'
        : 'rounded-2xl border border-[#d2d2d7] dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 p-4 shadow-sm'}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b] dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#1d1d1f] dark:text-slate-100 sm:text-base">{value}</p>
    </div>
  );

  const MapPanelFallback = ({ message }: { message: string }) => (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#d2d2d7] dark:border-slate-700 bg-[#f5f5f7]/80 dark:bg-slate-800/80 px-5 py-8 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-[#6e6e73] dark:text-slate-400" />
      <p className="mt-3 text-sm font-medium text-[#1d1d1f] dark:text-slate-100">Loading map tools</p>
      <p className="mt-1 max-w-sm text-xs text-[#6e6e73] dark:text-slate-400">{message}</p>
    </div>
  );

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
                  ? appt.type === 'ocular' && !appt.customerLocation
                    ? 'Please submit your site location below so the agent can finalize your appointment.'
                    : appt.type === 'ocular' && !appt.ocularFeePaid
                    ? 'Please pay the ocular visit fee to proceed. An agent will confirm your appointment once payment is received.'
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
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Confirmed - Ready to Visit</p>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-0.5">
                {isCustomer
                  ? 'Your appointment is confirmed. The assigned sales staff will visit on the scheduled date.'
                  : 'Mark yourself as "On the Way" when heading to the site, then mark "Complete" after the visit.'}
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
                  : 'You are on the way. After the visit, mark this appointment as "Complete" and fill out the visit report.'}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Visit Schedule"
          value={`${format(new Date(appt.date), 'MMM d, yyyy')} • ${formatSlotTime(appt.slotCode)}`}
          tone="accent"
        />
        <SummaryCard
          label="Appointment Type"
          value={`${appt.type.charAt(0).toUpperCase() + appt.type.slice(1)} Visit`}
        />
        <SummaryCard
          label={isCustomer ? 'Assigned Staff' : 'Customer'}
          value={isCustomer ? appt.salesStaffName || 'Pending assignment' : appt.customerName || 'Not yet attached'}
        />
        <SummaryCard
          label="Location & Fee"
          value={appt.type === 'ocular'
            ? appt.ocularFeePaid
              ? `Fee paid • ${appt.customerLocation ? 'Pin saved' : 'No pin yet'}`
              : appt.ocularFee
                ? `${formatCurrency(appt.ocularFee)} pending`
                : appt.customerLocation
                  ? 'Pin submitted • awaiting fee'
                  : 'Awaiting site pin'
            : appt.address || 'Office visit'}
        />
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info */}
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Appointment Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={Clock}
              label="Date & Time"
              value={`${format(new Date(appt.date), 'EEEE, MMMM d, yyyy')} at ${formatSlotTime(appt.slotCode)}`}
            />

            <InfoRow
              icon={User}
              label="Type"
              value={`${appt.type.charAt(0).toUpperCase() + appt.type.slice(1)} Visit`}
            />

            {appt.serviceType && (
              <InfoRow
                icon={FileText}
                label="Service Type"
                value={
                  appt.serviceType === 'custom'
                    ? (appt.serviceTypeCustom || 'Custom')
                    : (SERVICE_TYPE_LABELS[appt.serviceType] || appt.serviceType)
                }
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
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-300 hover:underline"
                >
                  <MapPin className="h-3 w-3" /> Open in Google Maps
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ocular Fee & Reschedules */}
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Additional Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appt.ocularFee != null && appt.ocularFee > 0 && (
              <div>
                {appt.ocularFeeStatus === 'refunded' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Ocular Fee</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">
                        Refunded
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-[#86868b] dark:text-slate-500 line-through mt-1">
                      {formatCurrency(appt.ocularFee)}
                    </p>
                    {appt.ocularFeeRefundReason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {appt.ocularFeeRefundReason}</p>
                    )}
                    {appt.ocularFeeRefundedAt && (
                      <p className="text-xs text-[#86868b] dark:text-slate-400 mt-0.5">
                        Refunded on {format(new Date(appt.ocularFeeRefundedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </>
                ) : appt.ocularFeePaid ? (
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
                    {/* Admin: Refund button */}
                    {isAdmin && ![AppointmentStatus.ON_THE_WAY, AppointmentStatus.COMPLETED].includes(appt.status as AppointmentStatus) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRefundOpen(true)}
                        className="mt-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs h-8"
                      >
                        Issue Refund
                      </Button>
                    )}
                  </>
                ) : appt.ocularFeeStatus === 'pending' && isCustomer ? (
                  <div className="rounded-xl border border-[#c8c8cd] bg-[#f0f0f5] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Ocular Fee Required</p>
                      <p className="text-lg font-bold text-[#1d1d1f] dark:text-slate-100">{formatCurrency(appt.ocularFee)}</p>
                    </div>
                    <p className="text-xs text-[#6e6e73] dark:text-slate-400">Pay before your appointment can be confirmed.</p>
                    <Button
                      asChild
                      className="w-full bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl h-10"
                    >
                      <Link to={`/appointments/${appt._id}/pay-ocular-fee`}>
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

            <div>
              <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Reschedules</p>
              <p className="text-sm text-[#6e6e73] dark:text-slate-300">
                {appt.rescheduleCount} / {appt.maxReschedules} used
              </p>
            </div>

            {appt.internalNotes && isStaff && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Internal Notes</p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300">{appt.internalNotes}</p>
              </div>
            )}

            <div>
              <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Created</p>
              <p className="text-sm text-[#6e6e73] dark:text-slate-300">
                {format(new Date(appt.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </CardContent>
        </Card>



      {/* Customer: Submit Location for Ocular Visit */}
      {isCustomer && appt.type === 'ocular' && appt.status === AppointmentStatus.REQUESTED && !appt.customerLocation && !appt.ocularFeePaid && (
        <Card className="rounded-xl border-blue-200 bg-blue-50/50 shadow-sm dark:border-[#29476b] dark:bg-[linear-gradient(180deg,rgba(14,25,38,0.96)_0%,rgba(8,16,27,0.98)_100%)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-blue-900 dark:text-[#d7e8ff]">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-[#72aeea]" />
              Provide Your Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-800 dark:text-[#a9c9ee]">
              An ocular visit has been scheduled for{' '}
              <strong>{format(new Date(appt.date), 'MMMM d, yyyy')}</strong>.
              Please pin your site location on the map so we can calculate the visit fee and finalize your appointment.
            </p>
            <Suspense fallback={<MapPanelFallback message="Loading the site-pin picker so you can submit your visit location." />}>
              <LazyLocationPicker
                value={customerLocationPin}
                onChange={(loc, addrHint) => {
                  setCustomerLocationPin(loc);
                  if (addrHint) setCustomerAddress(addrHint);
                  else {
                    reverseGeocodeLocation(loc)
                      .then(addr => setCustomerAddress(addr || ''))
                      .catch(() => {});
                  }
                }}
              />
            </Suspense>
            {customerAddress && (
              <div className="rounded-lg border border-blue-200 bg-white p-3 dark:border-[#35557d] dark:bg-[#0d1724]">
                <p className="text-xs font-medium text-blue-700 dark:text-[#8dbcf2]">Resolved Address</p>
                <p className="mt-0.5 text-sm text-[#3a3a3e] dark:text-slate-200">{customerAddress}</p>
              </div>
            )}

            {/* Official address */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Official Site Address</p>
                {!user?.addressData?.street && !user?.addressData?.city && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Not set in profile — please fill in
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-slate-400">This is the official address of the site to be visited. You can adjust it if needed.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="addr-street" className="text-xs font-medium text-[#3a3a3e] dark:text-slate-300">Street / Unit / Building</Label>
                  <Input
                    id="addr-street"
                    value={addrStreet}
                    onChange={e => setAddrStreet(e.target.value)}
                    placeholder="e.g. 123 Rizal St."
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-barangay" className="text-xs font-medium text-[#3a3a3e] dark:text-slate-300">Barangay</Label>
                  <Input
                    id="addr-barangay"
                    value={addrBarangay}
                    onChange={e => setAddrBarangay(e.target.value)}
                    placeholder="e.g. Barangay 1"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-city" className="text-xs font-medium text-[#3a3a3e] dark:text-slate-300">City / Municipality</Label>
                  <Input
                    id="addr-city"
                    value={addrCity}
                    onChange={e => setAddrCity(e.target.value)}
                    placeholder="e.g. Quezon City"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-province" className="text-xs font-medium text-[#3a3a3e] dark:text-slate-300">Province / Region</Label>
                  <Input
                    id="addr-province"
                    value={addrProvince}
                    onChange={e => setAddrProvince(e.target.value)}
                    placeholder="e.g. Metro Manila"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-zip" className="text-xs font-medium text-[#3a3a3e] dark:text-slate-300">ZIP Code</Label>
                  <Input
                    id="addr-zip"
                    value={addrZip}
                    onChange={e => setAddrZip(e.target.value)}
                    placeholder="e.g. 1100"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>
            </div>

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
              <div className={`space-y-2 rounded-lg border p-4 ${feePreview.fee.isWithinNCR ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Ocular Visit Fee</p>
                  {feePreview.fee.isWithinNCR ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> FREE
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-amber-800 dark:text-amber-200">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(feePreview.fee.total)}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 text-xs text-[#6e6e73] dark:text-slate-300">
                  <p>Distance: {feePreview.route.distanceKm.toFixed(1)} km · ~{feePreview.route.durationMinutes} min drive</p>
                  {feePreview.fee.isWithinNCR ? (
                    <p className="text-emerald-700 dark:text-emerald-200">Within Metro Manila — no ocular visit fee</p>
                  ) : (
                    <>
                      <p>Base fee: ₱{feePreview.fee.baseFee} (first {feePreview.fee.baseCoveredKm} km)</p>
                      {feePreview.fee.additionalDistanceKm > 0 && (
                        <p>Additional: ₱{feePreview.fee.perKmRate}/km × {feePreview.fee.additionalDistanceKm.toFixed(1)} km = ₱{feePreview.fee.additionalFee}</p>
                      )}
                      <p className="mt-1 font-medium text-amber-700 dark:text-amber-200">Payment required before your appointment can be confirmed.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Submit / Pay button */}
            {feePreview && !feeLoading && !feeError && (
              (() => {
                const addressStructured = {
                  street: addrStreet.trim(),
                  barangay: addrBarangay.trim(),
                  city: addrCity.trim(),
                  province: addrProvince.trim(),
                  zip: addrZip.trim(),
                };
                const handleSubmit = async (redirect?: boolean) => {
                  if (!customerLocationPin) return;
                  if (!addrCity.trim()) {
                    toast.error('Please enter at least the city/municipality for the official address');
                    return;
                  }
                  try {
                    await submitLocationMutation.mutateAsync({
                      id: id!,
                      customerLocation: customerLocationPin,
                      formattedAddress: customerAddress || undefined,
                      addressStructured,
                    });
                    if (redirect) {
                      navigate(`/appointments/${id}/pay-ocular-fee`);
                    } else {
                      toast.success('Location submitted! The agent will finalize your appointment.');
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
                        Submit Location
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

      {/* Customer: Waiting for agent finalization (within NCR — no payment needed) */}
      {isCustomer && appt.type === 'ocular' && appt.status === AppointmentStatus.REQUESTED && appt.customerLocation && (appt.ocularFeeBreakdown?.isWithinNCR || appt.ocularFeePaid) && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 shadow-sm lg:col-span-2">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Location Submitted</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {appt.address || 'Your location has been submitted.'}
                  {' '}Waiting for our agent to finalize your appointment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer: Location submitted but ocular fee not paid (outside NCR) */}
      {isCustomer && appt.type === 'ocular' && appt.status === AppointmentStatus.REQUESTED && appt.customerLocation && !appt.ocularFeeBreakdown?.isWithinNCR && !appt.ocularFeePaid && appt.ocularFeeStatus === 'pending' && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50 shadow-sm lg:col-span-2">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Ocular Fee Payment Required</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your location is outside Metro Manila. Please pay the ocular visit fee to proceed.
                </p>
              </div>
              {appt.ocularFee != null && (
                <p className="text-lg font-bold text-amber-800">
                  {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(appt.ocularFee)}
                </p>
              )}
            </div>
            <Button
              asChild
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl w-full sm:w-auto h-10"
            >
              <Link to={`/appointments/${appt._id}/pay-ocular-fee`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Ocular Fee
              </Link>
            </Button>
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
            {appt.customerSiteDetails.serviceType && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400">Service Type</p>
                <p className="text-sm text-[#6e6e73] dark:text-slate-300">{SERVICE_TYPE_LABELS[appt.customerSiteDetails.serviceType] || appt.customerSiteDetails.serviceType}</p>
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
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.26)]">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f] dark:text-slate-100">Assign Sales Staff & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {salesStaffList.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                <Users className="h-4 w-4 shrink-0" />
                <span>No sales staff found. Please create one in the admin panel first.</span>
              </div>
            ) : (
              <div>
                <label className="block text-[13px] font-medium text-[#3a3a3e] dark:text-slate-400 mb-2.5">Sales Staff</label>
                <Select
                  value={selectedSalesStaff}
                  onValueChange={(val) => setSelectedSalesStaff(val)}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] focus:border-[#c8c8cd] focus:ring-1 focus:ring-[#e8e8ed] focus:ring-offset-0 dark:border-[#2f4563] dark:bg-[#1c2a42] dark:text-slate-100 dark:hover:border-[#3d587d] dark:focus:border-[#4f7097] dark:focus:ring-[#4f7097]/20">
                    <SelectValue placeholder="Choose a sales staff member..." />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-3rem)] rounded-xl border-[#d2d2d7] bg-white shadow-lg dark:border-[#2f4563] dark:bg-[#1c2a42]">
                    {salesStaffList.map((s) => (
                      <SelectItem key={s._id} value={s._id} className="cursor-pointer rounded-lg py-2.5 text-sm text-[#1d1d1f] dark:text-slate-100 focus:bg-[#f0f0f5] focus:text-[#1d1d1f] dark:focus:bg-[#243754] dark:focus:text-white data-[highlighted]:bg-[#f0f0f5] data-[highlighted]:text-[#1d1d1f] dark:data-[highlighted]:bg-[#243754] dark:data-[highlighted]:text-white">
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || !selectedSalesStaff}
              className="h-10 w-full rounded-xl [background-image:none] bg-emerald-600 text-sm text-white hover:bg-emerald-700 disabled:opacity-100 dark:border dark:border-emerald-700/40 dark:[background-image:none] dark:bg-[#1f7a5b] dark:text-white dark:shadow-[0_12px_24px_rgba(16,97,71,0.24)] dark:hover:bg-[#248667] dark:hover:border-emerald-500/40 dark:disabled:border-white/10 dark:disabled:bg-[#1b2432] dark:disabled:text-slate-500 dark:disabled:shadow-none sm:w-auto"
            >
              Confirm & Assign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agent: Finalize Ocular (for REQUESTED oculars where customer has submitted location) */}
      {canConfirmAppointment && appt.type === 'ocular' && appt.status === AppointmentStatus.REQUESTED && appt.customerLocation && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50 shadow-sm dark:border-[#295447] dark:bg-[linear-gradient(180deg,rgba(10,28,24,0.96)_0%,rgba(8,19,19,0.98)_100%)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-900 dark:text-emerald-200">Finalize Ocular Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-emerald-800 dark:text-emerald-100/85">
              Customer has submitted their location. {previousStaff ? 'The sales staff from the previous consultation will be assigned.' : 'Assign a sales staff member to finalize this ocular appointment.'}
            </p>
            {appt.address && (
              <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Customer Address</p>
                <p className="mt-0.5 text-sm text-emerald-900 dark:text-slate-100">{appt.address}</p>
              </div>
            )}
            {appt.ocularFee != null && appt.ocularFee > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Ocular Fee</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-900 dark:text-slate-100">{formatCurrency(appt.ocularFee)}</p>
              </div>
            )}
            {previousStaffLoading ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
                <Loader2 className="h-4 w-4 animate-spin" /> Looking up previous sales staff...
              </div>
            ) : previousStaff ? (
              <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Assigned Sales Staff (from consultation)</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-900 dark:text-slate-100">{previousStaff.name}</p>
              </div>
            ) : salesStaffList.length > 0 ? (
              <div>
                <label className="mb-2 block text-[13px] font-medium text-emerald-800 dark:text-emerald-200">Assign Sales Staff</label>
                <Select value={finalizeSalesStaff} onValueChange={setFinalizeSalesStaff}>
                  <SelectTrigger className="h-12 w-full rounded-xl border-emerald-300 bg-white px-4 text-base text-[#1d1d1f] focus:ring-1 focus:ring-emerald-300 dark:border-emerald-700/60 dark:bg-[#1c2a42] dark:text-slate-100 dark:focus:ring-emerald-500/20">
                    <SelectValue placeholder="Choose a sales staff member..." />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-3rem)] rounded-xl border-[#d2d2d7] bg-white shadow-lg dark:border-[#2f4563] dark:bg-[#1c2a42]">
                    {salesStaffList.map((s) => (
                      <SelectItem key={s._id} value={s._id} className="cursor-pointer rounded-lg py-2.5 text-sm text-[#1d1d1f] dark:text-slate-100 dark:data-[highlighted]:bg-[#243754] dark:data-[highlighted]:text-white">
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              variant="prominent"
              onClick={async () => {
                const staffId = previousStaff?._id || finalizeSalesStaff;
                if (!staffId && !previousStaff) {
                  toast.error('Please select a sales staff member');
                  return;
                }
                try {
                  await finalizeMutation.mutateAsync({ id: id!, ...(staffId ? { salesStaffId: staffId } : {}) });
                  toast.success('Ocular visit finalized! The customer will be asked to pay the ocular fee, then sales staff can proceed with the site visit.', { duration: 5000 });
                } catch (err) {
                  toast.error(extractErrorMessage(err, 'Failed to finalize ocular'));
                }
              }}
              disabled={finalizeMutation.isPending || (!previousStaff && !finalizeSalesStaff) || previousStaffLoading}
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
                <Link to={`/visit-reports/${visitReports[0]!._id}`}>
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
                <Link to="/visit-reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
            {/* Ocular: CONFIRMED → On The Way */}
            {appt.type === 'ocular' && (
              <Button
                onClick={() => visitStatusMutation.mutateAsync({ id: id!, status: 'on_the_way' }).then(() => toast.success('Status updated: On the Way — the customer has been notified.')).catch((err: unknown) => toast.error(extractErrorMessage(err, 'Failed to update')))}
                disabled={visitStatusMutation.isPending}
                className="rounded-xl [background-image:none] bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] dark:border dark:border-[#39577a] dark:[background-image:none] dark:bg-[#21364f] dark:text-[#e3efff] dark:shadow-[0_12px_24px_rgba(19,47,79,0.24)] dark:hover:bg-[#294465]"
              >
                {visitStatusMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'On The Way'}
              </Button>
            )}
            {/* Office: CONFIRMED → Complete */}
            {appt.type === 'office' && (
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="rounded-xl [background-image:none] bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] dark:border dark:border-emerald-700/45 dark:[background-image:none] dark:bg-[#1f7a5b] dark:text-white dark:shadow-[0_12px_24px_rgba(16,97,71,0.24)] dark:hover:bg-[#248667]"
              >
                {completeMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Completing...</> : 'Mark Complete'}
              </Button>
            )}
            <Button
              onClick={handleNoShow}
              disabled={noShowMutation.isPending}
              className="rounded-xl border border-[#cb8b86] [background-image:none] bg-[#fff5f4] text-[#8a4a47] shadow-none hover:bg-[#fdeceb] hover:text-[#7a403c] dark:border-[#7d4342] dark:[background-image:none] dark:bg-[#3a1f21] dark:text-[#ffd7d2] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:bg-[#482628] dark:hover:text-[#ffe7e3]"
            >
              {noShowMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Mark No-Show'}
            </Button>
          </>
        )}

        {/* Sales staff: ON_THE_WAY → Complete */}
        {canCompleteAppointment && appt.status === AppointmentStatus.ON_THE_WAY && (
          <>
            {visitReports && visitReports.length > 0 ? (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] dark:border-[#39577a] dark:bg-[#16253a] dark:text-[#c8dfff] dark:hover:border-[#4d7099] dark:hover:bg-[#1d314d] dark:hover:text-[#e2efff]"
              >
                <Link to={`/visit-reports/${visitReports[0]!._id}`}>
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
                <Link to="/visit-reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
            <Button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="rounded-xl [background-image:none] bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] dark:border dark:border-emerald-700/45 dark:[background-image:none] dark:bg-[#1f7a5b] dark:text-white dark:shadow-[0_12px_24px_rgba(16,97,71,0.24)] dark:hover:bg-[#248667]"
            >
              {completeMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Completing...</> : 'Mark Complete'}
            </Button>
            <Button
              onClick={handleNoShow}
              disabled={noShowMutation.isPending}
              className="rounded-xl border border-[#cb8b86] [background-image:none] bg-[#fff5f4] text-[#8a4a47] shadow-none hover:bg-[#fdeceb] hover:text-[#7a403c] dark:border-[#7d4342] dark:[background-image:none] dark:bg-[#3a1f21] dark:text-[#ffd7d2] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:bg-[#482628] dark:hover:text-[#ffe7e3]"
            >
              {noShowMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Mark No-Show'}
            </Button>
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
                <Link to={`/visit-reports/${visitReports[0]!._id}`}>
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
                <Link to="/visit-reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Reports
                </Link>
              </Button>
            )}
          </>
        )}

        {/* Agent: Schedule Ocular Visit (for completed office appointments) */}
        {canConfirmAppointment && appt.status === AppointmentStatus.COMPLETED && appt.type === 'office' && (() => {
          const consultationReport = visitReports?.find(r => r.visitType === 'consultation');
          const recDate = extractLocalDateValue(consultationReport?.recommendedOcularDate);
          const recSlot = consultationReport?.recommendedOcularSlot ?? '';
          const params = new URLSearchParams({
            ocularFor: appt.customerId,
            appointmentId: appt._id,
            ...(recDate && { recommendedDate: recDate }),
            ...(recSlot && { recommendedSlot: recSlot }),
          });
          return (
            <Button
              asChild
              variant="prominent"
              className="rounded-xl"
            >
              <Link to={`/appointments/create-for-customer?${params.toString()}`}>
                <MapPin className="mr-2 h-4 w-4" />
                Schedule Ocular Visit
              </Link>
            </Button>
          );
        })()}

        {(isAgent || isAdmin) &&
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

        {/* Customer: Request Refund (when fee is verified and appointment is not on_the_way/completed) */}
        {isCustomer && appt.ocularFeeStatus === 'verified' &&
          ![AppointmentStatus.ON_THE_WAY, AppointmentStatus.COMPLETED].includes(appt.status as AppointmentStatus) &&
          !myRefundRequests?.some(r => r.appointmentId === appt._id && r.status === 'pending') && (
          <Button
            variant="outline"
            onClick={() => setCustomerRefundOpen(true)}
            className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Request Refund
          </Button>
        )}

        {/* Customer: Show pending refund status */}
        {isCustomer && myRefundRequests?.some(r => r.appointmentId === appt._id && r.status === 'pending') && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Refund request pending review
          </div>
        )}

        {/* Customer: Contact Admin card (on_the_way or completed) */}
        {isCustomer && appt.ocularFeeStatus === 'verified' &&
          [AppointmentStatus.ON_THE_WAY, AppointmentStatus.COMPLETED].includes(appt.status as AppointmentStatus) && (
          <Card className="rounded-xl border-blue-200 bg-blue-50 w-full">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Need a refund?</p>
                  <p className="mt-1 text-blue-700">
                    Since the visit is already in progress, please contact the admin directly:
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
            className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
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
              variant="outline"
              onClick={() => { setCancelOpen(false); setCancelReason(''); }}
              className="rounded-xl border-[#d4d7dd] bg-[#f7f8fa] text-[#1f2937] hover:bg-[#eef1f5] hover:text-[#111827] dark:border-white/12 dark:bg-[#182230] dark:text-slate-100 dark:hover:bg-[#202c3d] dark:hover:text-white"
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

      {/* Refund Ocular Fee dialog (Admin only) */}
      <Dialog open={refundOpen} onOpenChange={(open) => { setRefundOpen(open); if (!open) setRefundReason(''); }}>
        <DialogContent className="max-w-md rounded-2xl border border-[color:var(--color-border)]/65 bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)] shadow-[0_28px_70px_rgba(15,23,42,0.4)]">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f] dark:text-slate-100">Refund Ocular Fee</DialogTitle>
            <DialogDescription className="text-[#6e6e73] dark:text-slate-400">
              This will mark the ocular fee of {appt.ocularFee ? formatCurrency(appt.ocularFee) : ''} as refunded, record your reason on the appointment timeline, and notify the customer that finance follow-up will continue outside this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="refund-reason" className="text-sm font-medium text-[#3a3a3e] dark:text-slate-300">Reason for refund</Label>
            <Textarea
              id="refund-reason"
              placeholder="e.g., Customer cancelled before visit, duplicate payment..."
              value={refundReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRefundReason(e.target.value)}
              className="min-h-[112px] rounded-2xl border border-[color:var(--color-border)]/70 bg-[color:var(--color-card)]/78 text-[var(--color-card-foreground)] placeholder:text-[var(--text-metal-muted-color)] focus-visible:ring-[var(--color-card-foreground)]/35"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setRefundOpen(false); setRefundReason(''); }}
              className="rounded-xl border-[color:var(--color-border)]/70 bg-[color:var(--color-card)]/55 text-[var(--color-card-foreground)] hover:bg-[color:var(--color-card)]/82 hover:text-[var(--color-card-foreground)]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await refundMutation.mutateAsync({ id: id!, reason: refundReason.trim() });
                  toast.success('Ocular fee refunded successfully');
                  setRefundOpen(false);
                  setRefundReason('');
                } catch (err) {
                  toast.error(extractErrorMessage(err, 'Failed to process refund'));
                }
              }}
              disabled={refundMutation.isPending || !refundReason.trim()}
              className="rounded-xl"
            >
              {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Refund Request dialog */}
      <Dialog open={customerRefundOpen} onOpenChange={(open) => {
        setCustomerRefundOpen(open);
        if (!open) {
          setCustomerRefundReason('');
          setCustomerRefundMethod('gcash');
          setCustomerRefundAccountName('');
          setCustomerRefundAccountNumber('');
          setCustomerRefundBankName('');
        }
      }}>
        <DialogContent className="max-w-md rounded-2xl border border-[color:var(--color-border)]/65 bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)] shadow-[0_28px_70px_rgba(15,23,42,0.4)]">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f] dark:text-slate-100">Request Refund</DialogTitle>
            <DialogDescription className="text-[#6e6e73] dark:text-slate-400">
              Request a refund for the ocular fee of {appt.ocularFee ? formatCurrency(appt.ocularFee) : ''}. Your request will be reviewed by the cashier team, and the payout will be sent using the method you provide below if it is approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cr-reason" className="text-sm font-medium text-[#3a3a3e] dark:text-slate-300">Reason for refund</Label>
              <Textarea
                id="cr-reason"
                placeholder="e.g., Schedule conflict, changed plans..."
                value={customerRefundReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomerRefundReason(e.target.value)}
                className="mt-1 min-h-[112px] rounded-2xl border border-[color:var(--color-border)]/70 bg-[color:var(--color-card)]/78 text-[var(--color-card-foreground)] placeholder:text-[var(--text-metal-muted-color)] focus-visible:ring-[var(--color-card-foreground)]/35"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-[#3a3a3e] dark:text-slate-300">Refund Method</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={customerRefundMethod === 'gcash' ? 'default' : 'outline'}
                  onClick={() => setCustomerRefundMethod('gcash')}
                  className="rounded-xl flex-1"
                >
                  GCash
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={customerRefundMethod === 'bank_transfer' ? 'default' : 'outline'}
                  onClick={() => setCustomerRefundMethod('bank_transfer')}
                  className="rounded-xl flex-1"
                >
                  Bank Transfer
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="cr-account-name" className="text-sm font-medium text-[#3a3a3e] dark:text-slate-300">Account Name</Label>
              <Input
                id="cr-account-name"
                placeholder="Full name on account"
                value={customerRefundAccountName}
                onChange={(e) => setCustomerRefundAccountName(e.target.value)}
                className="mt-1 bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="cr-account-number" className="text-sm font-medium text-[#3a3a3e] dark:text-slate-300">
                {customerRefundMethod === 'gcash' ? 'GCash Number' : 'Account Number'}
              </Label>
              <Input
                id="cr-account-number"
                placeholder={customerRefundMethod === 'gcash' ? '09XX XXX XXXX' : 'Account number'}
                value={customerRefundAccountNumber}
                onChange={(e) => setCustomerRefundAccountNumber(e.target.value)}
                className="mt-1 bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
              />
            </div>
            {customerRefundMethod === 'bank_transfer' && (
              <div>
                <Label htmlFor="cr-bank-name" className="text-sm font-medium text-[#3a3a3e] dark:text-slate-300">Bank Name</Label>
                <Input
                  id="cr-bank-name"
                  placeholder="e.g., BDO, BPI, Metrobank..."
                  value={customerRefundBankName}
                  onChange={(e) => setCustomerRefundBankName(e.target.value)}
                  className="mt-1 bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCustomerRefundOpen(false)} className="rounded-xl border-[#d2d2d7]">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await submitRefundMutation.mutateAsync({
                    appointmentId: appt._id,
                    reason: customerRefundReason.trim(),
                    refundMethod: customerRefundMethod,
                    accountName: customerRefundAccountName.trim(),
                    accountNumber: customerRefundAccountNumber.trim(),
                    ...(customerRefundMethod === 'bank_transfer' ? { bankName: customerRefundBankName.trim() } : {}),
                  });
                  toast.success('Refund request submitted successfully');
                  setCustomerRefundOpen(false);
                } catch (err) {
                  toast.error(extractErrorMessage(err, 'Failed to submit refund request'));
                }
              }}
              disabled={submitRefundMutation.isPending || !customerRefundReason.trim() || !customerRefundAccountName.trim() || !customerRefundAccountNumber.trim() || (customerRefundMethod === 'bank_transfer' && !customerRefundBankName.trim())}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitRefundMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
