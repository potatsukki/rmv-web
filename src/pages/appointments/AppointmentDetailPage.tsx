import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, User, Phone, CreditCard, CheckCircle2, Users, FileText, Camera, Image, Loader2, RotateCcw, Mail, Banknote, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { LocationView } from '@/components/maps/LocationView';
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
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ApiResponse, Appointment } from '@/lib/types';

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: appt, isLoading, isError, refetch } = useAppointment(id!);

  const confirmMutation = useConfirmAppointment();
  const completeMutation = useCompleteAppointment();
  const cancelMutation = useCancelAppointment();
  const noShowMutation = useMarkNoShow();
  const visitStatusMutation = useUpdateVisitStatus();
  const refundMutation = useRefundOcularFee();
  const finalizeMutation = useAgentFinalizeOcular();
  const submitLocationMutation = useCustomerSubmitLocation();

  // Customer location submission state
  const [customerLocationPin, setCustomerLocationPin] = useState<MapPoint | null>(null);
  const [customerAddress, setCustomerAddress] = useState('');
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

  const handleConfirm = async () => {
    if (!selectedSalesStaff) {
      toast.error('Please select a sales staff member to assign');
      return;
    }
    try {
      await confirmMutation.mutateAsync({ id: id!, salesStaffId: selectedSalesStaff });
      await refetch();
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
      await refetch();
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
      <div className="mt-0.5 rounded-lg bg-[#f0f0f5] p-2">
        <Icon className="h-4 w-4 text-[#6e6e73]" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-[#3a3a3e]">{label}</p>
        <p className="text-sm text-[#6e6e73]">{value}</p>
      </div>
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
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
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
        <Card className="rounded-xl border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Awaiting Confirmation</p>
              <p className="text-xs text-amber-700 mt-0.5">
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
        <Card className="rounded-xl border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Confirmed — Ready to Visit</p>
              <p className="text-xs text-blue-700 mt-0.5">
                {isCustomer
                  ? 'Your appointment is confirmed. The assigned sales staff will visit on the scheduled date.'
                  : 'Mark yourself as "On the Way" when heading to the site, then mark "Complete" after the visit.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {appt.status === AppointmentStatus.ON_THE_WAY && (
        <Card className="rounded-xl border-indigo-200 bg-indigo-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">Sales Staff En Route</p>
              <p className="text-xs text-indigo-700 mt-0.5">
                {isCustomer
                  ? 'The sales staff is on their way to your location. Please be available at the site.'
                  : 'You are on the way. After the visit, mark this appointment as "Complete" and fill out the visit report.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {appt.status === AppointmentStatus.COMPLETED && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Visit Completed</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {isCustomer
                  ? 'The visit is complete. The sales staff will submit a visit report, which will automatically create your project.'
                  : 'Visit complete. Submit the visit report to generate the project for this customer.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info */}
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f]">Appointment Info</CardTitle>
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
                <p className="text-[13px] font-medium text-[#3a3a3e]">Purpose</p>
                <p className="text-sm text-[#6e6e73] mt-1">{appt.purpose}</p>
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
                <p className="text-[13px] font-medium text-[#3a3a3e]">Distance</p>
                <p className="text-sm text-[#6e6e73]">{appt.distanceKm.toFixed(1)} km</p>
              </div>
            )}

            {/* Customer pin location map — visible to staff/admin */}
            {!isCustomer && appt.customerLocation && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] mb-2">Customer Pin Location</p>
                <LocationView lat={appt.customerLocation.lat} lng={appt.customerLocation.lng} />
                <a
                  href={`https://www.google.com/maps?q=${appt.customerLocation.lat},${appt.customerLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
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
            <CardTitle className="text-lg text-[#1d1d1f]">Additional Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appt.ocularFee != null && appt.ocularFee > 0 && (
              <div>
                {appt.ocularFeeStatus === 'refunded' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-[#3a3a3e]">Ocular Fee</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">
                        Refunded
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-[#86868b] line-through mt-1">
                      {formatCurrency(appt.ocularFee)}
                    </p>
                    {appt.ocularFeeRefundReason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {appt.ocularFeeRefundReason}</p>
                    )}
                    {appt.ocularFeeRefundedAt && (
                      <p className="text-xs text-[#86868b] mt-0.5">
                        Refunded on {format(new Date(appt.ocularFeeRefundedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </>
                ) : appt.ocularFeePaid ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-[#3a3a3e]">Ocular Fee</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-[#1d1d1f] mt-1">
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
                      <p className="text-sm font-semibold text-[#1d1d1f]">Ocular Fee Required</p>
                      <p className="text-lg font-bold text-[#1d1d1f]">{formatCurrency(appt.ocularFee)}</p>
                    </div>
                    <p className="text-xs text-[#6e6e73]">Pay before your appointment can be confirmed.</p>
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
                    <p className="text-[13px] font-medium text-[#3a3a3e]">Ocular Fee</p>
                    <p className="text-lg font-semibold text-[#1d1d1f] mt-1">
                      {formatCurrency(appt.ocularFee)}
                    </p>
                  </>
                )}
                {appt.ocularFeeMethod && (
                  <p className="text-xs text-[#6e6e73] capitalize mt-1">
                    via {appt.ocularFeeMethod.replace('_', ' ')}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-[13px] font-medium text-[#3a3a3e]">Reschedules</p>
              <p className="text-sm text-[#6e6e73]">
                {appt.rescheduleCount} / {appt.maxReschedules} used
              </p>
            </div>

            {appt.internalNotes && isStaff && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e]">Internal Notes</p>
                <p className="text-sm text-[#6e6e73]">{appt.internalNotes}</p>
              </div>
            )}

            <div>
              <p className="text-[13px] font-medium text-[#3a3a3e]">Created</p>
              <p className="text-sm text-[#6e6e73]">
                {format(new Date(appt.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </CardContent>
        </Card>



      {/* Customer: Submit Location for Ocular Visit */}
      {isCustomer && appt.type === 'ocular' && appt.status === AppointmentStatus.REQUESTED && !appt.customerLocation && !appt.ocularFeePaid && (
        <Card className="rounded-xl border-blue-200 bg-blue-50/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Provide Your Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-800">
              An ocular visit has been scheduled for{' '}
              <strong>{format(new Date(appt.date), 'MMMM d, yyyy')}</strong>.
              Please pin your site location on the map so we can calculate the visit fee and finalize your appointment.
            </p>
            <LocationPicker
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
            {customerAddress && (
              <div className="rounded-lg border border-blue-200 bg-white p-3">
                <p className="text-xs font-medium text-blue-700">Resolved Address</p>
                <p className="text-sm text-[#3a3a3e] mt-0.5">{customerAddress}</p>
              </div>
            )}

            {/* Official address */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1d1d1f]">Official Site Address</p>
                {!user?.addressData?.street && !user?.addressData?.city && (
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    Not set in profile — please fill in
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6e6e73]">This is the official address of the site to be visited. You can adjust it if needed.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="addr-street" className="text-xs font-medium text-[#3a3a3e]">Street / Unit / Building</Label>
                  <Input
                    id="addr-street"
                    value={addrStreet}
                    onChange={e => setAddrStreet(e.target.value)}
                    placeholder="e.g. 123 Rizal St."
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-barangay" className="text-xs font-medium text-[#3a3a3e]">Barangay</Label>
                  <Input
                    id="addr-barangay"
                    value={addrBarangay}
                    onChange={e => setAddrBarangay(e.target.value)}
                    placeholder="e.g. Barangay 1"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-city" className="text-xs font-medium text-[#3a3a3e]">City / Municipality</Label>
                  <Input
                    id="addr-city"
                    value={addrCity}
                    onChange={e => setAddrCity(e.target.value)}
                    placeholder="e.g. Quezon City"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-province" className="text-xs font-medium text-[#3a3a3e]">Province / Region</Label>
                  <Input
                    id="addr-province"
                    value={addrProvince}
                    onChange={e => setAddrProvince(e.target.value)}
                    placeholder="e.g. Metro Manila"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="addr-zip" className="text-xs font-medium text-[#3a3a3e]">ZIP Code</Label>
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
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating visit fee...
              </div>
            )}
            {feeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{feeError}</p>
              </div>
            )}
            {feePreview && !feeLoading && (
              <div className={`rounded-lg border p-4 space-y-2 ${feePreview.fee.isWithinNCR ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1d1d1f]">Ocular Visit Fee</p>
                  {feePreview.fee.isWithinNCR ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> FREE
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-amber-800">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(feePreview.fee.total)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#6e6e73] space-y-0.5">
                  <p>Distance: {feePreview.route.distanceKm.toFixed(1)} km · ~{feePreview.route.durationMinutes} min drive</p>
                  {feePreview.fee.isWithinNCR ? (
                    <p className="text-emerald-700">Within Metro Manila — no ocular visit fee</p>
                  ) : (
                    <>
                      <p>Base fee: ₱{feePreview.fee.baseFee} (first {feePreview.fee.baseCoveredKm} km)</p>
                      {feePreview.fee.additionalDistanceKm > 0 && (
                        <p>Additional: ₱{feePreview.fee.perKmRate}/km × {feePreview.fee.additionalDistanceKm.toFixed(1)} km = ₱{feePreview.fee.additionalFee}</p>
                      )}
                      <p className="text-amber-700 font-medium mt-1">Payment required before your appointment can be confirmed.</p>
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
                    onClick={() => handleSubmit(false)}
                    disabled={submitLocationMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl w-full sm:w-auto h-10"
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
                    onClick={() => handleSubmit(true)}
                    disabled={submitLocationMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl w-full sm:w-auto h-10"
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
            <CardTitle className="text-lg text-[#1d1d1f] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#6e6e73]" />
              Customer Site Details
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Submitted
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appt.customerSiteDetails.serviceType && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e]">Service Type</p>
                <p className="text-sm text-[#6e6e73]">{SERVICE_TYPE_LABELS[appt.customerSiteDetails.serviceType] || appt.customerSiteDetails.serviceType}</p>
              </div>
            )}

            {appt.customerSiteDetails.customerRequirements && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e]">Customer Requirements</p>
                <p className="text-sm text-[#6e6e73] whitespace-pre-wrap">{appt.customerSiteDetails.customerRequirements}</p>
              </div>
            )}

            {appt.customerSiteDetails.lineItems && appt.customerSiteDetails.lineItems.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] mb-1">Measurements</p>
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
                          <td className="px-3 py-2 text-[#3a3a3e]">{item.label || `Item ${i + 1}`}</td>
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
                <p className="text-[13px] font-medium text-[#3a3a3e] mb-1">Site Conditions</p>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 text-sm">
                  {appt.customerSiteDetails.siteConditions.environment && (
                    <div>
                      <span className="text-[#6e6e73]">Environment:</span>{' '}
                      <span className="text-[#3a3a3e] capitalize">{appt.customerSiteDetails.siteConditions.environment}</span>
                    </div>
                  )}
                  {appt.customerSiteDetails.siteConditions.hasElectrical != null && (
                    <div>
                      <span className="text-[#6e6e73]">Electrical:</span>{' '}
                      <span className="text-[#3a3a3e]">{appt.customerSiteDetails.siteConditions.hasElectrical ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {appt.customerSiteDetails.siteConditions.accessNotes && (
                    <div className="col-span-2">
                      <span className="text-[#6e6e73]">Access Notes:</span>{' '}
                      <span className="text-[#3a3a3e]">{appt.customerSiteDetails.siteConditions.accessNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(appt.customerSiteDetails.materials || appt.customerSiteDetails.finishes || appt.customerSiteDetails.preferredDesign) && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e] mb-1">Materials & Design</p>
                <div className="space-y-1 text-sm">
                  {appt.customerSiteDetails.materials && (
                    <p><span className="text-[#6e6e73]">Materials:</span> <span className="text-[#3a3a3e]">{appt.customerSiteDetails.materials}</span></p>
                  )}
                  {appt.customerSiteDetails.finishes && (
                    <p><span className="text-[#6e6e73]">Finishes:</span> <span className="text-[#3a3a3e]">{appt.customerSiteDetails.finishes}</span></p>
                  )}
                  {appt.customerSiteDetails.preferredDesign && (
                    <p><span className="text-[#6e6e73]">Preferred Design:</span> <span className="text-[#3a3a3e]">{appt.customerSiteDetails.preferredDesign}</span></p>
                  )}
                </div>
              </div>
            )}

            {appt.customerSiteDetails.notes && (
              <div>
                <p className="text-[13px] font-medium text-[#3a3a3e]">Additional Notes</p>
                <p className="text-sm text-[#6e6e73] whitespace-pre-wrap">{appt.customerSiteDetails.notes}</p>
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
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1d1d1f]">Assign Sales Staff & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {salesStaffList.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                <Users className="h-4 w-4 shrink-0" />
                <span>No sales staff found. Please create one in the admin panel first.</span>
              </div>
            ) : (
              <div>
                <label className="block text-[13px] font-medium text-[#3a3a3e] mb-2.5">Sales Staff</label>
                <Select
                  value={selectedSalesStaff}
                  onValueChange={(val) => setSelectedSalesStaff(val)}
                >
                  <SelectTrigger className="h-12 rounded-xl border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] focus:ring-1 focus:ring-[#e8e8ed] focus:ring-offset-0 focus:border-[#c8c8cd] w-full">
                    <SelectValue placeholder="Choose a sales staff member..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#d2d2d7] bg-white shadow-lg max-w-[calc(100vw-3rem)]">
                    {salesStaffList.map((s) => (
                      <SelectItem key={s._id} value={s._id} className="rounded-lg cursor-pointer text-sm py-2.5 focus:bg-[#f0f0f5] focus:text-[#1d1d1f] data-[highlighted]:bg-[#f0f0f5] data-[highlighted]:text-[#1d1d1f]">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-full sm:w-auto h-10 text-sm"
            >
              Confirm & Assign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agent: Finalize Ocular (for REQUESTED oculars where customer has submitted location) */}
      {canConfirmAppointment && appt.type === 'ocular' && appt.status === AppointmentStatus.REQUESTED && appt.customerLocation && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-900">Finalize Ocular Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-emerald-800">
              Customer has submitted their location. {previousStaff ? 'The sales staff from the previous consultation will be assigned.' : 'Assign a sales staff member to finalize this ocular appointment.'}
            </p>
            {appt.address && (
              <div className="rounded-lg bg-white/70 border border-emerald-200 p-3">
                <p className="text-xs font-medium text-emerald-700">Customer Address</p>
                <p className="text-sm text-emerald-900 mt-0.5">{appt.address}</p>
              </div>
            )}
            {appt.ocularFee != null && appt.ocularFee > 0 && (
              <div className="rounded-lg bg-white/70 border border-emerald-200 p-3">
                <p className="text-xs font-medium text-emerald-700">Ocular Fee</p>
                <p className="text-sm font-semibold text-emerald-900 mt-0.5">{formatCurrency(appt.ocularFee)}</p>
              </div>
            )}
            {previousStaffLoading ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <Loader2 className="h-4 w-4 animate-spin" /> Looking up previous sales staff...
              </div>
            ) : previousStaff ? (
              <div className="rounded-lg bg-white/70 border border-emerald-200 p-3">
                <p className="text-xs font-medium text-emerald-700">Assigned Sales Staff (from consultation)</p>
                <p className="text-sm font-semibold text-emerald-900 mt-0.5">{previousStaff.name}</p>
              </div>
            ) : salesStaffList.length > 0 ? (
              <div>
                <label className="block text-[13px] font-medium text-emerald-800 mb-2">Assign Sales Staff</label>
                <Select value={finalizeSalesStaff} onValueChange={setFinalizeSalesStaff}>
                  <SelectTrigger className="h-12 rounded-xl border-emerald-300 bg-white px-4 text-base text-[#1d1d1f] focus:ring-1 focus:ring-emerald-300 w-full">
                    <SelectValue placeholder="Choose a sales staff member..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#d2d2d7] bg-white shadow-lg max-w-[calc(100vw-3rem)]">
                    {salesStaffList.map((s) => (
                      <SelectItem key={s._id} value={s._id} className="rounded-lg cursor-pointer text-sm py-2.5">
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-full sm:w-auto h-10 text-sm"
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
                className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
                className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
                className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
              >
                {visitStatusMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'On The Way'}
              </Button>
            )}
            {/* Office: CONFIRMED → Complete */}
            {appt.type === 'office' && (
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
              >
                {completeMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Completing...</> : 'Mark Complete'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleNoShow}
              disabled={noShowMutation.isPending}
              className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
                className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
                className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
              className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl"
            >
              {completeMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Completing...</> : 'Mark Complete'}
            </Button>
            <Button
              variant="outline"
              onClick={handleNoShow}
              disabled={noShowMutation.isPending}
              className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
                className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
                className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
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
          const recDate = consultationReport?.recommendedOcularDate?.split('T')[0] ?? '';
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
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Link to={`/appointments/create-for-customer?${params.toString()}`}>
                <MapPin className="mr-2 h-4 w-4" />
                Schedule Ocular Visit
              </Link>
            </Button>
          );
        })()}

        {(isCustomer || isAgent || isAdmin) &&
          [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.PREPARING].includes(
            appt.status as AppointmentStatus,
          ) && (
            <>
              {isCustomer && appt.rescheduleCount < appt.maxReschedules && (
                <Button
                  asChild
                  variant="outline"
                  className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
                >
                  <Link to={`/appointments/book?reschedule=${appt._id}`}>
                    Reschedule
                  </Link>
                </Button>
              )}
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
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Cancel Appointment</DialogTitle>
            <DialogDescription className="text-[#6e6e73]">
              Please provide a reason for cancellation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium text-[#3a3a3e]">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Schedule conflict, changed plans..."
              value={cancelReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
              className="min-h-[80px] bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCancelOpen(false); setCancelReason(''); }} className="rounded-xl border-[#d2d2d7]">
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
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Refund Ocular Fee</DialogTitle>
            <DialogDescription className="text-[#6e6e73]">
              This will mark the ocular fee of {appt.ocularFee ? formatCurrency(appt.ocularFee) : ''} as refunded. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="refund-reason" className="text-sm font-medium text-[#3a3a3e]">Reason for refund</Label>
            <Textarea
              id="refund-reason"
              placeholder="e.g., Customer cancelled before visit, duplicate payment..."
              value={refundReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRefundReason(e.target.value)}
              className="min-h-[80px] bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRefundOpen(false); setRefundReason(''); }} className="rounded-xl border-[#d2d2d7]">
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
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Request Refund</DialogTitle>
            <DialogDescription className="text-[#6e6e73]">
              Request a refund for the ocular fee of {appt.ocularFee ? formatCurrency(appt.ocularFee) : ''}. A cashier will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cr-reason" className="text-sm font-medium text-[#3a3a3e]">Reason for refund</Label>
              <Textarea
                id="cr-reason"
                placeholder="e.g., Schedule conflict, changed plans..."
                value={customerRefundReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomerRefundReason(e.target.value)}
                className="mt-1 min-h-[80px] bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-[#3a3a3e]">Refund Method</Label>
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
              <Label htmlFor="cr-account-name" className="text-sm font-medium text-[#3a3a3e]">Account Name</Label>
              <Input
                id="cr-account-name"
                placeholder="Full name on account"
                value={customerRefundAccountName}
                onChange={(e) => setCustomerRefundAccountName(e.target.value)}
                className="mt-1 bg-[#f5f5f7]/50 border-[#d2d2d7] rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="cr-account-number" className="text-sm font-medium text-[#3a3a3e]">
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
                <Label htmlFor="cr-bank-name" className="text-sm font-medium text-[#3a3a3e]">Bank Name</Label>
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
