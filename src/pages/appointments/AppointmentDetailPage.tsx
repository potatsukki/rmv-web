import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, User, Phone, CreditCard, CheckCircle2, Users } from 'lucide-react';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  useAppointment,
  useConfirmAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useMarkNoShow,
} from '@/hooks/useAppointments';
import { useAuthStore } from '@/stores/auth.store';
import { Role, AppointmentStatus } from '@/lib/constants';
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

  const [cancelOpen, setCancelOpen] = useState(false);
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
    try {
      await cancelMutation.mutateAsync(id!);
      toast.success('Appointment cancelled');
      setCancelOpen(false);
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
        {isCustomer && !appt.ocularFeePaid && appt.ocularFeeStatus === 'pending' ? (
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
              value={`${format(new Date(appt.date), 'EEEE, MMMM d, yyyy')} at ${appt.slotCode}`}
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
                {appt.ocularFeePaid ? (
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

      {/* Agent: Assign Sales Staff & Confirm */}
      {canConfirmAppointment && appt.status === AppointmentStatus.REQUESTED && (
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Assign Sales Staff & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
              disabled={confirmMutation.isPending || !selectedSalesStaff}
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

        {canCompleteAppointment && appt.status === AppointmentStatus.CONFIRMED && (
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

        {(isCustomer || isStaff) &&
          [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED].includes(
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

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? This action cannot be undone."
        variant="destructive"
        confirmLabel="Yes, Cancel"
        isLoading={cancelMutation.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
