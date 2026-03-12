import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Fence,
  Grid3x3,
  DoorOpen,
  Armchair,
  ChefHat,
  Utensils,
  BookOpen,
  Frame,
  Umbrella,
  ArrowUpFromLine,
  PenTool,
  Wrench,
  Layers,
  DoorClosed,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  ServiceType,
  SERVICE_TYPE_LABELS,
  VisitReportStatus,
} from '@/lib/constants';
import type { VisitReport } from '@/lib/types';
import {
  useVisitReportsByAppointment,
  useCreateVisitReport,
  useUpdateVisitReport,
  useDeleteVisitReport,
} from '@/hooks/useVisitReports';

/* ── Icon mapping ── */
const SERVICE_ICONS: Record<string, LucideIcon> = {
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

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  [VisitReportStatus.DRAFT]: {
    dot: 'bg-gray-400 dark:bg-slate-400',
    bg: 'bg-gray-50 dark:bg-white/[0.08] dark:ring-1 dark:ring-white/[0.08]',
    text: 'text-gray-500 dark:text-slate-200',
  },
  [VisitReportStatus.SUBMITTED]: {
    dot: 'bg-blue-500 dark:bg-sky-400',
    bg: 'bg-blue-50 dark:bg-sky-500/15 dark:ring-1 dark:ring-sky-400/20',
    text: 'text-blue-600 dark:text-sky-200',
  },
  [VisitReportStatus.RETURNED]: {
    dot: 'bg-orange-500 dark:bg-amber-400',
    bg: 'bg-orange-50 dark:bg-amber-500/15 dark:ring-1 dark:ring-amber-400/20',
    text: 'text-orange-600 dark:text-amber-200',
  },
  [VisitReportStatus.COMPLETED]: {
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/15 dark:ring-1 dark:ring-emerald-400/20',
    text: 'text-emerald-600 dark:text-emerald-200',
  },
};

const STATUS_SHORT: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'Draft',
  [VisitReportStatus.SUBMITTED]: 'Submitted',
  [VisitReportStatus.RETURNED]: 'Returned',
  [VisitReportStatus.COMPLETED]: 'Completed',
};

function getLabel(report: VisitReport): string {
  return (
    report.serviceTypeCustom ||
    SERVICE_TYPE_LABELS[report.serviceType] ||
    'Untitled Project'
  );
}

