import { Suspense, lazy, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, FileText, CreditCard, Hammer, Image, ScrollText,
  Download, Loader2, Phone, UserPlus, Upload, Camera, Video,
  PenTool, ChevronDown, ChevronUp, Users, Eye, Check, X, ExternalLink,
  Info, CheckCircle2, AlertTriangle,
  RotateCcw, Fence, Grid3x3, DoorOpen, Armchair, ChefHat, Utensils,
  BookOpen, Frame, Umbrella, ArrowUpFromLine, Wrench, Layers, DoorClosed, Calculator,
  MessageSquare, LockKeyhole, CalendarDays, ShieldCheck, Maximize2,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/shared/FileUpload';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { AuthImage } from '@/components/shared/AuthImage';
import {
  useProject,
  useAssignEngineers,
  useReassignProjectSales,
  useAssignFabrication,
  useReviewInitialDesign,
  useResubmitInitialDesign,
  useBackfillInitialDesign,
  useSubmitProjectReview,
  useSkipProjectReview,
} from '@/hooks/useProjects';
import { useLatestBlueprint } from '@/hooks/useBlueprints';
import { usePaymentPlan, usePaymentsByProject, useProjectPaymentPlans } from '@/hooks/usePayments';
import { useGetDownloadUrl, openAuthenticatedFile, useAuthenticatedUrl } from '@/hooks/useUploads';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { api } from '@/lib/api';
import { ContractStatus, Role, StaffAvailabilityStatus, ProjectStatus, ServiceType, SERVICE_TYPE_LABELS } from '@/lib/constants';
import { canManageFabricationUpdates, canViewFabricationUpdates, isAssignedEngineer as isProjectEngineerAssigned, isAssignedFabricationMember } from '@/lib/project-access';
import { getServiceSpecificationSchema, hasMeaningfulSpecifications } from '@/lib/service-specifications';
import { cn, extractErrorMessage } from '@/lib/utils';
import { resolveProjectWorkflowStatus } from '@/lib/workflow-status';
import type { ApiResponse, PaymentPlan, ProjectItem, VisitReport } from '@/lib/types';
import toast from 'react-hot-toast';

const LazyBlueprintTab = lazy(() =>
  import('./tabs/BlueprintTab').then((module) => ({ default: module.BlueprintTab })),
);

const LazyFabricationTab = lazy(() =>
  import('./tabs/FabricationTab').then((module) => ({ default: module.FabricationTab })),
);

// ── Types ──
type TabKey = 'details' | 'design_review' | 'contract' | 'blueprint' | 'costing' | 'payments' | 'fabrication';

const SERVICE_ICONS: Record<string, React.ElementType> = {
  [ServiceType.RAILINGS]: Fence,
  [ServiceType.GRILLS]: Grid3x3,
  [ServiceType.GATES]: DoorOpen,
  [ServiceType.FENCES]: Fence,
  [ServiceType.KITCHEN_COUNTER]: Utensils,
  [ServiceType.KITCHEN_CABINET]: ChefHat,
  [ServiceType.TABLE]: BookOpen,
  [ServiceType.CHAIR]: Armchair,
  [ServiceType.SHELVING]: Layers,
  [ServiceType.DOOR]: DoorClosed,
  [ServiceType.WINDOW_FRAME]: Frame,
  [ServiceType.CANOPY]: Umbrella,
  [ServiceType.STAIRCASE]: ArrowUpFromLine,
  [ServiceType.BALUSTRADE]: Fence,
  [ServiceType.SIGNAGE]: PenTool,
  [ServiceType.CUSTOM]: Wrench,
};

const ALL_TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'details', label: 'Details', icon: FileText },
  { key: 'design_review', label: 'Design Review', icon: PenTool },
  { key: 'contract', label: 'Contract', icon: ScrollText },
  { key: 'blueprint', label: 'Blueprint', icon: Image },
  { key: 'costing', label: 'Costing', icon: Calculator },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'fabrication', label: 'Fabrication', icon: Hammer },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

const IMAGE_FILE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif']);

const getFileName = (fileKey: string) => fileKey.split('/').pop() || fileKey;

const getFileExtension = (fileKey: string) => {
  const fileName = getFileName(fileKey);
  const extension = fileName.split('.').pop();
  return extension ? extension.toLowerCase() : '';
};

const isImageFileKey = (fileKey: string) => IMAGE_FILE_EXTENSIONS.has(getFileExtension(fileKey));

