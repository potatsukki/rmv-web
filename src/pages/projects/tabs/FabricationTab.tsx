import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Hammer,
  Plus,
  Clock,
  User,
  Paperclip,
  Lock,
  CreditCard,
  Pencil,
  Trash2,
  PackageCheck,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Scissors,
  Wrench,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { resolveBlockedAction, type BlockedActionInfo } from '@/lib/blocked-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthImage } from '@/components/shared/AuthImage';
import { BlockedActionPrompt } from '@/components/shared/BlockedActionPrompt';
import { openAuthenticatedFile } from '@/hooks/useUploads';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileUpload } from '@/components/shared/FileUpload';

import {
  useFabricationUpdates,
  useCreateFabricationUpdate,
  useUpdateFabricationUpdate,
  useDeleteFabricationUpdate,
  useFabricationStatus,
} from '@/hooks/useFabrication';
import { useConfirmInstallation, useProject } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { connectSocket } from '@/lib/socket';
import { DeliveryType, FabricationStatus, Role } from '@/lib/constants';
import type { ProjectItem } from '@/lib/types';

interface FabricationTabProps {
  projectId: string;
  projectItemId?: string;
  projectStatus: string;
  installationConfirmedAt?: string;
  canViewUpdates: boolean;
  canManageUpdates: boolean;
  showAssignmentNotice: boolean;
}

const SHOP_FABRICATION_STEP_MARKERS: Array<{ key: string; label: string }> = [
  { key: FabricationStatus.MATERIAL_PREP, label: 'Material Prep' },
  { key: FabricationStatus.CUTTING, label: 'Cutting' },
  { key: FabricationStatus.WELDING, label: 'Welding' },
  { key: FabricationStatus.ASSEMBLY, label: 'Assembly' },
  { key: FabricationStatus.FINISHING, label: 'Finishing' },
  { key: FabricationStatus.QUALITY_CHECK, label: 'Quality Check' },
  { key: FabricationStatus.READY_FOR_DELIVERY, label: 'Ready for Delivery' },
  { key: FabricationStatus.DONE, label: 'Done' },
];

const ON_SITE_INSTALLATION_STEP_MARKERS: Array<{ key: string; label: string }> = [
  { key: FabricationStatus.SITE_PREPARATION, label: 'Site Preparation' },
  { key: FabricationStatus.MEASUREMENT_LAYOUT, label: 'Measurement / Layout' },
  { key: FabricationStatus.MATERIAL_PREP, label: 'Material Prep' },
  { key: FabricationStatus.FABRICATION_INSTALLATION, label: 'Fabrication / Installation' },
  { key: FabricationStatus.WELDING_ASSEMBLY, label: 'Welding / Assembly' },
  { key: FabricationStatus.FINISHING, label: 'Finishing' },
  { key: FabricationStatus.QUALITY_CHECK, label: 'Quality Check' },
  { key: FabricationStatus.TURNOVER, label: 'Turnover' },
];

function getFabricationStepMarkers(deliveryType?: string) {
  return deliveryType === DeliveryType.ON_SITE_INSTALLATION
    ? ON_SITE_INSTALLATION_STEP_MARKERS
    : SHOP_FABRICATION_STEP_MARKERS;
}

const WORKSTREAMS_BREAKPOINTS = {
  desktop: 1280,
  tablet: 768,
};

const lifecycleIconByStatus: Record<string, ComponentType<{ className?: string }>> = {
  [FabricationStatus.MATERIAL_PREP]: Boxes,
  [FabricationStatus.SITE_PREPARATION]: Wrench,
  [FabricationStatus.MEASUREMENT_LAYOUT]: Scissors,
  [FabricationStatus.CUTTING]: Scissors,
  [FabricationStatus.WELDING]: Wrench,
  [FabricationStatus.ASSEMBLY]: Hammer,
  [FabricationStatus.FABRICATION_INSTALLATION]: Hammer,
  [FabricationStatus.WELDING_ASSEMBLY]: Wrench,
  [FabricationStatus.FINISHING]: Pencil,
  [FabricationStatus.QUALITY_CHECK]: ShieldCheck,
  [FabricationStatus.READY_FOR_DELIVERY]: Truck,
  [FabricationStatus.TURNOVER]: CheckCircle2,
  [FabricationStatus.DONE]: CheckCircle2,
};

