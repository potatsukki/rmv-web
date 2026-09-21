import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderPlus, Loader2, Search } from 'lucide-react';
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
import { useAppointment } from '@/hooks/useAppointments';
import { useCreateProject } from '@/hooks/useProjects';
import { useCustomerSearch, type CustomerSearchResult } from '@/hooks/useUsers';
import { api } from '@/lib/api';
import { DELIVERY_TYPE_LABELS, DeliveryType, getDefaultDeliveryType, MEASUREMENT_UNIT_LABELS, SERVICE_TYPE_LABELS } from '@/lib/constants';
import type { ApiResponse, LineItem, ServiceSpecifications } from '@/lib/types';
import type { DesignTemplate } from '@/lib/design-templates';
import { mergeSpecificationsWithDefaults } from '@/lib/service-specifications';
import { extractErrorMessage } from '@/lib/utils';

const selectClassName = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const dimensions = ['length', 'width', 'height', 'area', 'thickness'] as const;
const attachmentGroups = [
  { key: 'photoKeys', label: 'Photos', folder: 'visit-photos', accept: 'image/*', maxFiles: 20, maxSizeMB: 10 },
  { key: 'videoKeys', label: 'Videos', folder: 'visit-videos', accept: 'video/*', maxFiles: 5, maxSizeMB: 50 },
  { key: 'sketchKeys', label: 'Sketches', folder: 'visit-sketches', accept: 'image/*,.pdf', maxFiles: 10, maxSizeMB: 10 },
  { key: 'referenceImageKeys', label: 'Reference Images', folder: 'visit-references', accept: 'image/*,.pdf', maxFiles: 10, maxSizeMB: 10 },
] as const;

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId') || '';
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') || '');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const createProject = useCreateProject();
  const [serviceType, setServiceType] = useState('');
  const [serviceTypeFromAppointment, setServiceTypeFromAppointment] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType | ''>('');
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
  const isUploading = Object.values(uploads).some(Boolean);

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
    if (serviceType || !appointment.data) return;
    const appointmentServiceType = appointment.data.serviceTypes?.[0]
      || appointment.data.customerSiteDetails?.serviceTypes?.[0]
      || appointment.data.serviceType
      || appointment.data.customerSiteDetails?.serviceType;
    if (appointmentServiceType && SERVICE_TYPE_LABELS[appointmentServiceType]) {
      setServiceType(appointmentServiceType);
      setServiceTypeFromAppointment(true);
    }
  }, [appointment.data, serviceType]);

  useEffect(() => {
    const defaultDeliveryType = getDefaultDeliveryType(serviceType);
    setDeliveryType(defaultDeliveryType || '');
  }, [serviceType]);

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

    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || '').trim();
    const title = value('title');
    const description = value('description');
    const siteAddress = value('siteAddress');
    if (!title || !serviceType || !deliveryType || !description || !siteAddress) {
      toast.error('Complete the required project information.');
      return;
    }
    if (lineItems.some((item) => !item.label.trim() || item.quantity < 1)) {
      toast.error('Complete the component name and quantity for each measurement item.');
      return;
    }

    const measurements: Record<string, unknown> = {};
    for (const dimension of dimensions) {
      if (value(dimension)) measurements[dimension] = Number(value(dimension));
    }
    const hasMeasurements = Object.keys(measurements).length > 0;
    if (hasMeasurements) measurements.unit = value('unit');

    try {
      const project = await createProject.mutateAsync({
        customerId,
        title,
        serviceType,
        deliveryType,
        description,
        siteAddress,
        serviceTypeCustom: value('serviceTypeCustom') || undefined,
        measurementUnit,
        lineItems,
        specifications,
        preferredDesign: preferredDesign || undefined,
        customerRequirements: value('customerRequirements') || undefined,
        initialDesignKeys,
        initialDesignNotes: initialDesignNotes || undefined,
        selectedDesignTemplateId: selectedDesign?.id,
        selectedDesignTemplateName: selectedDesign?.title,
        selectedDesignTemplateImageUrl: selectedDesign?.imageUrl.startsWith('data:') ? undefined : selectedDesign?.imageUrl,
        ...attachments,
        ...(hasMeasurements ? { measurements } : {}),
        materialType: value('materialType') || undefined,
        finishColor: value('finishColor') || undefined,
        quantity: value('quantity') ? Number(value('quantity')) : undefined,
        notes: value('notes') || undefined,
        contractFileKey: contractFileKeys[0],
      });
      toast.success('Project created successfully.');
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={createProject.isPending} className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Signed Contract *</CardTitle>
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
                  <Label htmlFor="project-customer-search">Customer *</Label>
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
              <CardDescription>Required fields are marked with *. These details belong to the project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="project-title">Project Title *</Label><Input id="project-title" name="title" required maxLength={100} /></div>
                <div className="space-y-2">
                  <Label htmlFor="project-service">Service Type *</Label>
                  <select id="project-service" name="serviceType" required value={serviceType} onChange={(event) => {
                    setServiceType(event.target.value);
                    setServiceTypeFromAppointment(false);
                  }} className={selectClassName}>
                    <option value="" disabled>{appointmentId && appointment.isLoading ? 'Loading appointment service…' : 'Select a service'}</option>
                    {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {serviceTypeFromAppointment && <p className="text-xs text-muted-foreground">Auto-filled from the customer appointment. You can change it if needed.</p>}
                  {appointmentId && appointment.isError && <p className="text-xs text-muted-foreground">Unable to load the appointment service. Select it manually.</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-delivery-type">Delivery Type *</Label>
                <select id="project-delivery-type" required value={deliveryType} onChange={(event) => setDeliveryType(event.target.value as DeliveryType)} className={selectClassName}>
                  <option value="" disabled>Select a delivery type</option>
                  {Object.entries(DELIVERY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Controls the lifecycle markers used for fabrication and installation updates.</p>
              </div>
              <div className="space-y-2"><Label htmlFor="project-description">Description / Scope of Work *</Label><Textarea id="project-description" name="description" required maxLength={2000} rows={3} /></div>
              <div className="space-y-2"><Label htmlFor="project-address">Project Site Address *</Label><Textarea id="project-address" name="siteAddress" required maxLength={500} rows={2} /></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="project-material">Material Type</Label><Input id="project-material" name="materialType" maxLength={1000} value={materialType} onChange={(event) => setMaterialType(event.target.value)} list="project-material-options" /></div>
                <div className="space-y-2"><Label htmlFor="project-finish">Finish / Color</Label><Input id="project-finish" name="finishColor" maxLength={500} value={finishColor} onChange={(event) => setFinishColor(event.target.value)} list="project-finish-options" /></div>
                <div className="space-y-2"><Label htmlFor="project-quantity">Quantity</Label><Input id="project-quantity" name="quantity" type="number" min="1" step="1" /></div>
              </div>
              <div className="space-y-3 rounded-xl border p-4">
                <h2 className="text-sm font-medium">Measurements (optional)</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {dimensions.map((dimension) => <div key={dimension} className="space-y-2"><Label htmlFor={`project-${dimension}`} className="capitalize">{dimension}</Label><Input id={`project-${dimension}`} name={dimension} type="number" min="0.001" step="any" /></div>)}
                  <div className="space-y-2"><Label htmlFor="project-unit">Unit</Label><select id="project-unit" name="unit" value={measurementUnit} onChange={(event) => setMeasurementUnit(event.target.value)} className={selectClassName}>{Object.entries(MEASUREMENT_UNIT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="project-notes">Project Notes</Label><Textarea id="project-notes" name="notes" maxLength={2000} rows={3} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Project Details &amp; Design</CardTitle></CardHeader>
            <CardContent className="min-w-0 space-y-5">
              {serviceType === 'custom' && <div className="space-y-2"><Label htmlFor="project-custom-service">Custom Service</Label><Input id="project-custom-service" name="serviceTypeCustom" maxLength={200} /></div>}
              {serviceType && <DesignTemplateSelector serviceType={serviceType} selectedTemplateId={selectedDesign?.id} onSelect={selectDesign} />}
              <div className="space-y-2"><Label htmlFor="project-preferred-design">Preferred Design</Label><Textarea id="project-preferred-design" value={preferredDesign} onChange={(event) => setPreferredDesign(event.target.value)} maxLength={1000} /></div>
              <div className="space-y-2"><Label htmlFor="project-requirements">Customer Requirements</Label><Textarea id="project-requirements" name="customerRequirements" maxLength={2000} /></div>
              {serviceType && <ServiceSpecificationForm serviceType={serviceType} value={specifications} onChange={setSpecifications} />}
              <div className="space-y-3"><h2 className="font-semibold">Component Measurements</h2><LineItemsEditor items={lineItems} unit={measurementUnit} onItemsChange={setLineItems} onUnitChange={setMeasurementUnit} /></div>
              <FileUpload folder="projects/initial-design" accept="image/*,.pdf" maxSizeMB={5} maxFiles={10} label="Initial Design Files" existingKeys={initialDesignKeys} onUploadComplete={setInitialDesignKeys} onUploadingChange={(active) => setUploads((current) => current.initialDesign === active ? current : { ...current, initialDesign: active })} />
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
              {createProject.isPending ? 'Creating…' : isUploading ? 'Uploading…' : 'Create Project'}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
