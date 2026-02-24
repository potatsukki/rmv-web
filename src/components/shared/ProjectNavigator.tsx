import { useState } from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  ServiceType,
  SERVICE_TYPE_LABELS,
  VisitReportStatus,
} from '@/lib/constants';
import type { VisitReport } from '@/lib/types';
import {
  useVisitReportsByAppointment,
  useCreateVisitReport,
} from '@/hooks/useVisitReports';

/* ── Icon mapping (mirrors ServiceTypePicker) ── */
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

const STATUS_DOT: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'bg-gray-400',
  [VisitReportStatus.SUBMITTED]: 'bg-blue-500',
  [VisitReportStatus.RETURNED]: 'bg-orange-500',
  [VisitReportStatus.COMPLETED]: 'bg-emerald-500',
};

const STATUS_SHORT: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'Draft',
  [VisitReportStatus.SUBMITTED]: 'Submitted',
  [VisitReportStatus.RETURNED]: 'Returned',
  [VisitReportStatus.COMPLETED]: 'Completed',
};

interface ProjectNavigatorProps {
  appointmentId: string;
  activeReportId: string;
  canAdd?: boolean;
}

export function ProjectNavigator({
  appointmentId,
  activeReportId,
  canAdd = false,
}: ProjectNavigatorProps) {
  const navigate = useNavigate();
  const { data: siblings } = useVisitReportsByAppointment(appointmentId);
  const createMutation = useCreateVisitReport();
  const [adding, setAdding] = useState(false);

  const reports: VisitReport[] = siblings ?? [];

  // Don't render the strip when there's only 1 report and the user can't add
  if (reports.length <= 1 && !canAdd) return null;

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const newReport = await createMutation.mutateAsync({
        appointmentId,
        serviceType: ServiceType.CUSTOM,
      });
      toast.success('New project added');
      navigate(`/visit-reports/${newReport._id}`);
    } catch {
      toast.error('Failed to add project');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="w-full">
      {/* Label */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-0.5">
        Projects for this appointment ({reports.length})
      </p>

      {/* Scrollable strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory no-scrollbar">
        {reports.map((report, idx) => {
          const isActive = String(report._id) === String(activeReportId);
          const Icon = SERVICE_ICONS[report.serviceType] ?? Wrench;
          const label =
            report.serviceTypeCustom ||
            SERVICE_TYPE_LABELS[report.serviceType] ||
            'Custom';

          return (
            <button
              type="button"
              key={String(report._id)}
              onClick={() => {
                if (!isActive) navigate(`/visit-reports/${report._id}`);
              }}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 snap-start shrink-0',
                'min-w-[140px] max-w-[200px] sm:min-w-[160px] sm:max-w-[220px]',
                isActive
                  ? 'border-orange-300 bg-orange-50 shadow-sm ring-1 ring-orange-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
              )}
            >
              {/* Icon container */}
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-[13px] font-semibold leading-tight truncate',
                    isActive ? 'text-orange-900' : 'text-gray-800',
                  )}
                >
                  {label}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      STATUS_DOT[report.status] ?? 'bg-gray-300',
                    )}
                  />
                  <span className="text-[11px] text-gray-500 leading-none">
                    {STATUS_SHORT[report.status] ?? report.status}
                  </span>
                </div>
              </div>

              {/* Index badge */}
              <span
                className={cn(
                  'absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300',
                )}
              >
                {idx + 1}
              </span>
            </button>
          );
        })}

        {/* Add button */}
        {canAdd && (
          <button
            type="button"
            disabled={adding}
            onClick={handleAdd}
            className={cn(
              'flex items-center gap-2 rounded-xl border-2 border-dashed px-4 py-2.5 transition-all snap-start shrink-0',
              'min-w-[140px] sm:min-w-[160px]',
              'border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50',
              adding && 'opacity-60 pointer-events-none',
            )}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="text-[13px] font-semibold whitespace-nowrap">
              Add Project
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
