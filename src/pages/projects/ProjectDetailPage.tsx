import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, FileText, CreditCard, Hammer, Image, ScrollText,
  Download, Loader2, Phone, UserPlus, Upload, Camera, Video,
  PenTool, ChevronDown, ChevronUp, Users, Eye, Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { useProject, useGenerateContract, useAssignEngineers, useAssignFabrication } from '@/hooks/useProjects';
import { useLatestBlueprint, useUploadBlueprint, useUploadRevision } from '@/hooks/useBlueprints';
import { usePaymentPlan, usePaymentsByProject } from '@/hooks/usePayments';
import { useFabricationUpdates, useFabricationStatus } from '@/hooks/useFabrication';
import { useGetUploadUrl, useGetDownloadUrl, uploadFileToR2 } from '@/hooks/useUploads';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { VisitReport } from '@/lib/types';
import toast from 'react-hot-toast';

// ── Types ──
type TabKey = 'details' | 'blueprint' | 'payments' | 'fabrication';

const ALL_TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'details', label: 'Details', icon: FileText },
  { key: 'blueprint', label: 'Blueprint', icon: Image },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'fabrication', label: 'Fabrication', icon: Hammer },
];

const LIFECYCLE_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'blueprint', label: 'Blueprint' },
  { key: 'approved', label: 'Approved' },
  { key: 'payment_pending', label: 'Payment' },
  { key: 'fabrication', label: 'Fabrication' },
  { key: 'completed', label: 'Completed' },
] as const;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

// ── Media Thumbnail Component (lazy download URLs) ──
function MediaThumbnail({ fileKey, type }: { fileKey: string; type: 'image' | 'video' }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const getDownloadUrl = useGetDownloadUrl();

  const handleOpen = useCallback(async () => {
    if (url) {
      window.open(url, '_blank');
      return;
    }
    setLoading(true);
    try {
      const res = await getDownloadUrl.mutateAsync(fileKey);
      setUrl(res.downloadUrl);
      window.open(res.downloadUrl, '_blank');
    } catch {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [fileKey, url, getDownloadUrl]);

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="relative group flex items-center justify-center w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      ) : (
        <>
          {type === 'image' ? (
            <Camera className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
          ) : (
            <Video className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
            <Eye className="h-4 w-4 text-transparent group-hover:text-white transition-colors" />
          </div>
        </>
      )}
      <span className="absolute bottom-0.5 text-[9px] text-gray-400 truncate max-w-[90%] px-1">
        {fileKey.split('/').pop()?.substring(0, 12)}
      </span>
    </button>
  );
}

// ── Collapsible Section ──
function CollapsibleSection({
  title, icon: Icon, count, children, defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <Icon className="h-4 w-4 text-gray-400" />
        {title}
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {count}
        </span>
        <span className="ml-auto">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="flex flex-wrap gap-2 pt-1 pb-3">{children}</div>}
    </div>
  );
}

