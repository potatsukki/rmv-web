import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Send,
  RotateCcw,
  Ruler,
  Paintbrush,
  Package,
  StickyNote,
  Camera,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  useVisitReport,
  useUpdateVisitReport,
  useSubmitVisitReport,
  useReturnVisitReport,
} from '@/hooks/useVisitReports';
import { useAuthStore } from '@/stores/auth.store';
import { Role, VisitReportStatus } from '@/lib/constants';

export function VisitReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: report, isLoading, isError, refetch } = useVisitReport(id!);

  const updateMutation = useUpdateVisitReport();
  const submitMutation = useSubmitVisitReport();
  const returnMutation = useReturnVisitReport();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Form state
  const [visitType, setVisitType] = useState('');
  const [actualVisitDateTime, setActualVisitDateTime] = useState('');
  const [materials, setMaterials] = useState('');
  const [finishes, setFinishes] = useState('');
  const [preferredDesign, setPreferredDesign] = useState('');
  const [customerRequirements, setCustomerRequirements] = useState('');
  const [notes, setNotes] = useState('');

  // Measurements
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [thickness, setThickness] = useState('');
  const [measurementNotes, setMeasurementNotes] = useState('');

  const [formLoaded, setFormLoaded] = useState(false);

  const isSalesStaff = user?.roles.includes(Role.SALES_STAFF);
  const isEngineerOrAdmin =
    user?.roles.includes(Role.ENGINEER) || user?.roles.includes(Role.ADMIN);

  // Pre-fill form when data arrives
  if (report && !formLoaded) {
    setVisitType(report.visitType || '');
    setActualVisitDateTime(
      report.actualVisitDateTime
        ? new Date(report.actualVisitDateTime).toISOString().slice(0, 16)
        : '',
    );
    setMaterials(report.materials || '');
    setFinishes(report.finishes || '');
    setPreferredDesign(report.preferredDesign || '');
    setCustomerRequirements(report.customerRequirements || '');
    setNotes(report.notes || '');
    if (report.measurements) {
      setLength(report.measurements.length?.toString() || '');
      setWidth(report.measurements.width?.toString() || '');
      setHeight(report.measurements.height?.toString() || '');
      setThickness(report.measurements.thickness?.toString() || '');
      setMeasurementNotes(report.measurements.raw || '');
    }
    setFormLoaded(true);
  }

  if (isLoading) return <PageLoader />;
  if (isError || !report) return <PageError onRetry={refetch} />;

  const isDraft = report.status === VisitReportStatus.DRAFT;
  const isReturned = report.status === VisitReportStatus.RETURNED;
  const canEdit = isSalesStaff && (isDraft || isReturned);
  const canReturn =
    isEngineerOrAdmin && report.status === VisitReportStatus.SUBMITTED;

  const handleSave = async () => {
    try {
      const measurements: Record<string, unknown> = {};
      if (length) measurements.length = parseFloat(length);
      if (width) measurements.width = parseFloat(width);
      if (height) measurements.height = parseFloat(height);
      if (thickness) measurements.thickness = parseFloat(thickness);
      if (measurementNotes) measurements.raw = measurementNotes;

      await updateMutation.mutateAsync({
        id: id!,
        visitType: visitType || undefined,
        actualVisitDateTime: actualVisitDateTime || undefined,
        measurements: Object.keys(measurements).length
          ? measurements
          : undefined,
        materials: materials || undefined,
        finishes: finishes || undefined,
        preferredDesign: preferredDesign || undefined,
        customerRequirements: customerRequirements || undefined,
        notes: notes || undefined,
      });
      toast.success('Report saved');
    } catch {
      toast.error('Failed to save report');
    }
  };

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(id!);
      toast.success(
        'Report submitted! A project has been created automatically.',
      );
      setSubmitOpen(false);
    } catch {
      toast.error('Failed to submit report');
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning');
      return;
    }
    try {
      await returnMutation.mutateAsync({ id: id!, reason: returnReason });
      toast.success('Report returned to sales staff');
      setReturnOpen(false);
      setReturnReason('');
    } catch {
      toast.error('Failed to return report');
    }
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
          onClick={() => navigate(-1)}
          className="rounded-xl text-gray-500 hover:text-gray-900"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {canEdit ? 'Edit Visit Report' : 'Visit Report Details'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {report.visitType === 'ocular' ? 'Ocular Visit' : 'Consultation'}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* Return reason banner */}
      {report.returnReason && isReturned && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-orange-800">
            Report Returned
          </p>
          <p className="text-sm text-orange-700 mt-1">{report.returnReason}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Report Info (read-only) */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              Report Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={Calendar}
              label="Created"
              value={format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}
            />
            {report.actualVisitDateTime && !canEdit && (
              <InfoRow
                icon={Calendar}
                label="Visit Date"
                value={format(
                  new Date(report.actualVisitDateTime),
                  'MMM d, yyyy h:mm a',
                )}
              />
            )}
            {(report.photoKeys?.length ?? 0) > 0 && (
              <InfoRow
                icon={Camera}
                label="Photos"
                value={`${report.photoKeys!.length} uploaded`}
              />
            )}
          </CardContent>
        </Card>

        {/* Summary / Read-only view for non-editors */}
        {!canEdit && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.materials && (
                <InfoRow icon={Package} label="Materials" value={report.materials} />
              )}
              {report.finishes && (
                <InfoRow
                  icon={Paintbrush}
                  label="Finishes"
                  value={report.finishes}
                />
              )}
              {report.preferredDesign && (
                <InfoRow
                  icon={Paintbrush}
                  label="Preferred Design"
                  value={report.preferredDesign}
                />
              )}
              {report.customerRequirements && (
                <InfoRow
                  icon={StickyNote}
                  label="Customer Requirements"
                  value={report.customerRequirements}
                />
              )}
              {report.notes && (
                <InfoRow icon={StickyNote} label="Notes" value={report.notes} />
              )}
              {report.measurements && (
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-gray-700">
                    Measurements
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                    {report.measurements.length != null && (
                      <span>Length: {report.measurements.length} cm</span>
                    )}
                    {report.measurements.width != null && (
                      <span>Width: {report.measurements.width} cm</span>
                    )}
                    {report.measurements.height != null && (
                      <span>Height: {report.measurements.height} cm</span>
                    )}
                    {report.measurements.thickness != null && (
                      <span>
                        Thickness: {report.measurements.thickness} cm
                      </span>
                    )}
                  </div>
                  {report.measurements.raw && (
                    <p className="text-sm text-gray-500 mt-1">
                      {report.measurements.raw}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Editable form for Sales Staff on DRAFT/RETURNED */}
      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Visit Details */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">
                Visit Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Visit Type
                </Label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                >
                  <option value="">-- Select --</option>
                  <option value="ocular">Ocular Visit</option>
                  <option value="consultation">Consultation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Actual Visit Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={actualVisitDateTime}
                  onChange={(e) => setActualVisitDateTime(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Customer Requirements
                </Label>
                <Textarea
                  value={customerRequirements}
                  onChange={(e) => setCustomerRequirements(e.target.value)}
                  placeholder="What the customer needs..."
                  className="min-h-[80px] rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Notes
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional observations..."
                  className="min-h-[80px] rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Ruler className="h-5 w-5 text-gray-400" />
                Measurements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700">
                    Length (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700">
                    Width (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700">
                    Height (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700">
                    Thickness (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Measurement Notes
                </Label>
                <Textarea
                  value={measurementNotes}
                  onChange={(e) => setMeasurementNotes(e.target.value)}
                  placeholder="Special conditions, non-standard shapes..."
                  className="min-h-[60px] rounded-xl border-gray-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Materials & Design */}
          <Card className="rounded-xl border-gray-100 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Package className="h-5 w-5 text-gray-400" />
                Materials & Design
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Materials
                </Label>
                <Input
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="e.g., Stainless 304"
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Finishes
                </Label>
                <Input
                  value={finishes}
                  onChange={(e) => setFinishes(e.target.value)}
                  placeholder="e.g., Brushed, Mirror"
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Preferred Design
                </Label>
                <Input
                  value={preferredDesign}
                  onChange={(e) => setPreferredDesign(e.target.value)}
                  placeholder="e.g., Modern minimalist"
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button
              onClick={() => setSubmitOpen(true)}
              disabled={submitMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Send className="mr-2 h-4 w-4" />
              Submit Report
            </Button>
          </>
        )}

        {canReturn && (
          <Button
            onClick={() => setReturnOpen(true)}
            disabled={returnMutation.isPending}
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Return for Revision
          </Button>
        )}
      </div>

      {/* Submit Confirmation */}
      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit Visit Report"
        description="This will automatically complete the related appointment and create a new project. Are you sure?"
        confirmLabel="Submit"
        isLoading={submitMutation.isPending}
        onConfirm={handleSubmit}
      />

      {/* Return Dialog */}
      <ConfirmDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return Visit Report"
        description=""
        variant="destructive"
        confirmLabel="Return Report"
        isLoading={returnMutation.isPending}
        onConfirm={handleReturn}
      >
        <div className="space-y-2 mt-2">
          <Label className="text-[13px] font-medium text-gray-700">
            Reason for returning
          </Label>
          <Textarea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Explain what needs to be corrected..."
            className="min-h-[80px] rounded-xl border-gray-200"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
