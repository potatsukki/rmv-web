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
  MapPin,
  Layers,
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
import { ServiceTypePicker } from '@/components/shared/ServiceTypePicker';
import { LineItemsEditor } from '@/components/shared/LineItemsEditor';
import { SiteConditionsPanel } from '@/components/shared/SiteConditionsPanel';
import { PhotoUploadGrid } from '@/components/shared/PhotoUploadGrid';
import {
  useVisitReport,
  useUpdateVisitReport,
  useSubmitVisitReport,
  useReturnVisitReport,
} from '@/hooks/useVisitReports';
import { useAuthStore } from '@/stores/auth.store';
import {
  Role,
  VisitReportStatus,
  ServiceType,
  MeasurementUnit,
  SERVICE_TYPE_LABELS,
  MEASUREMENT_UNIT_LABELS,
  ENVIRONMENT_LABELS,
  Environment,
} from '@/lib/constants';
import type { LineItem, SiteConditions } from '@/lib/types';

const DEFAULT_SITE_CONDITIONS: SiteConditions = {
  environment: Environment.INDOOR,
};

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

  // ── Form state ──
  const [visitType, setVisitType] = useState('');
  const [actualVisitDateTime, setActualVisitDateTime] = useState('');
  const [serviceType, setServiceType] = useState(ServiceType.CUSTOM as string);
  const [serviceTypeCustom, setServiceTypeCustom] = useState('');
  const [materials, setMaterials] = useState('');
  const [finishes, setFinishes] = useState('');
  const [preferredDesign, setPreferredDesign] = useState('');
  const [customerRequirements, setCustomerRequirements] = useState('');
  const [notes, setNotes] = useState('');

  // Measurements
  const [measurementUnit, setMeasurementUnit] = useState(MeasurementUnit.CM as string);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Legacy measurements (for old reports)
  const [legacyLength, setLegacyLength] = useState('');
  const [legacyWidth, setLegacyWidth] = useState('');
  const [legacyHeight, setLegacyHeight] = useState('');
  const [legacyThickness, setLegacyThickness] = useState('');
  const [legacyMeasurementNotes, setLegacyMeasurementNotes] = useState('');

  // Site conditions
  const [siteConditions, setSiteConditions] = useState<SiteConditions>(DEFAULT_SITE_CONDITIONS);

  // File uploads
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [videoKeys, setVideoKeys] = useState<string[]>([]);
  const [sketchKeys, setSketchKeys] = useState<string[]>([]);
  const [referenceImageKeys, setReferenceImageKeys] = useState<string[]>([]);

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
    setServiceType(report.serviceType || ServiceType.CUSTOM);
    setServiceTypeCustom(report.serviceTypeCustom || '');
    setMaterials(report.materials || '');
    setFinishes(report.finishes || '');
    setPreferredDesign(report.preferredDesign || '');
    setCustomerRequirements(report.customerRequirements || '');
    setNotes(report.notes || '');

    // New measurement system
    setMeasurementUnit(report.measurementUnit || MeasurementUnit.CM);
    setLineItems(report.lineItems || []);

    // Legacy measurements
    if (report.measurements) {
      setLegacyLength(report.measurements.length?.toString() || '');
      setLegacyWidth(report.measurements.width?.toString() || '');
      setLegacyHeight(report.measurements.height?.toString() || '');
      setLegacyThickness(report.measurements.thickness?.toString() || '');
      setLegacyMeasurementNotes(report.measurements.raw || '');
    }

    // Site conditions
    if (report.siteConditions) {
      setSiteConditions(report.siteConditions);
    }

    // File keys
    setPhotoKeys(report.photoKeys || []);
    setVideoKeys(report.videoKeys || []);
    setSketchKeys(report.sketchKeys || []);
    setReferenceImageKeys(report.referenceImageKeys || []);

    setFormLoaded(true);
  }

  if (isLoading) return <PageLoader />;
  if (isError || !report) return <PageError onRetry={refetch} />;

  const isDraft = report.status === VisitReportStatus.DRAFT;
  const isReturned = report.status === VisitReportStatus.RETURNED;
  const canEdit = isSalesStaff && (isDraft || isReturned);
  const canReturn =
    isEngineerOrAdmin && report.status === VisitReportStatus.SUBMITTED;

  // Detect if this is an old-style report (has legacy measurements but no lineItems)
  const isLegacyReport = !!(
    report.measurements &&
    (report.measurements.length != null ||
      report.measurements.width != null ||
      report.measurements.height != null) &&
    (!report.lineItems || report.lineItems.length === 0)
  );

  const serviceLabel =
    serviceType === ServiceType.CUSTOM
      ? serviceTypeCustom || 'Custom'
      : SERVICE_TYPE_LABELS[serviceType] || serviceType;

  const handleSave = async () => {
    try {
      // Build legacy measurements only if this is a legacy report
      let measurements: Record<string, unknown> | undefined;
      if (isLegacyReport) {
        measurements = {};
        if (legacyLength) measurements.length = parseFloat(legacyLength);
        if (legacyWidth) measurements.width = parseFloat(legacyWidth);
        if (legacyHeight) measurements.height = parseFloat(legacyHeight);
        if (legacyThickness) measurements.thickness = parseFloat(legacyThickness);
        if (legacyMeasurementNotes) measurements.raw = legacyMeasurementNotes;
        if (!Object.keys(measurements).length) measurements = undefined;
      }

      await updateMutation.mutateAsync({
        id: id!,
        visitType: visitType || undefined,
        actualVisitDateTime: actualVisitDateTime || undefined,
        serviceType: serviceType || undefined,
        serviceTypeCustom: serviceTypeCustom || undefined,
        measurementUnit,
        lineItems,
        measurements,
        siteConditions,
        materials: materials || undefined,
        finishes: finishes || undefined,
        preferredDesign: preferredDesign || undefined,
        customerRequirements: customerRequirements || undefined,
        notes: notes || undefined,
        photoKeys,
        videoKeys,
        sketchKeys,
        referenceImageKeys,
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
      {/* ── Header ── */}
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
            {serviceLabel}{' '}
            &middot;{' '}
            {report.visitType === 'ocular' ? 'Ocular Visit' : 'Consultation'}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* ── Return reason banner ── */}
      {report.returnReason && isReturned && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-orange-800">
            Report Returned
          </p>
          <p className="text-sm text-orange-700 mt-1">{report.returnReason}</p>
        </div>
      )}

      {/* ── READ-ONLY VIEWS (for non-editors) ── */}
      {!canEdit && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Report Info */}
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Report Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={Layers} label="Service Type" value={serviceLabel} />
                <InfoRow
                  icon={Calendar}
                  label="Created"
                  value={format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}
                />
                {report.actualVisitDateTime && (
                  <InfoRow
                    icon={Calendar}
                    label="Visit Date"
                    value={format(new Date(report.actualVisitDateTime), 'MMM d, yyyy h:mm a')}
                  />
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.materials && (
                  <InfoRow icon={Package} label="Materials" value={report.materials} />
                )}
                {report.finishes && (
                  <InfoRow icon={Paintbrush} label="Finishes" value={report.finishes} />
                )}
                {report.preferredDesign && (
                  <InfoRow icon={Paintbrush} label="Preferred Design" value={report.preferredDesign} />
                )}
                {report.customerRequirements && (
                  <InfoRow icon={StickyNote} label="Customer Requirements" value={report.customerRequirements} />
                )}
                {report.notes && (
                  <InfoRow icon={StickyNote} label="Notes" value={report.notes} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Line Items (read-only) */}
          {report.lineItems && report.lineItems.length > 0 && (
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Ruler className="h-5 w-5 text-gray-400" />
                  Measurements ({MEASUREMENT_UNIT_LABELS[report.measurementUnit || 'cm'] || report.measurementUnit})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.lineItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 border border-gray-100">
                      <div className="bg-white rounded-lg h-8 w-8 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                          {item.length != null && <span>L: {item.length}</span>}
                          {item.width != null && <span>W: {item.width}</span>}
                          {item.height != null && <span>H: {item.height}</span>}
                          {item.thickness != null && <span>T: {item.thickness}</span>}
                          {item.area != null && <span>Area: {item.area}</span>}
                          <span>Qty: {item.quantity}</span>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legacy measurements (read-only) */}
          {isLegacyReport && report.measurements && (
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Ruler className="h-5 w-5 text-gray-400" />
                  Measurements (Legacy)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                  {report.measurements.length != null && (
                    <span>Length: {report.measurements.length} {report.measurements.unit}</span>
                  )}
                  {report.measurements.width != null && (
                    <span>Width: {report.measurements.width} {report.measurements.unit}</span>
                  )}
                  {report.measurements.height != null && (
                    <span>Height: {report.measurements.height} {report.measurements.unit}</span>
                  )}
                  {report.measurements.thickness != null && (
                    <span>Thickness: {report.measurements.thickness} {report.measurements.unit}</span>
                  )}
                </div>
                {report.measurements.raw && (
                  <p className="text-sm text-gray-500 mt-2">{report.measurements.raw}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Site Conditions (read-only) */}
          {report.siteConditions && (
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  Site Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow icon={MapPin} label="Environment" value={ENVIRONMENT_LABELS[report.siteConditions.environment] || report.siteConditions.environment} />
                {report.siteConditions.floorType && (
                  <InfoRow icon={Layers} label="Floor Type" value={report.siteConditions.floorType} />
                )}
                {report.siteConditions.wallMaterial && (
                  <InfoRow icon={Layers} label="Wall Material" value={report.siteConditions.wallMaterial} />
                )}
                {report.siteConditions.accessNotes && (
                  <InfoRow icon={StickyNote} label="Access Notes" value={report.siteConditions.accessNotes} />
                )}
                {report.siteConditions.obstaclesOrConstraints && (
                  <InfoRow icon={StickyNote} label="Obstacles" value={report.siteConditions.obstaclesOrConstraints} />
                )}
                <div className="flex gap-4 text-sm text-gray-500">
                  {report.siteConditions.hasElectrical && <span>Electrical nearby</span>}
                  {report.siteConditions.hasPlumbing && <span>Plumbing nearby</span>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photos (read-only summary) */}
          <PhotoUploadGrid
            photoKeys={report.photoKeys || []}
            videoKeys={report.videoKeys || []}
            sketchKeys={report.sketchKeys || []}
            referenceImageKeys={report.referenceImageKeys || []}
            onPhotoKeysChange={() => {}}
            onVideoKeysChange={() => {}}
            onSketchKeysChange={() => {}}
            onReferenceImageKeysChange={() => {}}
            disabled
          />
        </div>
      )}

      {/* ── EDITABLE FORM (Sales Staff on DRAFT/RETURNED) ── */}
      {canEdit && (
        <div className="space-y-6">
          {/* Section 1: Service Type + Visit Details */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  Service & Visit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ServiceTypePicker
                  value={serviceType}
                  customValue={serviceTypeCustom}
                  onChange={(type, custom) => {
                    setServiceType(type);
                    setServiceTypeCustom(custom || '');
                  }}
                />

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
              </CardContent>
            </Card>

            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  Customer Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
          </div>

          {/* Section 2: Measurements */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Ruler className="h-5 w-5 text-gray-400" />
                Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLegacyReport ? (
                /* Legacy flat measurements for old reports */
                <div className="space-y-4">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs text-amber-700">
                      This report uses the old measurement format. New reports use per-component line items.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { label: 'Length', value: legacyLength, set: setLegacyLength },
                      { label: 'Width', value: legacyWidth, set: setLegacyWidth },
                      { label: 'Height', value: legacyHeight, set: setLegacyHeight },
                      { label: 'Thickness', value: legacyThickness, set: setLegacyThickness },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="space-y-1.5">
                        <Label className="text-[13px] font-medium text-gray-700">
                          {label} (cm)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          className="h-11 rounded-xl border-gray-200"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-gray-700">
                      Measurement Notes
                    </Label>
                    <Textarea
                      value={legacyMeasurementNotes}
                      onChange={(e) => setLegacyMeasurementNotes(e.target.value)}
                      placeholder="Special conditions, non-standard shapes..."
                      className="min-h-[60px] rounded-xl border-gray-200"
                    />
                  </div>
                </div>
              ) : (
                /* New line-item based measurements */
                <LineItemsEditor
                  items={lineItems}
                  unit={measurementUnit}
                  onItemsChange={setLineItems}
                  onUnitChange={setMeasurementUnit}
                />
              )}
            </CardContent>
          </Card>

          {/* Section 3: Site Conditions */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <MapPin className="h-5 w-5 text-gray-400" />
                Site Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SiteConditionsPanel
                value={siteConditions}
                onChange={setSiteConditions}
              />
            </CardContent>
          </Card>

          {/* Section 4: Materials & Design */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
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

          {/* Section 5: File Uploads */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Camera className="h-5 w-5 text-gray-400" />
                Photos & Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploadGrid
                photoKeys={photoKeys}
                videoKeys={videoKeys}
                sketchKeys={sketchKeys}
                referenceImageKeys={referenceImageKeys}
                onPhotoKeysChange={setPhotoKeys}
                onVideoKeysChange={setVideoKeys}
                onSketchKeysChange={setSketchKeys}
                onReferenceImageKeysChange={setReferenceImageKeys}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Actions ── */}
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

      {/* ── Submit Confirmation ── */}
      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit Visit Report"
        description="This will create a project for this report. If all reports for this appointment are submitted, the appointment will be marked as completed. Are you sure?"
        confirmLabel="Submit"
        isLoading={submitMutation.isPending}
        onConfirm={handleSubmit}
      />

      {/* ── Return Dialog ── */}
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
