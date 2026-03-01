import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  SkipForward,
  Ruler,
  Package,
  Camera,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ServiceTypePicker } from '@/components/shared/ServiceTypePicker';
import { LineItemsEditor } from '@/components/shared/LineItemsEditor';
import { SiteConditionsPanel } from '@/components/shared/SiteConditionsPanel';
import { PhotoUploadGrid } from '@/components/shared/PhotoUploadGrid';
import {
  useAppointment,
  useSubmitSiteDetails,
  useSkipSiteDetails,
} from '@/hooks/useAppointments';
import {
  AppointmentType,
  ServiceType,
  MeasurementUnit,
  Environment,
} from '@/lib/constants';
import type { LineItem, SiteConditions } from '@/lib/types';

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

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'error' in error.response.data &&
    typeof error.response.data.error === 'object' &&
    error.response.data.error !== null &&
    'message' in error.response.data.error &&
    typeof error.response.data.error.message === 'string'
  ) {
    return error.response.data.error.message;
  }
  return fallback;
}

export function CustomerSiteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appt, isLoading, isError, refetch } = useAppointment(id!);

  const submitMutation = useSubmitSiteDetails();
  const skipMutation = useSkipSiteDetails();

  const [skipOpen, setSkipOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  // ── Form state ──
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

  // Site conditions
  const [siteConditions, setSiteConditions] = useState<SiteConditions>(DEFAULT_SITE_CONDITIONS);

  // File uploads
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [videoKeys, setVideoKeys] = useState<string[]>([]);
  const [sketchKeys, setSketchKeys] = useState<string[]>([]);
  const [referenceImageKeys, setReferenceImageKeys] = useState<string[]>([]);

  if (isLoading) return <PageLoader />;
  if (isError || !appt) return <PageError onRetry={refetch} />;

  const isOffice = appt.type === AppointmentType.OFFICE;
  const isOcular = appt.type === AppointmentType.OCULAR;

  // If already submitted, redirect to detail page
  if (appt.siteDetailsStatus === 'submitted' || appt.siteDetailsStatus === 'skipped') {
    navigate(`/appointments/${appt._id}`, { replace: true });
    return null;
  }

  // If appointment is not in 'requested' status, redirect
  if (appt.status !== 'requested') {
    navigate(`/appointments/${appt._id}`, { replace: true });
    return null;
  }

  const buildPayload = () => ({
    id: id!,
    serviceType: serviceType || undefined,
    serviceTypeCustom: serviceType === ServiceType.CUSTOM ? serviceTypeCustom : undefined,
    measurementUnit: measurementUnit || undefined,
    lineItems: lineItems.length > 0 ? lineItems : undefined,
    siteConditions,
    materials: materials || undefined,
    finishes: finishes || undefined,
    preferredDesign: preferredDesign || undefined,
    customerRequirements: customerRequirements || undefined,
    notes: notes || undefined,
    photoKeys: photoKeys.length > 0 ? photoKeys : undefined,
    videoKeys: videoKeys.length > 0 ? videoKeys : undefined,
    sketchKeys: sketchKeys.length > 0 ? sketchKeys : undefined,
    referenceImageKeys: referenceImageKeys.length > 0 ? referenceImageKeys : undefined,
  });

  const handleSubmit = async () => {
    // Validate mandatory fields for office appointments
    if (isOffice) {
      if (photoKeys.length === 0) {
        toast.error('At least one site photo is required for office appointments.');
        setSubmitOpen(false);
        return;
      }
      if (referenceImageKeys.length === 0) {
        toast.error('At least one reference image is required for office appointments.');
        setSubmitOpen(false);
        return;
      }
    }

    try {
      await submitMutation.mutateAsync(buildPayload());
      toast.success('Site details submitted successfully!');
      navigate('/appointments');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to submit site details'));
    }
    setSubmitOpen(false);
  };

  const handleSkip = async () => {
    try {
      await skipMutation.mutateAsync(id!);
      toast.success('Site details skipped.');
      navigate('/appointments');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to skip'));
    }
    setSkipOpen(false);
  };

  const hasRequiredPhotos = photoKeys.length > 0 && referenceImageKeys.length > 0;
  const submitDisabled = submitMutation.isPending || (isOffice && !hasRequiredPhotos);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/appointments/${appt._id}`)}
          className="rounded-xl text-[#6e6e73] hover:text-[#1d1d1f]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            Provide Site Details
          </h1>
          <p className="text-[#6e6e73] text-sm">
            Help our sales team prepare by describing your site. Photos & reference images are required.
          </p>
        </div>
      </div>

      {/* Info banner for office */}
      {isOffice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Required for Office Appointments</p>
            <p className="text-xs text-amber-700 mt-1">
              Since our sales staff won&apos;t visit your site, please upload <strong>site photos</strong> and <strong>reference images</strong> so they can prepare for your consultation. Your appointment cannot be confirmed without these details.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Service Type + Customer Requirements */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">
                Service Type
              </CardTitle>
              <CardDescription className="text-[#6e6e73]">
                What type of fabrication do you need?
              </CardDescription>
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
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">
                Your Requirements
              </CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Describe what you need and any special notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#3a3a3e]">
                  What do you need?
                </Label>
                <Textarea
                  value={customerRequirements}
                  onChange={(e) => setCustomerRequirements(e.target.value)}
                  placeholder="Describe what you're looking for (e.g., kitchen countertop with L-shape, stainless steel railings for 2nd floor balcony)..."
                  className="min-h-[80px] rounded-xl border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#3a3a3e]">
                  Additional Notes
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other details you'd like to share..."
                  className="min-h-[80px] rounded-xl border-[#d2d2d7] focus:border-[#c8c8cd] focus:ring-[#6e6e73]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Measurements */}
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
              items={lineItems}
              unit={measurementUnit}
              onItemsChange={setLineItems}
              onUnitChange={setMeasurementUnit}
            />
          </CardContent>
        </Card>

        {/* Section 3: Site Conditions */}
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
              value={siteConditions}
              onChange={setSiteConditions}
            />
          </CardContent>
        </Card>

        {/* Section 4: Materials & Design */}
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
              <Label className="text-[13px] font-medium text-[#3a3a3e]">
                Materials
              </Label>
              <Select value={materials} onValueChange={setMaterials}>
                <SelectTrigger className="h-11 rounded-xl border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] focus:ring-1 focus:ring-[#f0f0f5] focus:ring-offset-0 focus:border-[#c8c8cd] w-full">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#d2d2d7] bg-white shadow-lg">
                  {MATERIAL_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="rounded-lg cursor-pointer text-sm py-2.5 focus:bg-[#f0f0f5] focus:text-[#1d1d1f] data-[highlighted]:bg-[#f0f0f5] data-[highlighted]:text-[#1d1d1f]"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-[#3a3a3e]">
                Finishes
              </Label>
              <Select value={finishes} onValueChange={setFinishes}>
                <SelectTrigger className="h-11 rounded-xl border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] focus:ring-1 focus:ring-[#f0f0f5] focus:ring-offset-0 focus:border-[#c8c8cd] w-full">
                  <SelectValue placeholder="Select finish..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#d2d2d7] bg-white shadow-lg">
                  {FINISH_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="rounded-lg cursor-pointer text-sm py-2.5 focus:bg-[#f0f0f5] focus:text-[#1d1d1f] data-[highlighted]:bg-[#f0f0f5] data-[highlighted]:text-[#1d1d1f]"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-[#3a3a3e]">
                Preferred Design
              </Label>
              <Input
                value={preferredDesign}
                onChange={(e) => setPreferredDesign(e.target.value)}
                placeholder="e.g., Modern minimalist"
                className="h-11 rounded-xl border-[#d2d2d7]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: File Uploads */}
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
              <Camera className="h-5 w-5 text-[#86868b]" />
              Photos & Attachments
            </CardTitle>
            <CardDescription className="text-[#6e6e73]">
              Site photos and reference images are required. Videos and sketches help the sales staff prepare.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isOffice && (
              <div className="mb-4 rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#6e6e73]" />
                  <p className="text-xs font-medium text-[#3a3a3e]">
                    <span className="text-red-600">*</span> Site Photos and Reference Images are required
                  </p>
                </div>
              </div>
            )}
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

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pb-8">
        <Button
          onClick={() => setSubmitOpen(true)}
          disabled={submitDisabled}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
        >
          <Send className="mr-2 h-4 w-4" />
          Submit Site Details
        </Button>

        {isOcular && (
          <Button
            variant="outline"
            onClick={() => setSkipOpen(true)}
            disabled={skipMutation.isPending}
            className="border-[#d2d2d7] text-[#3a3a3e] rounded-xl"
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Skip for Now
          </Button>
        )}
      </div>

      {/* Submit Confirmation */}
      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit Site Details"
        description="Once submitted, these details will be shared with the assigned sales staff. You won't be able to edit them afterwards. Continue?"
        confirmLabel="Submit"
        isLoading={submitMutation.isPending}
        onConfirm={handleSubmit}
      />

      {/* Skip Confirmation (ocular only) */}
      <ConfirmDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        title="Skip Site Details"
        description="You can skip this step since our sales staff will visit your site. However, providing details upfront helps them prepare better."
        confirmLabel="Skip"
        isLoading={skipMutation.isPending}
        onConfirm={handleSkip}
      />
    </div>
  );
}
