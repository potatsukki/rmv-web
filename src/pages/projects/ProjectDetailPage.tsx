import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, FileText, CreditCard, Hammer, Image, ScrollText,
  Download, Loader2, Phone, UserPlus, Upload, Camera, Video,
  PenTool, ChevronDown, ChevronUp, Users, Eye, Check, ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { useProject, useGenerateContract, useSignContract, useAssignEngineers, useAssignFabrication } from '@/hooks/useProjects';
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
import { SignaturePad } from '@/components/shared/SignaturePad';

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
      className="relative group flex items-center justify-center w-24 h-24 rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] hover:bg-[#f0f0f5] transition-colors overflow-hidden"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#86868b]" />
      ) : (
        <>
          {type === 'image' ? (
            <Camera className="h-6 w-6 text-[#86868b] group-hover:text-[#6e6e73] transition-colors" />
          ) : (
            <Video className="h-6 w-6 text-[#86868b] group-hover:text-[#6e6e73] transition-colors" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
            <Eye className="h-4 w-4 text-transparent group-hover:text-white transition-colors" />
          </div>
        </>
      )}
      <span className="absolute bottom-0.5 text-[9px] text-[#86868b] truncate max-w-[90%] px-1">
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
        className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-[#3a3a3e] hover:text-[#1d1d1f]"
      >
        <Icon className="h-4 w-4 text-[#86868b]" />
        {title}
        <span className="text-xs text-[#86868b] bg-[#f0f0f5] rounded-full px-2 py-0.5">
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
  const signContractMutation = useSignContract();
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
  const [quotMaterials, setQuotMaterials] = useState('');
  const [quotLabor, setQuotLabor] = useState('');
  const [quotFees, setQuotFees] = useState('');
  const [quotBreakdown, setQuotBreakdown] = useState('');
  const [quotDuration, setQuotDuration] = useState('');
  const [quotNotes, setQuotNotes] = useState('');

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
  const [contractSignatureKey, setContractSignatureKey] = useState('');

  const handleGenerateContract = async () => {
    try {
      await generateContract.mutateAsync(id!);
      toast.success('Contract generated successfully');
      refetch();
    } catch {
      toast.error('Failed to generate contract');
    }
  };

  const handleSignContract = async () => {
    if (!contractSignatureKey) {
      toast.error('Please draw your signature first');
      return;
    }
    try {
      await signContractMutation.mutateAsync({
        projectId: id!,
        signatureKey: contractSignatureKey,
      });
      toast.success('Contract signed successfully! Redirecting to payments...');
      setContractSignatureKey('');
      // Redirect customer to payments page with this project pre-selected
      setTimeout(() => {
        navigate('/payments', { state: { projectId: id } });
      }, 1200);
    } catch {
      toast.error('Failed to sign contract');
    }
  };

  const handleDownloadContract = async (copy: 'original' | 'copy') => {
    try {
      const { data } = await api.get(`/projects/${id}/contract-url`, {
        params: { copy },
      });
      window.open(data.data.url, '_blank');
      if (copy === 'original') {
        refetch(); // refresh project to update originalContractDownloadedAt
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to get download link';
      toast.error(msg);
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

      const materials = Number(quotMaterials) || 0;
      const labor = Number(quotLabor) || 0;
      const fees = Number(quotFees) || 0;
      const total = materials + labor + fees;
      const quotation = total > 0
        ? {
            materials,
            labor,
            fees,
            total,
            breakdown: quotBreakdown || undefined,
            estimatedDuration: quotDuration || undefined,
            engineerNotes: quotNotes || undefined,
          }
        : undefined;

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
          quotation,
        });
        toast.success('Blueprint uploaded successfully');
      }
      setBlueprintFile(null);
      setCostingFile(null);
      setQuotMaterials('');
      setQuotLabor('');
      setQuotFees('');
      setQuotBreakdown('');
      setQuotDuration('');
      setQuotNotes('');
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
          className="rounded-xl hover:bg-[#f0f0f5]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] truncate">
            {project.title}
          </h1>
          <p className="text-sm text-[#6e6e73]">
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
                      isPast ? 'bg-[#1d1d1f]' : 'bg-gray-200',
                    )}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-colors',
                      isCurrent
                        ? 'bg-[#1d1d1f] text-white ring-2 ring-[#c8c8cd]'
                        : isPast
                          ? 'bg-[#1d1d1f] text-white'
                          : 'bg-[#f0f0f5] text-[#86868b]',
                    )}
                  >
                    {isPast ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium whitespace-nowrap',
                      isCurrent ? 'text-[#1d1d1f]' : isPast ? 'text-[#6e6e73]' : 'text-[#86868b]',
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
            <Card className="rounded-xl border-[#c8c8cd] bg-[#f0f0f5]/50">
              <CardContent className="p-4 flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-[#1d1d1f] shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1d1d1f]">This project needs an engineer</p>
                  <p className="text-xs text-[#6e6e73]">Claim it to start working on the blueprint.</p>
                </div>
                <Button
                  size="sm"
                  className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white"
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
      <div className="flex gap-1 overflow-x-auto border-b border-[#d2d2d7]">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-[#1d1d1f] text-[#1d1d1f]'
                : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]',
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
          <Card className="rounded-xl border-[#c8c8cd]/50">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Description</p>
                  <p className="text-sm text-[#3a3a3e] mt-1">{project.description}</p>
                </div>
              )}
              {isStaff && project.customerName && (
                <div>
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Customer</p>
                  <p className="text-sm text-[#3a3a3e] mt-1">{project.customerName}</p>
                </div>
              )}
              {project.serviceType && (
                <div>
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Service Type</p>
                  <p className="text-sm text-[#3a3a3e] mt-1 capitalize">{project.serviceType.replace(/_/g, ' ')}</p>
                </div>
              )}
              {project.siteAddress && (
                <div>
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Site Address</p>
                  <p className="text-sm text-[#3a3a3e] mt-1">{project.siteAddress}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Status</p>
                <div className="mt-1"><StatusBadge status={project.status} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Team (internal staff only — customers see simplified view) */}
          {isStaff ? (
          <Card className="rounded-xl border-[#c8c8cd]/50">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Engineers */}
              <div>
                <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Engineers</p>
                {project.engineerIds.length > 0 ? (
                  <div className="mt-1 space-y-2">
                    {project.engineerIds.map((eng: any) => (
                      <div key={String(eng._id || eng)} className="flex items-center gap-2">
                        <p className="text-sm text-[#3a3a3e]">
                          {eng.firstName ? `${eng.firstName} ${eng.lastName}` : String(eng)}
                        </p>
                        {eng.phone && (
                          <a
                            href={`tel:${eng.phone}`}
                            className="inline-flex items-center gap-1 text-xs text-[#1d1d1f] hover:text-[#3a3a3e]"
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
                    <p className="text-sm text-[#86868b] italic">Not assigned yet</p>
                    {isEngineer && project.status === 'submitted' && (
                      <Button
                        size="sm"
                        className="mt-2 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white"
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
                <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Fabrication Lead</p>
                {hasFabLead ? (
                  <p className="text-sm text-[#3a3a3e] mt-1">
                    {(project.fabricationLeadId as any).firstName} {(project.fabricationLeadId as any).lastName}
                  </p>
                ) : (
                  <p className="text-sm text-[#86868b] italic mt-1">Not assigned yet</p>
                )}
              </div>

              {/* Fabrication Assistants */}
              <div>
                <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Fabrication Assistants</p>
                {project.fabricationAssistantIds.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {project.fabricationAssistantIds.map((a: any) => (
                      <p key={String(a._id || a)} className="text-sm text-[#3a3a3e]">
                        {a.firstName ? `${a.firstName} ${a.lastName}` : String(a)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#86868b] italic mt-1">Not assigned yet</p>
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
                    <label className="text-xs font-medium text-[#6e6e73] block mb-1">Lead Fabricator *</label>
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
                    <label className="text-xs font-medium text-[#6e6e73] block mb-1">Assistants (optional)</label>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-[#d2d2d7] bg-white divide-y divide-[#e8e8ed]">
                      {fabStaffList
                        ?.filter((s) => s._id !== fabLeadId)
                        .map((s) => (
                          <button
                            type="button"
                            key={s._id}
                            onClick={() => toggleAssistant(s._id)}
                            className={cn(
                              'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[#f5f5f7] transition-colors',
                              fabAssistantIds.includes(s._id) && 'bg-violet-50',
                            )}
                          >
                            <div
                              className={cn(
                                'h-4 w-4 rounded border flex items-center justify-center',
                                fabAssistantIds.includes(s._id)
                                  ? 'bg-violet-500 border-violet-500'
                                  : 'border-[#c8c8cd]',
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
                        <p className="px-3 py-2 text-xs text-[#86868b]">No other fabrication staff available</p>
                      )}
                    </div>
                    {fabAssistantIds.length > 0 && (
                      <p className="text-xs text-[#6e6e73] mt-1">{fabAssistantIds.length} selected</p>
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
            <Card className="rounded-xl border-[#c8c8cd]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f]">Project Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#6e6e73]">
                  Your project is being handled by our expert team of engineers and fabrication specialists. 
                  We&apos;ll keep you updated on progress through notifications.
                </p>
                {project.engineerIds.length > 0 && (
                  <p className="text-sm text-[#6e6e73] mt-3">
                    <span className="font-medium text-[#3a3a3e]">{project.engineerIds.length}</span> engineer{project.engineerIds.length > 1 ? 's' : ''} assigned
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Visit Report (Site Survey Data) — Staff only ── */}
          {isStaff && visitReport && (
            <Card className="rounded-xl border-[#c8c8cd]/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
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
                    <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-2">Line Items</p>
                    <div className="overflow-x-auto rounded-lg border border-[#d2d2d7]">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[#f5f5f7]/80">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-medium text-[#6e6e73]">Item</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-[#6e6e73]">Qty</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-[#6e6e73]">L</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-[#6e6e73]">W</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-[#6e6e73]">H</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-[#6e6e73]">Area</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-[#6e6e73]">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8e8ed]">
                          {visitReport.lineItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#f5f5f7]/50">
                              <td className="px-3 py-2 font-medium text-[#3a3a3e]">{item.label}</td>
                              <td className="px-3 py-2 text-center text-[#6e6e73]">{item.quantity}</td>
                              <td className="px-3 py-2 text-center text-[#6e6e73]">{item.length ?? '—'}</td>
                              <td className="px-3 py-2 text-center text-[#6e6e73]">{item.width ?? '—'}</td>
                              <td className="px-3 py-2 text-center text-[#6e6e73]">{item.height ?? '—'}</td>
                              <td className="px-3 py-2 text-center text-[#6e6e73]">{item.area ?? '—'}</td>
                              <td className="px-3 py-2 text-[#6e6e73] text-xs">{item.notes || '—'}</td>
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
                    <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-2">Site Conditions</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visitReport.siteConditions.environment && (
                        <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                          <p className="text-[10px] uppercase text-[#86868b] font-medium">Environment</p>
                          <p className="text-sm text-[#3a3a3e] capitalize">{visitReport.siteConditions.environment}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.floorType && (
                        <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                          <p className="text-[10px] uppercase text-[#86868b] font-medium">Floor Type</p>
                          <p className="text-sm text-[#3a3a3e]">{visitReport.siteConditions.floorType}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.wallMaterial && (
                        <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                          <p className="text-[10px] uppercase text-[#86868b] font-medium">Wall Material</p>
                          <p className="text-sm text-[#3a3a3e]">{visitReport.siteConditions.wallMaterial}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.hasElectrical !== undefined && (
                        <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                          <p className="text-[10px] uppercase text-[#86868b] font-medium">Electrical Access</p>
                          <p className="text-sm text-[#3a3a3e]">{visitReport.siteConditions.hasElectrical ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.hasPlumbing !== undefined && (
                        <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                          <p className="text-[10px] uppercase text-[#86868b] font-medium">Plumbing Access</p>
                          <p className="text-sm text-[#3a3a3e]">{visitReport.siteConditions.hasPlumbing ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.accessNotes && (
                        <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50 sm:col-span-2 lg:col-span-3">
                          <p className="text-[10px] uppercase text-[#86868b] font-medium">Access Notes</p>
                          <p className="text-sm text-[#3a3a3e]">{visitReport.siteConditions.accessNotes}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.obstaclesOrConstraints && (
                        <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50 sm:col-span-2 lg:col-span-3">
                          <p className="text-[10px] uppercase text-[#86868b] font-medium">Obstacles / Constraints</p>
                          <p className="text-sm text-[#3a3a3e]">{visitReport.siteConditions.obstaclesOrConstraints}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Requirements & other text fields */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {visitReport.customerRequirements && (
                    <div>
                      <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">Customer Requirements</p>
                      <p className="text-sm text-[#3a3a3e] mt-1">{visitReport.customerRequirements}</p>
                    </div>
                  )}
                  {visitReport.materials && (
                    <div>
                      <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">Materials</p>
                      <p className="text-sm text-[#3a3a3e] mt-1">{visitReport.materials}</p>
                    </div>
                  )}
                  {visitReport.finishes && (
                    <div>
                      <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">Finishes</p>
                      <p className="text-sm text-[#3a3a3e] mt-1">{visitReport.finishes}</p>
                    </div>
                  )}
                  {visitReport.preferredDesign && (
                    <div>
                      <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">Preferred Design</p>
                      <p className="text-sm text-[#3a3a3e] mt-1">{visitReport.preferredDesign}</p>
                    </div>
                  )}
                  {visitReport.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">Notes</p>
                      <p className="text-sm text-[#3a3a3e] mt-1">{visitReport.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Blueprint Card (inline for engineers) ── */}
          {isEngineer && (
            <Card className="rounded-xl border-[#c8c8cd]/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
                  <Image className="h-5 w-5" />
                  Blueprint
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blueprint ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1d1d1f]">Version {blueprint.version}</p>
                      <StatusBadge status={blueprint.status} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/50">
                        <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Blueprint</p>
                        <p className="mt-1 text-sm font-medium">
                          {blueprint.blueprintApproved ? 'Approved' : 'Pending Review'}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-[#1d1d1f] hover:text-[#3a3a3e] p-0 h-auto text-xs"
                          onClick={() => handleDownloadFile(blueprint.blueprintKey)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                      <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/50">
                        <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Costing</p>
                        <p className="mt-1 text-sm font-medium">
                          {blueprint.costingApproved ? 'Approved' : 'Pending Review'}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-[#1d1d1f] hover:text-[#3a3a3e] p-0 h-auto text-xs"
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
                    <p className="text-xs text-[#86868b]">
                      Uploaded {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>

                    {/* Revision upload (when revision requested) */}
                    {blueprint.status === 'revision_requested' && isAssignedEngineer && (
                      <div className="rounded-xl border border-dashed border-[#c8c8cd] p-4 space-y-3">
                        <p className="text-sm font-medium text-[#3a3a3e]">Upload Revision</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Blueprint File *</label>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.dwg"
                              onChange={(e) => setBlueprintFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#f0f0f5] file:text-[#1d1d1f] file:text-xs file:font-medium hover:file:bg-[#f0f0f5]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Costing File *</label>
                            <input
                              type="file"
                              accept=".pdf,.xlsx,.xls,.csv"
                              onChange={(e) => setCostingFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#f0f0f5] file:text-[#1d1d1f] file:text-xs file:font-medium hover:file:bg-[#f0f0f5]"
                            />
                          </div>
                        </div>

                        {/* Quotation Fields */}
                        <div className="border-t border-[#c8c8cd]/50 pt-3 space-y-3">
                          <p className="text-sm font-medium text-[#3a3a3e]">Quotation Details</p>
                          <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-[#6e6e73] block mb-1">Materials (₱)</label>
                              <input type="number" value={quotMaterials} onChange={(e) => setQuotMaterials(e.target.value)} min={0} step={0.01} className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6e6e73] block mb-1">Labor (₱)</label>
                              <input type="number" value={quotLabor} onChange={(e) => setQuotLabor(e.target.value)} min={0} step={0.01} className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6e6e73] block mb-1">Other Fees (₱)</label>
                              <input type="number" value={quotFees} onChange={(e) => setQuotFees(e.target.value)} min={0} step={0.01} className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                            </div>
                          </div>
                          {(Number(quotMaterials) + Number(quotLabor) + Number(quotFees)) > 0 && (
                            <p className="text-sm font-semibold text-emerald-700">
                              Total: ₱{(Number(quotMaterials) + Number(quotLabor) + Number(quotFees)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Estimated Duration</label>
                            <input value={quotDuration} onChange={(e) => setQuotDuration(e.target.value)} placeholder="e.g. 2-3 weeks" className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                          </div>
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Engineer Notes</label>
                            <textarea value={quotNotes} onChange={(e) => setQuotNotes(e.target.value)} placeholder="Any additional notes..." rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white"
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
                      <div className="rounded-xl border border-dashed border-[#c8c8cd] p-4 space-y-3">
                        <p className="text-sm font-medium text-[#3a3a3e]">Upload Blueprint & Costing</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Blueprint File *</label>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.dwg"
                              onChange={(e) => setBlueprintFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#f0f0f5] file:text-[#1d1d1f] file:text-xs file:font-medium hover:file:bg-[#f0f0f5]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Costing File *</label>
                            <input
                              type="file"
                              accept=".pdf,.xlsx,.xls,.csv"
                              onChange={(e) => setCostingFile(e.target.files?.[0] || null)}
                              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#f0f0f5] file:text-[#1d1d1f] file:text-xs file:font-medium hover:file:bg-[#f0f0f5]"
                            />
                          </div>
                        </div>

                        {/* Quotation Fields */}
                        <div className="border-t border-[#c8c8cd]/50 pt-3 space-y-3">
                          <p className="text-sm font-medium text-[#3a3a3e]">Quotation Details <span className="text-xs text-red-500">*</span></p>
                          <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-[#6e6e73] block mb-1">Materials (₱) *</label>
                              <input type="number" value={quotMaterials} onChange={(e) => setQuotMaterials(e.target.value)} min={0} step={0.01} className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6e6e73] block mb-1">Labor (₱) *</label>
                              <input type="number" value={quotLabor} onChange={(e) => setQuotLabor(e.target.value)} min={0} step={0.01} className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6e6e73] block mb-1">Other Fees (₱)</label>
                              <input type="number" value={quotFees} onChange={(e) => setQuotFees(e.target.value)} min={0} step={0.01} className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                            </div>
                          </div>
                          {(Number(quotMaterials) + Number(quotLabor) + Number(quotFees)) > 0 && (
                            <p className="text-sm font-semibold text-emerald-700">
                              Total: ₱{(Number(quotMaterials) + Number(quotLabor) + Number(quotFees)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Estimated Duration</label>
                            <input value={quotDuration} onChange={(e) => setQuotDuration(e.target.value)} placeholder="e.g. 2-3 weeks" className="w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                          </div>
                          <div>
                            <label className="text-xs text-[#6e6e73] block mb-1">Engineer Notes</label>
                            <textarea value={quotNotes} onChange={(e) => setQuotNotes(e.target.value)} placeholder="Any additional notes for the customer..." rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white"
                          onClick={handleBlueprintUpload}
                          disabled={uploading || !blueprintFile || !costingFile}
                        >
                          {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                          Upload Blueprint
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-[#6e6e73] py-4">No blueprint uploaded yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contract Card */}
          <Card className="rounded-xl border-[#c8c8cd]/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
                <ScrollText className="h-5 w-5" />
                Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.contractKey ? (
                <div className="space-y-4">
                  {/* Contract info + download */}
                  <div className="space-y-3">
                    <p className="text-sm text-[#6e6e73]">
                      Contract generated on{' '}
                      {project.contractGeneratedAt
                        ? format(new Date(project.contractGeneratedAt), 'MMM d, yyyy h:mm a')
                        : 'N/A'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-[#1d1d1f] hover:bg-[#2d2d2f]"
                        onClick={() => handleDownloadContract('original')}
                        disabled={!!project.originalContractDownloadedAt}
                      >
                        <Download className="mr-1.5 h-4 w-4" />
                        {project.originalContractDownloadedAt
                          ? 'Original Downloaded'
                          : 'Download Original'}
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

                  {/* Signing status */}
                  {project.contractSignedAt ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-semibold">Contract Signed</span>
                      </div>
                      <p className="text-xs text-emerald-600 mt-1">
                        Signed on {format(new Date(project.contractSignedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ) : isCustomer ? (
                    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                          <PenTool className="h-4 w-4" />
                          E-Sign Your Contract
                        </p>
                        <p className="text-xs text-amber-700">
                          Please review the contract above, then draw your signature below to sign. You must sign before making any payments.
                        </p>
                      </div>
                      <SignaturePad
                        onSave={(key) => setContractSignatureKey(key)}
                        existingKey={null}
                        width={460}
                        height={160}
                        hideSaveButton={false}
                      />
                      {contractSignatureKey && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Signature captured
                        </p>
                      )}
                      <Button
                        onClick={handleSignContract}
                        disabled={!contractSignatureKey || signContractMutation.isPending}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                      >
                        {signContractMutation.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <PenTool className="mr-1.5 h-4 w-4" />
                        )}
                        {signContractMutation.isPending ? 'Signing...' : 'Sign Contract'}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                      <p className="text-sm text-amber-700">
                        Awaiting customer signature. The customer must e-sign this contract before payments can proceed.
                      </p>
                    </div>
                  )}
                </div>
              ) : canGenerate &&
                ['payment_pending', 'fabrication', 'completed'].includes(project.status) ? (
                <div className="space-y-2">
                  <p className="text-sm text-[#6e6e73]">No contract has been generated yet.</p>
                  <Button
                    size="sm"
                    className="bg-[#1d1d1f] hover:bg-[#2d2d2f]"
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
                <p className="text-sm text-[#6e6e73] py-2">
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
        <Card className="rounded-xl border-[#c8c8cd]/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#1d1d1f]">Latest Blueprint</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[#d2d2d7] text-[#3a3a3e] gap-2"
              onClick={() => navigate('/blueprints')}
            >
              <ExternalLink className="h-4 w-4" />
              View All Blueprints
            </Button>
          </CardHeader>
          <CardContent>
            {blueprint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1d1d1f]">Version {blueprint.version}</p>
                  <StatusBadge status={blueprint.status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/50">
                    <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Blueprint</p>
                    <p className="mt-1 text-sm font-medium">
                      {blueprint.blueprintApproved ? 'Approved' : 'Pending Review'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/50">
                    <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Costing</p>
                    <p className="mt-1 text-sm font-medium">
                      {blueprint.costingApproved ? 'Approved' : 'Pending Review'}
                    </p>
                  </div>
                </div>
                {blueprint.revisionNotes && (
                  <div>
                    <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Revision Notes</p>
                    <p className="text-sm text-[#3a3a3e] mt-1">{blueprint.revisionNotes}</p>
                  </div>
                )}
                <p className="text-xs text-[#86868b]">
                  Uploaded {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#6e6e73] py-4">No blueprint uploaded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════  PAYMENTS TAB  ════════════════ */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {paymentPlan && (
            <Card className="rounded-xl border-[#c8c8cd]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#1d1d1f]">Payment Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentPlan.stages.map((stage) => (
                    <div
                      key={String(stage.stageId)}
                      className="flex items-center justify-between rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/30 hover:bg-[#f5f5f7] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f]">{String(stage.label)}</p>
                        <p className="text-xs text-[#6e6e73]">
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

          <Card className="rounded-xl border-[#c8c8cd]/50">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={String(p._id)}
                      className="flex items-center justify-between rounded-xl border border-[#c8c8cd]/50 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f]">
                          {formatCurrency(Number(p.amountPaid))}
                        </p>
                        <p className="text-xs text-[#6e6e73] capitalize">
                          {String(p.method || '').replace('_', ' ')}
                          {p.receiptNumber && ` · ${String(p.receiptNumber)}`}
                        </p>
                        <p className="text-xs text-[#86868b]">
                          {p.createdAt ? format(new Date(String(p.createdAt)), 'MMM d, yyyy') : ''}
                        </p>
                      </div>
                      <StatusBadge status={String(p.status)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6e6e73] py-4">No payments yet.</p>
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

          <Card className="rounded-xl border-[#c8c8cd]/50">
            <CardHeader>
              <CardTitle className="text-lg text-[#1d1d1f]">Fabrication Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {fabUpdates && fabUpdates.length > 0 ? (
                <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                  {fabUpdates.map((update) => (
                    <div key={String(update._id)} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-[#1d1d1f] bg-white" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={String(update.status)} />
                          <span className="text-xs text-[#86868b]">
                            {update.createdAt
                              ? format(new Date(String(update.createdAt)), 'MMM d, yyyy h:mm a')
                              : ''}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#3a3a3e]">{String(update.notes || '')}</p>
                        {isStaff && update.createdByName ? (
                          <p className="text-xs text-[#86868b]">By {String(update.createdByName)}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6e6e73] py-4">No fabrication updates yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
