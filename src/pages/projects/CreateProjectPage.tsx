import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderPlus, Loader2, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DesignTemplateSelector } from '@/components/shared/DesignTemplateSelector';
import { ServiceSpecificationForm } from '@/components/shared/ServiceSpecificationForm';
import { LineItemsEditor } from '@/components/shared/LineItemsEditor';
import { FileUpload } from '@/components/shared/FileUpload';
import { useAppointment, useAvailableSlots } from '@/hooks/useAppointments';
import { useCreateProject } from '@/hooks/useProjects';
import { useCustomerSearch, type CustomerSearchResult } from '@/hooks/useUsers';
import { useVisitReportsByAppointment } from '@/hooks/useVisitReports';
import { api } from '@/lib/api';
import { DeliveryType, getDefaultDeliveryType, SERVICE_TYPE_LABELS } from '@/lib/constants';
import type { ApiResponse, Appointment, LineItem, ServiceSpecifications } from '@/lib/types';
import { getDesignTemplates, type DesignTemplate } from '@/lib/design-templates';
import { mergeSpecificationsWithDefaults } from '@/lib/service-specifications';
import { extractErrorMessage } from '@/lib/utils';

const selectClassName = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const attachmentGroups = [
  { key: 'photoKeys', label: 'Photos', folder: 'visit-photos', accept: 'image/*', maxFiles: 20, maxSizeMB: 10 },
  { key: 'videoKeys', label: 'Videos', folder: 'visit-videos', accept: 'video/*', maxFiles: 5, maxSizeMB: 50 },
  { key: 'referenceImageKeys', label: 'Reference Images', folder: 'visit-references', accept: 'image/*,.pdf', maxFiles: 10, maxSizeMB: 10 },
] as const;

function appointmentAddress(appointment?: Appointment) {
  if (!appointment) return '';
  if (appointment.formattedAddress) return appointment.formattedAddress;
  if (appointment.address) return appointment.address;
  if (appointment.customerAddress) return appointment.customerAddress;
  const address = appointment.addressStructured;
  return address
    ? [address.street, address.barangay, address.city, address.province, address.zip].filter(Boolean).join(', ')
    : '';
}

function serviceLabel(serviceType?: string, custom?: string) {
  if (serviceType === 'custom' && custom?.trim()) return custom.trim();
  return serviceType ? SERVICE_TYPE_LABELS[serviceType] || serviceType : '';
}

