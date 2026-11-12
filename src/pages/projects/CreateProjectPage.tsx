import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderPlus, Loader2, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DesignTemplateSelector } from '@/components/shared/DesignTemplateSelector';
import { ServiceSpecificationForm } from '@/components/shared/ServiceSpecificationForm';
import { LineItemsEditor } from '@/components/shared/LineItemsEditor';
import { FileUpload } from '@/components/shared/FileUpload';
import { PageError } from '@/components/shared/PageError';
import { PageLoader } from '@/components/shared/PageLoader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAppointment, useAppointments } from '@/hooks/useAppointments';
import { useCreateProject, useProject } from '@/hooks/useProjects';
import { useCustomerSearch, type CustomerSearchResult } from '@/hooks/useUsers';
import { useVisitReportsByAppointment } from '@/hooks/useVisitReports';
import { pickServiceType, serviceTypeOfDesign, toServiceTypeKey } from '@/lib/service-type-key';
import { api } from '@/lib/api';
import { DeliveryType, getDefaultDeliveryType, SERVICE_TYPE_LABELS, VisitReportStatus } from '@/lib/constants';
import type { ApiResponse, LineItem, ServiceSpecifications, VisitReport } from '@/lib/types';
import { getDesignTemplates, type DesignTemplate } from '@/lib/design-templates';
import { FINISH_OPTIONS, MATERIAL_OPTIONS, mergeSpecificationsWithDefaults } from '@/lib/service-specifications';
import { SuggestionInput } from '@/components/shared/SuggestionInput';
import { GalleryUpload } from '@/components/shared/PhotoUploadGrid';
import { extractErrorMessage } from '@/lib/utils';
import { cleanSalesNotes, combineSalesNotes } from '@/lib/sales-notes';
import { getReportItemKey } from '@/lib/design-selection';


// The app's Select (not a native <select>): Brave on Linux closed native dropdowns on a plain click here.
// Radix reserves '' for "no value", so the explicit "No appointment" choice needs its own value.
const NO_APPOINTMENT = 'none';
const attachmentGroups = [
  { key: 'photoKeys', label: 'Photos', folder: 'visit-photos', accept: 'image/*', maxFiles: 20, maxSizeMB: 10 },
  { key: 'videoKeys', label: 'Videos', folder: 'visit-videos', accept: 'video/*', maxFiles: 5, maxSizeMB: 50 },
  { key: 'referenceImageKeys', label: 'Reference Images', folder: 'visit-references', accept: 'image/*,.pdf', maxFiles: 10, maxSizeMB: 10 },
] as const;

function serviceLabel(serviceType?: string, custom?: string) {
  if (serviceType === 'custom' && custom?.trim()) return custom.trim();
  return serviceType ? SERVICE_TYPE_LABELS[serviceType] || serviceType : '';
}

function formatAppointmentDate(date?: string) {
  if (!date) return '';
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}


type AttachmentKey = typeof attachmentGroups[number]['key'];

type ItemDraft = {
  serviceType: string;
  serviceTypeCustom: string;
  selectedDesign: DesignTemplate | null;
  preferredDesign: string;
  initialDesignKeys: string[];
  customerRequirements: string;
  materials: string;
  finishes: string;
  specifications: ServiceSpecifications;
  lineItems: LineItem[];
  measurementUnit: string;
} & Record<AttachmentKey | 'sketchKeys', string[]>;

/** An extra project item: one per customer-selected design (or per service when there is no design). */
type ExtraItemDraft = ItemDraft & {
  key: string;
  /** The visit report this item came from, so the server updates that exact item. */
  visitReportId?: string;
  /** The booked design name, shown as the item heading. */
  label?: string;
};

function templatePatch(serviceType: string, template: DesignTemplate, specifications: ServiceSpecifications): Partial<ItemDraft> {
  return {
    selectedDesign: template,
    materials: template.material,
    finishes: template.finish,
    preferredDesign: template.preferredDesign,
    specifications: mergeSpecificationsWithDefaults(serviceType, template.suggestedSpecifications || specifications),
    lineItems: template.suggestedLineItems.map((item) => ({ ...item })),
  };
}

function newItemDraft(serviceType: string, report?: VisitReport, design?: { id?: string; name?: string }, custom?: string): ItemDraft {
  const template = getDesignTemplates(serviceType).find((candidate) => (
    candidate.id === design?.id || candidate.title.toLowerCase() === design?.name?.trim().toLowerCase()
  ));
  return {
    serviceType,
    serviceTypeCustom: report?.serviceTypeCustom || (serviceType === 'custom' ? custom || '' : ''),
    selectedDesign: template || null,
    preferredDesign: report?.preferredDesign || template?.preferredDesign || '',
    initialDesignKeys: report?.initialDesignKeys || [],
    customerRequirements: report?.customerRequirements || '',
    materials: report?.materials || template?.material || '',
    finishes: report?.finishes || template?.finish || '',
    specifications: mergeSpecificationsWithDefaults(serviceType, report?.specifications || template?.suggestedSpecifications || {}),
    lineItems: (report?.lineItems?.length ? report.lineItems : template?.suggestedLineItems || []).map((item) => ({ ...item })),
    measurementUnit: report?.measurementUnit || 'cm',
    photoKeys: report?.photoKeys || [],
    videoKeys: report?.videoKeys || [],
    sketchKeys: report?.sketchKeys || [],
    referenceImageKeys: report?.referenceImageKeys || [],
  };
}