// ── Main Component ──
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial tab from URL path segment (e.g., /projects/:id/blueprint)
  const initialTab = useMemo<TabKey>(() => {
    const path = location.pathname;
    if (path.endsWith('/blueprint')) return 'blueprint';
    if (path.endsWith('/payments')) return 'payments';
    if (path.endsWith('/fabrication')) return 'fabrication';
    return 'details';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // ── Data queries ──
  const { data: project, isLoading, isError, refetch } = useProject(id!);
  const { data: blueprint, refetch: refetchBlueprint } = useLatestBlueprint(id!);
  const { data: paymentPlan } = usePaymentPlan(id!);
  const { data: payments } = usePaymentsByProject(id!);
  const { data: fabUpdates } = useFabricationUpdates(id!);
  const { data: fabStatus } = useFabricationStatus(id!);

  // ── Mutations ──
  const generateContract = useGenerateContract();
  const assignEngineers = useAssignEngineers();
  const assignFabrication = useAssignFabrication();
  const uploadBlueprint = useUploadBlueprint();
  const uploadRevision = useUploadRevision();
  const getUploadUrl = useGetUploadUrl();

  // ── Auth ──
  const user = useAuthStore((s) => s.user);
  const isEngineer = user?.roles?.some((r: string) => r === 'engineer');
  const isCustomer = user?.roles?.some((r: string) => r === 'customer');
  const isStaff = !isCustomer; // any non-customer role
  const canGenerate = user?.roles?.some((r: string) =>
    ['admin', 'cashier', 'sales_staff'].includes(r),
  );

  // ── Fabrication staff list (only fetch when engineer is on the page) ──
  const { data: fabStaffList } = useUsers(
    isEngineer ? { role: 'fabrication_staff' } : undefined,
  );

  // ── Fab assignment form state ──
  const [showFabForm, setShowFabForm] = useState(false);
  const [fabLeadId, setFabLeadId] = useState('');
  const [fabAssistantIds, setFabAssistantIds] = useState<string[]>([]);

  // ── Blueprint upload state ──
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null);
  const [costingFile, setCostingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Derived ──
  const visitReport: VisitReport | null = useMemo(() => {
    if (!project?.visitReportId || typeof project.visitReportId === 'string') return null;
    return project.visitReportId as VisitReport;
  }, [project]);

  const tabs = useMemo(() => {
    if (isEngineer) return ALL_TABS.filter((t) => t.key !== 'blueprint');
    return ALL_TABS;
  }, [isEngineer]);

  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === project?.status);

  const isAssignedEngineer = useMemo(() => {
    if (!user?._id || !project) return false;
    return project.engineerIds.some(
      (e: any) => (typeof e === 'string' ? e : e._id) === user._id,
    );
  }, [user, project]);

  // ── Handlers ──
  const handleGenerateContract = async () => {
    try {
      await generateContract.mutateAsync(id!);
      toast.success('Contract generated successfully');
      refetch();
    } catch {
      toast.error('Failed to generate contract');
    }
  };

  const handleDownloadContract = async (copy: 'original' | 'copy') => {
    try {
      const { data } = await api.get(`/projects/${id}/contract-url`, {
        params: { copy },
      });
      window.open(data.data.url, '_blank');
    } catch {
      toast.error('Failed to get download link');
    }
  };

  const handleClaimProject = async () => {
    if (!user?._id) return;
    try {
      await assignEngineers.mutateAsync({ id: id!, engineerIds: [user._id] });
      toast.success('You have been assigned to this project');
      refetch();
    } catch {
      toast.error('Failed to claim project');
    }
  };

  const handleBlueprintUpload = async () => {
    if (!blueprintFile || !costingFile) {
      toast.error('Please select both blueprint and costing files');
      return;
    }
    setUploading(true);
    try {
      // Get signed upload URLs
      const [bpUrl, costUrl] = await Promise.all([
        getUploadUrl.mutateAsync({
          folder: 'blueprints',
          fileName: blueprintFile.name,
          contentType: blueprintFile.type,
        }),
        getUploadUrl.mutateAsync({
          folder: 'blueprints',
          fileName: costingFile.name,
          contentType: costingFile.type,
        }),
      ]);
      // Upload to R2
      await Promise.all([
        uploadFileToR2(bpUrl.uploadUrl, blueprintFile),
        uploadFileToR2(costUrl.uploadUrl, costingFile),
      ]);

      if (blueprint) {
        // Revision
        await uploadRevision.mutateAsync({
          id: blueprint._id,
          blueprintKey: bpUrl.fileKey,
          costingKey: costUrl.fileKey,
        });
        toast.success('Revision uploaded successfully');
      } else {
        // First upload
        await uploadBlueprint.mutateAsync({
          projectId: id!,
          blueprintKey: bpUrl.fileKey,
          costingKey: costUrl.fileKey,
        });
        toast.success('Blueprint uploaded successfully');
      }
      setBlueprintFile(null);
      setCostingFile(null);
      refetchBlueprint();
      refetch();
    } catch {
      toast.error('Failed to upload blueprint');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (fileKey: string) => {
    try {
      const res = await api.post('/uploads/signed-download-url', { key: fileKey });
      window.open(res.data.data.downloadUrl, '_blank');
    } catch {
      toast.error('Failed to get download link');
    }
  };

  const handleAssignFabrication = async () => {
    if (!fabLeadId) {
      toast.error('Please select a fabrication lead');
      return;
    }
    try {
      await assignFabrication.mutateAsync({
        id: id!,
        fabricationLeadId: fabLeadId,
        fabricationAssistantIds: fabAssistantIds,
      });
      toast.success('Fabrication team assigned');
      setShowFabForm(false);
      setFabLeadId('');
      setFabAssistantIds([]);
      refetch();
    } catch {
      toast.error('Failed to assign fabrication team');
    }
  };

  const toggleAssistant = (staffId: string) => {
    setFabAssistantIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
    );
  };

  if (isLoading) return <PageLoader />;
  if (isError || !project) return <PageError onRetry={refetch} />;

  const hasFabLead = project.fabricationLeadId && typeof project.fabricationLeadId !== 'string';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 truncate">
            {project.title}
          </h1>
          <p className="text-sm text-gray-500">
            Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* ── Lifecycle Stepper ── */}
      {project.status !== 'cancelled' && (
        <div className="flex items-center gap-0 overflow-x-auto py-1">
          {LIFECYCLE_STEPS.map((step, i) => {
            const isCurrent = step.key === project.status;
            const isPast = i < currentStepIndex;
            return (
              <div key={step.key} className="flex items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      'h-0.5 w-6 sm:w-10',
                      isPast ? 'bg-orange-500' : 'bg-gray-200',
                    )}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-colors',
                      isCurrent
                        ? 'bg-orange-500 text-white ring-2 ring-orange-200'
                        : isPast
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {isPast ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium whitespace-nowrap',
                      isCurrent ? 'text-orange-600' : isPast ? 'text-gray-600' : 'text-gray-400',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Contextual Action Banner (engineer) ── */}
      {isEngineer && (
        <>
          {project.status === 'submitted' && project.engineerIds.length === 0 && (
            <Card className="rounded-xl border-orange-200 bg-orange-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-orange-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-800">This project needs an engineer</p>
                  <p className="text-xs text-orange-700">Claim it to start working on the blueprint.</p>
                </div>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleClaimProject}
                  disabled={assignEngineers.isPending}
                >
                  {assignEngineers.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                  Claim Project
                </Button>
              </CardContent>
            </Card>
          )}
          {project.status === 'blueprint' && isAssignedEngineer && !blueprint && (
            <Card className="rounded-xl border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Upload className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">Blueprint needed</p>
                  <p className="text-xs text-blue-700">Upload the blueprint and costing for customer review.</p>
                </div>
              </CardContent>
            </Card>
          )}
          {blueprint?.status === 'revision_requested' && isAssignedEngineer && (
            <Card className="rounded-xl border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Upload className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Revision requested</p>
                  <p className="text-xs text-amber-700">
                    {blueprint.revisionNotes || 'The customer requested changes to the blueprint.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {['approved', 'payment_pending'].includes(project.status) && isAssignedEngineer && !hasFabLead && (
            <Card className="rounded-xl border-violet-200 bg-violet-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-violet-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-800">Assign fabrication team</p>
                  <p className="text-xs text-violet-700">Select a lead fabricator and assistants for this project.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-violet-300 text-violet-700 hover:bg-violet-100"
                  onClick={() => setShowFabForm(true)}
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  Assign Team
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-900',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════  DETAILS TAB  ════════════════ */}
      {activeTab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Project Info */}
          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
                  <p className="text-sm text-gray-700 mt-1">{project.description}</p>
                </div>
              )}
              {isStaff && project.customerName && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
                  <p className="text-sm text-gray-700 mt-1">{project.customerName}</p>
                </div>
              )}
              {project.serviceType && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</p>
                  <p className="text-sm text-gray-700 mt-1 capitalize">{project.serviceType.replace(/_/g, ' ')}</p>
                </div>
              )}
              {project.siteAddress && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Site Address</p>
                  <p className="text-sm text-gray-700 mt-1">{project.siteAddress}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                <div className="mt-1"><StatusBadge status={project.status} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Team (internal staff only — customers see simplified view) */}
          {isStaff ? (
          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Engineers */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Engineers</p>
                {project.engineerIds.length > 0 ? (
                  <div className="mt-1 space-y-2">
                    {project.engineerIds.map((eng: any) => (
                      <div key={String(eng._id || eng)} className="flex items-center gap-2">
                        <p className="text-sm text-gray-700">
                          {eng.firstName ? `${eng.firstName} ${eng.lastName}` : String(eng)}
                        </p>
                        {eng.phone && (
                          <a
                            href={`tel:${eng.phone}`}
                            className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
                          >
                            <Phone className="h-3 w-3" />
                            {eng.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-gray-400 italic">Not assigned yet</p>
                    {isEngineer && project.status === 'submitted' && (
                      <Button
                        size="sm"
                        className="mt-2 bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={handleClaimProject}
                        disabled={assignEngineers.isPending}
                      >
                        {assignEngineers.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="mr-1.5 h-4 w-4" />
                        )}
                        Claim This Project
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Fabrication Lead */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fabrication Lead</p>
                {hasFabLead ? (
                  <p className="text-sm text-gray-700 mt-1">
                    {(project.fabricationLeadId as any).firstName} {(project.fabricationLeadId as any).lastName}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">Not assigned yet</p>
                )}
              </div>

              {/* Fabrication Assistants */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fabrication Assistants</p>
                {project.fabricationAssistantIds.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {project.fabricationAssistantIds.map((a: any) => (
                      <p key={String(a._id || a)} className="text-sm text-gray-700">
                        {a.firstName ? `${a.firstName} ${a.lastName}` : String(a)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">Not assigned yet</p>
                )}
              </div>

              {/* Assign Fabrication Team (inline form for engineers) */}
              {isEngineer && isAssignedEngineer && (showFabForm || (!hasFabLead && ['approved', 'payment_pending', 'fabrication'].includes(project.status))) && (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/30 p-4 space-y-4">
                  <p className="text-sm font-semibold text-violet-800 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assign Fabrication Team
                  </p>

                  {/* Lead Select */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Lead Fabricator *</label>
                    <Select value={fabLeadId} onValueChange={setFabLeadId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select lead fabricator" />
                      </SelectTrigger>
                      <SelectContent>
                        {fabStaffList?.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assistants Multi-Select (checkbox list) */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Assistants (optional)</label>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                      {fabStaffList
                        ?.filter((s) => s._id !== fabLeadId)
                        .map((s) => (
                          <button
                            type="button"
                            key={s._id}
                            onClick={() => toggleAssistant(s._id)}
                            className={cn(
                              'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors',
                              fabAssistantIds.includes(s._id) && 'bg-violet-50',
                            )}
                          >
                            <div
                              className={cn(
                                'h-4 w-4 rounded border flex items-center justify-center',
                                fabAssistantIds.includes(s._id)
                                  ? 'bg-violet-500 border-violet-500'
                                  : 'border-gray-300',
                              )}
                            >
                              {fabAssistantIds.includes(s._id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            {s.firstName} {s.lastName}
                          </button>
                        ))}
                      {(!fabStaffList || fabStaffList.filter((s) => s._id !== fabLeadId).length === 0) && (
                        <p className="px-3 py-2 text-xs text-gray-400">No other fabrication staff available</p>
                      )}
                    </div>
                    {fabAssistantIds.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{fabAssistantIds.length} selected</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={handleAssignFabrication}
                      disabled={assignFabrication.isPending || !fabLeadId}
                    >
                      {assignFabrication.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      Assign Team
                    </Button>
                    {showFabForm && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFabForm(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Reassign button if already assigned */}
              {isEngineer && isAssignedEngineer && hasFabLead && !showFabForm && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-violet-600 hover:text-violet-700"
                  onClick={() => setShowFabForm(true)}
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  Reassign Fabrication Team
                </Button>
              )}
            </CardContent>
          </Card>
          ) : (
            /* Customer sees a simple info card instead of team details */
            <Card className="rounded-xl border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Project Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Your project is being handled by our expert team of engineers and fabrication specialists. 
                  We&apos;ll keep you updated on progress through notifications.
                </p>
                {project.engineerIds.length > 0 && (
                  <p className="text-sm text-gray-500 mt-3">
                    <span className="font-medium text-gray-700">{project.engineerIds.length}</span> engineer{project.engineerIds.length > 1 ? 's' : ''} assigned
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Visit Report (Site Survey Data) — Staff only ── */}
          {isStaff && visitReport && (
            <Card className="rounded-xl border-gray-100 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Camera className="h-5 w-5" />
                  Site Visit Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Media Gallery */}
                <CollapsibleSection title="Photos" icon={Camera} count={visitReport.photoKeys?.length || 0} defaultOpen>
                  {visitReport.photoKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="image" />
                  ))}
                </CollapsibleSection>

                <CollapsibleSection title="Videos" icon={Video} count={visitReport.videoKeys?.length || 0} defaultOpen>
                  {visitReport.videoKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="video" />
                  ))}
                </CollapsibleSection>

                <CollapsibleSection title="Sketches" icon={PenTool} count={visitReport.sketchKeys?.length || 0}>
                  {visitReport.sketchKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="image" />
                  ))}
                </CollapsibleSection>

                <CollapsibleSection title="Reference Images" icon={Image} count={visitReport.referenceImageKeys?.length || 0}>
                  {visitReport.referenceImageKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="image" />
                  ))}
                </CollapsibleSection>

                {/* Line Items */}
                {visitReport.lineItems && visitReport.lineItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Line Items</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50/80">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Item</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">L</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">W</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">H</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Area</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {visitReport.lineItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 font-medium text-gray-700">{item.label}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{item.length ?? '—'}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{item.width ?? '—'}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{item.height ?? '—'}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{item.area ?? '—'}</td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{item.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Site Conditions */}
                {visitReport.siteConditions && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Site Conditions</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visitReport.siteConditions.environment && (
                        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                          <p className="text-[10px] uppercase text-gray-400 font-medium">Environment</p>
                          <p className="text-sm text-gray-700 capitalize">{visitReport.siteConditions.environment}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.floorType && (
                        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                          <p className="text-[10px] uppercase text-gray-400 font-medium">Floor Type</p>
                          <p className="text-sm text-gray-700">{visitReport.siteConditions.floorType}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.wallMaterial && (
                        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                          <p className="text-[10px] uppercase text-gray-400 font-medium">Wall Material</p>
                          <p className="text-sm text-gray-700">{visitReport.siteConditions.wallMaterial}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.hasElectrical !== undefined && (
                        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                          <p className="text-[10px] uppercase text-gray-400 font-medium">Electrical Access</p>
                          <p className="text-sm text-gray-700">{visitReport.siteConditions.hasElectrical ? '✅ Yes' : '❌ No'}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.hasPlumbing !== undefined && (
                        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                          <p className="text-[10px] uppercase text-gray-400 font-medium">Plumbing Access</p>
                          <p className="text-sm text-gray-700">{visitReport.siteConditions.hasPlumbing ? '✅ Yes' : '❌ No'}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.accessNotes && (
                        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50 sm:col-span-2 lg:col-span-3">
                          <p className="text-[10px] uppercase text-gray-400 font-medium">Access Notes</p>
                          <p className="text-sm text-gray-700">{visitReport.siteConditions.accessNotes}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.obstaclesOrConstraints && (
                        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50 sm:col-span-2 lg:col-span-3">
                          <p className="text-[10px] uppercase text-gray-400 font-medium">Obstacles / Constraints</p>
                          <p className="text-sm text-gray-700">{visitReport.siteConditions.obstaclesOrConstraints}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Requirements & other text fields */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {visitReport.customerRequirements && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Requirements</p>
                      <p className="text-sm text-gray-700 mt-1">{visitReport.customerRequirements}</p>
                    </div>
                  )}
                  {visitReport.materials && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Materials</p>
                      <p className="text-sm text-gray-700 mt-1">{visitReport.materials}</p>
                    </div>
                  )}
                  {visitReport.finishes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Finishes</p>
                      <p className="text-sm text-gray-700 mt-1">{visitReport.finishes}</p>
                    </div>
                  )}
                  {visitReport.preferredDesign && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Preferred Design</p>
                      <p className="text-sm text-gray-700 mt-1">{visitReport.preferredDesign}</p>
                    </div>
                  )}
                  {visitReport.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</p>
                      <p className="text-sm text-gray-700 mt-1">{visitReport.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Blueprint Card (inline for engineers) ── */}
          {isEngineer && (
            <Card className="rounded-xl border-gray-100 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Image className="h-5 w-5" />
                  Blueprint
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blueprint ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Version {blueprint.version}</p>
                      <StatusBadge status={blueprint.status} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Blueprint</p>
                        <p className="mt-1 text-sm font-medium">
                          {blueprint.blueprintApproved ? '✅ Approved' : '⏳ Pending'}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-orange-600 hover:text-orange-700 p-0 h-auto text-xs"
                          onClick={() => handleDownloadFile(blueprint.blueprintKey)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                      <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Costing</p>
                        <p className="mt-1 text-sm font-medium">
                          {blueprint.costingApproved ? '✅ Approved' : '⏳ Pending'}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-orange-600 hover:text-orange-700 p-0 h-auto text-xs"
                          onClick={() => handleDownloadFile(blueprint.costingKey)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {blueprint.revisionNotes && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                        <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Revision Notes</p>
                        <p className="text-sm text-amber-800 mt-1">{blueprint.revisionNotes}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      Uploaded {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>

                    {/* Revision upload (when revision requested) */}
                    {blueprint.status === 'revision_requested' && isAssignedEngineer && (
                      <div className="rounded-xl border border-dashed border-gray-300 p-4 space-y-3">
                        <p className="text-sm font-medium text-gray-700">Upload Revision</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Blueprint File *</label>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.dwg"
                              onChange={(e) => setBlueprintFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-600 file:text-xs file:font-medium hover:file:bg-orange-100"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Costing File *</label>
                            <input
                              type="file"
                              accept=".pdf,.xlsx,.xls,.csv"
                              onChange={(e) => setCostingFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-600 file:text-xs file:font-medium hover:file:bg-orange-100"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={handleBlueprintUpload}
                          disabled={uploading || !blueprintFile || !costingFile}
                        >
                          {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                          Upload Revision
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* First blueprint upload */}
                    {isAssignedEngineer && ['blueprint', 'submitted'].includes(project.status) ? (
                      <div className="rounded-xl border border-dashed border-gray-300 p-4 space-y-3">
                        <p className="text-sm font-medium text-gray-700">Upload Blueprint & Costing</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Blueprint File *</label>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.dwg"
                              onChange={(e) => setBlueprintFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-600 file:text-xs file:font-medium hover:file:bg-orange-100"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Costing File *</label>
                            <input
                              type="file"
                              accept=".pdf,.xlsx,.xls,.csv"
                              onChange={(e) => setCostingFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-600 file:text-xs file:font-medium hover:file:bg-orange-100"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={handleBlueprintUpload}
                          disabled={uploading || !blueprintFile || !costingFile}
                        >
                          {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                          Upload Blueprint
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-4">No blueprint uploaded yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contract Card */}
          <Card className="rounded-xl border-gray-100 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <ScrollText className="h-5 w-5" />
                Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.contractKey ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Contract generated on{' '}
                    {project.contractGeneratedAt
                      ? format(new Date(project.contractGeneratedAt), 'MMM d, yyyy h:mm a')
                      : 'N/A'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleDownloadContract('original')}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Download Original
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadContract('copy')}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Download Copy
                    </Button>
                    {canGenerate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleGenerateContract}
                        disabled={generateContract.isPending}
                      >
                        {generateContract.isPending && (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        )}
                        Regenerate
                      </Button>
                    )}
                  </div>
                </div>
              ) : canGenerate &&
                ['payment_pending', 'fabrication', 'completed'].includes(project.status) ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">No contract has been generated yet.</p>
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={handleGenerateContract}
                    disabled={generateContract.isPending}
                  >
                    {generateContract.isPending && (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    )}
                    <ScrollText className="mr-1.5 h-4 w-4" />
                    Generate Contract
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  {['payment_pending', 'fabrication', 'completed'].includes(project.status)
                    ? 'No contract generated yet.'
                    : 'Contract will be available after blueprint acceptance.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════  BLUEPRINT TAB (non-engineers) ════════════════ */}
      {activeTab === 'blueprint' && !isEngineer && (
        <Card className="rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Latest Blueprint</CardTitle>
          </CardHeader>
          <CardContent>
            {blueprint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Version {blueprint.version}</p>
                  <StatusBadge status={blueprint.status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Blueprint</p>
                    <p className="mt-1 text-sm font-medium">
                      {blueprint.blueprintApproved ? '✅ Approved' : '⏳ Pending'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Costing</p>
                    <p className="mt-1 text-sm font-medium">
                      {blueprint.costingApproved ? '✅ Approved' : '⏳ Pending'}
                    </p>
                  </div>
                </div>
                {blueprint.revisionNotes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revision Notes</p>
                    <p className="text-sm text-gray-700 mt-1">{blueprint.revisionNotes}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Uploaded {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">No blueprint uploaded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════  PAYMENTS TAB  ════════════════ */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {paymentPlan && (
            <Card className="rounded-xl border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Payment Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentPlan.stages.map((stage) => (
                    <div
                      key={String(stage.stageId)}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-4 bg-gray-50/30 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{String(stage.label)}</p>
                        <p className="text-xs text-gray-500">
                          {String(stage.percentage)}% — {formatCurrency(Number(stage.amount))}
                        </p>
                      </div>
                      <StatusBadge status={String(stage.status)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={String(p._id)}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(p.amountPaid))}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {String(p.method || '').replace('_', ' ')}
                          {p.receiptNumber && ` · ${String(p.receiptNumber)}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.createdAt ? format(new Date(String(p.createdAt)), 'MMM d, yyyy') : ''}
                        </p>
                      </div>
                      <StatusBadge status={String(p.status)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4">No payments yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════  FABRICATION TAB  ════════════════ */}
      {activeTab === 'fabrication' && (
        <div className="space-y-4">
          {/* Payment Gate Banner */}
          {fabStatus?.paymentGate && !fabStatus.paymentGate.allPaid && (
            <Card className="rounded-xl border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Payment Gate Active</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {fabStatus.paymentGate.unpaidCount} payment stage(s) remain unpaid.
                    Fabrication cannot proceed to &quot;Ready for Delivery&quot; until all stages are verified.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {fabStatus?.paymentGate?.allPaid && (
            <Card className="rounded-xl border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-800">
                  All payments verified — fabrication is unblocked
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Fabrication Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {fabUpdates && fabUpdates.length > 0 ? (
                <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                  {fabUpdates.map((update) => (
                    <div key={String(update._id)} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-orange-500 bg-white" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={String(update.status)} />
                          <span className="text-xs text-gray-400">
                            {update.createdAt
                              ? format(new Date(String(update.createdAt)), 'MMM d, yyyy h:mm a')
                              : ''}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{String(update.notes || '')}</p>
                        {isStaff && update.createdByName ? (
                          <p className="text-xs text-gray-400">By {String(update.createdByName)}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4">No fabrication updates yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