const getFileTypeLabel = (fileKey: string) => {
  const extension = getFileExtension(fileKey);
  if (!extension) return 'Unknown file';
  if (IMAGE_FILE_EXTENSIONS.has(extension)) return `${extension.toUpperCase()} Image`;
  if (extension === 'pdf') return 'PDF Document';
  return `${extension.toUpperCase()} File`;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return 'File size not recorded';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function formatServiceTypeLabel(serviceType?: string) {
  if (!serviceType) return '';
  return SERVICE_TYPE_LABELS[serviceType as keyof typeof SERVICE_TYPE_LABELS]
    || serviceType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDisplayItemStatus(projectStatus?: string, itemStatus?: string) {
  if (
    projectStatus === ProjectStatus.BLUEPRINT
    && [ProjectStatus.DRAFT, ProjectStatus.SUBMITTED].includes(itemStatus as ProjectStatus)
  ) {
    return ProjectStatus.BLUEPRINT;
  }

  return itemStatus || projectStatus || 'draft';
}

function getProjectServiceItems(project?: { items?: ProjectItem[]; serviceTypes?: string[]; serviceType?: string; status?: string }) {
  if (!project) return [];

  if (project.items?.length) {
    return project.items.map((item) => ({
      id: item._id,
      serviceType: item.serviceType,
      label: item.title || formatServiceTypeLabel(item.serviceType),
      status: getDisplayItemStatus(project.status, item.status),
      Icon: SERVICE_ICONS[item.serviceType] || Wrench,
      item,
    }));
  }

  const rawItems = project.serviceTypes?.length
    ? project.serviceTypes
    : String(project.serviceType || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  return [...new Set(rawItems)].map((serviceType) => ({
    id: serviceType,
    serviceType,
    label: formatServiceTypeLabel(serviceType),
    status: project.status || 'draft',
    Icon: SERVICE_ICONS[serviceType] || Wrench,
  }));
}

function ProjectItemsStrip({
  items,
  isDark,
  activeItemId,
  onSelect,
  bare = false,
}: {
  items: Array<{ id: string; serviceType: string; label: string; status: string; Icon: React.ElementType }>;
  isDark: boolean;
  activeItemId: string;
  onSelect: (itemId: string) => void;
  bare?: boolean;
}) {
  if (items.length <= 1) return null;

  const cards = (
    <div className={cn('flex gap-3 overflow-x-auto overflow-y-visible', bare ? '' : 'pb-1')}>
      {items.map(({ label, Icon }, index) => {
        const item = items[index]!;
        const isActive = item.id === activeItemId;

        return (
        <button
          type="button"
          key={`${item.id}-${index}`}
          onClick={() => onSelect(item.id)}
          className={cn(
            'relative flex shrink-0 cursor-pointer items-center text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40',
            bare
              ? 'h-[76px] min-w-[230px] max-w-[260px] gap-3 rounded-xl border px-4 py-3'
              : 'min-w-[210px] max-w-[300px] gap-3 rounded-2xl border px-4 py-4 sm:min-w-[240px]',
            isActive
              ? isDark
                ? 'border-blue-400/70 bg-blue-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_30px_rgba(14,165,233,0.08)] ring-1 ring-blue-300/20'
                : 'border-sky-300 bg-sky-50 shadow-[0_12px_24px_rgba(2,132,199,0.10)] ring-1 ring-sky-200'
              : isDark
                ? 'border-white/10 bg-white/[0.035] hover:border-slate-500 hover:bg-white/[0.07] active:scale-[0.98]'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]',
          )}
        >
          <div className={cn(
            'flex shrink-0 items-center justify-center rounded-full border',
            bare ? 'h-11 w-11' : 'h-11 w-11 rounded-xl',
            isActive
              ? isDark
                ? 'border-blue-400/35 bg-blue-400/12 text-sky-100'
                : 'bg-sky-100 text-sky-800'
              : isDark
                ? 'border-white/10 bg-slate-950/45 text-slate-300'
                : 'bg-slate-100 text-slate-600',
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('truncate font-semibold text-slate-950 dark:text-slate-50', bare ? 'text-sm' : 'text-sm')}>{label}</p>
            <span className={cn(
              'mt-1.5 inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 font-medium',
              bare ? 'text-[11px]' : 'text-[10px]',
              isDark ? 'text-slate-100' : 'bg-slate-100 text-slate-700',
            )}>
              <span className={cn('rounded-full', bare ? 'h-2 w-2' : 'h-1.5 w-1.5', isActive ? 'bg-blue-500' : 'bg-slate-500')} />
              {item.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
          <span className={cn(
            'absolute right-2.5 top-2.5 flex items-center justify-center rounded-full font-bold',
            bare ? 'h-5 w-5 text-[10px]' : 'h-5 w-5 text-[10px]',
            isActive
              ? isDark
                ? 'border border-blue-300/20 bg-blue-400/15 text-blue-100'
                : 'bg-sky-100 text-sky-800'
              : isDark
                ? 'border border-white/10 bg-slate-950/60 text-slate-300'
                : 'bg-slate-100 text-slate-500',
          )}>
            {index + 1}
          </span>
        </button>
        );
      })}
    </div>
  );

  if (bare) return cards;

  return (
    <div className={cn(
      'w-full rounded-2xl border border-[color:var(--color-border)]/60 p-4 shadow-sm sm:p-5',
      isDark
        ? 'bg-slate-950/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.18)]'
        : 'bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)]',
    )}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-metal-muted-color)] dark:text-slate-400">
            Items ({items.length})
          </p>
          <p className="mt-1 text-xs text-[var(--text-metal-color)] dark:text-slate-300">
            Select an item to view its blueprint, payments, fabrication, and details.
          </p>
        </div>
      </div>
      {cards}
    </div>
  );
}

// ── Media Thumbnail Component (shows real image thumbnail) ──
function MediaThumbnail({ fileKey, type, onPreview }: { fileKey: string; type: 'image' | 'video'; onPreview?: (key: string) => void }) {
  if (type === 'image') {
    return (
      <button
        type="button"
        onClick={() => onPreview?.(fileKey)}
        className="relative group w-24 h-24 rounded-xl border border-[#d2d2d7] dark:border-slate-700 overflow-hidden cursor-pointer"
      >
        <AuthImage
          fileKey={fileKey}
          alt={fileKey.split('/').pop() || 'Image'}
          className="w-24 h-24 object-cover rounded-xl"
          fallback={
            <div className="flex items-center justify-center w-24 h-24 rounded-xl bg-[#f5f5f7] dark:bg-slate-800">
              <Camera className="h-6 w-6 text-[#86868b] dark:text-slate-500" />
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
      className="relative group flex items-center justify-center w-24 h-24 rounded-xl border border-[#d2d2d7] dark:border-slate-700 bg-[#f5f5f7] dark:bg-slate-800 hover:bg-[#f0f0f5] dark:hover:bg-slate-700 transition-colors overflow-hidden"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#86868b]" />
      ) : (
        <>
          <Video className="h-6 w-6 text-[#86868b] dark:text-slate-500 group-hover:text-[#6e6e73] dark:group-hover:text-slate-300 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
            <Eye className="h-4 w-4 text-transparent group-hover:text-white transition-colors" />
          </div>
        </>
      )}
      <span 
        className="absolute bottom-0.5 text-[9px] text-[#86868b] dark:text-slate-400 truncate max-w-[90%] px-1"
        title={fileKey.split('/').pop() || fileKey}
      >
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
        className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-[#3a3a3e] dark:text-slate-300 hover:text-[#1d1d1f] dark:hover:text-slate-100"
      >
        <Icon className="h-4 w-4 text-[#86868b] dark:text-slate-500" />
        {title}
        <span className="text-xs text-[#86868b] dark:text-slate-400 bg-[#f0f0f5] dark:bg-slate-800 rounded-full px-2 py-0.5">
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

function DetailSectionCard({
  title,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className={cn(
      'overflow-hidden rounded-3xl border border-[color:var(--color-border)]/60 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:bg-slate-950/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.18)]',
      className,
    )}>
      <CardHeader className="border-b border-[color:var(--color-border)]/45 bg-slate-50/80 px-5 py-5 dark:bg-white/[0.02]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-950 dark:text-slate-50">
            {Icon && (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-100">
                <Icon className="h-5 w-5" />
              </span>
            )}
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        {children}
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'rounded-2xl border border-[color:var(--color-border)]/50 bg-slate-50/75 px-4 py-4 dark:bg-white/[0.035]',
      className,
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-950 dark:text-slate-100 sm:text-base">
        {children || value || 'Not provided'}
      </div>
    </div>
  );
}

function TabPanelFallback({ message }: { message: string }) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  return (
    <div className={`${isDark ? 'metal-panel-strong' : 'metal-panel'} flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-[color:var(--color-border)]/60 px-5 py-8 text-center`}>
      <Loader2 className={`h-5 w-5 animate-spin ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
      <p className={`mt-3 text-sm font-medium ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Loading section</p>
      <p className={`mt-1 max-w-sm text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>{message}</p>
    </div>
  );
}

// ── Main Component ──
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  // Determine initial tab from URL path segment (e.g., /projects/:id/blueprint)
  const initialTab = useMemo<TabKey>(() => {
    const path = location.pathname;
    if (path.endsWith('/contract')) return 'contract';
    if (path.endsWith('/blueprint')) return 'blueprint';
    if (path.endsWith('/costing')) return 'costing';
    if (path.endsWith('/payments')) return 'payments';
    if (path.endsWith('/fabrication')) return 'fabrication';

    return 'details';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [activeProjectItem, setActiveProjectItem] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentKey: TabKey) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === currentKey);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab) setActiveTab(nextTab.key);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const firstTab = tabs[0];
      if (firstTab) setActiveTab(firstTab.key);
    }

    if (event.key === 'End') {
      event.preventDefault();
      const lastTab = tabs[tabs.length - 1];
      if (lastTab) setActiveTab(lastTab.key);
    }
  };

  // ── Data queries ──
  const { data: project, isLoading, isError, refetch } = useProject(id!);
  const projectServiceItems = useMemo(() => getProjectServiceItems(project), [project]);
  const linkedProjectItemId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('projectItemId') || params.get('itemId') || '';
  }, [location.search]);

  useEffect(() => {
    if (!linkedProjectItemId || !projectServiceItems.length) return;
    const matchedItem = projectServiceItems.find((item) => item.id === linkedProjectItemId);
    if (!matchedItem) return;
    setActiveProjectItem(matchedItem.id);
  }, [linkedProjectItemId, projectServiceItems]);

  const activeProjectItemId = useMemo(() => {
    if (!projectServiceItems.length) return undefined;
    if (activeProjectItem && projectServiceItems.some((item) => item.id === activeProjectItem)) {
      return activeProjectItem;
    }
    return projectServiceItems[0]?.id;
  }, [activeProjectItem, projectServiceItems]);
  const activeProjectItemRecord = useMemo(() => (
    project?.items?.find((item) => item._id === activeProjectItemId)
  ), [project?.items, activeProjectItemId]);
  const { data: blueprint } = useLatestBlueprint(id!, activeProjectItemRecord?._id);
  const { data: paymentPlan } = usePaymentPlan(id!, activeProjectItemRecord?._id);
  const { data: payments } = usePaymentsByProject(id!, activeProjectItemRecord?._id);
  const hasPayablePaymentStage = Boolean(paymentPlan?.stages?.some((stage) => (
    ['pending', 'declined'].includes(String(stage.status))
  )));
  const projectPaymentPlanItemIds = useMemo(
    () => projectServiceItems.map((item) => item.id),
    [projectServiceItems],
  );
  const projectPaymentPlanQueries = useProjectPaymentPlans(id!, projectPaymentPlanItemIds);

  // ── Mutations ──
  const assignEngineers = useAssignEngineers();
  const reassignProjectSales = useReassignProjectSales();
  const assignFabrication = useAssignFabrication();
  const reviewInitialDesign = useReviewInitialDesign();
  const resubmitInitialDesign = useResubmitInitialDesign();
  const backfillInitialDesign = useBackfillInitialDesign();
  const submitProjectReview = useSubmitProjectReview();
  const skipProjectReview = useSkipProjectReview();

  // ── Auth ──
  const user = useAuthStore((s) => s.user);
  const isEngineer = user?.roles?.some((r: string) => r === Role.ENGINEER);
  const isCustomer = user?.roles?.some((r: string) => r === Role.CUSTOMER);
  const isAdmin = user?.roles?.some((r: string) => r === Role.ADMIN);
  const shouldHideAmount = user?.roles?.some((r: string) => [Role.ADMIN, Role.APPOINTMENT_AGENT, Role.ENGINEER, Role.FABRICATION_STAFF].includes(r as Role));
  const isFabricationStaff = user?.roles?.some((r: string) => r === Role.FABRICATION_STAFF);
  const isStaff = !isCustomer; // any non-customer role

  const tabs = useMemo(() => {
    if (isEngineer || isFabricationStaff) {
      // Prioritize Blueprint for tech staff and hide Payments
      const order: TabKey[] = isEngineer
        ? ['details', 'design_review', 'contract', 'blueprint', 'costing', 'fabrication']
        : ['details', 'design_review', 'contract', 'blueprint', 'fabrication'];
      return order
        .map((k) => ALL_TABS.find((t) => t.key === k))
        .filter(Boolean) as typeof ALL_TABS;
    }
    if (isCustomer) {
      return ALL_TABS.filter((tab) => tab.key !== 'design_review');
    }
    return ALL_TABS;
  }, [isEngineer, isFabricationStaff, isCustomer]);

  // ── Fabrication staff list (only fetch when engineer is on the page) ──
  const { data: fabStaffList } = useUsers(
    isEngineer ? { role: 'fabrication_staff' } : undefined,
    { enabled: !!isEngineer },
  );

  const [salesStaffList, setSalesStaffList] = useState<Array<{
    _id: string;
    firstName: string;
    lastName: string;
    availabilityStatus?: StaffAvailabilityStatus;
    availabilityNote?: string;
  }>>([]);
  const [selectedSalesStaffId, setSelectedSalesStaffId] = useState('');

  // ── Fab assignment form state ──
  const [showFabForm, setShowFabForm] = useState(false);
  const [fabLeadId, setFabLeadId] = useState('');
  const [fabAssistantIds, setFabAssistantIds] = useState<string[]>([]);
  const fabricationAssignFormRef = useRef<HTMLDivElement | null>(null);
  const [designReviewNotes, setDesignReviewNotes] = useState('');
  const [projectReviewRating, setProjectReviewRating] = useState('5');
  const [projectReviewComment, setProjectReviewComment] = useState('');
  const [projectReviewSkipReason, setProjectReviewSkipReason] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showSkipReviewDialog, setShowSkipReviewDialog] = useState(false);
  const [isTeamOwnershipCollapsed, setIsTeamOwnershipCollapsed] = useState(true);
  const [initialDesignKeys, setInitialDesignKeys] = useState<string[]>([]);
  const [initialDesignNotes, setInitialDesignNotes] = useState('');
  const [initialDesignBackfillReason, setInitialDesignBackfillReason] = useState('Synthetic demo backfill for a historical project that originally skipped the initial design step.');
  const [initialDesignUploading, setInitialDesignUploading] = useState(false);
  const [initialDesignFileSizeBytes, setInitialDesignFileSizeBytes] = useState<number | null>(null);
  const [reviewConfirmDecision, setReviewConfirmDecision] = useState<'approved' | 'declined' | null>(null);

  // ── Derived ──
  const visitReport: VisitReport | null = useMemo(() => {
    const activeReport = activeProjectItemRecord?.ocularVisitReportId || activeProjectItemRecord?.consultationVisitReportId;
    if (activeReport && typeof activeReport !== 'string') return activeReport as VisitReport;
    if (!project?.visitReportId || typeof project.visitReportId === 'string') return null;
    return project.visitReportId as VisitReport;
  }, [activeProjectItemRecord, project]);

  const activeProjectItemHasSpecifications = hasMeaningfulSpecifications(activeProjectItemRecord?.specifications);
  const visitReportHasSpecifications = hasMeaningfulSpecifications(visitReport?.specifications);

  const activeWorkflowStatus = getDisplayItemStatus(project?.status, activeProjectItemRecord?.status) || 'submitted';

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
  const currentSalesStaffId = useMemo(() => {
    if (!project?.salesStaffId) return '';
    return typeof project.salesStaffId === 'string' ? project.salesStaffId : project.salesStaffId._id;
  }, [project?.salesStaffId]);
  const currentSalesStaffName = useMemo(() => {
    if (!project?.salesStaffId) return 'Not assigned yet';
    if (typeof project.salesStaffId !== 'string') {
      return `${project.salesStaffId.firstName} ${project.salesStaffId.lastName}`;
    }
    const fromList = salesStaffList.find((staff) => staff._id === project.salesStaffId);
    return fromList ? `${fromList.firstName} ${fromList.lastName}` : 'Assigned sales staff';
  }, [project?.salesStaffId, salesStaffList]);
  const activeInitialDesignKeys = useMemo(
    () => {
      if (activeProjectItemRecord?.initialDesignKeys?.length) {
        return activeProjectItemRecord.initialDesignKeys;
      }

      if (project?.initialDesignKeys?.length) {
        return project.initialDesignKeys;
      }

      return project?.items?.find((item) => item.initialDesignKeys?.length)?.initialDesignKeys || [];
    },
    [activeProjectItemRecord?.initialDesignKeys, project?.initialDesignKeys, project?.items],
  );
  const activeInitialDesignNotes = activeProjectItemRecord?.initialDesignNotes ?? project?.initialDesignNotes;
  const activeDesignReviewStatus = activeProjectItemRecord?.designReviewStatus || project?.designReviewStatus || 'not_required';
  const activeDesignReviewNotes = activeProjectItemRecord?.designReviewNotes ?? project?.designReviewNotes;
  const hasInitialDesign = Boolean(activeInitialDesignKeys.length || activeInitialDesignNotes);
  const initialDesignBackfill = project?.initialDesignBackfill;
  const hasBackfilledInitialDesign = Boolean(initialDesignBackfill?.backfilledAt);
  const primaryInitialDesignKey = activeInitialDesignKeys[0];
  const { url: primaryInitialDesignUrl } = useAuthenticatedUrl(primaryInitialDesignKey);
  const initialDesignPreviewFileName = primaryInitialDesignKey ? getFileName(primaryInitialDesignKey) : 'Initial design file';
  const initialDesignPreviewTypeLabel = primaryInitialDesignKey ? getFileTypeLabel(primaryInitialDesignKey) : 'No file uploaded';
  const initialDesignSubmittedAt = activeProjectItemRecord?.updatedAt
    || project?.updatedAt
    || project?.createdAt;
  const initialDesignUploaderName = project?.salesStaffName || currentSalesStaffName || 'Sales Team';
  const initialDesignFileSizeText = formatFileSize(initialDesignFileSizeBytes ?? undefined);
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
  const canReviewInitialDesign = Boolean(
    (isAdmin || isAssignedEngineer)
    && hasInitialDesign
    && !hasBackfilledInitialDesign
    && !blueprint
    && ['pending', 'not_required'].includes(activeDesignReviewStatus),
  );
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
  const canReassignProjectSales = Boolean(
    isAdmin
    && project
    && ![ProjectStatus.CANCELLED, ProjectStatus.COMPLETED].includes(project.status as ProjectStatus),
  );
  const canEngineerClaimProject = Boolean(
    isEngineer
    && project?.status === 'submitted'
    && project.contractStatus === ContractStatus.UPLOADED
    && project.engineerIds.length === 0
    && !isAssignedEngineer,
  );
  const hasProjectReviewSubmitted = Boolean(project?.customerReview?.submittedAt);
  const hasProjectReviewSkipped = Boolean(project?.customerReview?.skippedAt);
  const canPromptProjectReview = Boolean(isCustomer && project?.status === 'completed' && !hasProjectReviewSubmitted && !hasProjectReviewSkipped);
  const showDesignReviewTabIndicator = Boolean(
    isAssignedEngineer
    && hasInitialDesign
    && !hasBackfilledInitialDesign
    && !blueprint
    && ['pending', 'not_required'].includes(activeDesignReviewStatus),
  );
  const showBlueprintTabIndicator = Boolean(
    isAssignedEngineer
    && project
    && activeWorkflowStatus === ProjectStatus.BLUEPRINT
    && (!blueprint || blueprint.status === 'revision_requested'),
  );
  const activeQuotationTotal = Number(blueprint?.quotation?.total || 0);
  const showCostingTabIndicator = Boolean(
    isAssignedEngineer
    && project
    && activeWorkflowStatus === ProjectStatus.BLUEPRINT
    && activeProjectItemRecord
    && (!blueprint?.costingKey || !blueprint?.quotation || activeQuotationTotal <= 0),
  );
  const blueprintReadyForCustomerReview = Boolean(
    isCustomer
    && blueprint
    && blueprint.status !== 'revision_requested'
    && blueprint.blueprintKey
    && blueprint.designKey
    && blueprint.quotation
    && blueprint.quotationReviewStatus === 'sent_to_customer'
    && activeQuotationTotal > 0,
  );
  const showCustomerBlueprintApprovalIndicator = Boolean(
    blueprintReadyForCustomerReview
    && !blueprint?.blueprintApproved,
  );
  const showCustomerCostingApprovalIndicator = Boolean(
    blueprintReadyForCustomerReview
    && !blueprint?.costingApproved,
  );
  const showBlueprintTabBadge = showBlueprintTabIndicator || showCustomerBlueprintApprovalIndicator;
  const showCostingTabBadge = showCostingTabIndicator || showCustomerCostingApprovalIndicator;
  const paymentTabPendingCount = useMemo(() => (
    projectPaymentPlanQueries.reduce((count, query) => {
      const plan = query.data;
      if (!plan?.stages?.length) return count;
      return count + (plan.stages.some((stage) => String(stage.status) !== 'verified') ? 1 : 0);
    }, 0)
  ), [projectPaymentPlanQueries]);
  const showPaymentsTabIndicator = paymentTabPendingCount > 0;
  const allRequiredInitialFabricationPaymentsVerified = Boolean(
    project?.status === ProjectStatus.FABRICATION
    || project?.status === ProjectStatus.COMPLETED
    || (
      projectPaymentPlanItemIds.length > 0
      && projectPaymentPlanQueries.length === projectPaymentPlanItemIds.length
      && projectPaymentPlanQueries.every((query) => query.data?.stages?.[0]?.status === 'verified')
    )
    || (
      projectPaymentPlanItemIds.length === 0
      && paymentPlan?.stages?.[0]?.status === 'verified'
    ),
  );
  const hasReachedFabricationPaymentStage = Boolean(
    project
    && allRequiredInitialFabricationPaymentsVerified,
  );
  const canStartFabricationSetup = Boolean(
    project
    && hasReachedFabricationPaymentStage,
  );
  const isActivePaymentPlanFullyVerified = Boolean(
    paymentPlan?.stages?.length
    && paymentPlan.stages.every((stage) => String(stage.status) === 'verified'),
  );
  const workflowStatus = resolveProjectWorkflowStatus({
    project,
    item: activeProjectItemRecord,
    blueprint,
    paymentPlans: [paymentPlan as PaymentPlan | undefined],
    isCustomer,
  });
  const projectStatusBadgeStatus = workflowStatus.key || (isActivePaymentPlanFullyVerified ? 'verified' : activeWorkflowStatus);
  const projectStatusBadgeLabel = workflowStatus.label || (isActivePaymentPlanFullyVerified ? 'Paid' : undefined);
  const contractFileName = project?.contractFileName || (project?.contractFileKey ? getFileName(project.contractFileKey) : 'Signed contract');
  const contractFileExtension = getFileExtension(contractFileName);
  const contractIsPdf = contractFileExtension === 'pdf' || project?.contractContentType === 'application/pdf';
  const contractIsImage = IMAGE_FILE_EXTENSIONS.has(contractFileExtension);
  const contractFileSizeText = formatFileSize(project?.contractFileSize);
  const {
    url: contractPreviewUrl,
    isLoading: contractPreviewLoading,
    error: contractPreviewError,
  } = useAuthenticatedUrl(project?.contractFileKey);

  useEffect(() => {
    if (!primaryInitialDesignUrl) {
      setInitialDesignFileSizeBytes(null);
      return;
    }

    const controller = new AbortController();

    const resolveFileSize = async () => {
      try {
        const headRes = await fetch(primaryInitialDesignUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });
        const headLength = Number(headRes.headers.get('content-length') || 0);
        if (headLength > 0) {
          setInitialDesignFileSizeBytes(headLength);
          return;
        }
      } catch {
        // Fall through to GET fallback.
      }

      try {
        const getRes = await fetch(primaryInitialDesignUrl, { signal: controller.signal });
        const blob = await getRes.blob();
        setInitialDesignFileSizeBytes(blob.size > 0 ? blob.size : null);
      } catch {
        setInitialDesignFileSizeBytes(null);
      }
    };

    void resolveFileSize();
    return () => controller.abort();
  }, [primaryInitialDesignUrl]);

  const availabilityLabel = (status?: StaffAvailabilityStatus) => {
    switch (status) {
      case StaffAvailabilityStatus.UNAVAILABLE:
        return 'Unavailable';
      case StaffAvailabilityStatus.ON_LEAVE:
        return 'On Leave';
      default:
        return 'Available';
    }
  };

  const isAvailabilityBlocked = (status?: StaffAvailabilityStatus) => (
    status === StaffAvailabilityStatus.UNAVAILABLE || status === StaffAvailabilityStatus.ON_LEAVE
  );

  useEffect(() => {
    if (!isAdmin) return;

    api.get<ApiResponse<Array<{
      _id: string;
      firstName: string;
      lastName: string;
      availabilityStatus?: StaffAvailabilityStatus;
      availabilityNote?: string;
    }>>>('/users/sales-staff')
      .then((res) => setSalesStaffList(res.data.data))
      .catch(() => setSalesStaffList([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!currentSalesStaffId) return;
    setSelectedSalesStaffId(currentSalesStaffId);
  }, [currentSalesStaffId]);

  useEffect(() => {
    setInitialDesignKeys(activeInitialDesignKeys);
    setInitialDesignNotes(activeInitialDesignNotes || '');
    setInitialDesignBackfillReason(
      project?.initialDesignBackfill?.reason ||
      'Synthetic demo backfill for a historical project that originally skipped the initial design step.',
    );
  }, [activeInitialDesignKeys, activeInitialDesignNotes, project?.initialDesignBackfill?.reason]);

  useEffect(() => {
    // Keep engineer review input scoped per active project item.
    setDesignReviewNotes(activeDesignReviewNotes || '');
  }, [activeProjectItemRecord?._id, activeDesignReviewNotes]);

  // ── Handlers ──
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);

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
        projectItemId: activeProjectItemRecord?._id,
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

  const requestReviewInitialDesign = (decision: 'approved' | 'declined') => {
    if (decision === 'declined' && !designReviewNotes.trim()) {
      toast.error('Add review notes before declining the initial design.');
      return;
    }

    setReviewConfirmDecision(decision);
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
        projectItemId: activeProjectItemRecord?._id,
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


  const handleDownloadContract = async () => {
    try {
      if (project?.contractFileKey) {
        await openAuthenticatedFile(project.contractFileKey);
        return;
      }
      const { data } = await api.get(`/projects/${id}/contract-url`, {
      });
      window.open(data.data.url, '_blank');
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
    if (!canStartFabricationSetup) {
      toast.error('Team assignment unlocks after the required customer payment is verified.');
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

  const handleReassignProjectSales = async () => {
    if (!project) return;
    if (!selectedSalesStaffId) {
      toast.error('Select a sales staff member first');
      return;
    }
    if (selectedSalesStaffId === currentSalesStaffId) {
      toast.error('Select a different sales staff member');
      return;
    }

    try {
      await reassignProjectSales.mutateAsync({
        id: project._id,
        salesStaffId: selectedSalesStaffId,
      });
      toast.success('Project sales staff reassigned successfully.');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to reassign sales staff'));
    }
  };

  const toggleAssistant = (staffId: string) => {
    setFabAssistantIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
    );
  };

  const handleOpenFabricationAssign = () => {
    if (!canStartFabricationSetup) {
      toast.error('Team assignment unlocks after the required customer payment is verified.');
      return;
    }
    setShowFabForm(true);
    requestAnimationFrame(() => {
      fabricationAssignFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSubmitProjectReview = async () => {
    const rating = Number(projectReviewRating);
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Please select a valid rating');
      return;
    }

    try {
      await submitProjectReview.mutateAsync({
        projectId: id!,
        rating,
        comment: projectReviewComment.trim() || undefined,
      });
      toast.success('Thanks for your review. Your feedback was saved.');
      setShowReviewForm(false);
      setProjectReviewComment('');
      setProjectReviewSkipReason('');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to submit review'));
    }
  };

  const handleSkipProjectReview = async () => {
    try {
      await skipProjectReview.mutateAsync({
        projectId: id!,
        reason: projectReviewSkipReason.trim() || undefined,
      });
      toast.success('No problem. You can continue using your project dashboard.');
      setShowSkipReviewDialog(false);
      setProjectReviewSkipReason('');
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to skip review'));
    }
  };

  if (isLoading) return <PageLoader />;
  if (isError || !project) return <PageError onRetry={refetch} />;

  const hasFabLead = project.fabricationLeadId && typeof project.fabricationLeadId !== 'string';
  const activeProjectServiceLabel = projectServiceItems.find((item) => item.id === activeProjectItemId)?.label || '';
  const projectServiceTitle = projectServiceItems.map((item) => item.label).join(', ') || project.title;
  const headerTitle = activeProjectServiceLabel || projectServiceTitle;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mt-0.5 h-10 w-10 shrink-0 rounded-xl border border-[color:var(--color-border)]/60 hover:bg-[color:var(--color-muted)]/85 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[1.8rem] font-semibold tracking-tight text-[var(--color-card-foreground)] truncate sm:text-[2rem]">
                {headerTitle}
              </h1>
              {project.projectNumber && (
                <span className="inline-flex h-7 items-center rounded-xl bg-[color:var(--color-muted)] dark:bg-slate-800 border border-[color:var(--color-border)] dark:border-slate-700 px-2.5 text-[11px] font-semibold tracking-tight text-[var(--text-metal-color)] dark:text-slate-300 shadow-sm">
                  {project.projectNumber}
                </span>
              )}
              <StatusBadge status={projectStatusBadgeStatus} label={projectStatusBadgeLabel} />
            </div>
            <p className="mt-1.5 text-sm text-[var(--text-metal-color)] dark:text-slate-300">
              Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {projectServiceItems.length > 1 && (
          <div className={cn(
            'rounded-2xl border border-[color:var(--color-border)]/60 px-4 py-3 shadow-sm xl:w-[520px] xl:max-w-[46%]',
            isDark ? 'bg-slate-950/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.2)]' : 'bg-white',
          )}>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Project Items
            </p>
            <div className="mt-2.5">
              <ProjectItemsStrip
                items={projectServiceItems}
                isDark={isDark}
                activeItemId={activeProjectItemId || ''}
                onSelect={setActiveProjectItem}
                bare
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div
          className="flex h-12 items-center gap-3 overflow-x-auto rounded-2xl border border-[color:var(--color-border)]/60 bg-white px-3 shadow-sm no-scrollbar dark:bg-slate-950/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          role="tablist"
          aria-label="Project detail sections"
        >
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
              role="tab"
              id={`project-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`project-panel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              className={cn(
                'relative flex h-full min-w-fit items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-blue-400 text-slate-950 dark:text-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-50',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.key === 'design_review' && showDesignReviewTabIndicator && (
                <span
                  aria-label="Design review requires attention"
                  className={cn(
                    'absolute right-2 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none',
                    activeTab === tab.key
                      ? 'bg-sky-700 text-white dark:bg-sky-300 dark:text-slate-950'
                      : 'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
                  )}
                >
                  1
                </span>
              )}
              {tab.key === 'blueprint' && showBlueprintTabBadge && (
                <span
                  aria-label={showCustomerBlueprintApprovalIndicator ? 'Blueprint approval pending' : 'Blueprint requires attention'}
                  className={cn(
                    showCustomerBlueprintApprovalIndicator
                      ? 'absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 dark:bg-rose-400'
                      : cn(
                        'absolute right-2 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none',
                        activeTab === tab.key
                          ? 'bg-sky-700 text-white dark:bg-sky-300 dark:text-slate-950'
                          : 'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
                      ),
                  )}
                >
                  {!showCustomerBlueprintApprovalIndicator ? '1' : null}
                </span>
              )}
              {tab.key === 'costing' && showCostingTabBadge && (
                <span
                  aria-label={showCustomerCostingApprovalIndicator ? 'Costing approval pending' : 'Costing requires attention'}
                  className={cn(
                    showCustomerCostingApprovalIndicator
                      ? 'absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 dark:bg-rose-400'
                      : cn(
                        'absolute right-2 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none',
                        activeTab === tab.key
                          ? 'bg-sky-700 text-white dark:bg-sky-300 dark:text-slate-950'
                          : 'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
                      ),
                  )}
                >
                  {!showCustomerCostingApprovalIndicator ? '1' : null}
                </span>
              )}
              {tab.key === 'payments' && showPaymentsTabIndicator && (
                <span
                  aria-label="Payments require attention"
                  className={cn(
                    'absolute right-2 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none',
                    activeTab === tab.key
                      ? 'bg-sky-700 text-white dark:bg-sky-300 dark:text-slate-950'
                      : 'bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950',
                  )}
                >
                  {paymentTabPendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Customer Status Guide Banner ── */}
      {project.status === 'draft' && visitReport?.visitType === 'consultation' && (
        <Card className={cn(
          'rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x',
          isDark ? 'metal-panel-strong border-[color:var(--color-border)]/60' : 'border-blue-200 bg-blue-50/50'
        )}>
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className={cn('mt-0.5 h-5 w-5 shrink-0', isDark ? 'text-slate-300' : 'text-blue-600')} />
            <div>
              <p className={cn('text-sm font-semibold', isDark ? 'text-slate-100' : 'text-blue-900')}>
                {visitReport.consultationOutcome === 'no_ocular' ? 'Complete project details' : 'Awaiting ocular visit'}
              </p>
              <p className={cn('mt-0.5 text-xs', isDark ? 'text-slate-400' : 'text-blue-700')}>
                {visitReport.consultationOutcome === 'no_ocular'
                  ? 'Ocular was skipped for this consultation. Complete and review the project details before submitting it to engineering.'
                  : isEngineer
                    ? 'Engineering work starts after the ocular visit is finalized and its report moves this project into the submitted stage.'
                    : 'This draft came from the consultation stage. The next step is to finalize the ocular visit before engineering begins.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && project.status === 'submitted' && (
        <Card className={cn(
          'rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x',
          isDark ? 'metal-panel-strong border-[color:var(--color-border)]/60' : 'border-blue-200 bg-blue-50/50'
        )}>
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className={cn('mt-0.5 h-5 w-5 shrink-0', isDark ? 'text-slate-300' : 'text-blue-600')} />
            <div>
              <p className={cn('text-sm font-semibold', isDark ? 'text-slate-100' : 'text-blue-900')}>Project Submitted</p>
              <p className={cn('mt-0.5 text-xs', isDark ? 'text-slate-400' : 'text-blue-700')}>Your project has been created from the visit report. An engineer will be assigned to design your blueprint.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && ['approved', 'payment_pending'].includes(project.status) && !paymentPlan && (
        <Card className={cn(
          'rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x',
          isDark ? 'metal-panel-strong border-[color:var(--color-border)]/60' : 'border-emerald-200 bg-emerald-50/50'
        )}>
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <CreditCard className={cn('mt-0.5 h-5 w-5 shrink-0', isDark ? 'text-emerald-300' : 'text-emerald-600')} />
            <div>
              <p className={cn('text-sm font-semibold', isDark ? 'text-slate-100' : 'text-emerald-900')}>Choose Your Payment Plan</p>
              <p className={cn('mt-0.5 text-xs', isDark ? 'text-slate-400' : 'text-emerald-700')}>Your blueprint is approved. Open the Blueprint tab to choose full payment or installment.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isCustomer && project.status === 'completed' && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/40">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Project Complete</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-0.5">Your project has been completed. Thank you for choosing our services!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isCustomer && project.status === 'completed' && (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-[color:var(--color-border)]/60">
          <CardContent className="space-y-3 py-4 px-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-[var(--text-metal-color)] dark:text-slate-300 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-card-foreground)] dark:text-slate-100">
                  Post-Project Review
                </p>
                <p className="text-xs text-[var(--text-metal-color)] dark:text-slate-300 mt-0.5">
                  This feedback is for internal service improvement and quality tracking only.
                </p>
              </div>
            </div>

            {canPromptProjectReview && !showReviewForm && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setShowReviewForm(true)} className="rounded-lg bg-[linear-gradient(180deg,#c49a62_0%,#a07d4a_100%)] hover:bg-[linear-gradient(180deg,#d4aa72_0%,#b08d5a_100%)] text-white border-0 shadow-[0_2px_8px_rgba(196,154,98,0.3)]">
                  Leave Review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSkipReviewDialog(true)}
                  className="rounded-lg"
                >
                  Skip for now
                </Button>
              </div>
            )}

            {canPromptProjectReview && showReviewForm && (
              <div className="space-y-3 rounded-xl border border-[color:var(--color-border)]/60 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="project-review-rating" className="text-xs font-medium">Rating</Label>
                  <Select value={projectReviewRating} onValueChange={setProjectReviewRating}>
                    <SelectTrigger id="project-review-rating" className="h-9 rounded-lg">
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                      <SelectItem value="4">4 - Very Good</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="2">2 - Fair</SelectItem>
                      <SelectItem value="1">1 - Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-review-comment" className="text-xs font-medium">Comment (optional)</Label>
                  <Textarea
                    id="project-review-comment"
                    value={projectReviewComment}
                    onChange={(event) => setProjectReviewComment(event.target.value)}
                    placeholder="Share what went well and what can be improved"
                    className="min-h-[88px]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitProjectReview}
                    disabled={submitProjectReview.isPending}
                    className="rounded-lg bg-[linear-gradient(180deg,#c49a62_0%,#a07d4a_100%)] hover:bg-[linear-gradient(180deg,#d4aa72_0%,#b08d5a_100%)] text-white border-0 shadow-[0_2px_8px_rgba(196,154,98,0.3)]"
                  >
                    {submitProjectReview.isPending ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReviewForm(false)}
                    className="rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {hasProjectReviewSubmitted && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/30 p-3">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  Review submitted: {project.customerReview?.rating}/5
                </p>
                {project.customerReview?.comment && (
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
                    {project.customerReview.comment}
                  </p>
                )}
              </div>
            )}

            {hasProjectReviewSkipped && (
              <div className="rounded-xl border border-[color:var(--color-border)]/60 p-3">
                <p className="text-sm font-medium text-[var(--color-card-foreground)] dark:text-slate-100">Review skipped</p>
                {project.customerReview?.skippedReason && (
                  <p className="mt-1 text-xs text-[var(--text-metal-color)] dark:text-slate-300">
                    Note: {project.customerReview.skippedReason}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Contextual Action Banner (engineer) ── */}
      {isEngineer && (
        <>
          {canEngineerClaimProject && (
            <Card className={cn(
              'rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x transition-all duration-300',
              isDark ? 'border-sky-900/60 bg-[linear-gradient(135deg,rgba(12,25,45,0.9)_0%,rgba(10,20,35,0.85)_100%)] shadow-md shadow-sky-900/10' : 'border-sky-200 bg-sky-50/80'
            )}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm", isDark ? "bg-sky-500/10 text-sky-300" : "bg-sky-100 text-sky-700")}>
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 mt-0.5">
                    <p className={cn("text-sm font-semibold", isDark ? "text-sky-50" : "text-sky-950")}>This project needs an engineer</p>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-sky-200/80" : "text-sky-700")}>Take it over to start working on the blueprint.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className={cn(
                    "w-full sm:w-auto text-white shadow-sm transition-all border-0",
                    isDark ? "bg-[linear-gradient(180deg,#0ea5e9_0%,#0284c7_100%)] hover:bg-[linear-gradient(180deg,#38bdf8_0%,#0ea5e9_100%)]" : "bg-[linear-gradient(180deg,#0284c7_0%,#0369a1_100%)] hover:bg-[linear-gradient(180deg,#0369a1_0%,#075985_100%)]"
                  )}
                  onClick={handleClaimProject}
                  disabled={assignEngineers.isPending}
                >
                  {assignEngineers.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                  Take Over this Project
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ════════════════  DETAILS TAB  ════════════════ */}
      {activeTab === 'details' && (
        <div
          className="grid gap-5 lg:grid-cols-2"
          role="tabpanel"
          id="project-panel-details"
          aria-labelledby="project-tab-details"
        >
          {/* Project Info */}
          <DetailSectionCard
            title="Project Snapshot"
            icon={FileText}
            className="lg:col-span-2"
            action={<StatusBadge status={projectStatusBadgeStatus} label={projectStatusBadgeLabel} />}
          >
            <div className="grid gap-3">
              {project.description && (
                <DetailField label="Description" value={project.description} />
              )}
              {project.serviceType && (
                <DetailField label="Items">
                  <p>{projectServiceTitle}</p>
                  {activeProjectServiceLabel && projectServiceItems.length > 1 && (
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Viewing: <span className="text-sky-700 dark:text-sky-200">{activeProjectServiceLabel}</span>
                    </p>
                  )}
                </DetailField>
              )}
              {isStaff && project.customerName && (
                <DetailField label="Customer" value={project.customerName} />
              )}
              {project.siteAddress && (
                <DetailField label="Site Address" value={project.siteAddress} />
              )}
              {project.projectNumber && (
                <DetailField label="Project Number" value={project.projectNumber} />
              )}
            </div>
          </DetailSectionCard>

          {activeProjectItemHasSpecifications && activeProjectItemRecord?.specifications && (
            <DetailSectionCard
              title={`${activeProjectServiceLabel || 'Item'} Specifications`}
              icon={Layers}
              className="lg:col-span-2"
            >
              <div className="space-y-3">
                {getServiceSpecificationSchema(activeProjectItemRecord.serviceType).sections.map((section) => {
                  const sectionValues = activeProjectItemRecord.specifications?.[section.key] || {};
                  const visibleFields = section.fields.filter((field) => {
                    const value = sectionValues[field.key];
                    if (typeof value === 'string') return value.trim().length > 0;
                    if (typeof value === 'number') return Number.isFinite(value);
                    return value === true;
                  });
                  if (!visibleFields.length) return null;
                  return (
                    <div key={section.key} className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3`}>
                      <p className={`mb-2 text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>{section.label}</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {visibleFields.map((field) => (
                          <p key={field.key} className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>
                            <span className="font-medium">{field.label}:</span> {String(sectionValues[field.key])}{field.unit ? ` ${field.unit}` : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DetailSectionCard>
          )}

          {isStaff && !hasInitialDesign && project.status !== 'draft' && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/40 lg:col-span-2">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                  Initial Design Missing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  No initial design package was submitted by sales staff for this project.
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Because there was nothing to review, engineering approval for the initial design was skipped on this record.
                </p>
                {canBackfillInitialDesign && (
                  <div className="space-y-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white/80 dark:bg-slate-900/90 p-4">
                    <div>
                      <p className="text-sm font-medium text-amber-950 dark:text-amber-100">Admin Historical Backfill</p>
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
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
                      className="min-h-[96px] rounded-xl border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <Textarea
                      value={initialDesignBackfillReason}
                      onChange={(e) => setInitialDesignBackfillReason(e.target.value)}
                      placeholder="Explain why this historical backfill is being added now."
                      className="min-h-[96px] rounded-xl border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <Button
                      className="w-full bg-amber-900 text-white hover:bg-amber-950 dark:bg-none dark:bg-amber-100 dark:text-amber-950 dark:hover:bg-amber-50 sm:w-auto"
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
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 lg:col-span-2">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                  Historical Initial Design Backfill
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  This project originally skipped the initial design submission and engineer review step.
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  An admin later attached synthetic demo reference data on {initialDesignBackfill?.backfilledAt ? format(new Date(initialDesignBackfill.backfilledAt), 'MMM d, yyyy h:mm a') : 'a later date'} so the historical record is easier to demo and inspect.
                </p>
                {initialDesignBackfill?.reason && (
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Reason: {initialDesignBackfill.reason}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {/* ── Visit Report (Site Survey Data) — Staff only ── */}
          {isStaff && visitReport && (
            <DetailSectionCard title="Site Visit Report" icon={Camera} className="lg:col-span-2">
              <div className="space-y-5">
                {visitReport.visitType === 'ocular' && !hasVisitMeasurements && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Measurements Missing</p>
                        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                          This ocular report was submitted without measured line items or legacy dimensions. Engineering can only see the notes and attachments currently saved on the report.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {visitReport.status === 'returned' && visitReport.returnReason && (
                  <div className="rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/40 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-300" />
                      <div>
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">Report Under Repair</p>
                        <p className="mt-1 text-sm text-orange-800 dark:text-orange-200">{visitReport.returnReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="Report Status" value={visitReport.status} />
                  {visitReport.actualVisitDateTime && (
                    <DetailField label="Actual Visit Date" value={format(new Date(visitReport.actualVisitDateTime), 'MMM d, yyyy h:mm a')} />
                  )}
                  {(visitReport.measurementUnit || visitReport.measurements?.unit) && (
                    <DetailField label="Measurement Unit" value={visitReport.measurementUnit || visitReport.measurements?.unit} />
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

                {visitReportHasSpecifications && visitReport.specifications && (
                  <div>
                    <p className={`mb-2 text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                      Category Specifications
                    </p>
                    <div className="space-y-2">
                      {getServiceSpecificationSchema(visitReport.serviceType).sections.map((section) => {
                        const sectionValues = visitReport.specifications?.[section.key] || {};
                        const visibleFields = section.fields.filter((field) => sectionValues[field.key] !== undefined && sectionValues[field.key] !== '');
                        if (!visibleFields.length) return null;
                        return (
                          <div key={section.key} className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3`}>
                            <p className={`mb-2 text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>{section.label}</p>
                            <div className="grid gap-1 sm:grid-cols-2">
                              {visibleFields.map((field) => (
                                <p key={field.key} className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>
                                  <span className="font-medium">{field.label}:</span> {String(sectionValues[field.key])}{field.unit ? ` ${field.unit}` : ''}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Line Items */}
                {!visitReportHasSpecifications && visitReport.lineItems && visitReport.lineItems.length > 0 && (
                  <div>
                    <p className={`mb-2 text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                      Line Items ({visitReport.measurementUnit || visitReport.measurements?.unit || 'cm'})
                    </p>
                    <div className="-mx-4 overflow-x-auto border-y border-[color:var(--color-border)]/45 sm:mx-0 sm:rounded-xl sm:border sm:border-[color:var(--color-border)]/45">
                      <table className="min-w-full text-sm">
                        <thead className={isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/75'}>
                          <tr>
                            <th className={`px-3 py-2 text-left text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Item</th>
                            <th className={`px-3 py-2 text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Qty</th>
                            <th className={`px-3 py-2 text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>L</th>
                            <th className={`px-3 py-2 text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>W</th>
                            <th className={`px-3 py-2 text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>H</th>
                            <th className={`px-3 py-2 text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Area</th>
                            <th className={`px-3 py-2 text-left text-xs font-medium ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Notes</th>
                          </tr>
                        </thead>
                        <tbody className={cn(
                          'divide-y divide-[color:var(--color-border)]/35',
                          isDark ? 'bg-slate-950/55' : 'bg-white/70'
                        )}>
                          {visitReport.lineItems.map((item, idx) => (
                            <tr key={idx} className={isDark ? 'hover:bg-slate-900/45' : 'hover:bg-[color:var(--color-muted)]/65'}>
                              <td className={`px-3 py-2 font-medium ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{item.label}</td>
                              <td className={`px-3 py-2 text-center ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{item.quantity}</td>
                              <td className={`px-3 py-2 text-center ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{item.length ?? '—'}</td>
                              <td className={`px-3 py-2 text-center ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{item.width ?? '—'}</td>
                              <td className={`px-3 py-2 text-center ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{item.height ?? '—'}</td>
                              <td className={`px-3 py-2 text-center ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{item.area ?? '—'}</td>
                              <td className={`px-3 py-2 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>{item.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Site Conditions — ocular visits only */}
                {!visitReportHasSpecifications && visitReport.visitType === 'ocular' && visitReport.siteConditions && (
                  <div>
                    <p className={`mb-2 text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Site Conditions</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visitReport.siteConditions.environment && (
                        <div className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3`}>
                          <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Environment</p>
                          <p className={`text-sm capitalize ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{visitReport.siteConditions.environment}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.floorType && (
                        <div className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3`}>
                          <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Floor Type</p>
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{visitReport.siteConditions.floorType}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.wallMaterial && (
                        <div className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3`}>
                          <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Wall Material</p>
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{visitReport.siteConditions.wallMaterial}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.hasElectrical !== undefined && (
                        <div className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3`}>
                          <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Electrical Access</p>
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{visitReport.siteConditions.hasElectrical ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.hasPlumbing !== undefined && (
                        <div className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3`}>
                          <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Plumbing Access</p>
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{visitReport.siteConditions.hasPlumbing ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.accessNotes && (
                        <div className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3 sm:col-span-2 lg:col-span-3`}>
                          <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Access Notes</p>
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{visitReport.siteConditions.accessNotes}</p>
                        </div>
                      )}
                      {visitReport.siteConditions.obstaclesOrConstraints && (
                        <div className={`${isDark ? 'metal-panel' : 'bg-[color:var(--color-muted)]/55'} rounded-xl border border-[color:var(--color-border)]/45 p-3 sm:col-span-2 lg:col-span-3`}>
                          <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Obstacles / Constraints</p>
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>{visitReport.siteConditions.obstaclesOrConstraints}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Requirements & other text fields */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {visitReport.customerRequirements && (
                    <DetailField label="Customer Requirements" value={visitReport.customerRequirements} />
                  )}
                  {visitReport.materials && (
                    <DetailField label="Materials" value={visitReport.materials} />
                  )}
                  {visitReport.finishes && (
                    <DetailField label="Finishes" value={visitReport.finishes} />
                  )}
                  {visitReport.preferredDesign && (
                    <DetailField label="Preferred Design" value={visitReport.preferredDesign} />
                  )}
                  {visitReport.notes && (
                    <DetailField label="Notes" value={visitReport.notes} className="sm:col-span-2" />
                  )}
                </div>
              </div>
            </DetailSectionCard>
          )}

        </div>
      )}

      {/* ════════════════  DESIGN REVIEW TAB  ════════════════ */}
      {activeTab === 'design_review' && (
        <div
          className="grid gap-5 lg:grid-cols-2"
          role="tabpanel"
          id="project-panel-design_review"
          aria-labelledby="project-tab-design_review"
        >
          {isStaff && hasInitialDesign ? (
            <DetailSectionCard
              title="Initial Design Review"
              icon={PenTool}
              className="lg:col-span-2 dark:border-sky-400/15 dark:bg-slate-950/55"
              action={(
                <span className={cn(
                  'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize',
                  activeDesignReviewStatus === 'approved' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
                  activeDesignReviewStatus === 'declined' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
                  activeDesignReviewStatus === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
                  activeDesignReviewStatus === 'not_required' && 'border-gray-200 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                )}>
                  <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                  {activeDesignReviewStatus.replace('_', ' ')}
                </span>
              )}
            >
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {hasBackfilledInitialDesign
                      ? 'This package was added later as synthetic demo reference data. It documents a backfill for this historical record and does not mean the original review step happened on time.'
                      : 'Review the submitted initial design and provide your decision.'}
                  </p>
                  {!canManageInitialDesign && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
                      <Info className="h-3.5 w-3.5" />
                      Review Guidelines
                    </span>
                  )}
                </div>

                {!canManageInitialDesign && activeInitialDesignKeys.length > 0 && (
                  <div className="rounded-[26px] border border-[color:var(--color-border)]/55 bg-slate-50/80 p-4 dark:bg-white/[0.035] sm:p-5">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600/16 text-sm font-bold text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                        1
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">Initial Design Files</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Open reference files submitted by sales.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (!primaryInitialDesignKey) return;
                          if (isImageFileKey(primaryInitialDesignKey)) {
                            setLightboxKey(primaryInitialDesignKey);
                            return;
                          }
                          openAuthenticatedFile(primaryInitialDesignKey);
                        }}
                        className={cn(
                          'group rounded-[24px] border border-[color:var(--color-border)]/55 bg-white/90 p-4 text-left shadow-sm transition hover:border-blue-400/35 dark:border-slate-700 dark:bg-slate-950/55',
                          primaryInitialDesignKey && isImageFileKey(primaryInitialDesignKey) ? 'cursor-zoom-in' : 'cursor-pointer',
                        )}
                        title={primaryInitialDesignKey && isImageFileKey(primaryInitialDesignKey) ? 'Click to preview image' : 'Open file'}
                      >
                        {primaryInitialDesignKey && isImageFileKey(primaryInitialDesignKey) ? (
                          <div className="space-y-4">
                            <div className="relative overflow-hidden rounded-[22px] border border-[color:var(--color-border)]/45 bg-slate-950/95 p-4 dark:border-slate-700">
                              <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-slate-950">
                                <AuthImage
                                  fileKey={primaryInitialDesignKey}
                                  alt={initialDesignPreviewFileName}
                                  className="absolute inset-0 h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                                  fallback={(
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 px-4 py-5 text-center dark:bg-slate-900">
                                      <Image className="h-8 w-8 text-slate-400" />
                                      <span className="line-clamp-2 break-words text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {initialDesignPreviewFileName}
                                      </span>
                                    </div>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex items-end justify-between gap-4">
                              <div className="min-w-0">
                                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                                  <Image className="h-3.5 w-3.5" />
                                  Image Preview
                                </p>
                                <p className="mt-4 truncate text-base font-medium text-slate-950 dark:text-slate-100" title={initialDesignPreviewFileName}>
                                  {initialDesignPreviewFileName}
                                </p>
                              </div>
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.16)] dark:bg-slate-100">
                                <Maximize2 className="h-5 w-5" />
                              </span>
                            </div>
                          </div>
                        ) : primaryInitialDesignKey ? (
                          <div className="flex min-h-[240px] flex-col justify-between gap-6 rounded-[22px] border border-[color:var(--color-border)]/45 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/65">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                              <FileText className="h-7 w-7" />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                                File Preview
                              </p>
                              <p className="mt-3 break-words text-base font-semibold text-slate-950 dark:text-slate-100">
                                {initialDesignPreviewFileName}
                              </p>
                              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {initialDesignPreviewTypeLabel} • {initialDesignFileSizeText}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </button>

                      <div className="rounded-[24px] border border-[color:var(--color-border)]/55 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                        <div className="space-y-5">
                          <div className="flex gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                              <User className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Uploaded By</p>
                              <p className="mt-2 text-lg font-medium text-slate-950 dark:text-slate-100">{initialDesignUploaderName}</p>
                            </div>
                          </div>

                          <div className="border-t border-[color:var(--color-border)]/55 pt-5 dark:border-slate-700">
                            <div className="flex gap-3">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                <CalendarDays className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Uploaded On</p>
                                <p className="mt-2 text-lg font-medium text-slate-950 dark:text-slate-100">
                                  {initialDesignSubmittedAt ? format(new Date(initialDesignSubmittedAt), 'MMM d, yyyy h:mm a') : 'Not recorded'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[color:var(--color-border)]/55 pt-5 dark:border-slate-700">
                            <div className="flex gap-3">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                <FileText className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">File Type</p>
                                <p className="mt-2 text-lg font-medium text-slate-950 dark:text-slate-100">{initialDesignPreviewTypeLabel}</p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[color:var(--color-border)]/55 pt-5 dark:border-slate-700">
                            <div className="flex gap-3">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                <Download className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">File Size</p>
                                <p className="mt-2 text-lg font-medium text-slate-950 dark:text-slate-100">{initialDesignFileSizeText}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {activeInitialDesignKeys.length > 1 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {activeInitialDesignKeys.slice(1).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (isImageFileKey(key)) {
                                setLightboxKey(key);
                                return;
                              }
                              openAuthenticatedFile(key);
                            }}
                            className="rounded-full border border-[color:var(--color-border)]/60 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-400/35 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:text-slate-100"
                          >
                            {getFileName(key)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!canManageInitialDesign && activeInitialDesignNotes && (
                  <div className="rounded-[26px] border border-[color:var(--color-border)]/55 bg-slate-50/80 p-4 dark:bg-white/[0.035] sm:p-5">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600/16 text-sm font-bold text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                        2
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">
                          {hasBackfilledInitialDesign ? 'Backfill Notes' : 'Sales Notes'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Notes and requirements provided by sales.</p>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-blue-500/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.08)_0%,rgba(15,23,42,0.02)_100%)] px-5 py-6 dark:border-blue-400/10 dark:bg-[linear-gradient(180deg,rgba(59,130,246,0.10)_0%,rgba(15,23,42,0.16)_100%)]">
                      <p className="text-base leading-9 text-slate-900 dark:text-slate-100">
                        {activeInitialDesignNotes}
                      </p>
                    </div>
                  </div>
                )}

                {canReviewInitialDesign && (
                  <div className="rounded-[26px] border border-[color:var(--color-border)]/55 bg-slate-50/80 p-4 dark:bg-white/[0.035] sm:p-5">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600/16 text-sm font-bold text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                        3
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">Engineer Decision</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Approve if the reference is sufficient to proceed, or decline with notes for sales.</p>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[color:var(--color-border)]/55 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-950/45">
                      <Label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Add internal review notes (required when declining)
                      </Label>
                      <div className="relative">
                        <Textarea
                          value={designReviewNotes}
                          onChange={(e) => setDesignReviewNotes(e.target.value)}
                          placeholder="Add internal review notes..."
                          maxLength={1000}
                          className="min-h-[132px] resize-none rounded-2xl border border-[color:var(--color-border)]/55 bg-slate-50/80 pb-10 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-slate-500 dark:text-slate-400">
                          {designReviewNotes.length}/1000
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-[color:var(--color-border)]/55 bg-white/40 px-4 py-5 dark:border-slate-700 dark:bg-slate-950/35">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Info className="h-4 w-4" />
                          Your decision will be shared with the sales team and recorded in the project activity.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button
                            variant="destructive"
                            className="w-full rounded-xl border-0 bg-[linear-gradient(180deg,#d97261_0%,#cb5a50_100%)] px-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_24px_rgba(153,46,42,0.20)] hover:bg-[linear-gradient(180deg,#e17c6b_0%,#d46258_100%)] sm:w-auto"
                            onClick={() => requestReviewInitialDesign('declined')}
                            disabled={reviewInitialDesign.isPending}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Decline Initial Design
                          </Button>
                          <Button
                            className="w-full rounded-xl border-0 bg-[linear-gradient(180deg,#33b87c_0%,#239762_100%)] px-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_24px_rgba(21,98,70,0.24)] hover:bg-[linear-gradient(180deg,#39c988_0%,#28a76d_100%)] dark:text-white sm:w-auto"
                            onClick={() => requestReviewInitialDesign('approved')}
                            disabled={reviewInitialDesign.isPending}
                          >
                            {reviewInitialDesign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Approve Initial Design
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDesignReviewNotes && (
                  <DetailField label="Latest Review Notes" value={activeDesignReviewNotes} />
                )}

                {canManageInitialDesign && (
                  <div className="space-y-5 rounded-2xl border border-[color:var(--color-border)]/55 bg-slate-50/80 p-4 dark:bg-white/[0.035] sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                        <Upload className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-base font-semibold text-slate-950 dark:text-slate-100">1. Sales Resubmission</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {activeDesignReviewStatus === 'declined'
                            ? 'Engineering requested changes. Upload the revised package for another review.'
                            : 'Upload your refined initial design package for the engineer to create the first blueprint.'}
                        </p>
                      </div>
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
                      presentation="review"
                    />

                    <div className="border-t border-[color:var(--color-border)]/55 pt-5">
                      <div className="mb-3 flex items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                          <MessageSquare className="h-6 w-6" />
                        </span>
                        <div>
                          <p className="text-base font-semibold text-slate-950 dark:text-slate-100">2. Sales Notes</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Provide clear notes to help engineering understand the requirements.</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Textarea
                          value={initialDesignNotes}
                          onChange={(e) => setInitialDesignNotes(e.target.value)}
                          placeholder="Add sales notes, clarified customer preferences, or engineer-requested adjustments."
                          maxLength={1000}
                          className="min-h-[132px] resize-none rounded-2xl border border-[color:var(--color-border)]/60 bg-white/80 pb-10 text-sm leading-relaxed text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-slate-500 dark:text-slate-400">
                          {initialDesignNotes.length}/1000
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                      <Button
                        className="w-full rounded-xl !border-blue-500 !bg-blue-600 !text-white !shadow-[0_14px_28px_rgba(37,99,235,0.38)] ![background-image:none] hover:!bg-blue-500 dark:!border-blue-400 dark:!bg-blue-500 dark:!text-white dark:hover:!bg-blue-400 sm:w-auto"
                        onClick={handleResubmitInitialDesign}
                        disabled={resubmitInitialDesign.isPending || initialDesignUploading}
                      >
                        {resubmitInitialDesign.isPending || initialDesignUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Save & Resubmit Initial Design
                      </Button>
                      <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <LockKeyhole className="h-4 w-4" />
                        Your submission will be sent to engineering for review.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </DetailSectionCard>
          ) : (
            <DetailSectionCard title="Design Review" icon={PenTool} className="lg:col-span-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This project does not have an initial design package ready for review yet.
              </p>
            </DetailSectionCard>
          )}
        </div>
      )}

      {/* ════════════════  CONTRACT TAB  ════════════════ */}
      {activeTab === 'contract' && (
        <div
          className="grid gap-5"
          role="tabpanel"
          id="project-panel-contract"
          aria-labelledby="project-tab-contract"
        >
          <Card className="overflow-hidden rounded-3xl border border-[color:var(--color-border)]/60 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-sky-400/15 dark:bg-slate-950/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.18)]">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-600/15 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200">
                  <ScrollText className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold tracking-[-0.01em] text-slate-950 dark:text-slate-50 sm:text-2xl">
                    Signed Contract
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    View and download the manually signed contract uploaded for this project.
                  </p>
                </div>
              </div>

              {project.contractStatus === ContractStatus.UPLOADED && project.contractFileKey ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(290px,0.82fr)]">
                    <div className="overflow-hidden rounded-2xl border border-[color:var(--color-border)]/60 bg-slate-50/80 p-2.5 dark:border-slate-700 dark:bg-slate-950/45">
                      <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]/60 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)]/55 px-3 py-2.5 dark:border-slate-700">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/12 text-red-600 dark:bg-red-400/15 dark:text-red-300">
                              <FileText className="h-5 w-5" />
                            </span>
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100" title={contractFileName}>
                              {contractFileName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadContract}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                            aria-label="Open contract in a new tab"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="relative min-h-[320px] bg-slate-100 dark:bg-slate-950 sm:min-h-[360px]">
                          {contractPreviewLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading contract preview</p>
                            </div>
                          )}

                          {!contractPreviewLoading && contractPreviewUrl && contractIsPdf && (
                            <iframe
                              src={`${contractPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                              title="Signed contract preview"
                              className="h-[320px] w-full border-0 bg-white sm:h-[360px]"
                            />
                          )}

                          {!contractPreviewLoading && contractPreviewUrl && contractIsImage && (
                            <img
                              src={contractPreviewUrl}
                              alt="Signed contract preview"
                              className="h-[320px] w-full object-contain bg-white sm:h-[360px]"
                            />
                          )}

                          {!contractPreviewLoading && (!contractPreviewUrl || contractPreviewError || (!contractIsPdf && !contractIsImage)) && (
                            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center sm:min-h-[360px]">
                              <FileText className="h-10 w-10 text-slate-400" />
                              <div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preview is not available</p>
                                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                                  Open or download the file to view the signed contract.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)]/55 px-4 py-2.5 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">
                            {contractIsPdf ? '1 / 1' : 'Preview'}
                          </p>
                          <div className="hidden items-center gap-3 rounded-xl border border-[color:var(--color-border)]/55 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:flex">
                            <span>-</span>
                            <span>100%</span>
                            <span>+</span>
                          </div>
                          {contractPreviewUrl ? (
                            <a
                              href={contractPreviewUrl}
                              download={contractFileName}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                              aria-label="Download signed contract"
                            >
                              <Download className="h-5 w-5" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={handleDownloadContract}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                              aria-label="Open signed contract"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--color-border)]/60 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-white/[0.035]">
                      <div className="space-y-5">
                        <div className="flex gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200/75 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                            <CalendarDays className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Uploaded</p>
                            <p className="mt-1.5 text-sm font-semibold text-slate-950 dark:text-slate-100 sm:text-base">
                              {project.contractUploadedAt ? format(new Date(project.contractUploadedAt), 'MMM d, yyyy h:mm a') : 'Recorded'}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-[color:var(--color-border)]/55 pt-5 dark:border-slate-700">
                          <div className="flex gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200/75 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                              <FileText className="h-6 w-6" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">File</p>
                              <p className="mt-1.5 break-words text-sm font-semibold leading-relaxed text-slate-950 dark:text-slate-100 sm:text-base">
                                {contractFileName}
                              </p>
                              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{contractFileSizeText}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-[color:var(--color-border)]/55 pt-5 dark:border-slate-700">
                          <div className="flex gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                              <ShieldCheck className="h-6 w-6" />
                            </span>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</p>
                              <p className="mt-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-300 sm:text-base">Ready for engineering</p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                The contract is ready and will be used for engineering work.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)]/55 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-white/[0.035]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                      <Info className="h-5 w-5" />
                    </span>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      Contract tab is view-only. Use this tab to check status and download the uploaded signed contract.
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Signed contract missing</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Contract tab is view-only. The signed contract has not been uploaded yet.
                        </p>
                      </div>
                    </div>
                    {(isAssignedSales || isAdmin) && (
                      <Button
                        type="button"
                        variant="prominent"
                        className="w-full sm:w-auto"
                        onClick={() => navigate(`/projects/${id}/contract`)}
                      >
                        <Upload className="mr-1.5 h-4 w-4" />
                        Go to Contract Upload
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════  BLUEPRINT TAB  ════════════════ */}
      <div
        className={cn(activeTab === 'blueprint' ? '' : 'hidden')}
        role="tabpanel"
        id="project-panel-blueprint"
        aria-labelledby="project-tab-blueprint"
      >
        {activeTab === 'blueprint' && (
          <Suspense fallback={<TabPanelFallback message="Loading the blueprint workspace." />}>
            <LazyBlueprintTab
              projectId={id!}
              projectItemId={activeProjectItemRecord?._id}
              mode="blueprint"
            />
          </Suspense>
        )}
      </div>

      {/* ════════════════  COSTING TAB  ════════════════ */}
      <div
        className={cn(activeTab === 'costing' ? '' : 'hidden')}
        role="tabpanel"
        id="project-panel-costing"
        aria-labelledby="project-tab-costing"
      >
        {activeTab === 'costing' && (
          <Suspense fallback={<TabPanelFallback message="Loading the costing workspace." />}>
            <LazyBlueprintTab
              projectId={id!}
              projectItemId={activeProjectItemRecord?._id}
              mode="costing"
            />
          </Suspense>
        )}
      </div>

      {/* ════════════════  PAYMENTS TAB  ════════════════ */}
      {activeTab === 'payments' && isCustomer && !paymentPlan && (
        <div
          className="w-full"
          role="tabpanel"
          id="project-panel-payments"
          aria-labelledby="project-tab-payments"
        >
          <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-white shadow-sm dark:bg-slate-950/45">
            <CardContent className="flex flex-col items-center text-center py-12 px-6">
              <div className="silver-sheen mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                <CreditCard className="h-7 w-7 text-[#33414d] dark:text-[#33414d]" />
              </div>
              <h3 className={`mb-1 text-base font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
                Choose Payment Plan First
              </h3>
              <p className={`mb-6 max-w-sm text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                Choose your payment plan in the Costing tab first. After that, you can continue directly to payment.
              </p>
              <Button
                className="rounded-xl border border-emerald-300/70 !bg-emerald-600 !bg-none px-6 !text-white shadow-[0_12px_28px_rgba(16,185,129,0.28)] hover:!bg-emerald-500 dark:border-emerald-300/55 dark:!bg-emerald-500 dark:!text-slate-950 dark:hover:!bg-emerald-400"
                onClick={() => setActiveTab('costing')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Choose Payment Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {activeTab === 'payments' && (!isCustomer || paymentPlan) && (
        <div
          className="space-y-4"
          role="tabpanel"
          id="project-panel-payments"
          aria-labelledby="project-tab-payments"
        >


          {paymentPlan && (
            <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-white shadow-sm dark:bg-slate-950/45">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className={`text-base sm:text-lg ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Payment Plan</CardTitle>
                    {hasPayablePaymentStage && isCustomer && (
                      <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                        Payment is ready. Continue to the Payments page to pay by QR or request cash payment.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {activeProjectServiceLabel && (
                      <span className="w-fit rounded-full border border-[color:var(--color-border)]/60 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {activeProjectServiceLabel}
                      </span>
                    )}
                    {hasPayablePaymentStage && isCustomer && (
                      <Button
                        type="button"
                        variant="prominent"
                        className="w-full rounded-xl border border-emerald-300/70 !bg-emerald-600 !bg-none px-4 !text-white shadow-[0_12px_28px_rgba(16,185,129,0.24)] hover:!bg-emerald-500 dark:border-emerald-300/55 dark:!bg-emerald-500 dark:!text-slate-950 dark:hover:!bg-emerald-400 sm:w-auto"
                        onClick={() => navigate('/payments', {
                          state: {
                            projectId: id,
                            projectItemId: activeProjectItemRecord?._id,
                          },
                        })}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3">
                  {paymentPlan.stages.map((stage) => (
                    <div
                      key={String(stage.stageId)}
                      className="flex flex-col gap-3 rounded-xl border border-[color:var(--color-border)]/55 bg-slate-50 p-3.5 transition-colors dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-4"
                    >
                      <div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>{String(stage.label)}</p>
                        {(stage as any).description && (
                          <p className={`mt-0.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>{(stage as any).description}</p>
                        )}
                        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                          {String(stage.percentage)}% — {shouldHideAmount ? '***' : formatCurrency(Number(stage.amount))}
                        </p>
                      </div>
                      <StatusBadge status={String(stage.status)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-white shadow-sm dark:bg-slate-950/45">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className={`text-base sm:text-lg ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={String(p._id)}
                      className="flex flex-col gap-3 rounded-xl border border-[color:var(--color-border)]/55 bg-slate-50 p-3.5 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-4"
                    >
                      <div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>
                          {shouldHideAmount ? '***' : formatCurrency(Number(p.amountPaid))}
                        </p>
                        <p className={`text-xs capitalize ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                          {String(p.method || '').replace('_', ' ')}
                          {p.receiptNumber && ` · ${String(p.receiptNumber)}`}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                          {p.createdAt ? format(new Date(String(p.createdAt)), 'MMM d, yyyy') : ''}
                        </p>
                      </div>
                      <StatusBadge status={String(p.status)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[color:var(--color-border)]/60 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
                  No payments recorded for this item yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════  FABRICATION TAB  ════════════════ */}
      {activeTab === 'fabrication' && (
        <div
          className="w-full space-y-4"
          role="tabpanel"
          id="project-panel-fabrication"
          aria-labelledby="project-tab-fabrication"
        >
          {canStartFabricationSetup && isAssignedEngineer && !hasFabLead && !showFabForm && (
            <Card className={cn(
              'rounded-none sm:rounded-xl border-x-0 sm:border-x',
              isDark ? 'metal-panel-strong border-[color:var(--color-border)]/60' : 'border-violet-200 bg-violet-50/50',
            )}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Users className={cn('h-5 w-5 shrink-0 mt-0.5 sm:mt-0', isDark ? 'text-violet-300' : 'text-violet-600')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold', isDark ? 'text-slate-100' : 'text-violet-800')}>Assign fabrication team</p>
                    <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-violet-700')}>Customer payment is verified. Select a lead fabricator and assistants for this project.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto !border-violet-500/70 !bg-violet-600 !text-white hover:!bg-violet-700 dark:!border-violet-400/70 dark:!bg-violet-500 dark:hover:!bg-violet-400"
                  onClick={handleOpenFabricationAssign}
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  Assign Team
                </Button>
              </CardContent>
            </Card>
          )}

          {isEngineer && isAssignedEngineer && showFabForm && (
            <Card
              ref={fabricationAssignFormRef}
              className="rounded-none border-x-0 border-violet-200 bg-violet-50/30 dark:border-violet-900/60 dark:bg-violet-950/30 sm:rounded-xl sm:border-x"
            >
              <CardContent className="space-y-4 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-200">
                  <Users className="h-4 w-4" />
                  Assign Fabrication Team
                </p>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#6e6e73] dark:text-slate-400">Lead Fabricator *</label>
                  <Select value={fabLeadId} onValueChange={setFabLeadId}>
                    <SelectTrigger className="bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      <SelectValue placeholder="Select lead fabricator" />
                    </SelectTrigger>
                    <SelectContent className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      {fabStaffList?.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#6e6e73] dark:text-slate-400">Assistants (optional)</label>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-[#d2d2d7] bg-white divide-y divide-[#e8e8ed] dark:border-slate-700 dark:bg-slate-900 dark:divide-slate-700">
                    {fabStaffList
                      ?.filter((s) => s._id !== fabLeadId)
                      .map((s) => (
                        <button
                          type="button"
                          key={s._id}
                          onClick={() => toggleAssistant(s._id)}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#f5f5f7] dark:text-slate-100 dark:hover:bg-slate-800',
                            fabAssistantIds.includes(s._id) && 'bg-violet-50 dark:bg-violet-950/40',
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded border',
                              fabAssistantIds.includes(s._id)
                                ? 'border-violet-500 bg-violet-500'
                                : 'border-[#c8c8cd] dark:border-slate-600',
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
                      <p className="px-3 py-2 text-xs text-[#86868b] dark:text-slate-400">No other fabrication staff available</p>
                    )}
                  </div>
                  {fabAssistantIds.length > 0 && (
                    <p className="mt-1 text-xs text-[#6e6e73] dark:text-slate-400">{fabAssistantIds.length} selected</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-violet-600 text-white hover:bg-violet-700 dark:bg-none dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_34px_rgba(0,0,0,0.34)]"
                    onClick={handleAssignFabrication}
                    disabled={assignFabrication.isPending || !fabLeadId}
                  >
                    {assignFabrication.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Assign Team
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFabForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team (moved from Details tab) */}
          {isStaff && (
            <DetailSectionCard
              title="Team & Ownership"
              icon={Users}
              className="lg:col-span-2"
              action={(
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTeamOwnershipCollapsed((prev) => !prev)}
                  className="h-9 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  {isTeamOwnershipCollapsed ? 'Show' : 'Hide'}
                  {isTeamOwnershipCollapsed ? <ChevronDown className="ml-1.5 h-4 w-4" /> : <ChevronUp className="ml-1.5 h-4 w-4" />}
                </Button>
              )}
            >
              {isTeamOwnershipCollapsed ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Collapsed. Expand to view team assignments.</p>
              ) : (
                <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailField label="Sales Staff">
                    <p>{currentSalesStaffName}</p>
                  </DetailField>

                  <DetailField label="Engineers">
                    {project.engineerIds.length > 0 ? (
                      <div className="mt-1 space-y-2">
                        {project.engineerIds.map((eng: any) => (
                          <div key={String(eng._id || eng)} className="flex flex-wrap items-center gap-2">
                            <p className="text-sm">{eng.firstName ? `${eng.firstName} ${eng.lastName}` : String(eng)}</p>
                            {eng.phone && (
                              <a
                                href={`tel:${eng.phone}`}
                                className="inline-flex items-center gap-1 text-xs text-sky-700 hover:text-sky-900 dark:text-sky-200 dark:hover:text-sky-100"
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
                        <p className="text-sm italic text-slate-500 dark:text-slate-400">Not assigned yet</p>
                      </div>
                    )}
                  </DetailField>

                  <DetailField label="Fabrication Lead">
                    {hasFabLead ? (
                      <p>{(project.fabricationLeadId as any).firstName} {(project.fabricationLeadId as any).lastName}</p>
                    ) : (
                      <p className="text-sm italic text-slate-500 dark:text-slate-400">Not assigned yet</p>
                    )}
                  </DetailField>

                  <DetailField label="Fabrication Assistants">
                    {project.fabricationAssistantIds.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {project.fabricationAssistantIds.map((a: any) => (
                          <p key={String(a._id || a)} className="text-sm">
                            {a.firstName ? `${a.firstName} ${a.lastName}` : String(a)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-slate-500 dark:text-slate-400">Not assigned yet</p>
                    )}
                  </DetailField>
                </div>

                {canReassignProjectSales && (
                  <div className="rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/30 p-4 space-y-4">
                    <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Reassign Sales Staff
                    </p>

                    <div>
                      <label className="text-xs font-medium text-[#6e6e73] dark:text-slate-400 block mb-1">Sales Staff</label>
                      <Select value={selectedSalesStaffId} onValueChange={setSelectedSalesStaffId}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                          <SelectValue placeholder="Select replacement sales staff" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
                          {salesStaffList.map((staff) => (
                            <SelectItem
                              key={staff._id}
                              value={staff._id}
                              disabled={isAvailabilityBlocked(staff.availabilityStatus)}
                            >
                              {staff.firstName} {staff.lastName} ({availabilityLabel(staff.availabilityStatus)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      size="sm"
                      className="bg-cyan-700 text-white hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                      onClick={handleReassignProjectSales}
                      disabled={
                        reassignProjectSales.isPending
                        || !selectedSalesStaffId
                        || selectedSalesStaffId === currentSalesStaffId
                      }
                    >
                      {reassignProjectSales.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      Reassign Sales Staff
                    </Button>
                  </div>
                )}
                </>
              )}
            </DetailSectionCard>
          )}

          <Suspense fallback={<TabPanelFallback message="Loading fabrication updates, assignments, and delivery milestones." />}>
            <LazyFabricationTab
              projectId={id!}
              projectItemId={activeProjectItemRecord?._id}
              projectStatus={project.status}
              installationConfirmedAt={
                activeProjectItemRecord?.installationConfirmedAt
                  || (!project.items?.length ? project?.installationConfirmedAt : undefined)
              }
              canViewUpdates={canViewFabrication}
              canManageUpdates={canManageFabrication}
              showAssignmentNotice={showFabricationAssignmentNotice}
            />
          </Suspense>
        </div>
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

      <ConfirmDialog
        open={reviewConfirmDecision !== null}
        onOpenChange={(open) => {
          if (!open) setReviewConfirmDecision(null);
        }}
        title={reviewConfirmDecision === 'declined' ? 'Decline Initial Design' : 'Approve Initial Design'}
        description={reviewConfirmDecision === 'declined'
          ? 'This will decline the current initial design, notify sales staff, and require changes before blueprint work can continue. Are you sure?'
          : 'This will approve the initial design and allow engineering to proceed to the next step. Are you sure?'}
        confirmLabel={reviewConfirmDecision === 'declined' ? 'Decline Initial Design' : 'Approve Initial Design'}
        variant={reviewConfirmDecision === 'declined' ? 'destructive' : 'default'}
        confirmClassName={reviewConfirmDecision === 'approved'
          ? 'bg-[linear-gradient(180deg,#2ca36f_0%,#1e7c54_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_24px_rgba(21,98,70,0.24)] hover:bg-[linear-gradient(180deg,#33b47b_0%,#238960_100%)] dark:border dark:border-emerald-600/40 dark:bg-[linear-gradient(180deg,#34c084_0%,#238960_100%)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_14px_28px_rgba(7,58,40,0.28)] dark:hover:bg-[linear-gradient(180deg,#3ad18f_0%,#28976a_100%)]'
          : undefined}
        isLoading={reviewInitialDesign.isPending}
        onConfirm={async () => {
          if (!reviewConfirmDecision) return;
          await handleReviewInitialDesign(reviewConfirmDecision);
          setReviewConfirmDecision(null);
        }}
      >
        {designReviewNotes.trim() ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a7480] dark:text-slate-400">
              Review Notes
            </p>
            <p className="whitespace-pre-wrap text-sm text-[#46515f] dark:text-slate-200">
              {designReviewNotes.trim()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#5b6672] dark:text-slate-300/90">
            No review notes will be attached to this approval.
          </p>
        )}
      </ConfirmDialog>

      <Dialog open={showSkipReviewDialog} onOpenChange={setShowSkipReviewDialog}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skip project review?</DialogTitle>
            <DialogDescription>
              You can skip now, or leave a short note to help our internal team improve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="skip-project-review-reason" className="text-xs font-medium">Reason (optional)</Label>
            <Textarea
              id="skip-project-review-reason"
              value={projectReviewSkipReason}
              onChange={(event) => setProjectReviewSkipReason(event.target.value)}
              placeholder="Example: Busy right now, will review later"
              className="min-h-[90px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setShowSkipReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-lg"
              onClick={handleSkipProjectReview}
              disabled={skipProjectReview.isPending}
            >
              {skipProjectReview.isPending ? 'Saving...' : 'Skip Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