function newExtraItemDraft(serviceType: string, report?: VisitReport, design?: { id?: string; name?: string }, custom?: string): ExtraItemDraft {
  const reportDesign = report?.selectedDesignTemplateId
    ? { id: report.selectedDesignTemplateId, name: report.selectedDesignTemplateName }
    : design;
  return {
    ...newItemDraft(serviceType, report, reportDesign, custom),
    key: report ? getReportItemKey(report) : `type:${serviceType}`,
    visitReportId: report?._id ? String(report._id) : undefined,
    label: report?.selectedDesignTemplateName?.trim() || undefined,
  };
}

function itemDomKey(key: string) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function storableImageUrl(url?: string) {
  return url && !url.startsWith('data:') ? url : undefined;
}

function ItemDetailsFields({ idPrefix, heading, itemLabel, draft, fallbackTemplateId, report, onChange, onUploadingChange, onRemove }: {
  idPrefix: string;
  heading?: string;
  /** Design name for a design-backed item; falls back to the service label. */
  itemLabel?: string;
  /** The ocular/visit report this item came from; every report must be submitted before a pending ocular is completed. */
  report?: Pick<VisitReport, '_id' | 'status'>;
  draft: ItemDraft;
  fallbackTemplateId?: string;
  onChange: (patch: Partial<ItemDraft>) => void;
  onUploadingChange: (key: string, active: boolean) => void;
  onRemove?: () => void;
}) {
  const { serviceType } = draft;
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            {heading && <p className="text-xs font-semibold uppercase tracking-wider text-[#f5b400]">{heading}</p>}
            <CardTitle>{heading ? `${itemLabel || serviceLabel(serviceType, draft.serviceTypeCustom)} Details & Design` : 'Project Details & Design'}</CardTitle>
            {report && (
              <p className="mt-1 text-xs text-muted-foreground">
                Visit report: <span className="capitalize">{String(report.status).replaceAll('_', ' ')}</span>
                {report.status !== VisitReportStatus.SUBMITTED && report.status !== VisitReportStatus.COMPLETED && (
                  <> · <Link to={`/visit-reports/${report._id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#f5b400] underline underline-offset-4">Submit Visit Report</Link></>
                )}
              </p>
            )}
          </div>
          {onRemove && <Button type="button" variant="outline" size="sm" onClick={onRemove}><Trash2 className="h-4 w-4" />Remove Item</Button>}
        </CardHeader>
        <CardContent className="min-w-0 space-y-5">
          {serviceType === 'custom' && <div className="space-y-2"><Label htmlFor={`${idPrefix}-custom-service`}>Custom Service</Label><Input id={`${idPrefix}-custom-service`} maxLength={200} value={draft.serviceTypeCustom} onChange={(event) => onChange({ serviceTypeCustom: event.target.value })} /></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor={`${idPrefix}-material`}>Material Type</Label><SuggestionInput id={`${idPrefix}-material`} maxLength={1000} value={draft.materials} options={MATERIAL_OPTIONS} onValueChange={(materials) => onChange({ materials })} /></div>
            <div className="space-y-2"><Label htmlFor={`${idPrefix}-finish`}>Finish / Color</Label><SuggestionInput id={`${idPrefix}-finish`} maxLength={500} value={draft.finishes} options={FINISH_OPTIONS} onValueChange={(finishes) => onChange({ finishes })} /></div>
          </div>
          {serviceType && <DesignTemplateSelector serviceType={serviceType} selectedTemplateId={draft.selectedDesign?.id || fallbackTemplateId} onSelect={(template) => onChange(templatePatch(serviceType, template, draft.specifications))} />}
          <div className="space-y-3">
            <div>
              <Label>Preferred Design</Label>
              <p className="mt-1 text-xs text-muted-foreground">Upload the customer's preferred design images, then add a short description below.</p>
            </div>
            <FileUpload
              folder="projects/initial-design"
              accept="image/*"
              maxSizeMB={5}
              maxFiles={10}
              label="Upload Preferred Design Images"
              existingKeys={draft.initialDesignKeys}
              onUploadComplete={(keys) => onChange({ initialDesignKeys: keys })}
              onUploadingChange={(active) => onUploadingChange(`${idPrefix}-initialDesign`, active)}
            />
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-preferred-design`}>Description</Label>
              <Textarea
                id={`${idPrefix}-preferred-design`}
                value={draft.preferredDesign}
                onChange={(event) => onChange({ preferredDesign: event.target.value })}
                maxLength={1000}
                rows={3}
                placeholder="Describe the preferred style, layout, finish, or other design details."
              />
            </div>
          </div>
          <div className="space-y-2"><Label htmlFor={`${idPrefix}-requirements`}>Customer Requirements</Label><Textarea id={`${idPrefix}-requirements`} maxLength={2000} value={draft.customerRequirements} onChange={(event) => onChange({ customerRequirements: event.target.value })} /></div>
          {serviceType && <ServiceSpecificationForm serviceType={serviceType} value={draft.specifications} onChange={(specifications) => onChange({ specifications })} />}
          <div className="space-y-3"><h2 className="font-semibold">Component Measurements</h2><LineItemsEditor items={draft.lineItems} unit={draft.measurementUnit} onItemsChange={(lineItems) => onChange({ lineItems })} onUnitChange={(measurementUnit) => onChange({ measurementUnit })} showNotes={false} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{heading ? `${serviceLabel(serviceType, draft.serviceTypeCustom)} Attachments` : 'Project Attachments'}</CardTitle></CardHeader>
        <CardContent className="grid min-w-0 gap-5 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium">Gallery</p>
            <p className="text-xs text-muted-foreground">Photos and videos from your gallery. Videos are optional (up to 20 photos and 5 videos).</p>
            <GalleryUpload
              photoKeys={draft.photoKeys}
              videoKeys={draft.videoKeys}
              onChange={(photoKeys, videoKeys) => onChange({ photoKeys, videoKeys })}
              onUploadingChange={(active) => onUploadingChange(`${idPrefix}-gallery`, active)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium">Reference Images</p>
            <FileUpload folder="visit-references" accept="image/*,.pdf" maxSizeMB={10} maxFiles={10} label="Reference Images" existingKeys={draft.referenceImageKeys} onUploadComplete={(referenceImageKeys) => onChange({ referenceImageKeys })} onUploadingChange={(active) => onUploadingChange(`${idPrefix}-referenceImageKeys`, active)} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingProjectId = searchParams.get('pendingProjectId') || '';
  const pendingProject = useProject(pendingProjectId);
  const urlAppointmentId = pendingProject.data?.ocularAppointmentId || searchParams.get('appointmentId') || '';
  // Plain "Create Project" (no appointment carried in the URL) — let the sales staff
  // optionally link one of the customer's completed appointments, so its notes and
  // design details still prefill the project.
  const isManualFlow = !pendingProjectId && !urlAppointmentId;
  const [manualAppointmentId, setManualAppointmentId] = useState('');
  const appointmentId = urlAppointmentId || manualAppointmentId;
  const visitReportId = searchParams.get('visitReportId') || '';
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') || '');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const createProject = useCreateProject();
  const [serviceType, setServiceType] = useState('');
  const [extraItems, setExtraItems] = useState<ExtraItemDraft[]>([]);
  const [newItemServiceType, setNewItemServiceType] = useState('');
  const [serviceTypeCustom, setServiceTypeCustom] = useState('');
  const [customerRequirements, setCustomerRequirements] = useState('');
  const [serviceTypeFromAppointment, setServiceTypeFromAppointment] = useState(false);
  const deliveryType = getDefaultDeliveryType(serviceType) || DeliveryType.SHOP_FABRICATED;
  const [materialType, setMaterialType] = useState('');
  const [finishColor, setFinishColor] = useState('');
  const [preferredDesign, setPreferredDesign] = useState('');
  const [specifications, setSpecifications] = useState<ServiceSpecifications>({});
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [measurementUnit, setMeasurementUnit] = useState('cm');
  const [selectedDesign, setSelectedDesign] = useState<DesignTemplate | null>(null);
  const [initialDesignKeys, setInitialDesignKeys] = useState<string[]>([]);
  const [initialDesignNotes, setInitialDesignNotes] = useState('');
  const [contractFileKeys, setContractFileKeys] = useState<string[]>([]);
  const [attachments, setAttachments] = useState({ photoKeys: [] as string[], videoKeys: [] as string[], sketchKeys: [] as string[], referenceImageKeys: [] as string[] });
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [isCheckingOcular, setIsCheckingOcular] = useState(false);
  const isUploading = Object.values(uploads).some(Boolean);

  const primaryDraft: ItemDraft = {
    serviceType,
    serviceTypeCustom,
    selectedDesign,
    preferredDesign,
    initialDesignKeys,
    customerRequirements,
    materials: materialType,
    finishes: finishColor,
    specifications,
    lineItems,
    measurementUnit,
    ...attachments,
  };

  function patchPrimary(patch: Partial<ItemDraft>) {
    if ('serviceTypeCustom' in patch) setServiceTypeCustom(patch.serviceTypeCustom!);
    if ('selectedDesign' in patch) setSelectedDesign(patch.selectedDesign!);
    if ('preferredDesign' in patch) setPreferredDesign(patch.preferredDesign!);
    if ('initialDesignKeys' in patch) setInitialDesignKeys(patch.initialDesignKeys!);
    if ('customerRequirements' in patch) setCustomerRequirements(patch.customerRequirements!);
    if ('materials' in patch) setMaterialType(patch.materials!);
    if ('finishes' in patch) setFinishColor(patch.finishes!);
    if ('specifications' in patch) setSpecifications(patch.specifications!);
    if ('lineItems' in patch) setLineItems(patch.lineItems!);
    if ('measurementUnit' in patch) setMeasurementUnit(patch.measurementUnit!);
    for (const { key } of attachmentGroups) {
      if (key in patch) setAttachments((current) => ({ ...current, [key]: patch[key]! }));
    }
  }

  function trackUpload(key: string, active: boolean) {
    setUploads((current) => current[key] === active ? current : { ...current, [key]: active });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const customerSearch = useCustomerSearch(debouncedSearch);
  // Only completed appointments that no project uses yet can be linked.
  const customerAppointments = useAppointments(
    { customerId, status: 'completed', withoutProject: 'true', sortBy: 'date', sortOrder: 'desc', limit: '20' },
    isManualFlow && !!customerId,
  );
  const linkableAppointments = customerAppointments.data?.items || [];

  // Start at "No appointment" so sales staff link one on purpose.
  useEffect(() => {
    if (isManualFlow) setManualAppointmentId('');
  }, [isManualFlow, customerId]);

  const appointment = useAppointment(appointmentId);
  const visitReports = useVisitReportsByAppointment(appointmentId);
  // Warn (but do not block) when the customer has no finished ocular visit yet.
  const completedOculars = useAppointments(
    { customerId, type: 'ocular', status: 'completed', limit: '1' },
    !pendingProjectId && !!customerId,
  );
  const hasCompletedOcular = Boolean(completedOculars.data?.items.length)
    || (appointment.data?.type === 'ocular' && appointment.data.status === 'completed');
  const [ocularWarningOpen, setOcularWarningOpen] = useState(false);
  const ocularWarningAcceptedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const appointmentReports = visitReports.data || [];
  const primaryReport = appointmentReports.find((report) => String(report._id) === visitReportId)
    || appointmentReports.find((report) => report.visitType === 'ocular')
    || appointmentReports[0];
  const appointmentServiceTypes = appointment.data?.serviceTypes?.length
    ? appointment.data.serviceTypes
    : appointment.data?.customerSiteDetails?.serviceTypes?.length
      ? appointment.data.customerSiteDetails.serviceTypes
      : [appointment.data?.serviceType || appointment.data?.customerSiteDetails?.serviceType].filter(Boolean) as string[];
  const linkedServiceTypes = [...new Set([
    ...appointmentServiceTypes,
    ...appointmentReports.map((report) => report.serviceType),
  ].map(toServiceTypeKey).filter((type): type is string => Boolean(type)))];
  const linkedServiceLabels = linkedServiceTypes.map((type) => serviceLabel(
    type,
    appointmentReports.find((report) => report.serviceType === type)?.serviceTypeCustom,
  ));
  const usedServiceTypes = [serviceType, ...extraItems.map((item) => item.serviceType)];
  const detailsSource = primaryReport || appointment.data?.customerSiteDetails;
  const defaultTitle = linkedServiceLabels.length
    ? `${linkedServiceLabels.join(' & ')} Project`.slice(0, 100)
    : '';
  const defaultNotes = [...new Set([primaryReport?.discussionNotes, detailsSource?.notes].filter(Boolean))]
    .join('\n\n')
    .slice(0, 2000);
  const sourceSelectedDesignId = primaryReport?.selectedDesignTemplateId || appointment.data?.selectedDesignTemplateId;
  const sourceSelectedDesignName = primaryReport?.selectedDesignTemplateName || appointment.data?.selectedDesignTemplateName;
  const sourceSelectedDesignImage = primaryReport?.selectedDesignTemplateImageUrl || appointment.data?.selectedDesignTemplateImageUrl;
  const prefillKeyRef = useRef('');
  const customerLookup = useQuery({
    queryKey: ['project-customer', customerId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CustomerSearchResult>>(`/users/customers/${customerId}`);
      return data.data;
    },
    enabled: !!customerId && !selectedCustomer,
  });
  const customer = selectedCustomer || customerLookup.data;

  useEffect(() => {
    const sourceCustomer = pendingProject.data?.customerId || appointment.data?.customerId;
    if (!sourceCustomer) return;
    setCustomerId(typeof sourceCustomer === 'string' ? sourceCustomer : sourceCustomer._id);
  }, [pendingProject.data?.customerId, appointment.data?.customerId]);

  useEffect(() => {
    if (!appointment.data || visitReports.isLoading) return;
    const sourceKey = primaryReport?._id || appointment.data._id;
    if (prefillKeyRef.current === sourceKey) return;
    const siteDetails = appointment.data.customerSiteDetails;
    const appointmentServiceType = pickServiceType([
      primaryReport?.serviceType,
      serviceTypeOfDesign(primaryReport?.selectedDesignTemplateId),
      appointment.data.selectedDesignTemplates?.[0]?.serviceType,
      serviceTypeOfDesign(appointment.data.selectedDesignTemplateId),
      appointment.data.serviceTypes?.[0],
      siteDetails?.serviceTypes?.[0],
      appointment.data.serviceType,
      siteDetails?.serviceType,
    ]);
    // An unknown service no longer skips the whole prefill; only the service-specific fields stay empty.
    if (!appointmentServiceType) {
      setCustomerRequirements((primaryReport || siteDetails)?.customerRequirements || '');
      setInitialDesignNotes(combineSalesNotes(...appointmentReports.map((report) => report.initialDesignNotes), appointment.data.initialDesignNotes, pendingProject.data?.initialDesignNotes));
      setAttachments({
        photoKeys: primaryReport?.photoKeys || siteDetails?.photoKeys || [],
        videoKeys: primaryReport?.videoKeys || siteDetails?.videoKeys || [],
        sketchKeys: primaryReport?.sketchKeys || siteDetails?.sketchKeys || [],
        referenceImageKeys: primaryReport?.referenceImageKeys || siteDetails?.referenceImageKeys || [],
      });
      prefillKeyRef.current = sourceKey;
      return;
    }

    const sourceTemplate = getDesignTemplates(appointmentServiceType).find((template) => (
      template.id === sourceSelectedDesignId
      || template.title.toLowerCase() === sourceSelectedDesignName?.trim().toLowerCase()
      || template.imageUrl === sourceSelectedDesignImage
    ));
    const sourceSpecifications = primaryReport?.specifications || siteDetails?.specifications;
    const sourceLineItems = primaryReport?.lineItems || siteDetails?.lineItems;

    setServiceType(appointmentServiceType);
    setServiceTypeFromAppointment(true);
    setServiceTypeCustom(primaryReport?.serviceTypeCustom || appointment.data.serviceTypeCustom || siteDetails?.serviceTypeCustom || '');
    setCustomerRequirements((primaryReport || siteDetails)?.customerRequirements || '');
    const customLabel = appointment.data?.serviceTypeCustom || siteDetails?.serviceTypeCustom;
    const primaryItemKey = primaryReport ? getReportItemKey(primaryReport) : `type:${appointmentServiceType}`;
    const seenItemKeys = new Set([primaryItemKey]);
    const reportItems: ExtraItemDraft[] = [];
    for (const report of appointmentReports) {
      const itemKey = getReportItemKey(report);
      const reportServiceType = toServiceTypeKey(report.serviceType);
      if (!reportServiceType || seenItemKeys.has(itemKey)) continue;
      seenItemKeys.add(itemKey);
      reportItems.push(newExtraItemDraft(
        reportServiceType,
        report,
        appointment.data?.selectedDesignTemplates?.find((template) => template.serviceType === reportServiceType),
        customLabel,
      ));
    }
    const servicesWithItems = new Set([appointmentServiceType, ...appointmentReports.map((report) => toServiceTypeKey(report.serviceType))]);
    setExtraItems([
      ...reportItems,
      ...linkedServiceTypes.filter((type) => !servicesWithItems.has(type)).map((type) => newExtraItemDraft(
        type,
        undefined,
        appointment.data?.selectedDesignTemplates?.find((template) => template.serviceType === type),
        customLabel,
      )),
    ]);
    setSelectedDesign(sourceTemplate || null);
    setMaterialType(primaryReport?.materials || siteDetails?.materials || sourceTemplate?.material || '');
    setFinishColor(primaryReport?.finishes || siteDetails?.finishes || sourceTemplate?.finish || '');
    setPreferredDesign(primaryReport?.preferredDesign || siteDetails?.preferredDesign || sourceTemplate?.preferredDesign || '');
    setSpecifications(mergeSpecificationsWithDefaults(
      appointmentServiceType,
      sourceSpecifications || sourceTemplate?.suggestedSpecifications || {},
    ));
    setLineItems((sourceLineItems?.length ? sourceLineItems : sourceTemplate?.suggestedLineItems || []).map((item) => ({ ...item })));
    setMeasurementUnit(primaryReport?.measurementUnit || siteDetails?.measurementUnit || 'cm');
    setInitialDesignKeys(primaryReport?.initialDesignKeys || appointment.data.initialDesignKeys || []);
    setInitialDesignNotes(combineSalesNotes(...appointmentReports.map((report) => report.initialDesignNotes), appointment.data.initialDesignNotes, pendingProject.data?.initialDesignNotes));
    setAttachments({
      photoKeys: primaryReport?.photoKeys || siteDetails?.photoKeys || [],
      videoKeys: primaryReport?.videoKeys || siteDetails?.videoKeys || [],
      sketchKeys: primaryReport?.sketchKeys || siteDetails?.sketchKeys || [],
      referenceImageKeys: primaryReport?.referenceImageKeys || siteDetails?.referenceImageKeys || [],
    });
    prefillKeyRef.current = sourceKey;
  }, [
    appointment.data,
    primaryReport,
    pendingProject.data?.initialDesignNotes,
    sourceSelectedDesignId,
    sourceSelectedDesignImage,
    sourceSelectedDesignName,
    visitReports.isLoading,
  ]);

  // Unlinking or switching the appointment clears everything the previous one filled in.
  function resetAppointmentDetails() {
    setServiceType('');
    setServiceTypeFromAppointment(false);
    setServiceTypeCustom('');
    setCustomerRequirements('');
    setExtraItems([]);
    setSelectedDesign(null);
    setMaterialType('');
    setFinishColor('');
    setPreferredDesign('');
    setSpecifications({});
    setLineItems([]);
    setMeasurementUnit('cm');
    setInitialDesignKeys([]);
    setInitialDesignNotes('');
    setAttachments({ photoKeys: [], videoKeys: [], sketchKeys: [], referenceImageKeys: [] });
    prefillKeyRef.current = '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createProject.isPending || isUploading || isCheckingOcular) return;
    if (!customerId || !customer) {
      toast.error('Select a customer first.');
      return;
    }
    // The signed contract is uploaded here, so a new project starts with its contract on file.
    if (!contractFileKeys[0]) {
      toast.error('Upload the signed contract before creating the project.');
      return;
    }

    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || '').trim();
    const title = defaultTitle
      || `${[serviceType, ...extraItems.map((item) => item.serviceType)].map((type, index) => serviceLabel(type, index ? extraItems[index - 1]!.serviceTypeCustom : serviceTypeCustom) || 'Custom').join(' & ')} Project`.slice(0, 100);
    const description = value('description');
    if (!serviceType || !deliveryType) {
      toast.error('Complete the required project information.');
      return;
    }
    if ([lineItems, ...extraItems.map((item) => item.lineItems)].flat().some((item) => !item.label.trim() || item.quantity < 1)) {
      toast.error('Complete the component name and quantity for each measurement item.');
      return;
    }
    if (!pendingProjectId && !hasCompletedOcular && !ocularWarningAcceptedRef.current) {
      setOcularWarningOpen(true);
      return;
    }
    ocularWarningAcceptedRef.current = false;

    try {
      if (pendingProjectId) {
        if (!appointmentId) {
          toast.error('The linked ocular visit could not be found. Reopen the project and try again.');
          return;
        }
        setIsCheckingOcular(true);
        const [latestAppointment, latestReports] = await Promise.all([
          appointment.refetch(),
          visitReports.refetch(),
        ]);
        if (latestAppointment.isError || latestReports.isError) {
          throw new Error('Unable to check the ocular visit and reports. Click Create Project to try again.');
        }
        const reports = latestReports.data || [];
        const reportToSubmit = reports.find((report) => (
          report.status !== VisitReportStatus.SUBMITTED && report.status !== VisitReportStatus.COMPLETED
        ));
        const visitComplete = latestAppointment.data?.status === 'completed';
        if (!visitComplete || !reports.length || reportToSubmit) {
          const needsReportSubmission = visitComplete && reportToSubmit;
          toast.error(
            <div className="space-y-2">
              <p>{needsReportSubmission
                ? `Submit the ${serviceLabel(reportToSubmit.serviceType, reportToSubmit.serviceTypeCustom) || 'ocular'} visit report before creating the project.`
                : visitComplete
                  ? 'Create and submit the ocular visit report before creating the project.'
                  : 'Complete the ocular visit before creating the project.'}</p>
              <a
                href={needsReportSubmission ? `/visit-reports/${reportToSubmit._id}` : `/appointments/${appointmentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
              >{needsReportSubmission ? 'Submit Visit Report' : 'Go to Ocular Visit'}</a>
            </div>,
            { id: 'ocular-project-validation', duration: 10000 },
          );
          return;
        }
        toast.dismiss('ocular-project-validation');
      }
      const project = await createProject.mutateAsync({
        pendingProjectId: pendingProjectId || undefined,
        customerId,
        appointmentId: appointmentId || undefined,
        title,
        serviceType,
        serviceTypes: usedServiceTypes,
        visitReportId: primaryReport?._id ? String(primaryReport._id) : undefined,
        additionalItems: extraItems.map(({ selectedDesign: design, key: _key, label: _label, ...item }) => ({
          ...item,
          serviceTypeCustom: item.serviceTypeCustom || undefined,
          preferredDesign: item.preferredDesign || undefined,
          customerRequirements: item.customerRequirements || undefined,
          materials: item.materials || undefined,
          finishes: item.finishes || undefined,
          selectedDesignTemplateId: design?.id,
          selectedDesignTemplateName: design?.title,
          selectedDesignTemplateImageUrl: storableImageUrl(design?.imageUrl),
        })),
        deliveryType,
        description: description || undefined,
        serviceTypeCustom: serviceTypeCustom || undefined,
        measurementUnit,
        lineItems,
        specifications,
        preferredDesign: preferredDesign || undefined,
        customerRequirements: customerRequirements || undefined,
        initialDesignKeys,
        initialDesignNotes: cleanSalesNotes(initialDesignNotes),
        selectedDesignTemplateId: selectedDesign?.id || sourceSelectedDesignId,
        selectedDesignTemplateName: selectedDesign?.title || sourceSelectedDesignName,
        selectedDesignTemplateImageUrl: (selectedDesign?.imageUrl || sourceSelectedDesignImage)?.startsWith('data:')
          ? undefined
          : selectedDesign?.imageUrl || sourceSelectedDesignImage || undefined,
        ...attachments,
        materialType: materialType || undefined,
        finishColor: finishColor || undefined,
        notes: value('notes') || undefined,
        contractFileKey: contractFileKeys[0],
      });
      toast.success(pendingProjectId
        ? 'Project created successfully.'
        : 'Project created. Schedule the ocular visit next.');
      navigate(`/projects/${project._id}`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to create project.'));
    } finally {
      setIsCheckingOcular(false);
    }
  }

  if (pendingProjectId && pendingProject.isLoading) return <PageLoader />;
  if (pendingProjectId && (pendingProject.isError || !pendingProject.data)) return <PageError onRetry={pendingProject.refetch} />;

  const submitButton = (
    <Button type="submit" disabled={isUploading || createProject.isPending || isCheckingOcular}>
      {createProject.isPending || isCheckingOcular ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
      {createProject.isPending
        ? 'Creating…'
        : isCheckingOcular
          ? 'Checking ocular…'
        : isUploading
          ? 'Uploading…'
          : 'Create Project'}
    </Button>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/projects"><ArrowLeft className="h-4 w-4" />Back to Projects</Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{pendingProjectId ? 'Complete Project' : 'Create Project'}</h1>
        <p className="text-sm text-muted-foreground">{pendingProjectId
          ? 'Enter the project details, then upload the signed contract.'
          : 'Enter the project details and upload the signed contract. The project starts as For Ocular; schedule the ocular visit from the project page.'}</p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <fieldset disabled={createProject.isPending || isCheckingOcular} className="min-w-0 space-y-6">
          {primaryReport?.visitType === 'ocular' && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Measurements and details were filled from the ocular visit report. Review them before creating the project.</p>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Select Customer</CardTitle>
              <CardDescription>Search by name, email, or phone number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerId ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div className="min-w-0">
                    {customer ? (
                      <>
                        <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                        <p className="break-all text-sm text-muted-foreground">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</p>
                      </>
                    ) : <p role="status" className="text-sm">{customerLookup.isError ? 'Unable to load customer. Please select a customer again.' : 'Loading customer…'}</p>}
                  </div>
                  {isManualFlow && <Button type="button" variant="outline" onClick={() => {
                    setCustomerId('');
                    setSelectedCustomer(null);
                    setSearch('');
                    setManualAppointmentId('');
                    resetAppointmentDetails();
                  }}>Change Customer</Button>}
                </div>
              ) : (
                <>
                  <Label htmlFor="project-customer-search">Customer</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="project-customer-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type at least 2 characters…" className="pl-10" autoComplete="off" />
                  </div>
                  {customerSearch.isFetching && <p role="status" className="text-sm text-muted-foreground">Searching customers…</p>}
                  {customerSearch.isError && <p role="alert" className="text-sm text-destructive">Unable to search customers. <button type="button" className="underline" onClick={() => customerSearch.refetch()}>Retry</button></p>}
                  {debouncedSearch.length >= 2 && !customerSearch.isFetching && customerSearch.data?.length === 0 && <p className="text-sm text-muted-foreground">No customers found. The customer needs a registered account.</p>}
                  {debouncedSearch.length >= 2 && customerSearch.data && customerSearch.data.length > 0 && (
                    <div className="max-h-64 divide-y overflow-y-auto rounded-xl border">
                      {customerSearch.data.map((result) => (
                        <button key={result._id} type="button" className="block w-full p-3 text-left hover:bg-muted focus-visible:bg-muted" onClick={() => {
                          setSelectedCustomer(result);
                          setCustomerId(result._id);
                          setSearch('');
                        }}>
                          <p className="font-medium">{result.firstName} {result.lastName}</p>
                          <p className="break-all text-xs text-muted-foreground">{result.email}{result.phone ? ` · ${result.phone}` : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {isManualFlow && customerId && (
            <Card>
              <CardHeader>
                <CardTitle>Appointment (optional)</CardTitle>
                <CardDescription>Pick the appointment this project came from to copy its notes and design.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {customerAppointments.isLoading ? (
                  <p role="status" className="text-sm text-muted-foreground">Loading appointments…</p>
                ) : linkableAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointments to link for this customer.</p>
                ) : (
                  <Select
                    value={manualAppointmentId}
                    onValueChange={(next) => {
                      const nextId = next === NO_APPOINTMENT ? '' : next;
                      if (nextId === manualAppointmentId) return;
                      resetAppointmentDetails();
                      setManualAppointmentId(nextId);
                    }}
                  >
                    <SelectTrigger aria-label="Appointment" className="h-11">
                      <SelectValue placeholder="No appointment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_APPOINTMENT}>No appointment</SelectItem>
                      {linkableAppointments.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {[
                            item.appointmentNumber || item._id,
                            item.type === 'ocular' ? 'Ocular' : 'Office',
                            formatAppointmentDate(item.date),
                            serviceLabel(item.serviceTypes?.[0], item.serviceTypeCustom),
                          ].filter(Boolean).join(' · ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Sales Notes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="project-sales-notes">Sales Notes (optional)</Label>
              <Textarea id="project-sales-notes" value={initialDesignNotes} onChange={(event) => setInitialDesignNotes(event.target.value)} maxLength={2000} rows={4} placeholder="Enter your notes and clarified customer requirements." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                {extraItems.length
                  ? `This project has ${extraItems.length + 1} items. Each item has its own details, design, and attachments below.`
                  : 'Project ID, delivery type, and appointment/ocular details are filled automatically.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedServiceTypes.length > 1 ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Primary Item</p>
                  <p className="text-sm">{serviceLabel(serviceType, serviceTypeCustom)}</p>
                  <p className="text-xs text-muted-foreground">Taken from the appointment. Each appointment item gets its own section below.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="project-service">Service Type</Label>
                  <Select value={serviceType} onValueChange={(next) => {
                    // Radix can fire an empty change from its hidden form <select> right after the
                    // value is set programmatically; ignoring it keeps the auto-filled service.
                    if (!next) return;
                    setServiceType(next);
                    setServiceTypeFromAppointment(false);
                    setSelectedDesign(null);
                    setExtraItems((current) => current.filter((item) => item.serviceType !== next));
                  }}>
                    <SelectTrigger id="project-service" className="h-11">
                      <SelectValue placeholder={appointmentId && appointment.isLoading ? 'Loading appointment service…' : 'Select a service'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {serviceTypeFromAppointment && <p className="text-xs text-muted-foreground">Auto-filled from the appointment and visit report. You can change it if needed.</p>}
                  {appointmentId && appointment.isError && <p className="text-xs text-muted-foreground">Unable to load the appointment service. Select it manually.</p>}
                </div>
              )}
              <div className="space-y-2"><Label htmlFor="project-description">Description / Scope of Work (optional)</Label><Textarea key={pendingProject.data?._id || 'new-project'} id="project-description" name="description" maxLength={2000} rows={3} defaultValue={pendingProject.data?.description} /></div>
              <div className="space-y-2"><Label htmlFor="project-notes">Project Notes</Label>{/* Keyed so the notes refill when a different appointment or report is linked; the rest of the form keeps its state. */}<Textarea key={primaryReport?._id || appointment.data?._id || 'new-project'} id="project-notes" name="notes" maxLength={2000} rows={3} defaultValue={defaultNotes} /></div>
            </CardContent>
          </Card>

          <ItemDetailsFields
            idPrefix="project"
            heading={extraItems.length ? 'Item 1 · Primary' : undefined}
            draft={primaryDraft}
            fallbackTemplateId={sourceSelectedDesignId}
            itemLabel={primaryReport?.selectedDesignTemplateName?.trim() || undefined}
            report={extraItems.length ? primaryReport || appointmentReports.find((entry) => entry.serviceType === serviceType) : undefined}
            onChange={patchPrimary}
            onUploadingChange={trackUpload}
          />

          {extraItems.map((item, index) => (
            <ItemDetailsFields
              key={item.key}
              idPrefix={`item-${itemDomKey(item.key)}`}
              heading={`Item ${index + 2}`}
              itemLabel={item.label}
              draft={item}
              report={item.visitReportId
                ? appointmentReports.find((entry) => String(entry._id) === item.visitReportId)
                : appointmentReports.find((entry) => entry.serviceType === item.serviceType)}
              onChange={(patch) => setExtraItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, ...patch } : entry))}
              onUploadingChange={trackUpload}
              // A pending ocular keeps every item measured during the visit.
              onRemove={pendingProjectId ? undefined : () => {
                setExtraItems((current) => current.filter((entry) => entry.key !== item.key));
                setUploads((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`item-${itemDomKey(item.key)}-`))));
              }}
            />
          ))}

          {serviceType && !pendingProjectId && (
            <Card>
              <CardHeader>
                <CardTitle>Add Another Item</CardTitle>
                <CardDescription>Use this when the customer orders more than one item, for example a walk-in customer who needs a gate and a railing.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Select value={newItemServiceType} onValueChange={setNewItemServiceType}>
                  <SelectTrigger aria-label="Service for the new item" className="h-11">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SERVICE_TYPE_LABELS).filter(([value]) => !usedServiceTypes.includes(value)).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="shrink-0" disabled={!newItemServiceType} onClick={() => {
                  setExtraItems((current) => [...current, newExtraItemDraft(newItemServiceType)]);
                  setNewItemServiceType('');
                }}><Plus className="h-4 w-4" />Add Item</Button>
              </CardContent>
            </Card>
          )}

          {/* Every project is created with its signed contract. */}
          <Card>
            <CardHeader>
              <CardTitle>Signed Contract</CardTitle>
              <CardDescription>Upload the contract the customer signed. It is required to create the project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                folder="contracts"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                maxSizeMB={10}
                maxFiles={1}
                label="Upload Signed Contract"
                existingKeys={contractFileKeys}
                onUploadComplete={setContractFileKeys}
                onUploadingChange={(active) => setUploads((current) => current.contract === active ? current : { ...current, contract: active })}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/projects')}>Cancel</Button>
            {submitButton}
          </div>
        </fieldset>
      </form>

      <ConfirmDialog
        open={ocularWarningOpen}
        onOpenChange={setOcularWarningOpen}
        title="No ocular visit yet"
        description='This customer has no completed ocular visit. The project will start as "For Ocular": schedule the ocular visit from the project page before it can move forward. Create the project anyway?'
        confirmLabel="Create Project Anyway"
        cancelLabel="Cancel"
        onConfirm={() => {
          ocularWarningAcceptedRef.current = true;
          setOcularWarningOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