/* ── Inline rename input ── */
function InlineRename({
  reportId,
  currentLabel,
  onDone,
}: {
  reportId: string;
  currentLabel: string;
  onDone: () => void;
}) {
  const [value, setValue] = useState(currentLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateVisitReport();

  useEffect(() => {
    // Auto-focus & select on mount
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const save = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentLabel) {
      onDone();
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: reportId,
        serviceType: ServiceType.CUSTOM,
        serviceTypeCustom: trimmed,
      });
      toast.success('Renamed');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to rename'));
    }
    onDone();
  }, [value, currentLabel, reportId, updateMutation, onDone]);

  return (
    <div className="flex items-center gap-1 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') onDone();
        }}
        className="w-full min-w-0 rounded-md border border-[#c8c8cd] bg-white px-2 py-0.5 text-[13px] font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#6e6e73]/20 dark:border-[#2f4563] dark:bg-[#162235] dark:text-slate-100 dark:focus:ring-[#4f7097]/20"
        maxLength={60}
      />
      <button
        type="button"
        onClick={save}
        disabled={updateMutation.isPending}
        className="shrink-0 rounded-md p-1 text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
        aria-label="Save name"
      >
        {updateMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-white/[0.06]"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Main component ── */

interface ProjectNavigatorProps {
  appointmentId: string;
  activeReportId: string;
  canAdd?: boolean;
  canEdit?: boolean;
  onBeforeNavigate?: (nextReportId: string) => Promise<boolean>;
}

export function ProjectNavigator({
  appointmentId,
  activeReportId,
  canAdd = false,
  canEdit = false,
  onBeforeNavigate,
}: ProjectNavigatorProps) {
  const navigate = useNavigate();
  const { data: siblings } = useVisitReportsByAppointment(appointmentId);
  const createMutation = useCreateVisitReport();
  const deleteMutation = useDeleteVisitReport();
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VisitReport | null>(null);

  const reports: VisitReport[] = siblings ?? [];

  // Don't render when there's only 1 report and the user can't add more
  if (reports.length <= 1 && !canAdd) return null;

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const newReport = await createMutation.mutateAsync({
        appointmentId,
        serviceType: ServiceType.CUSTOM,
      });
      toast.success('New project added — give it a name!');
      navigate(`/visit-reports/${newReport._id}`);
      // Auto-open rename for the new card after navigation
      setTimeout(() => setRenamingId(String(newReport._id)), 300);
    } catch {
      toast((t) => (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-gray-900">
            The appointment must be marked as complete first before adding projects.
          </p>
          <button
            type="button"
            onClick={() => { toast.dismiss(t.id); navigate(`/appointments/${appointmentId}`); }}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 text-left"
          >
            Go to Appointment →
          </button>
        </div>
      ), { duration: 6000, icon: '⚠️' });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const targetId = String(deleteTarget._id);
    const currentIndex = reports.findIndex((r) => String(r._id) === targetId);
    const remaining = reports.filter((r) => String(r._id) !== targetId);
    const nextReport =
      remaining[Math.max(0, Math.min(currentIndex, remaining.length - 1))];

    try {
      await deleteMutation.mutateAsync(targetId);
      toast.success('Project removed');
      setDeleteTarget(null);

      if (String(activeReportId) === targetId) {
        if (nextReport) {
          navigate(`/visit-reports/${nextReport._id}`);
        } else {
          navigate('/visit-reports');
        }
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to remove project'));
    }
  };

  const handleNavigate = async (nextReportId: string) => {
    if (nextReportId === String(activeReportId)) return;
    if (onBeforeNavigate) {
      const shouldNavigate = await onBeforeNavigate(nextReportId);
      if (!shouldNavigate) return;
    }
    navigate(`/visit-reports/${nextReportId}`);
  };

  return (
    <div className="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.26)] sm:p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
          Projects ({reports.length})
        </p>
        {canAdd && (
          <button
            type="button"
            disabled={adding}
            onClick={handleAdd}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              'bg-[#f0f0f5] text-[#1d1d1f] hover:bg-[#e4e4e9] active:scale-[0.97] dark:border dark:border-white/10 dark:bg-[#182437] dark:text-slate-100 dark:hover:bg-[#213148]',
              adding && 'opacity-50 pointer-events-none',
            )}
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add Project
          </button>
        )}
      </div>

      {/* Cards strip */}
      <div className="flex gap-3 overflow-x-auto overflow-y-visible pb-1 -mx-0.5 px-0.5 snap-x snap-mandatory no-scrollbar">
        {reports.map((report, idx) => {
          const id = String(report._id);
          const isActive = id === String(activeReportId);
          const isRenaming = renamingId === id;
          const canDeleteThisReport =
            canEdit
            && reports.length > 1
            && [VisitReportStatus.DRAFT, VisitReportStatus.RETURNED].includes(report.status as VisitReportStatus);
          const Icon = SERVICE_ICONS[report.serviceType] ?? Wrench;
          const label = getLabel(report);
          const style = STATUS_STYLES[report.status] ?? { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-500' };

          return (
            <div
              role="button"
              tabIndex={0}
              key={id}
              onClick={async () => {
                if (isRenaming) return;
                if (!isActive) await handleNavigate(id);
              }}
              onKeyDown={async (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (!isRenaming && !isActive) await handleNavigate(id);
                }
              }}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl border text-left transition-all duration-200 snap-start shrink-0',
                'min-w-[180px] max-w-[280px] sm:min-w-[200px] sm:max-w-[300px]',
                'px-4 py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e6e73]/30',
                isActive && canEdit ? 'pb-10' : '',
                isActive
                  ? 'border-[#1d1d1f]/30 bg-gradient-to-br from-[#f0f0f5] to-white shadow-md ring-1 ring-[#c8c8cd]/60 dark:border-[#456182] dark:bg-[linear-gradient(135deg,rgba(28,42,64,1)_0%,rgba(18,28,43,1)_100%)] dark:ring-[#5b7699]/30'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm active:scale-[0.98] dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-[#39577a] dark:hover:bg-white/[0.05]',
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-[#1d1d1f] text-white dark:bg-[#20324a] dark:text-[#d7e8fb]'
                    : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-500 dark:bg-[#162235] dark:text-slate-500 dark:group-hover:bg-[#1d2d45] dark:group-hover:text-slate-300',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Label + status */}
              {isRenaming ? (
                <InlineRename
                  reportId={id}
                  currentLabel={label}
                  onDone={() => setRenamingId(null)}
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p
                      className={cn(
                        'text-sm font-semibold leading-tight truncate',
                        isActive ? 'text-[#1d1d1f] dark:text-slate-100' : 'text-gray-800 dark:text-slate-200',
                      )}
                    >
                      {label}
                    </p>
                  </div>
                  {/* Status pill */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5',
                        style.bg,
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                      <span className={cn('text-[10px] font-medium leading-none', style.text)}>
                        {STATUS_SHORT[report.status] ?? report.status}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons — bottom-right, only on active + editable */}
              {isActive && canEdit && !isRenaming && (
                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(id);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0f0f5] text-[#1d1d1f] transition-colors hover:bg-[#e4e4e9] hover:text-[#1d1d1f] dark:bg-[#182437] dark:text-slate-200 dark:hover:bg-[#213148] dark:hover:text-white"
                    aria-label="Rename project"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {canDeleteThisReport && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(report);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-colors hover:bg-red-200 hover:text-red-700 dark:bg-[#341c1d] dark:text-[#f4d0cb] dark:hover:bg-[#482628] dark:hover:text-[#ffe1dc]"
                      aria-label="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Index badge — inside card, top-right */}
              {reports.length > 1 && (
                <span
                  className={cn(
                    'absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    isActive
                      ? 'bg-[#1d1d1f] text-white dark:bg-[#20324a] dark:text-[#d7e8fb]'
                      : 'bg-gray-200 text-gray-600 dark:bg-[#162235] dark:text-slate-400',
                  )}
                >
                  {idx + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Project"
        description="This removes this project report from the appointment. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
