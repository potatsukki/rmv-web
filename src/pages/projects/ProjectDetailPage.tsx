import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, FileText, CreditCard, Hammer, Image, ScrollText,
  Download, Loader2, Phone, UserPlus, Upload, Camera, Video,
  PenTool, ChevronDown, ChevronUp, Users, Eye, Check, X, ExternalLink,
  Info, CheckCircle2, AlertTriangle,
  RotateCcw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/shared/FileUpload';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { AuthImage } from '@/components/shared/AuthImage';
import {
  useProject,
  useGenerateContract,
  useSignContract,
  useAssignEngineers,
  useAssignFabrication,
  useReviewInitialDesign,
  useResubmitInitialDesign,
  useBackfillInitialDesign,
} from '@/hooks/useProjects';
import { useLatestBlueprint } from '@/hooks/useBlueprints';
import { usePaymentPlan, usePaymentsByProject } from '@/hooks/usePayments';
import { useGetDownloadUrl, openAuthenticatedFile } from '@/hooks/useUploads';
import { useUsers, useSignature } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { Role } from '@/lib/constants';
import { canManageFabricationUpdates, canViewFabricationUpdates, isAssignedEngineer as isProjectEngineerAssigned, isAssignedFabricationMember } from '@/lib/project-access';
import { cn, extractErrorMessage } from '@/lib/utils';
import type { VisitReport } from '@/lib/types';
import toast from 'react-hot-toast';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { BlueprintTab } from './tabs/BlueprintTab';
import { FabricationTab } from './tabs/FabricationTab';

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

