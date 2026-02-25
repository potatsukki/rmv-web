import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, User, Phone, CreditCard, CheckCircle2, Users, FileText, AlertTriangle, Camera, Image } from 'lucide-react';
import toast from 'react-hot-toast';

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
} from '@/hooks/useAppointments';
import { useAuthStore } from '@/stores/auth.store';
import { Role, AppointmentStatus } from '@/lib/constants';
import { SERVICE_TYPE_LABELS } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';

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

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [selectedSalesStaff, setSelectedSalesStaff] = useState('');
  const [salesStaffList, setSalesStaffList] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);

  const isAgent = user?.roles.includes(Role.APPOINTMENT_AGENT);
  const isAdmin = user?.roles.includes(Role.ADMIN);
  const canConfirmAppointment = !!(isAgent || isAdmin);
  const canCompleteAppointment = !!user?.roles.includes(Role.SALES_STAFF);
  const isStaff = user?.roles.some((r) =>
    [Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN].includes(r),
  );
  const isCustomer = user?.roles.includes(Role.CUSTOMER);

  // Fetch sales staff list when the agent views a requested appointment
  useEffect(() => {
    if (canConfirmAppointment) {
      api.get<ApiResponse<{ _id: string; firstName: string; lastName: string }[]>>('/users/sales-staff')
        .then(res => setSalesStaffList(res.data.data))
        .catch(() => {});
    }
  }, [canConfirmAppointment]);

  if (isLoading) return <PageLoader />;
  if (isError || !appt) return <PageError onRetry={refetch} />;

  const handleConfirm = async () => {
    if (!selectedSalesStaff) {
      toast.error('Please select a sales staff member to assign');
      return;
    }
    try {
      await confirmMutation.mutateAsync({ id: id!, salesStaffId: selectedSalesStaff });
      toast.success('Appointment confirmed & sales staff assigned');
    } catch {
      toast.error('Failed to confirm');
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync(id!);
      toast.success('Appointment completed');
    } catch {
      toast.error('Failed to complete');
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
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const handleNoShow = async () => {
    try {
      await noShowMutation.mutateAsync(id!);
      toast.success('Marked as no-show');
    } catch {
      toast.error('Failed to mark');
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
      <div className="mt-0.5 rounded-lg bg-gray-100 p-2">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-700">{label}</p>
        <p className="text-sm text-gray-500">{value}</p>
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
          className="rounded-xl text-gray-500 hover:text-gray-900"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Appointment Info</CardTitle>
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

            {appt.purpose && (
              <div>
                <p className="text-[13px] font-medium text-gray-700">Purpose</p>
                <p className="text-sm text-gray-500 mt-1">{appt.purpose}</p>
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
                <p className="text-[13px] font-medium text-gray-700">Distance</p>
                <p className="text-sm text-gray-500">{appt.distanceKm.toFixed(1)} km</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ocular Fee & Reschedules */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Additional Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appt.ocularFee != null && appt.ocularFee > 0 && (
              <div>
                {appt.ocularFeeStatus === 'refunded' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-gray-700">Ocular Fee</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                        Refunded
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-400 line-through mt-1">
                      {formatCurrency(appt.ocularFee)}
                    </p>
                    {appt.ocularFeeRefundReason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {appt.ocularFeeRefundReason}</p>
                    )}
                    {appt.ocularFeeRefundedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Refunded on {format(new Date(appt.ocularFeeRefundedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </>
                ) : appt.ocularFeePaid ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-gray-700">Ocular Fee</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
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
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-orange-800">Ocular Fee Required</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(appt.ocularFee)}</p>
                    </div>
                    <p className="text-xs text-orange-600">Pay before your appointment can be confirmed.</p>
                    <Button
                      asChild
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-10"
                    >
                      <Link to={`/appointments/${appt._id}/pay-ocular-fee`}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay {formatCurrency(appt.ocularFee)}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] font-medium text-gray-700">Ocular Fee</p>
                    <p className="text-lg font-semibold text-orange-600 mt-1">
                      {formatCurrency(appt.ocularFee)}
                    </p>
                  </>
                )}
                {appt.ocularFeeMethod && (
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    via {appt.ocularFeeMethod.replace('_', ' ')}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-[13px] font-medium text-gray-700">Reschedules</p>
              <p className="text-sm text-gray-500">
                {appt.rescheduleCount} / {appt.maxReschedules} used
              </p>
            </div>

            {appt.internalNotes && isStaff && (
              <div>
                <p className="text-[13px] font-medium text-gray-700">Internal Notes</p>
                <p className="text-sm text-gray-500">{appt.internalNotes}</p>
              </div>
            )}

            <div>
              <p className="text-[13px] font-medium text-gray-700">Created</p>
              <p className="text-sm text-gray-500">
                {format(new Date(appt.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </CardContent>
        </Card>

      {/* Customer: Site Details CTA (pending) */}
      {isCustomer && appt.siteDetailsStatus === 'pending' && appt.status === AppointmentStatus.REQUESTED && (
        <Card className="rounded-xl border-blue-200 bg-blue-50 shadow-sm">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {appt.type === 'office' ? 'Site Details Required' : 'Provide Site Details (Optional)'}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {appt.type === 'office'
                    ? 'Please provide your site photos and details so the sales staff can prepare for your consultation.'
                    : 'You may optionally provide site details to help the sales staff prepare for the ocular visit.'}
                </p>
              </div>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl w-full sm:w-auto h-10 text-sm">
              <Link to={`/appointments/${appt._id}/site-details`}>
                <Camera className="mr-2 h-4 w-4" />
                {appt.type === 'office' ? 'Complete Site Details' : 'Add Site Details'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Customer / Staff: Read-only view of submitted site details */}
      {appt.siteDetailsStatus === 'submitted' && appt.customerSiteDetails && (
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Customer Site Details
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Submitted
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appt.customerSiteDetails.serviceType && (
              <div>
                <p className="text-[13px] font-medium text-gray-700">Service Type</p>
                <p className="text-sm text-gray-500">{SERVICE_TYPE_LABELS[appt.customerSiteDetails.serviceType] || appt.customerSiteDetails.serviceType}</p>
              </div>
            )}

            {appt.customerSiteDetails.customerRequirements && (
              <div>
                <p className="text-[13px] font-medium text-gray-700">Customer Requirements</p>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">{appt.customerSiteDetails.customerRequirements}</p>
              </div>
            )}

            {appt.customerSiteDetails.lineItems && appt.customerSiteDetails.lineItems.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-gray-700 mb-1">Measurements</p>
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium">Item</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">L</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">W</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">H</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {appt.customerSiteDetails.lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700">{item.label || `Item ${i + 1}`}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{item.length ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{item.width ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{item.height ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{item.quantity ?? 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {appt.customerSiteDetails.siteConditions && (
              <div>
                <p className="text-[13px] font-medium text-gray-700 mb-1">Site Conditions</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {appt.customerSiteDetails.siteConditions.environment && (
                    <div>
                      <span className="text-gray-500">Environment:</span>{' '}
                      <span className="text-gray-700 capitalize">{appt.customerSiteDetails.siteConditions.environment}</span>
                    </div>
                  )}
                  {appt.customerSiteDetails.siteConditions.hasElectrical != null && (
                    <div>
                      <span className="text-gray-500">Electrical:</span>{' '}
                      <span className="text-gray-700">{appt.customerSiteDetails.siteConditions.hasElectrical ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {appt.customerSiteDetails.siteConditions.accessNotes && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Access Notes:</span>{' '}
                      <span className="text-gray-700">{appt.customerSiteDetails.siteConditions.accessNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(appt.customerSiteDetails.materials || appt.customerSiteDetails.finishes || appt.customerSiteDetails.preferredDesign) && (
              <div>
                <p className="text-[13px] font-medium text-gray-700 mb-1">Materials & Design</p>
                <div className="space-y-1 text-sm">
                  {appt.customerSiteDetails.materials && (
                    <p><span className="text-gray-500">Materials:</span> <span className="text-gray-700">{appt.customerSiteDetails.materials}</span></p>
                  )}
                  {appt.customerSiteDetails.finishes && (
                    <p><span className="text-gray-500">Finishes:</span> <span className="text-gray-700">{appt.customerSiteDetails.finishes}</span></p>
                  )}
                  {appt.customerSiteDetails.preferredDesign && (
                    <p><span className="text-gray-500">Preferred Design:</span> <span className="text-gray-700">{appt.customerSiteDetails.preferredDesign}</span></p>
                  )}
                </div>
              </div>
            )}

            {appt.customerSiteDetails.notes && (
              <div>
                <p className="text-[13px] font-medium text-gray-700">Additional Notes</p>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">{appt.customerSiteDetails.notes}</p>
              </div>
            )}

            {/* Photo / file count summary */}
            <div className="flex flex-wrap gap-3 pt-1">
              {appt.customerSiteDetails.photoKeys && appt.customerSiteDetails.photoKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                  <Camera className="h-3.5 w-3.5" /> {appt.customerSiteDetails.photoKeys.length} photo(s)
                </span>
              )}
              {appt.customerSiteDetails.referenceImageKeys && appt.customerSiteDetails.referenceImageKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                  <Image className="h-3.5 w-3.5" /> {appt.customerSiteDetails.referenceImageKeys.length} reference(s)
                </span>
              )}
              {appt.customerSiteDetails.videoKeys && appt.customerSiteDetails.videoKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                  {appt.customerSiteDetails.videoKeys.length} video(s)
                </span>
              )}
              {appt.customerSiteDetails.sketchKeys && appt.customerSiteDetails.sketchKeys.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                  {appt.customerSiteDetails.sketchKeys.length} sketch(es)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent: Assign Sales Staff & Confirm */}
      {canConfirmAppointment && appt.status === AppointmentStatus.REQUESTED && (
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Assign Sales Staff & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Warning: office appointment without site details */}
            {appt.type === 'office' && appt.siteDetailsStatus !== 'submitted' && (
              <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Cannot confirm — customer has not yet submitted their site details.</span>
              </div>
            )}
            {salesStaffList.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                <Users className="h-4 w-4 shrink-0" />
                <span>No sales staff found. Please create one in the admin panel first.</span>
              </div>
            ) : (
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2.5">Sales Staff</label>
                <Select
                  value={selectedSalesStaff}
                  onValueChange={(val) => setSelectedSalesStaff(val)}
                >
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white px-4 text-base text-gray-900 focus:ring-1 focus:ring-gray-100 focus:ring-offset-0 focus:border-gray-300 w-full">
                    <SelectValue placeholder="Choose a sales staff member..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 bg-white shadow-lg max-w-[calc(100vw-3rem)]">
                    {salesStaffList.map((s) => (
                      <SelectItem key={s._id} value={s._id} className="rounded-lg cursor-pointer text-sm py-2.5 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900">
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || !selectedSalesStaff || (appt.type === 'office' && appt.siteDetailsStatus !== 'submitted')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-full sm:w-auto h-10 text-sm"
            >
              Confirm & Assign
            </Button>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">

        {/* Sales staff: CONFIRMED → Preparing */}
        {canCompleteAppointment && appt.status === AppointmentStatus.CONFIRMED && (
          <>
            <Button
              onClick={() => visitStatusMutation.mutateAsync({ id: id!, status: 'preparing' }).then(() => toast.success('Status updated: Preparing')).catch(() => toast.error('Failed to update'))}
              disabled={visitStatusMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Start Preparing
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
            >
              Mark Complete
            </Button>
            <Button
              variant="outline"
              onClick={handleNoShow}
              disabled={noShowMutation.isPending}
              className="border-gray-200 text-gray-700 rounded-xl"
            >
              Mark No-Show
            </Button>
          </>
        )}

        {/* Sales staff: PREPARING → On The Way */}
        {canCompleteAppointment && appt.status === AppointmentStatus.PREPARING && (
          <>
            <Button
              onClick={() => visitStatusMutation.mutateAsync({ id: id!, status: 'on_the_way' }).then(() => toast.success('Status updated: On the Way')).catch(() => toast.error('Failed to update'))}
              disabled={visitStatusMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
            >
              On The Way
            </Button>
            <Button
              variant="outline"
              onClick={handleNoShow}
              disabled={noShowMutation.isPending}
              className="border-gray-200 text-gray-700 rounded-xl"
            >
              Mark No-Show
            </Button>
          </>
        )}

        {/* Sales staff: ON_THE_WAY → Complete */}
        {canCompleteAppointment && appt.status === AppointmentStatus.ON_THE_WAY && (
          <>
            <Button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
            >
              Mark Complete
            </Button>
            <Button
              variant="outline"
              onClick={handleNoShow}
              disabled={noShowMutation.isPending}
              className="border-gray-200 text-gray-700 rounded-xl"
            >
              Mark No-Show
            </Button>
          </>
        )}

        {(isCustomer || isAgent || isAdmin) &&
          [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.PREPARING].includes(
            appt.status as AppointmentStatus,
          ) && (
            <>
              {isCustomer && appt.rescheduleCount < appt.maxReschedules && (
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 rounded-xl"
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
      </div>

      {/* Cancel with reason dialog */}
      <Dialog open={cancelOpen} onOpenChange={(open) => { setCancelOpen(open); if (!open) setCancelReason(''); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Cancel Appointment</DialogTitle>
            <DialogDescription className="text-gray-500">
              Please provide a reason for cancellation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium text-gray-700">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Schedule conflict, changed plans..."
              value={cancelReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
              className="min-h-[80px] bg-gray-50/50 border-gray-200 rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCancelOpen(false); setCancelReason(''); }} className="rounded-xl border-gray-200">
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
            <DialogTitle className="text-gray-900">Refund Ocular Fee</DialogTitle>
            <DialogDescription className="text-gray-500">
              This will mark the ocular fee of {appt.ocularFee ? formatCurrency(appt.ocularFee) : ''} as refunded. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="refund-reason" className="text-sm font-medium text-gray-700">Reason for refund</Label>
            <Textarea
              id="refund-reason"
              placeholder="e.g., Customer cancelled before visit, duplicate payment..."
              value={refundReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRefundReason(e.target.value)}
              className="min-h-[80px] bg-gray-50/50 border-gray-200 rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRefundOpen(false); setRefundReason(''); }} className="rounded-xl border-gray-200">
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
                } catch {
                  toast.error('Failed to process refund');
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
    </div>
  );
}