function localDateAfter(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId') || '';
  const visitReportId = searchParams.get('visitReportId') || '';
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') || '');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const createProject = useCreateProject();
  const [serviceType, setServiceType] = useState('');
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
  const [projectPath, setProjectPath] = useState<'direct' | 'ocular'>('direct');
  const [ocularVisitDate, setOcularVisitDate] = useState('');
  const [ocularVisitSlot, setOcularVisitSlot] = useState('');
  const isUploading = Object.values(uploads).some(Boolean);
  const availableOcularSlots = useAvailableSlots(ocularVisitDate, 'ocular');

  function selectDesign(template: DesignTemplate) {
    setSelectedDesign(template);
    setMaterialType(template.material);
    setFinishColor(template.finish);
    setPreferredDesign(template.preferredDesign);
    setSpecifications(mergeSpecificationsWithDefaults(serviceType, template.suggestedSpecifications || specifications));
    setLineItems(template.suggestedLineItems.map((item) => ({ ...item })));
    setInitialDesignNotes(template.initialDesignNotes);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const customerSearch = useCustomerSearch(debouncedSearch);
  const appointment = useAppointment(appointmentId);
  const visitReports = useVisitReportsByAppointment(appointmentId);
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
    ...appointmentReports.map((report) => report.serviceType).filter(Boolean),
  ])];
  const linkedServiceLabels = linkedServiceTypes.map((type) => serviceLabel(
    type,
    appointmentReports.find((report) => report.serviceType === type)?.serviceTypeCustom,
  ));
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
    if (!appointment.data || visitReports.isLoading) return;
    const sourceKey = primaryReport?._id || appointment.data._id;
    if (prefillKeyRef.current === sourceKey) return;
    const siteDetails = appointment.data.customerSiteDetails;
    const appointmentServiceType = primaryReport?.serviceType
      || appointment.data.serviceTypes?.[0]
      || siteDetails?.serviceTypes?.[0]
      || appointment.data.serviceType
      || siteDetails?.serviceType;
    if (!appointmentServiceType || !SERVICE_TYPE_LABELS[appointmentServiceType]) return;

    const sourceTemplate = getDesignTemplates(appointmentServiceType).find((template) => (
      template.id === sourceSelectedDesignId
      || template.title.toLowerCase() === sourceSelectedDesignName?.trim().toLowerCase()
      || template.imageUrl === sourceSelectedDesignImage
    ));
    const sourceSpecifications = primaryReport?.specifications || siteDetails?.specifications;
    const sourceLineItems = primaryReport?.lineItems || siteDetails?.lineItems;

    setServiceType(appointmentServiceType);
    setServiceTypeFromAppointment(true);
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
    setInitialDesignNotes(primaryReport?.initialDesignNotes || appointment.data.initialDesignNotes || sourceTemplate?.initialDesignNotes || '');
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
    sourceSelectedDesignId,
    sourceSelectedDesignImage,
    sourceSelectedDesignName,
    visitReports.isLoading,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createProject.isPending || isUploading) return;
    if (!customerId || !customer) {
      toast.error('Select a customer first.');
      return;
    }
    if (!contractFileKeys[0]) {
      toast.error('Upload the signed contract before creating the project.');
      return;
    }
    if (projectPath === 'ocular') {
      if (!appointmentId) {
        toast.error('Open Create Project from a completed appointment before scheduling an ocular visit.');
        return;
      }
      if (!ocularVisitDate || !ocularVisitSlot) {
        toast.error('Select the ocular visit date and time.');
        return;
      }
      const selectedSlot = availableOcularSlots.data?.slots.find((slot) => slot.slotCode === ocularVisitSlot);
      if (!selectedSlot?.available) {
        toast.error('Select an available ocular visit time.');
        return;
      }
    }

    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || '').trim();
    const title = defaultTitle
      || `${serviceLabel(serviceType, value('serviceTypeCustom')) || 'Custom'} Project`.slice(0, 100);
    const description = value('description');
    const siteAddress = value('siteAddress');
    if (!serviceType || !deliveryType || !siteAddress) {
      toast.error('Complete the required project information.');
      return;
    }
    if (lineItems.some((item) => !item.label.trim() || item.quantity < 1)) {
      toast.error('Complete the component name and quantity for each measurement item.');
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        customerId,
        appointmentId: appointmentId || undefined,
        title,
        serviceType,
        deliveryType,
        description: description || undefined,
        siteAddress,
        serviceTypeCustom: value('serviceTypeCustom') || undefined,
        measurementUnit,
        lineItems,
        specifications,
        preferredDesign: preferredDesign || undefined,
        customerRequirements: value('customerRequirements') || undefined,
        initialDesignKeys,
        initialDesignNotes: initialDesignNotes || undefined,
        selectedDesignTemplateId: selectedDesign?.id || sourceSelectedDesignId,
        selectedDesignTemplateName: selectedDesign?.title || sourceSelectedDesignName,
        selectedDesignTemplateImageUrl: (selectedDesign?.imageUrl || sourceSelectedDesignImage)?.startsWith('data:')
          ? undefined
          : selectedDesign?.imageUrl || sourceSelectedDesignImage || undefined,
        ...attachments,
        materialType: value('materialType') || undefined,
        finishColor: value('finishColor') || undefined,
        notes: value('notes') || undefined,
        contractFileKey: contractFileKeys[0],
        ocularVisit: projectPath === 'ocular'
          ? { date: ocularVisitDate, slotCode: ocularVisitSlot }
          : undefined,
      });
      toast.success(projectPath === 'ocular'
        ? 'Project created and ocular visit scheduled.'
        : 'Project created successfully.');
      navigate(`/projects/${project._id}`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to create project.'));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/projects"><ArrowLeft className="h-4 w-4" />Back to Projects</Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Create Project</h1>
        <p className="text-sm text-muted-foreground">Upload the signed contract, then enter the project details.</p>
      </div>

      <datalist id="project-material-options">{['Stainless 201', 'Stainless 304', 'Stainless 316', 'Mild Steel', 'Galvanized Iron (GI)', 'Aluminum', 'Wrought Iron', 'Glass', 'Wood'].map((label) => <option key={label} value={label} />)}</datalist>
      <datalist id="project-finish-options">{['Hairline / Brushed', 'Mirror / Polished', 'Matte', 'Powder Coated', 'Painted', 'Sandblasted', 'Rose Gold (PVD)', 'Gold (PVD)', 'Black (PVD)'].map((label) => <option key={label} value={label} />)}</datalist>
      <form
        key={primaryReport?._id || appointment.data?._id || 'new-project'}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <fieldset disabled={createProject.isPending} className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Signed Contract</CardTitle>
              <CardDescription>A signed contract is required before the project can be created.</CardDescription>
            </CardHeader>
            <CardContent>
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

          <Card>
            <CardHeader>
              <CardTitle>Project Workflow</CardTitle>
              <CardDescription>Choose whether this project can proceed directly or needs an ocular site visit first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={projectPath === 'direct'}
                  onClick={() => setProjectPath('direct')}
                  className={`rounded-xl border p-4 text-left transition-colors ${projectPath === 'direct' ? 'border-blue-400 bg-blue-50 text-blue-950 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-100' : 'hover:bg-muted'}`}
                >
                  <p className="text-sm font-semibold">Create Project</p>
                  <p className="mt-1 text-xs opacity-75">Send the completed project details to engineering.</p>
                </button>
                <button
                  type="button"
                  aria-pressed={projectPath === 'ocular'}
                  disabled={!appointmentId}
                  onClick={() => setProjectPath('ocular')}
                  className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${projectPath === 'ocular' ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-100' : 'hover:bg-muted'}`}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" />Ocular Visit</p>
                  <p className="mt-1 text-xs opacity-75">Create the project first, then collect and verify details on site.</p>
                </button>
              </div>

              {!appointmentId && (
                <p className="text-xs text-muted-foreground">Ocular Visit is available when this page is opened from a completed appointment.</p>
              )}

              {projectPath === 'ocular' && (
                <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-ocular-date">Ocular Visit Date</Label>
                    <Input
                      id="project-ocular-date"
                      type="date"
                      min={localDateAfter(3)}
                      value={ocularVisitDate}
                      onChange={(event) => {
                        setOcularVisitDate(event.target.value);
                        setOcularVisitSlot('');
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-ocular-slot">Time Slot</Label>
                    <select
                      id="project-ocular-slot"
                      value={ocularVisitSlot}
                      onChange={(event) => setOcularVisitSlot(event.target.value)}
                      className={selectClassName}
                      required
                      disabled={!ocularVisitDate || availableOcularSlots.isLoading}
                    >
                      <option value="">{availableOcularSlots.isLoading ? 'Checking slots…' : 'Select an available time'}</option>
                      {availableOcularSlots.data?.slots.filter((slot) => slot.available).map((slot) => (
                        <option key={slot.slotCode} value={slot.slotCode}>{slot.slotCode}</option>
                      ))}
                    </select>
                    {ocularVisitDate && !availableOcularSlots.isLoading && availableOcularSlots.data?.slots.every((slot) => !slot.available) && (
                      <p className="text-xs text-destructive">No available ocular slots on this date.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                  <Button type="button" variant="outline" onClick={() => {
                    setCustomerId('');
                    setSelectedCustomer(null);
                    setSearch('');
                  }}>Change Customer</Button>
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

          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                {linkedServiceTypes.length > 1
                  ? `${linkedServiceTypes.length} service items and their appointment/ocular details will be linked automatically.`
                  : 'Project ID, delivery type, and appointment/ocular details are filled automatically.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-service">Service Type</Label>
                <select id="project-service" name="serviceType" required value={serviceType} onChange={(event) => {
                  setServiceType(event.target.value);
                  setServiceTypeFromAppointment(false);
                  setSelectedDesign(null);
                }} className={selectClassName}>
                  <option value="" disabled>{appointmentId && appointment.isLoading ? 'Loading appointment service…' : 'Select a service'}</option>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {serviceTypeFromAppointment && <p className="text-xs text-muted-foreground">Auto-filled from the appointment and visit report. You can change it if needed.</p>}
                {appointmentId && appointment.isError && <p className="text-xs text-muted-foreground">Unable to load the appointment service. Select it manually.</p>}
              </div>
              <div className="space-y-2"><Label htmlFor="project-description">Description / Scope of Work (optional)</Label><Textarea id="project-description" name="description" maxLength={2000} rows={3} /></div>
              <div className="space-y-2"><Label htmlFor="project-address">Project Site Address</Label><Textarea id="project-address" name="siteAddress" required maxLength={500} rows={2} defaultValue={appointmentAddress(appointment.data)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="project-material">Material Type</Label><Input id="project-material" name="materialType" maxLength={1000} value={materialType} onChange={(event) => setMaterialType(event.target.value)} list="project-material-options" /></div>
                <div className="space-y-2"><Label htmlFor="project-finish">Finish / Color</Label><Input id="project-finish" name="finishColor" maxLength={500} value={finishColor} onChange={(event) => setFinishColor(event.target.value)} list="project-finish-options" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="project-notes">Project Notes</Label><Textarea id="project-notes" name="notes" maxLength={2000} rows={3} defaultValue={defaultNotes} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Project Details &amp; Design</CardTitle></CardHeader>
            <CardContent className="min-w-0 space-y-5">
              {serviceType === 'custom' && <div className="space-y-2"><Label htmlFor="project-custom-service">Custom Service</Label><Input id="project-custom-service" name="serviceTypeCustom" maxLength={200} defaultValue={primaryReport?.serviceTypeCustom || appointment.data?.serviceTypeCustom || appointment.data?.customerSiteDetails?.serviceTypeCustom} /></div>}
              {serviceType && <DesignTemplateSelector serviceType={serviceType} selectedTemplateId={selectedDesign?.id || sourceSelectedDesignId} onSelect={selectDesign} />}
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
                  existingKeys={initialDesignKeys}
                  onUploadComplete={setInitialDesignKeys}
                  onUploadingChange={(active) => setUploads((current) => current.initialDesign === active ? current : { ...current, initialDesign: active })}
                />
                <div className="space-y-2">
                  <Label htmlFor="project-preferred-design">Description</Label>
                  <Textarea
                    id="project-preferred-design"
                    value={preferredDesign}
                    onChange={(event) => setPreferredDesign(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Describe the preferred style, layout, finish, or other design details."
                  />
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="project-requirements">Customer Requirements</Label><Textarea id="project-requirements" name="customerRequirements" maxLength={2000} defaultValue={detailsSource?.customerRequirements} /></div>
              {serviceType && <ServiceSpecificationForm serviceType={serviceType} value={specifications} onChange={setSpecifications} />}
              <div className="space-y-3"><h2 className="font-semibold">Component Measurements</h2><LineItemsEditor items={lineItems} unit={measurementUnit} onItemsChange={setLineItems} onUnitChange={setMeasurementUnit} showNotes={false} /></div>
              <div className="space-y-2"><Label htmlFor="project-design-notes">Initial Design Notes</Label><Textarea id="project-design-notes" value={initialDesignNotes} onChange={(event) => setInitialDesignNotes(event.target.value)} maxLength={2000} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Project Attachments</CardTitle></CardHeader>
            <CardContent className="grid min-w-0 gap-5 sm:grid-cols-2">
              {attachmentGroups.map((group) => <div key={group.key} className="min-w-0"><FileUpload folder={group.folder} accept={group.accept} maxSizeMB={group.maxSizeMB} maxFiles={group.maxFiles} label={group.label} existingKeys={attachments[group.key]} onUploadComplete={(keys) => setAttachments((current) => ({ ...current, [group.key]: keys }))} onUploadingChange={(active) => setUploads((current) => current[group.key] === active ? current : { ...current, [group.key]: active })} /></div>)}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/projects')}>Cancel</Button>
            <Button type="submit" disabled={!customer || !contractFileKeys[0] || isUploading || createProject.isPending}>
              {createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              {createProject.isPending
                ? 'Creating…'
                : isUploading
                  ? 'Uploading…'
                  : projectPath === 'ocular'
                    ? 'Create Project & Schedule Ocular Visit'
                    : 'Create Project'}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
