import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Send,
  SkipForward,
  Camera,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ServiceTypePicker } from '@/components/shared/ServiceTypePicker';
import { SiteConditionsPanel } from '@/components/shared/SiteConditionsPanel';
import { PhotoUploadGrid } from '@/components/shared/PhotoUploadGrid';
import {
  useAppointment,
  useSubmitSiteDetails,
  useSkipSiteDetails,
} from '@/hooks/useAppointments';
import {
  AppointmentType,
  AppointmentAttendanceStatus,
  ServiceType,
  Environment,
} from '@/lib/constants';
import type { SiteConditions } from '@/lib/types';

const DEFAULT_SITE_CONDITIONS: SiteConditions = {
  environment: Environment.INDOOR,
};

export function CustomerSiteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appt, isLoading, isError, refetch } = useAppointment(id!);

  const submitMutation = useSubmitSiteDetails();
  const skipMutation = useSkipSiteDetails();

  const [skipOpen, setSkipOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  // ── Form state ──
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [serviceTypeCustom, setServiceTypeCustom] = useState('');
  const [customerRequirements, setCustomerRequirements] = useState('');
  const [notes, setNotes] = useState('');

  // Site conditions
  const [siteConditions, setSiteConditions] = useState<SiteConditions>(DEFAULT_SITE_CONDITIONS);

  // File uploads
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [videoKeys, setVideoKeys] = useState<string[]>([]);
  const [sketchKeys, setSketchKeys] = useState<string[]>([]);
  const [referenceImageKeys, setReferenceImageKeys] = useState<string[]>([]);
  const consultationHasStarted = Boolean(
    appt?.consultationStartedAt
    || [
      AppointmentAttendanceStatus.IN_PROGRESS,
      AppointmentAttendanceStatus.COMPLETED,
    ].includes(appt?.attendanceStatus as AppointmentAttendanceStatus),
  );

  const initializedFromAppointment = useRef(false);
  useEffect(() => {
    if (!appt || initializedFromAppointment.current) return;
    initializedFromAppointment.current = true;
    setServiceTypes(appt.serviceTypes || (appt.serviceType ? [appt.serviceType] : []));
    setServiceTypeCustom(appt.serviceTypeCustom || '');
    setCustomerRequirements(appt.purpose || '');
  }, [appt]);

  useEffect(() => {
    if (!appt) return;
    if (
      appt.siteDetailsStatus === 'submitted'
      || appt.siteDetailsStatus === 'skipped'
      || consultationHasStarted
      || !['requested', 'confirmed'].includes(appt.status)
    ) {
      navigate(`/appointments/${appt._id}`, { replace: true });
    }
  }, [appt, consultationHasStarted, navigate]);

  if (isLoading) return <PageLoader />;
  if (isError || !appt) return <PageError onRetry={refetch} />;

  const isOffice = appt.type === AppointmentType.OFFICE;
  const isOcular = appt.type === AppointmentType.OCULAR;

  if (
    appt.siteDetailsStatus === 'submitted'
    || appt.siteDetailsStatus === 'skipped'
    || consultationHasStarted
    || !['requested', 'confirmed'].includes(appt.status)
  ) {
    return null;
  }

  const buildPayload = () => ({
    id: id!,
    serviceTypes: serviceTypes.length > 0 ? (serviceTypes as import('@/lib/constants').ServiceType[]) : undefined,
    serviceTypeCustom: serviceTypes.includes(ServiceType.CUSTOM) ? serviceTypeCustom : undefined,
    siteConditions,
    customerRequirements: customerRequirements || undefined,
    notes: notes || undefined,
    photoKeys: photoKeys.length > 0 ? photoKeys : undefined,
    videoKeys: videoKeys.length > 0 ? videoKeys : undefined,
    sketchKeys: sketchKeys.length > 0 ? sketchKeys : undefined,
    referenceImageKeys: referenceImageKeys.length > 0 ? referenceImageKeys : undefined,
  });

  const handleSubmit = async () => {
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

  const submitDisabled = submitMutation.isPending;

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
            Help our sales team prepare by describing your site. Add photos or reference images when available.
          </p>
        </div>
      </div>

      {/* Info banner for office */}
      {isOffice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Helpful for Office Consultations</p>
            <p className="text-xs text-amber-700 mt-1">
              Since the first appointment is an office consultation, site photos and reference images can help the sales team prepare. Upload whichever materials you already have.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Items + Customer Requirements */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">
                Consultation Topic
              </CardTitle>
              <CardDescription className="text-[#6e6e73]">
                What type of fabrication do you need?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ServiceTypePicker
                value={serviceTypes}
                customValue={serviceTypeCustom}
                onChange={(types, custom) => {
                  setServiceTypes(types);
                  setServiceTypeCustom(custom || '');
                }}
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">
                Appointment Notes
              </CardTitle>
              <CardDescription className="text-[#6e6e73]">
                Share what you want to discuss during your appointment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#3a3a3e]">
                  What would you like to discuss?
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

        {/* Section 3: Site Conditions */}
        <Card className="rounded-xl border-[#c8c8cd]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
              <MapPin className="h-5 w-5 text-[#86868b]" />
              Site Conditions
            </CardTitle>
            <CardDescription className="text-[#6e6e73]">
              Describe site access and conditions to help prepare for the visit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SiteConditionsPanel
              value={siteConditions}
              onChange={setSiteConditions}
            />
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
              Site photos, reference images, videos, and sketches are optional but help the sales staff prepare.
            </CardDescription>
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