const formatFabricationStatus = (value?: string) =>
  (value || FabricationStatus.QUEUED).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

function itemTitle(item: ProjectItem) {
  return item.title || item.serviceTypeCustom || item.serviceType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusFromProjectItem(item: ProjectItem) {
  if (item.status === 'completed') return FabricationStatus.DONE;
  if (item.status === 'fabrication') return FabricationStatus.MATERIAL_PREP;
  return FabricationStatus.QUEUED;
}

function FabricationItemStatusCard({
  projectId,
  item,
  index,
  selected,
  canViewUpdates,
  onSelect,
}: {
  projectId: string;
  item: ProjectItem;
  index: number;
  selected: boolean;
  canViewUpdates: boolean;
  onSelect: (itemId: string) => void;
}) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { data, isLoading } = useFabricationStatus(projectId, canViewUpdates, item._id);
  const currentStatus = data?.currentStatus || statusFromProjectItem(item);
  const fabricationStepMarkers = getFabricationStepMarkers(data?.deliveryType);
  const stepIndex = fabricationStepMarkers.findIndex((step) => step.key === currentStatus);
  const progress = stepIndex >= 0 ? Math.round(((stepIndex + 1) / fabricationStepMarkers.length) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(item._id)}
      className={`h-full min-h-[162px] w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? isDark
            ? 'border-sky-400/50 bg-sky-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_34px_rgba(2,132,199,0.14)]'
            : 'border-sky-300 bg-sky-50 shadow-sm'
          : isDark
            ? 'border-slate-800 bg-slate-950/55 hover:border-slate-600 hover:bg-slate-900/70'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-50' : 'text-slate-950'}`}>
            {itemTitle(item)}
          </p>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Item {index + 1}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
          selected
            ? isDark ? 'bg-sky-400/15 text-sky-100' : 'bg-sky-100 text-sky-800'
            : isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'
        }`}>
          {isLoading ? 'Loading' : formatFabricationStatus(currentStatus)}
        </span>
      </div>

      <div className={`mt-4 h-2 overflow-hidden rounded-full ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
        <div
          className={`h-full rounded-full ${currentStatus === FabricationStatus.DONE ? 'bg-emerald-400' : 'bg-sky-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {data?.latestUpdate?.notes || 'No workshop update yet'}
        </p>
        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {progress}%
        </span>
      </div>
    </button>
  );
}

export function FabricationTab({
  projectId,
  projectItemId,
  projectStatus,
  installationConfirmedAt,
  canViewUpdates,
  canManageUpdates,
  showAssignmentNotice,
}: FabricationTabProps) {
  const { user, accessToken } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>(FabricationStatus.MATERIAL_PREP);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(projectItemId || '');

  // Edit / delete state
  const [editingUpdate, setEditingUpdate] = useState<{
    _id: string; notes: string; photoKeys: string[]; createdBy: string; status: string;
  } | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPhotoKeys, setEditPhotoKeys] = useState<string[]>([]);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);

  // Upload-in-progress guards
  const [uploading, setUploading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [blockedAction, setBlockedAction] = useState<BlockedActionInfo | null>(null);
  const [carouselPage, setCarouselPage] = useState(0);
  const [baseCardsPerPage, setBaseCardsPerPage] = useState(4);

  const { data: project } = useProject(projectId);
  const projectItems = useMemo(() => project?.items || [], [project?.items]);
  const selectedFabricationItemId = useMemo(() => {
    if (!projectItems.length) return projectItemId;
    if (selectedItemId && projectItems.some((item) => item._id === selectedItemId)) return selectedItemId;
    if (projectItemId && projectItems.some((item) => item._id === projectItemId)) return projectItemId;
    return projectItems[0]?._id;
  }, [projectItems, projectItemId, selectedItemId]);
  const { data: fabricationStatus } = useFabricationStatus(projectId, canViewUpdates, selectedFabricationItemId);
  const selectedItem = projectItems.find((item) => item._id === selectedFabricationItemId);
  const selectedItemLabel = selectedItem ? itemTitle(selectedItem) : 'Project';
  const hasLifecyclePanel = Boolean(fabricationStatus?.currentStatus);
  const cardsPerPage = useMemo(() => {
    // In split mode (workstreams + lifecycle side-by-side), cap cards to keep each tile readable.
    if (hasLifecyclePanel) return Math.min(baseCardsPerPage, 2);
    return baseCardsPerPage;
  }, [baseCardsPerPage, hasLifecyclePanel]);
  const totalWorkstreamPages = Math.max(1, Math.ceil(projectItems.length / cardsPerPage));
  const canSlideWorkstreams = projectItems.length > cardsPerPage;
  const visibleWorkstreams = useMemo(() => {
    const start = carouselPage * cardsPerPage;
    return projectItems.slice(start, start + cardsPerPage);
  }, [projectItems, carouselPage, cardsPerPage]);

  useEffect(() => {
    if (projectItemId) setSelectedItemId(projectItemId);
  }, [projectItemId]);

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth >= WORKSTREAMS_BREAKPOINTS.desktop) {
        setBaseCardsPerPage(4);
        return;
      }
      if (window.innerWidth >= WORKSTREAMS_BREAKPOINTS.tablet) {
        setBaseCardsPerPage(2);
        return;
      }
      setBaseCardsPerPage(1);
    };

    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  useEffect(() => {
    setCarouselPage((prev) => Math.min(prev, Math.max(0, totalWorkstreamPages - 1)));
  }, [totalWorkstreamPages]);

  const {
    data: updates,
    isLoading,
    isError,
    refetch,
  } = useFabricationUpdates(projectId, canViewUpdates, selectedFabricationItemId);

  // ── Live updates via WebSocket ──
  useEffect(() => {
    if (!projectId) return;
    const sock = connectSocket(accessToken);
    if (!sock) return;

    const handleFabricationUpdate = (data: { projectId: string }) => {
      if (data.projectId !== projectId) return;
      queryClient.invalidateQueries({ queryKey: ['fabrication', 'project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['fabrication', 'status', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    sock.on('fabrication:update', handleFabricationUpdate);

    return () => {
      sock.off('fabrication:update', handleFabricationUpdate);
    };
  }, [projectId, queryClient, accessToken]);

  const addUpdateMutation = useCreateFabricationUpdate();
  const updateMutation = useUpdateFabricationUpdate(projectId);
  const deleteMutation = useDeleteFabricationUpdate(projectId);
  const confirmInstallationMutation = useConfirmInstallation();
  const isProjectInFabrication = projectStatus === 'fabrication';

  const canAddUpdate = isProjectInFabrication && canManageUpdates;
  const isCustomer = user?.roles.some((r: string) => r === Role.CUSTOMER);

  if (!canViewUpdates) {
    return (
      <Card className="metal-panel-strong rounded-xl border-amber-500/30 bg-amber-500/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {showAssignmentNotice ? 'You are not assigned to this project' : 'Fabrication updates are unavailable'}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {showAssignmentNotice
                ? 'Only the assigned fabrication team can view or post workshop updates for this project.'
                : 'You do not currently have access to this project’s fabrication timeline.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deliveryType = fabricationStatus?.deliveryType || project?.deliveryType || DeliveryType.SHOP_FABRICATED;
  const fabricationStepMarkers = getFabricationStepMarkers(deliveryType);
  const terminalStatus = deliveryType === DeliveryType.ON_SITE_INSTALLATION
    ? FabricationStatus.TURNOVER
    : FabricationStatus.DONE;
  const confirmationGateStatus = fabricationStatus?.confirmationGateStatus;
  const installationConfirmed = Boolean(
    selectedItem?.installationConfirmedAt
      || (!selectedFabricationItemId && installationConfirmedAt),
  );
  const currentFabricationStepIndex = fabricationStepMarkers.findIndex(
    (step) => step.key === fabricationStatus?.currentStatus,
  );

  const handleConfirmInstallation = async () => {
    try {
      setBlockedAction(null);
      await confirmInstallationMutation.mutateAsync({
        projectId,
        projectItemId: selectedFabricationItemId,
      });
      toast.success('Installation confirmed! The fabrication team will coordinate delivery and installation.', { duration: 5000 });
    } catch (err) {
      setBlockedAction(resolveBlockedAction(err, '/help/projects-fabrication/fabrication-gates-and-payments#overview'));
      toast.error(extractErrorMessage(err, 'Failed to confirm installation'));
    }
  };

  const canManageUpdate = (createdById: string) => {
    const isAdmin = user?.roles.some((r: string) => r === Role.ADMIN);
    const isAuthorStaff = user?._id === createdById && canAddUpdate;
    return !!(isAdmin || isAuthorStaff);
  };

  const allowedStatuses = fabricationStatus?.allowedTransitions || [];

  useEffect(() => {
    if (allowedStatuses.length === 0) return;
    setStatus((prev) => {
      if (allowedStatuses.includes(prev)) {
        const gate = fabricationStatus?.paymentGate?.stageGates?.[prev];
        if (!gate?.blocked) return prev;
      }
      const unblocked = allowedStatuses.find(
        (s) => !fabricationStatus?.paymentGate?.stageGates?.[s]?.blocked,
      );
      return unblocked ?? allowedStatuses[0] ?? prev;
    });
  }, [allowedStatuses, fabricationStatus]);

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error('Please enter update notes');
      return;
    }

    if (!isProjectInFabrication) {
      toast.error('Fabrication updates can only be posted after the project enters the fabrication phase');
      return;
    }

    if (status === confirmationGateStatus && !installationConfirmed) {
      toast.error('The customer must confirm the installation schedule before this stage can begin');
      return;
    }

    try {
      setBlockedAction(null);
      await addUpdateMutation.mutateAsync({
        projectId,
        projectItemId: selectedFabricationItemId,
        status,
        notes,
        photoKeys: photoKeys.length > 0 ? photoKeys : undefined,
      });
      toast.success(
        status === 'done'
          ? 'Fabrication complete! The project is now finished.'
          : 'Update added — the customer has been notified of the progress.',
        { duration: 5000 },
      );
      setUpdateDialogOpen(false);
      setNotes('');
      setPhotoKeys([]);
    } catch (err) {
      setBlockedAction(resolveBlockedAction(err, '/help/projects-fabrication/fabrication-gates-and-payments#overview'));
      toast.error(extractErrorMessage(err, 'Failed to add update'));
    }
  };

  const handleEditUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUpdate || !editNotes.trim()) {
      toast.error('Notes cannot be empty');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingUpdate._id,
        notes: editNotes,
        photoKeys: editPhotoKeys,
      });
      toast.success('Update saved');
      setEditingUpdate(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save update'));
    }
  };

  const handleDeleteUpdate = async () => {
    if (!deletingUpdateId) return;
    try {
      await deleteMutation.mutateAsync(deletingUpdateId);
      toast.success('Update deleted');
      setDeletingUpdateId(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete update'));
    }
  };

  const formatStatus = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const handleViewFile = (key: string) => {
    if (!key) return;
    if (key.startsWith('http')) {
      window.open(key, '_blank');
    } else {
      openAuthenticatedFile(key);
    }
  };

  return (
    <div className="space-y-4">
      {blockedAction && (
        <BlockedActionPrompt
          title={blockedAction.title}
          reason={blockedAction.reason}
          actionLabel={blockedAction.actionLabel}
          actionPath={blockedAction.actionPath}
        />
      )}

      {(projectItems.length > 1 || fabricationStatus?.currentStatus) && (
        <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-xl border-[color:var(--color-border)]/60 dark:border-slate-700`}>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className={`text-lg ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
                  Fabrication Overview & Lifecycle
                </CardTitle>
                <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}`}>
                  {projectItems.length > 1
                    ? `${projectItems.length} item workstreams under this project`
                    : 'Current fabrication stage for this project'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectItems.length > 1 && (
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    Viewing {selectedItemLabel}
                  </span>
                )}
                {fabricationStatus?.currentStatus && (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-[#edf0f4] text-[#1f2b37]'}`}>
                    {currentFabricationStepIndex >= 0
                      ? `Step ${currentFabricationStepIndex + 1} of ${fabricationStepMarkers.length}`
                      : 'Queued'}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`grid gap-4 ${projectItems.length > 1 && fabricationStatus?.currentStatus ? 'xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.35fr)]' : ''}`}>
              {projectItems.length > 1 && (
                <div className="space-y-3">
                  <div className={`grid gap-3 ${cardsPerPage === 1 ? 'grid-cols-1' : cardsPerPage === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                    {visibleWorkstreams.map((item) => {
                      const realIndex = projectItems.findIndex((projectItem) => projectItem._id === item._id);
                      return (
                        <FabricationItemStatusCard
                          key={item._id}
                          projectId={projectId}
                          item={item}
                          index={realIndex}
                          selected={item._id === selectedFabricationItemId}
                          canViewUpdates={canViewUpdates}
                          onSelect={setSelectedItemId}
                        />
                      );
                    })}
                  </div>

                  {canSlideWorkstreams && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={carouselPage === 0}
                          onClick={() => setCarouselPage((prev) => Math.max(0, prev - 1))}
                          className={`${isDark ? 'border-slate-700 bg-slate-900/75 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} h-8 w-8 rounded-full`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={carouselPage >= totalWorkstreamPages - 1}
                          onClick={() => setCarouselPage((prev) => Math.min(totalWorkstreamPages - 1, prev + 1))}
                          className={`${isDark ? 'border-slate-700 bg-slate-900/75 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} h-8 w-8 rounded-full`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalWorkstreamPages }).map((_, pageIndex) => (
                          <button
                            key={pageIndex}
                            type="button"
                            onClick={() => setCarouselPage(pageIndex)}
                            aria-label={`Go to workstream page ${pageIndex + 1}`}
                            className={`h-2.5 rounded-full transition-all ${
                              pageIndex === carouselPage
                                ? 'w-5 bg-sky-500'
                                : isDark
                                  ? 'w-2.5 bg-slate-700 hover:bg-slate-500'
                                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {fabricationStatus?.currentStatus && (
                <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-800 bg-slate-950/45' : 'border-slate-200 bg-white/65'}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>
                      Lifecycle Marker
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                      {formatFabricationStatus(fabricationStatus.currentStatus)}
                    </span>
                  </div>

                  <div className="overflow-x-auto pb-1">
                    <div className="min-w-[700px]">
                      <div className="grid grid-cols-8 gap-0">
                        {fabricationStepMarkers.map((step, idx) => {
                          const isCurrent = step.key === fabricationStatus.currentStatus;
                          const isComplete = currentFabricationStepIndex >= 0 && idx < currentFabricationStepIndex;
                          const isLast = idx === fabricationStepMarkers.length - 1;
                          const StageIcon = lifecycleIconByStatus[step.key] || Hammer;
                          const nodeClass = isCurrent
                            ? isDark
                              ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                              : 'border-sky-300 bg-sky-50 text-sky-700'
                            : isComplete
                              ? isDark
                                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : isDark
                                ? 'border-slate-700 bg-slate-900/70 text-slate-400'
                                : 'border-[#d8dee6] bg-[#f8fafc] text-[#64748b]';
                          const lineClass = isComplete
                            ? isDark ? 'bg-emerald-400/60' : 'bg-emerald-300'
                            : isDark ? 'bg-slate-700' : 'bg-slate-300';

                          return (
                            <div key={step.key} className="relative px-1 text-center">
                              <div className="relative mx-auto mb-2 flex h-12 w-12 items-center justify-center">
                                {!isLast && (
                                  <span className={`absolute left-[calc(100%+6px)] top-1/2 h-[2px] w-[calc(100%-4px)] -translate-y-1/2 ${lineClass}`} />
                                )}
                                <span className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border ${nodeClass}`}>
                                  <StageIcon className="h-4 w-4" />
                                </span>
                              </div>
                              <p className={`text-[11px] leading-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}</span>
                                {step.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {isCustomer && fabricationStatus?.currentStatus === terminalStatus && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/35 dark:bg-emerald-500/10">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Fabrication Complete</p>
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                {deliveryType === DeliveryType.ON_SITE_INSTALLATION
                  ? 'Your project has been installed and turned over. Thank you!'
                  : fabricationStatus?.requiresInstallationConfirmation
                    ? 'Your order has been delivered and installed. Thank you!'
                    : 'Your order has been delivered. Thank you!'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installation Confirmation Banners */}
      {confirmationGateStatus && allowedStatuses.includes(confirmationGateStatus) && !installationConfirmed && isCustomer && (
        <Card className="rounded-xl border-blue-200 bg-blue-50/60 dark:border-blue-500/35 dark:bg-blue-500/10">
          <CardContent className="p-4 flex items-start gap-3">
            <CalendarCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Confirm your installation schedule</p>
              <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
                Please confirm your schedule so our team can proceed with the on-site work.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-[linear-gradient(180deg,#c49a62_0%,#a07d4a_100%)] hover:bg-[linear-gradient(180deg,#d4aa72_0%,#b08d5a_100%)] text-white rounded-xl shrink-0 shadow-[0_2px_8px_rgba(196,154,98,0.3)]"
              disabled={confirmInstallationMutation.isPending}
              onClick={handleConfirmInstallation}
            >
              {confirmInstallationMutation.isPending ? 'Confirming...' : 'Confirm Installation'}
            </Button>
          </CardContent>
        </Card>
      )}

      {confirmationGateStatus && allowedStatuses.includes(confirmationGateStatus) && !installationConfirmed && canAddUpdate && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50 dark:border-amber-500/35 dark:bg-amber-500/10">
          <CardContent className="p-4 flex items-start gap-3">
            <CalendarCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-100">Awaiting Customer Confirmation</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                The customer has been notified and must confirm the installation schedule before you can mark this as Done.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {confirmationGateStatus && allowedStatuses.includes(confirmationGateStatus) && installationConfirmed && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/35 dark:bg-emerald-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <PackageCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-100">
              Customer confirmed the installation schedule — you may proceed to the next stage.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Updates Card */}
      <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-xl border-[color:var(--color-border)]/60 dark:border-slate-700`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
              {selectedItemLabel} Updates
            </CardTitle>
            {projectItems.length > 1 && (
              <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}`}>
                Direct workshop notes, photos, and status changes for this item.
              </p>
            )}
          </div>
          {canAddUpdate && !(confirmationGateStatus && allowedStatuses.includes(confirmationGateStatus) && !installationConfirmed && allowedStatuses.length === 1) && (
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="prominent" className="shrink-0 rounded-xl" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Update
                </Button>
              </DialogTrigger>
              <DialogContent className={`${isDark ? 'bg-slate-950/96 text-slate-100' : 'bg-white text-[var(--color-card-foreground)]'} rounded-2xl border-[color:var(--color-border)]/60 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-md`}>
                <DialogHeader>
                  <DialogTitle className={isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}>Add Fabrication Update</DialogTitle>
                  <DialogDescription className={isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}>
                    Log progress from the workshop floor.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUpdate} className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fab-status" className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>
                      Status
                    </Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className={`${isDark ? 'bg-slate-900/70 text-slate-100 focus:border-slate-500 focus:ring-slate-500/20' : 'bg-white text-[var(--color-card-foreground)] focus:border-[var(--color-ring)] focus:ring-[var(--color-ring)]/20'} h-11 w-full rounded-xl border border-[color:var(--color-border)]/45 focus:ring-2`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className={`${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-[var(--color-card-foreground)]'} border-[color:var(--color-border)]/55`}>
                        {(allowedStatuses.length > 0 ? allowedStatuses : Object.values(FabricationStatus)).map((value) => {
                          const gate = fabricationStatus?.paymentGate?.stageGates?.[value];
                          const isPaymentBlocked = gate?.blocked === true;
                          const isConfirmationBlocked = value === confirmationGateStatus && !installationConfirmed;
                          const isBlocked = isPaymentBlocked || isConfirmationBlocked;
                          return (
                            <SelectItem key={value} value={value} disabled={isBlocked}>
                              <span className="flex items-center gap-2">
                                {isBlocked && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                {formatStatus(value)}
                                {isPaymentBlocked && (
                                  <span className="text-[11px] text-amber-600 font-normal">
                                    ({gate.currentPaid}/{gate.requiredPaid} paid)
                                  </span>
                                )}
                                {isConfirmationBlocked && (
                                  <span className="text-[11px] text-amber-600 font-normal">
                                    (awaiting customer)
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {/* Payment gate warning for selected status */}
                    {fabricationStatus?.paymentGate?.stageGates?.[status]?.blocked && (
                      <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/35 dark:bg-amber-500/10">
                        <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          This stage requires {fabricationStatus.paymentGate.stageGates[status]!.requiredPaid} of {fabricationStatus.paymentGate.totalStages} payment stages to be verified.
                          Currently {fabricationStatus.paymentGate.stageGates[status]!.currentPaid} paid.
                          {fabricationStatus.paymentGate.stageGates[status]!.nextUnpaidLabel && (
                            <> Next: <span className="font-medium">{fabricationStatus.paymentGate.stageGates[status]!.nextUnpaidLabel}</span></>
                          )}
                        </p>
                      </div>
                    )}
                    {/* Payment notification hint */}
                    {status && ['finishing', 'quality_check', 'ready_for_delivery', 'turnover', 'done'].includes(status) && (
                      <div className="mt-1.5 flex items-start gap-2 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2">
                        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                        <p className={`text-xs ${isDark ? 'text-sky-100/90' : 'text-sky-800'}`}>
                          Advancing to this stage will notify the customer about an upcoming or due payment.
                          {['quality_check', 'turnover', 'done'].includes(status)
                            ? ' Their next payment stage will be unlocked for payment.'
                            : ' They\'ll receive a heads-up to prepare their payment.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fab-notes" className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>
                      Progress Notes
                    </Label>
                    <Textarea
                      id="fab-notes"
                      placeholder="Describe work completed..."
                      value={notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                      className={`${isDark ? 'bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:ring-slate-500/20' : 'bg-white text-[var(--color-card-foreground)] placeholder:text-[var(--text-metal-muted-color)] focus:border-[var(--color-ring)] focus:ring-[var(--color-ring)]/20'} min-h-[100px] border-[color:var(--color-border)]/45`}
                    />
                  </div>

                  <FileUpload
                    folder="fabrication"
                    accept="image/*"
                    maxSizeMB={5}
                    maxFiles={10}
                    label="Attach photos (optional)"
                    onUploadComplete={setPhotoKeys}
                    onUploadingChange={setUploading}
                    existingKeys={photoKeys}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setUpdateDialogOpen(false)}
                      className={`${isDark ? 'border-white/12 bg-slate-900/60 text-slate-100 hover:bg-slate-800/80' : 'border-[color:var(--color-border)] bg-white text-[var(--color-card-foreground)] hover:bg-[color:var(--color-muted)]'} rounded-lg`}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addUpdateMutation.isPending || uploading}
                      variant="prominent"
                      className="rounded-lg"
                    >
                      {uploading ? 'Uploading...' : addUpdateMutation.isPending ? 'Posting...' : 'Post Update'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse dark:bg-slate-800" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600">Failed to load updates.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : updates && updates.length > 0 ? (
            <div className="relative ml-4 space-y-12 border-l-2 border-[color:var(--color-border)]/45 pb-4 dark:border-slate-700">
              {updates.map((update) => (
                <div key={String(update._id)} className="relative pl-8">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-slate-200 bg-slate-950 shadow-sm dark:border-slate-200 dark:bg-slate-950" />

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>
                      {format(new Date(update.createdAt), 'MMMM d, yyyy')}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                      <Clock className="h-3 w-3" />
                      {format(new Date(update.createdAt), 'h:mm a')}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                      <User className="h-3 w-3" />
                      {user?._id === update.createdBy
                        ? 'You'
                        : isCustomer
                          ? 'Team Member'
                          : (update.createdByName || 'Team Member')}
                    </span>
                    {canManageUpdate(update.createdBy) && (
                      <div className="ml-auto flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-200"
                          onClick={() => {
                            setEditingUpdate(update);
                            setEditNotes(update.notes);
                            setEditPhotoKeys(update.photoKeys || []);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400"
                          onClick={() => setDeletingUpdateId(String(update._id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={String(update.status)} />
                  </div>

                  <Card className={`${isDark ? 'metal-panel dark:bg-slate-900/85' : 'metal-panel'} rounded-xl border-[color:var(--color-border)]/50 shadow-sm transition-shadow hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_34px_rgba(0,0,0,0.24)] dark:border-slate-700`}>
                    <CardContent className="p-4 space-y-4">
                      <p className={`whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>
                        {update.notes}
                      </p>

                      {/* Attachments Grid */}
                      {update.photoKeys && update.photoKeys.length > 0 && (
                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[color:var(--color-border)]/45 dark:border-slate-700">
                          {update.photoKeys.map((key: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleViewFile(key)}
                              className={`${isDark ? 'bg-slate-900/50 dark:bg-slate-800' : 'bg-[color:var(--color-muted)]'} group relative block aspect-square overflow-hidden rounded-xl border border-[color:var(--color-border)]/50 dark:border-slate-700`}
                            >
                              <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'text-slate-400 dark:text-slate-500' : 'text-[var(--text-metal-muted-color)]'}`}>
                                <Paperclip className="h-6 w-6" />
                              </div>
                              <AuthImage
                                fileKey={key}
                                alt="Attachment"
                                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Hammer className={`mx-auto mb-3 h-10 w-10 ${isDark ? 'text-slate-400 dark:text-slate-500' : 'text-[var(--text-metal-muted-color)]'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>No fabrication updates yet.</p>
              <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}`}>
                Updates will appear here as the fabrication team logs progress.
              </p>
              {canAddUpdate && (
                <Button
                  onClick={() => setUpdateDialogOpen(true)}
                  variant="outline"
                  className={`${isDark ? 'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700' : 'border-[color:var(--color-border)] bg-white text-[var(--color-card-foreground)] hover:bg-[color:var(--color-muted)]'} mt-3 rounded-xl border-gray-200`}
                  size="sm"
                >
                  Log First Update
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Update Dialog ── */}
      <Dialog open={!!editingUpdate} onOpenChange={(open) => { if (!open) setEditingUpdate(null); }}>
        <DialogContent className={`${isDark ? 'bg-slate-950/96 text-slate-100' : 'bg-white text-[var(--color-card-foreground)]'} rounded-2xl border-[color:var(--color-border)]/60 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-md`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}>Edit Update</DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}>
              Edit the notes or photos. Status cannot be changed once posted.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUpdate} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>Progress Notes</Label>
              <Textarea
                placeholder="Describe work completed..."
                value={editNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value)}
                className={`${isDark ? 'bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:ring-slate-500/20' : 'bg-white text-[var(--color-card-foreground)] placeholder:text-[var(--text-metal-muted-color)] focus:border-[var(--color-ring)] focus:ring-[var(--color-ring)]/20'} min-h-[100px] border-[color:var(--color-border)]/45`}
              />
            </div>
            <FileUpload
              folder="fabrication"
              accept="image/*"
              maxSizeMB={5}
              maxFiles={10}
              label="Attach photos (optional)"
              onUploadComplete={setEditPhotoKeys}
              onUploadingChange={setEditUploading}
              existingKeys={editPhotoKeys}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUpdate(null)}
                className={`${isDark ? 'border-white/12 bg-slate-900/60 text-slate-100 hover:bg-slate-800/80' : 'border-[color:var(--color-border)] bg-white text-[var(--color-card-foreground)] hover:bg-[color:var(--color-muted)]'} rounded-lg`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || editUploading}
                variant="prominent"
                className="rounded-lg"
              >
                {editUploading ? 'Uploading...' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingUpdateId} onOpenChange={(open) => { if (!open) setDeletingUpdateId(null); }}>
        <DialogContent className={`${isDark ? 'bg-slate-950/96 text-slate-100' : 'bg-white text-[var(--color-card-foreground)]'} max-w-sm rounded-2xl border-[color:var(--color-border)]/60 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-md`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}>Delete Update?</DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}>
              This will permanently remove the update from the timeline. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingUpdateId(null)}
              className={`${isDark ? 'border-white/12 bg-slate-900/60 text-slate-100 hover:bg-slate-800/80' : 'border-[color:var(--color-border)] bg-white text-[var(--color-card-foreground)] hover:bg-[color:var(--color-muted)]'} rounded-lg`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
              onClick={handleDeleteUpdate}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