// ── Media Thumbnail Component (shows real image thumbnail) ──
function MediaThumbnail({ fileKey, type, onPreview }: { fileKey: string; type: 'image' | 'video'; onPreview?: (key: string) => void }) {
  if (type === 'image') {
    return (
      <button
        type="button"
        onClick={() => onPreview?.(fileKey)}
        className="relative group w-24 h-24 rounded-xl border border-[#d2d2d7] overflow-hidden cursor-pointer"
      >
        <AuthImage
          fileKey={fileKey}
          alt={fileKey.split('/').pop() || 'Image'}
          className="w-24 h-24 object-cover rounded-xl"
          fallback={
            <div className="flex items-center justify-center w-24 h-24 rounded-xl bg-[#f5f5f7]">
              <Camera className="h-6 w-6 text-[#86868b]" />
            </div>
          }
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
          <Eye className="h-4 w-4 text-transparent group-hover:text-white transition-colors" />
        </div>
      </button>
    );
  }

  // Video: keep lazy-load approach (no thumbnail preview)
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
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load media'));
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
          <Video className="h-6 w-6 text-[#86868b] group-hover:text-[#6e6e73] transition-colors" />
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
  const { data: blueprint } = useLatestBlueprint(id!);
  const { data: paymentPlan } = usePaymentPlan(id!);
  const { data: payments } = usePaymentsByProject(id!);

  // ── Mutations ──
  const generateContract = useGenerateContract();
  const signContractMutation = useSignContract();
  const assignEngineers = useAssignEngineers();
  const assignFabrication = useAssignFabrication();
  const reviewInitialDesign = useReviewInitialDesign();
  const resubmitInitialDesign = useResubmitInitialDesign();
  const backfillInitialDesign = useBackfillInitialDesign();

  // ── Auth ──
  const user = useAuthStore((s) => s.user);
  const isEngineer = user?.roles?.some((r: string) => r === Role.ENGINEER);
  const isCustomer = user?.roles?.some((r: string) => r === Role.CUSTOMER);
  const isAdmin = user?.roles?.some((r: string) => r === Role.ADMIN);
  const isFabricationStaff = user?.roles?.some((r: string) => r === Role.FABRICATION_STAFF);
  const isStaff = !isCustomer; // any non-customer role
  const canGenerate = user?.roles?.some((r: string) =>
    [Role.ADMIN, Role.CASHIER, Role.SALES_STAFF].includes(r as Role),
  );

  // ── Fabrication staff list (only fetch when engineer is on the page) ──
  const { data: fabStaffList } = useUsers(
    isEngineer ? { role: 'fabrication_staff' } : undefined,
    { enabled: !!isEngineer },
  );

  // ── Fab assignment form state ──
  const [showFabForm, setShowFabForm] = useState(false);
  const [fabLeadId, setFabLeadId] = useState('');
  const [fabAssistantIds, setFabAssistantIds] = useState<string[]>([]);
  const [designReviewNotes, setDesignReviewNotes] = useState('');
  const [initialDesignKeys, setInitialDesignKeys] = useState<string[]>([]);
  const [initialDesignNotes, setInitialDesignNotes] = useState('');
  const [initialDesignBackfillReason, setInitialDesignBackfillReason] = useState('Synthetic demo backfill for a historical project that originally skipped the initial design step.');
  const [initialDesignUploading, setInitialDesignUploading] = useState(false);

  // ── Derived ──
  const visitReport: VisitReport | null = useMemo(() => {
    if (!project?.visitReportId || typeof project.visitReportId === 'string') return null;
    return project.visitReportId as VisitReport;
  }, [project]);

  const tabs = ALL_TABS;

  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === project?.status);

  const isAssignedEngineer = useMemo(() => {
    if (!project) return false;
    return isProjectEngineerAssigned(project, user?._id);
  }, [user, project]);
  const isAssignedFabrication = useMemo(() => {
    if (!project) return false;
    return isAssignedFabricationMember(project, user?._id);
  }, [project, user]);
  const isAssignedSales = useMemo(() => {
    if (!user?._id || !project?.salesStaffId) return false;
    return (typeof project.salesStaffId === 'string' ? project.salesStaffId : project.salesStaffId._id) === user._id;
  }, [project, user]);
  const hasInitialDesign = Boolean(project?.initialDesignKeys?.length || project?.initialDesignNotes);
  const initialDesignBackfill = project?.initialDesignBackfill;
  const hasBackfilledInitialDesign = Boolean(initialDesignBackfill?.backfilledAt);
  const hasVisitMeasurements = Boolean(
    visitReport?.lineItems?.some((item) =>
      item.length != null ||
      item.width != null ||
      item.height != null ||
      item.area != null ||
      item.thickness != null,
    ) ||
    visitReport?.measurements?.length != null ||
    visitReport?.measurements?.width != null ||
    visitReport?.measurements?.height != null ||
    visitReport?.measurements?.area != null ||
    visitReport?.measurements?.thickness != null ||
    visitReport?.measurements?.raw,
  );
  const canReviewInitialDesign = Boolean((isAdmin || isAssignedEngineer) && hasInitialDesign && !hasBackfilledInitialDesign);
  const canManageInitialDesign = Boolean((isAdmin || isAssignedSales) && !blueprint && !hasBackfilledInitialDesign);
  const canBackfillInitialDesign = Boolean(
    isAdmin &&
    !hasInitialDesign &&
    project &&
    project.status !== 'draft' &&
    (Boolean(blueprint) || ['approved', 'payment_pending', 'fabrication', 'completed'].includes(project.status)),
  );
  const canViewFabrication = Boolean(project && canViewFabricationUpdates(project, user));
  const canManageFabrication = Boolean(project && canManageFabricationUpdates(project, user));
  const showFabricationAssignmentNotice = Boolean(isFabricationStaff && !isAssignedFabrication && !isAdmin);
  const canEngineerClaimProject = Boolean(
    isEngineer && project?.status === 'submitted' && project.engineerIds.length === 0 && !isAssignedEngineer,
  );

  useEffect(() => {
    setInitialDesignKeys(project?.initialDesignKeys || []);
    setInitialDesignNotes(project?.initialDesignNotes || '');
    setInitialDesignBackfillReason(
      project?.initialDesignBackfill?.reason ||
      'Synthetic demo backfill for a historical project that originally skipped the initial design step.',
    );
  }, [project?.initialDesignKeys, project?.initialDesignNotes, project?.initialDesignBackfill?.reason]);

  // ── Handlers ──
  const [contractSignatureKey, setContractSignatureKey] = useState('');
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const [useNewSignature, setUseNewSignature] = useState(false);
  const { data: savedSignature } = useSignature();

  const handleGenerateContract = async () => {
    try {
      await generateContract.mutateAsync(id!);
      toast.success('Contract generated! The customer can now review and sign it.', { duration: 5000 });
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to generate contract'));
    }
  };

  const handleReviewInitialDesign = async (decision: 'approved' | 'declined') => {
    if (!project) return;
    if (decision === 'declined' && !designReviewNotes.trim()) {
      toast.error('Add review notes before declining the initial design.');
      return;
    }

    try {
      await reviewInitialDesign.mutateAsync({
        id: project._id,
        decision,
        notes: designReviewNotes.trim() || undefined,
      });
      toast.success(
        decision === 'approved'
          ? 'Initial design approved for engineering handoff.'
          : 'Initial design declined. Sales staff has been notified.',
      );
      setDesignReviewNotes('');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to submit design review'));
    }
  };

  const handleResubmitInitialDesign = async () => {
    if (!project) return;
    if (initialDesignKeys.length === 0 && !initialDesignNotes.trim()) {
      toast.error('Add at least one design file or a note before saving.');
      return;
    }

    try {
      await resubmitInitialDesign.mutateAsync({
        id: project._id,
        initialDesignKeys,
        initialDesignNotes: initialDesignNotes.trim() || undefined,
      });
      toast.success('Initial design updated and sent back for engineer review.');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update initial design'));
    }
  };

  const handleBackfillInitialDesign = async () => {
    if (!project) return;
    if (initialDesignKeys.length === 0 && !initialDesignNotes.trim()) {
      toast.error('Add at least one design file or a note before backfilling.');
      return;
    }
    if (!initialDesignBackfillReason.trim()) {
      toast.error('Add a reason so this historical backfill stays traceable.');
      return;
    }

    try {
      await backfillInitialDesign.mutateAsync({
        id: project._id,
        initialDesignKeys,
        initialDesignNotes: initialDesignNotes.trim() || undefined,
        backfillReason: initialDesignBackfillReason.trim(),
      });
      toast.success('Synthetic demo initial design backfill saved for this historical project.');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to backfill initial design'));
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
      toast.success('Contract signed! Redirecting to payments — complete the down-payment to start fabrication.', { duration: 5000 });
      setContractSignatureKey('');
      // Redirect customer to payments page with this project pre-selected
      setTimeout(() => {
        navigate('/payments', { state: { projectId: id } });
      }, 1200);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to sign contract'));
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
      toast.error(extractErrorMessage(err, 'Failed to get download link'));
    }
  };

  const handleClaimProject = async () => {
    if (!user?._id) return;
    try {
      await assignEngineers.mutateAsync({ id: id!, engineerIds: [user._id] });
      toast.success('You’ve been assigned to this project. Next: upload the blueprint and costing for customer review.', { duration: 5000 });
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to claim project'));
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
      toast.success('Fabrication team assigned! They can now begin tracking fabrication progress.', { duration: 5000 });
      setShowFabForm(false);
      setFabLeadId('');
      setFabAssistantIds([]);
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to assign fabrication team'));
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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl hover:bg-[#f0f0f5] shrink-0 mt-0.5"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[#1d1d1f] truncate">
              {project.serviceType || project.title}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-xs sm:text-sm text-[#6e6e73] mt-0.5">
            Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* ── Lifecycle Stepper ── */}
      {project.status !== 'cancelled' && (
        <>
          {/* Mobile: compact progress bar */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[#1d1d1f]">
                {LIFECYCLE_STEPS[currentStepIndex]?.label}
              </p>
              <p className="text-xs text-[#6e6e73]">
                Step {currentStepIndex + 1} of {LIFECYCLE_STEPS.length}
              </p>
            </div>
            <div className="h-2 bg-[#f0f0f5] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1d1d1f] rounded-full transition-all duration-500"
                style={{ width: `${((currentStepIndex + 1) / LIFECYCLE_STEPS.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              {LIFECYCLE_STEPS.map((step, i) => (
                <span
                  key={step.key}
                  className={cn(
                    'text-[10px] font-medium',
                    i === currentStepIndex ? 'text-[#1d1d1f] font-semibold' : i < currentStepIndex ? 'text-[#6e6e73]' : 'text-[#c8c8cd]',
                  )}
                >
                  {i === 0 || i === LIFECYCLE_STEPS.length - 1 || i === currentStepIndex ? step.label : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Desktop: circle stepper */}
          <div className="hidden sm:flex items-start py-2">
            {LIFECYCLE_STEPS.map((step, i) => {
              const isCurrent = step.key === project.status;
              const isPast = i < currentStepIndex;
              return (
                <div key={step.key} className={cn('flex items-center', i > 0 ? 'flex-1' : '')}>
                  {i > 0 && (
                    <div
                      className={cn(
                        'h-0.5 flex-1 min-w-4 mt-[18px]',
                        isPast ? 'bg-[#1d1d1f]' : 'bg-[#e8e8ed]',
                      )}
                    />
                  )}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className={cn(
                        'flex items-center justify-center h-9 w-9 rounded-full text-sm font-bold transition-colors',
                        isCurrent
                          ? 'bg-[#1d1d1f] text-white ring-2 ring-[#c8c8cd]'
                          : isPast
                            ? 'bg-[#1d1d1f] text-white'
                            : 'bg-[#f0f0f5] text-[#86868b]',
                      )}
                    >
                      {isPast ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium whitespace-nowrap',
                        isCurrent ? 'text-[#1d1d1f] font-semibold' : isPast ? 'text-[#6e6e73]' : 'text-[#86868b]',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Customer Status Guide Banner ── */}
      {project.status === 'draft' && visitReport?.visitType === 'consultation' && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Awaiting ocular visit</p>
              <p className="text-xs text-blue-700 mt-0.5">
                {isEngineer
                  ? 'Engineering work starts after the ocular visit is finalized and its report moves this project into the submitted stage.'
                  : 'This draft came from the consultation stage. The next step is to finalize the ocular visit before engineering begins.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'submitted' && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Project Submitted</p>
              <p className="text-xs text-blue-700 mt-0.5">Your project has been created from the visit report. An engineer will be assigned to design your blueprint.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'blueprint' && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Blueprint In Progress</p>
              <p className="text-xs text-amber-700 mt-0.5">The engineer is working on your blueprint and costing. You&apos;ll be notified once it&apos;s ready for your review.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'approved' && !paymentPlan && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <CreditCard className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Choose Your Payment Plan</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your blueprint is approved. Open the Blueprint tab to choose full payment or installment, then your contract will be generated for signing.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'payment_pending' && !project.contractSignedAt && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <PenTool className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Contract Ready for Signature</p>
              <p className="text-xs text-amber-700 mt-0.5">Your payment plan is set. Review and sign the contract before making your first payment.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'payment_pending' && !!project.contractSignedAt && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Payment Required</p>
              <p className="text-xs text-amber-700 mt-0.5">Complete the required payments to begin fabrication. Go to the Payments tab to pay via QR or cash.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'fabrication' && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-indigo-200 bg-indigo-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Hammer className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">Fabrication In Progress</p>
              <p className="text-xs text-indigo-700 mt-0.5">Your order is being fabricated. Check the Fabrication tab for progress updates and photos.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'completed' && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Project Complete</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your project has been completed. Thank you for choosing our services!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Contextual Action Banner (engineer) ── */}
      {isEngineer && (
        <>
          {canEngineerClaimProject && (
            <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-[#c8c8cd] bg-[#f0f0f5]/50">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <UserPlus className="h-5 w-5 text-[#1d1d1f] shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1d1d1f]">This project needs an engineer</p>
                    <p className="text-xs text-[#6e6e73]">Claim it to start working on the blueprint.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white w-full sm:w-auto"
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
            <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-blue-200 bg-blue-50/50">
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
            <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-amber-200 bg-amber-50/50">
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
            <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-violet-200 bg-violet-50/50">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Users className="h-5 w-5 text-violet-600 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-800">Assign fabrication team</p>
                    <p className="text-xs text-violet-700">Select a lead fabricator and assistants for this project.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-violet-300 text-violet-700 hover:bg-violet-100 w-full sm:w-auto"
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
      <div className="-mx-3 sm:mx-0">
        <div className="flex overflow-x-auto border-b border-[#d2d2d7] px-3 sm:px-0 no-scrollbar">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 whitespace-nowrap border-b-2 px-3.5 sm:px-4 py-3 text-sm font-medium transition-colors',
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
      </div>

      {/* ════════════════  DETAILS TAB  ════════════════ */}
      {activeTab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-2 -mx-3 sm:mx-0">
          {/* Project Info */}
          <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg text-[#1d1d1f]">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
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

          {isStaff && !hasInitialDesign && project.status !== 'draft' && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-amber-200 bg-amber-50/60">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-amber-900">
                  <AlertTriangle className="h-5 w-5" />
                  Initial Design Missing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                <p className="text-sm text-amber-900">
                  No initial design package was submitted by sales staff for this project.
                </p>
                <p className="text-sm text-amber-800">
                  Because there was nothing to review, engineering approval for the initial design was skipped on this record.
                </p>
                {canBackfillInitialDesign && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-white/80 p-4">
                    <div>
                      <p className="text-sm font-medium text-amber-950">Admin Historical Backfill</p>
                      <p className="mt-1 text-xs text-amber-800">
                        Add synthetic demo-only initial design data for reference without pretending the original workflow happened on time.
                      </p>
                    </div>
                    <FileUpload
                      folder="projects/initial-design"
                      accept="image/*,.pdf"
                      maxSizeMB={5}
                      maxFiles={10}
                      label="Upload synthetic demo initial design files"
                      existingKeys={initialDesignKeys}
                      onUploadComplete={setInitialDesignKeys}
                      onUploadingChange={setInitialDesignUploading}
                    />
                    <Textarea
                      value={initialDesignNotes}
                      onChange={(e) => setInitialDesignNotes(e.target.value)}
                      placeholder="Describe the synthetic reference package, intended visual direction, or demo assumptions."
                      className="min-h-[96px] rounded-xl border-amber-200 bg-white"
                    />
                    <Textarea
                      value={initialDesignBackfillReason}
                      onChange={(e) => setInitialDesignBackfillReason(e.target.value)}
                      placeholder="Explain why this historical backfill is being added now."
                      className="min-h-[96px] rounded-xl border-amber-200 bg-white"
                    />
                    <Button
                      className="w-full bg-amber-900 text-white hover:bg-amber-950 sm:w-auto"
                      onClick={handleBackfillInitialDesign}
                      disabled={backfillInitialDesign.isPending || initialDesignUploading}
                    >
                      {backfillInitialDesign.isPending || initialDesignUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                      Save Demo Backfill
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isStaff && hasInitialDesign && hasBackfilledInitialDesign && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-amber-200 bg-amber-50/80">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-amber-900">
                  <AlertTriangle className="h-5 w-5" />
                  Historical Initial Design Backfill
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                <p className="text-sm text-amber-900">
                  This project originally skipped the initial design submission and engineer review step.
                </p>
                <p className="text-sm text-amber-800">
                  An admin later attached synthetic demo reference data on {initialDesignBackfill?.backfilledAt ? format(new Date(initialDesignBackfill.backfilledAt), 'MMM d, yyyy h:mm a') : 'a later date'} so the historical record is easier to demo and inspect.
                </p>
                {initialDesignBackfill?.reason && (
                  <p className="text-sm text-amber-800">
                    Reason: {initialDesignBackfill.reason}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isStaff && hasInitialDesign && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base sm:text-lg text-[#1d1d1f]">Initial Design Review</CardTitle>
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium w-fit capitalize',
                    project.designReviewStatus === 'approved' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    project.designReviewStatus === 'declined' && 'border-red-200 bg-red-50 text-red-700',
                    project.designReviewStatus === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700',
                    (!project.designReviewStatus || project.designReviewStatus === 'not_required') && 'border-gray-200 bg-gray-50 text-gray-600',
                  )}>
                    {(project.designReviewStatus || 'not_required').replace('_', ' ')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
                <p className="text-sm text-[#6e6e73]">
                  {hasBackfilledInitialDesign
                    ? 'This package was added later as synthetic demo reference data. It documents a backfill for this historical record and does not mean the original review step happened on time.'
                    : 'Sales uploaded the rough sketch, inspiration, or reference files collected before the ocular visit. Engineering should review this package before continuing.'}
                </p>

                {!!project.initialDesignKeys?.length && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {project.initialDesignKeys.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openAuthenticatedFile(key)}
                        className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]"
                      >
                        <AuthImage
                          fileKey={key}
                          alt={key.split('/').pop() || 'Initial design'}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          fallback={
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
                              <Image className="h-7 w-7 text-[#86868b]" />
                              <span className="line-clamp-2 break-all text-[11px] text-[#6e6e73]">
                                {key.split('/').pop()}
                              </span>
                            </div>
                          }
                        />
                      </button>
                    ))}
                  </div>
                )}

                {project.initialDesignNotes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#6e6e73]">
                      {hasBackfilledInitialDesign ? 'Backfill Notes' : 'Sales Notes'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-xl border border-[#e8e8ed] bg-[#f5f5f7] p-3 text-sm text-[#3a3a3e]">
                      {project.initialDesignNotes}
                    </p>
                  </div>
                )}

                {project.designReviewNotes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#6e6e73]">Latest Review Notes</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-xl border border-[#e8e8ed] bg-white p-3 text-sm text-[#3a3a3e]">
                      {project.designReviewNotes}
                    </p>
                  </div>
                )}

                {canManageInitialDesign && (
                  <div className="space-y-3 rounded-xl border border-[#e8e8ed] bg-[#fbfbfd] p-4">
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">Sales Resubmission</p>
                      <p className="mt-1 text-xs text-[#6e6e73]">
                        {project.designReviewStatus === 'declined'
                          ? 'Engineering requested changes. Update the files or notes here and resubmit for review.'
                          : 'You can refine the initial design package before the engineer uploads the first blueprint.'}
                      </p>
                    </div>
                    <FileUpload
                      folder="projects/initial-design"
                      accept="image/*,.pdf"
                      maxSizeMB={5}
                      maxFiles={10}
                      label="Upload revised initial design files"
                      existingKeys={initialDesignKeys}
                      onUploadComplete={setInitialDesignKeys}
                      onUploadingChange={setInitialDesignUploading}
                    />
                    <Textarea
                      value={initialDesignNotes}
                      onChange={(e) => setInitialDesignNotes(e.target.value)}
                      placeholder="Add sales notes, clarified customer preferences, or engineer-requested adjustments."
                      className="min-h-[96px] rounded-xl border-[#d2d2d7] bg-white"
                    />
                    <Button
                      className="w-full bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] sm:w-auto"
                      onClick={handleResubmitInitialDesign}
                      disabled={resubmitInitialDesign.isPending || initialDesignUploading}
                    >
                      {resubmitInitialDesign.isPending || initialDesignUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Save & Resubmit Initial Design
                    </Button>
                  </div>
                )}

                {canReviewInitialDesign && (
                  <div className="space-y-3 rounded-xl border border-[#e8e8ed] bg-[#fbfbfd] p-4">
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">Engineer Decision</p>
                      <p className="mt-1 text-xs text-[#6e6e73]">Approve if the reference is sufficient to proceed, or decline it with notes for sales staff.</p>
                    </div>
                    <Textarea
                      value={designReviewNotes}
                      onChange={(e) => setDesignReviewNotes(e.target.value)}
                      placeholder="Add internal review notes. Required when declining."
                      className="min-h-[96px] rounded-xl border-[#d2d2d7] bg-white"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                        onClick={() => handleReviewInitialDesign('approved')}
                        disabled={reviewInitialDesign.isPending}
                      >
                        {reviewInitialDesign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Approve Initial Design
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
                        onClick={() => handleReviewInitialDesign('declined')}
                        disabled={reviewInitialDesign.isPending}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline Initial Design
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Team (internal staff only — customers see simplified view) */}
          {isStaff ? (
          <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg text-[#1d1d1f]">Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
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
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg text-[#1d1d1f]">Project Team</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
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
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50 lg:col-span-2">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-[#1d1d1f]">
                  <Camera className="h-5 w-5" />
                  Site Visit Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
                {visitReport.visitType === 'ocular' && !hasVisitMeasurements && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Measurements Missing</p>
                        <p className="mt-1 text-sm text-amber-800">
                          This ocular report was submitted without measured line items or legacy dimensions. Engineering can only see the notes and attachments currently saved on the report.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {visitReport.status === 'returned' && visitReport.returnReason && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Report Under Repair</p>
                        <p className="mt-1 text-sm text-orange-800">{visitReport.returnReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                    <p className="text-[10px] uppercase text-[#86868b] font-medium">Report Status</p>
                    <p className="text-sm text-[#3a3a3e] capitalize">{visitReport.status}</p>
                  </div>
                  {visitReport.actualVisitDateTime && (
                    <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                      <p className="text-[10px] uppercase text-[#86868b] font-medium">Actual Visit Date</p>
                      <p className="text-sm text-[#3a3a3e]">{format(new Date(visitReport.actualVisitDateTime), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  )}
                  {(visitReport.measurementUnit || visitReport.measurements?.unit) && (
                    <div className="rounded-lg border border-[#c8c8cd]/50 p-3 bg-[#f5f5f7]/50">
                      <p className="text-[10px] uppercase text-[#86868b] font-medium">Measurement Unit</p>
                      <p className="text-sm text-[#3a3a3e]">{visitReport.measurementUnit || visitReport.measurements?.unit}</p>
                    </div>
                  )}
                </div>

                {/* Media Gallery */}
                <CollapsibleSection title="Photos" icon={Camera} count={visitReport.photoKeys?.length || 0} defaultOpen>
                  {visitReport.photoKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="image" onPreview={setLightboxKey} />
                  ))}
                </CollapsibleSection>

                <CollapsibleSection title="Videos" icon={Video} count={visitReport.videoKeys?.length || 0} defaultOpen>
                  {visitReport.videoKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="video" />
                  ))}
                </CollapsibleSection>

                <CollapsibleSection title="Sketches" icon={PenTool} count={visitReport.sketchKeys?.length || 0}>
                  {visitReport.sketchKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="image" onPreview={setLightboxKey} />
                  ))}
                </CollapsibleSection>

                <CollapsibleSection title="Reference Images" icon={Image} count={visitReport.referenceImageKeys?.length || 0}>
                  {visitReport.referenceImageKeys?.map((key) => (
                    <MediaThumbnail key={key} fileKey={key} type="image" onPreview={setLightboxKey} />
                  ))}
                </CollapsibleSection>

                {/* Line Items */}
                {visitReport.lineItems && visitReport.lineItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-2">
                      Line Items ({visitReport.measurementUnit || visitReport.measurements?.unit || 'cm'})
                    </p>
                    <div className="-mx-4 sm:mx-0 overflow-x-auto sm:rounded-lg sm:border border-y sm:border-x border-[#d2d2d7]">
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

                {/* Site Conditions — ocular visits only */}
                {visitReport.visitType === 'ocular' && visitReport.siteConditions && (
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

          {/* Contract Card */}
          <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-[#1d1d1f]">
                <ScrollText className="h-5 w-5" />
                Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
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
                    <div className="rounded-xl border border-[#d2d2d7]/60 bg-[#f0f0f5]/60 p-4">
                      <div className="flex items-center gap-2 text-[#1d1d1f]">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-semibold">Contract Signed</span>
                      </div>
                      <p className="text-xs text-[#6e6e73] mt-1">
                        Signed on {format(new Date(project.contractSignedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ) : isCustomer ? (
                    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                          <PenTool className="h-3.5 w-3.5" />
                          E-Sign Your Contract
                        </p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Review the contract above, then sign below.
                        </p>
                      </div>

                      {/* Saved signature option */}
                      {savedSignature?.signatureKey && !useNewSignature && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Your Saved Signature</p>
                          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
                            <AuthImage
                              fileKey={savedSignature.signatureKey}
                              alt="Saved signature"
                              className="h-9 max-w-[140px] object-contain"
                            />
                            <div className="flex-1" />
                            <Button
                              size="sm"
                              className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-lg"
                              onClick={() => setContractSignatureKey(savedSignature.signatureKey!)}
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Use This
                            </Button>
                          </div>
                          <button
                            type="button"
                            className="text-[11px] text-amber-700 underline underline-offset-2 hover:text-amber-900"
                            onClick={() => setUseNewSignature(true)}
                          >
                            Draw a new signature instead
                          </button>
                        </div>
                      )}

                      {/* Draw new signature (shown if no saved sig or user chose to draw new) */}
                      {(!savedSignature?.signatureKey || useNewSignature) && (
                        <div className="space-y-2">
                          {useNewSignature && (
                            <button
                              type="button"
                              className="text-[11px] text-amber-700 underline underline-offset-2 hover:text-amber-900"
                              onClick={() => setUseNewSignature(false)}
                            >
                              &larr; Use saved signature instead
                            </button>
                          )}
                          <SignaturePad
                            onSave={(key) => setContractSignatureKey(key)}
                            existingKey={null}
                            width={400}
                            height={80}
                            hideSaveButton={false}
                          />
                        </div>
                      )}

                      {contractSignatureKey && (
                        <p className="text-xs text-[#6e6e73] flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Signature captured
                        </p>
                      )}
                      <Button
                        onClick={handleSignContract}
                        disabled={!contractSignatureKey || signContractMutation.isPending}
                        className="w-full bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-lg disabled:opacity-40"
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
                  {project.status === 'approved'
                    ? 'Contract will be generated after the customer chooses a payment plan.'
                    : ['payment_pending', 'fabrication', 'completed'].includes(project.status)
                    ? 'No contract generated yet.'
                    : 'Contract will be available after blueprint acceptance.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════  BLUEPRINT TAB  ════════════════ */}
      <div className={activeTab === 'blueprint' ? '' : 'hidden'}>
        <BlueprintTab projectId={id!} onNavigateToDetails={() => setActiveTab('details')} />
      </div>

      {/* ════════════════  PAYMENTS TAB  ════════════════ */}
      {activeTab === 'payments' && isCustomer && !project?.contractSignedAt && (
        <div className="-mx-3 sm:mx-0">
          <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
            <CardContent className="flex flex-col items-center text-center py-12 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f5f7] mb-4">
                <ScrollText className="h-7 w-7 text-[#6e6e73]" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f] mb-1">Sign Your Contract First</h3>
              <p className="text-sm text-[#6e6e73] max-w-sm mb-6">
                {project?.status === 'approved' && !project?.contractKey
                  ? 'Choose your payment plan in the Blueprint tab first. That step generates the contract you need to sign.'
                  : project?.contractKey
                  ? 'Your contract has been generated and is ready for signing. Please read and sign it before making any payments.'
                  : 'Your contract is being prepared by our team. Once it\'s ready, you\'ll be able to read and sign it here.'}
              </p>
              {project?.status === 'approved' && !project?.contractKey ? (
                <Button
                  className="bg-[#1d1d1f] hover:bg-[#3a3a3e] text-white rounded-xl px-6"
                  onClick={() => setActiveTab('blueprint')}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Choose Payment Plan
                </Button>
              ) : project?.contractKey && (
                <Button
                  className="bg-[#1d1d1f] hover:bg-[#3a3a3e] text-white rounded-xl px-6"
                  onClick={() => setActiveTab('details')}
                >
                  <ScrollText className="mr-2 h-4 w-4" />
                  Go to Contract &amp; Sign
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {activeTab === 'payments' && (!isCustomer || project?.contractSignedAt) && (
        <div className="space-y-4 -mx-3 sm:mx-0">
          {paymentPlan && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg text-[#1d1d1f]">Payment Plan</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3">
                  {paymentPlan.stages.map((stage) => (
                    <div
                      key={String(stage.stageId)}
                      className="flex flex-col min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between gap-1.5 min-[400px]:gap-2 rounded-xl border border-[#c8c8cd]/50 p-3.5 sm:p-4 bg-[#f5f5f7]/30 hover:bg-[#f5f5f7] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f]">{String(stage.label)}</p>
                        {(stage as any).description && (
                          <p className="text-[11px] text-[#86868b] mt-0.5">{(stage as any).description}</p>
                        )}
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

          <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg text-[#1d1d1f]">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={String(p._id)}
                      className="flex flex-col min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between gap-1.5 min-[400px]:gap-2 rounded-xl border border-[#c8c8cd]/50 p-3.5 sm:p-4"
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
        <FabricationTab
          projectId={id!}
          projectStatus={project.status}
          installationConfirmedAt={project?.installationConfirmedAt}
          canViewUpdates={canViewFabrication}
          canManageUpdates={canManageFabrication}
          showAssignmentNotice={showFabricationAssignmentNotice}
        />
      )}

      {/* ── Lightbox Preview ── */}
      {lightboxKey && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxKey(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openAuthenticatedFile(lightboxKey);
              }}
              className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
              aria-label="Open full size"
              title="Open full size"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setLightboxKey(null)}
              className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <AuthImage
              fileKey={lightboxKey}
              alt="Preview"
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
              fallback={
                <div className="flex items-center justify-center w-64 h-64 rounded-lg bg-[#1d1d1f] text-[#86868b]">
                  <p className="text-sm">Failed to load image</p>
                </div>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}