import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
  {
    variants: {
      color: {
        gray: 'bg-gray-100 text-gray-600',
        blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/50',
        green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/50',
        yellow: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/50',
        red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/50',
        purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200/50',
        orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200/50',
        indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200/50',
        cyan: 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200/50',
      },
    },
    defaultVariants: {
      color: 'gray',
    },
  },
);

type StatusColor = NonNullable<VariantProps<typeof statusBadgeVariants>['color']>;

const STATUS_COLOR_MAP: Record<string, StatusColor> = {
  // Appointment
  requested: 'yellow',
  pending: 'yellow',
  confirmed: 'blue',
  completed: 'green',
  cancelled: 'red',
  no_show: 'gray',
  reschedule_requested: 'orange',

  // Project
  draft: 'gray',
  submitted: 'blue',
  blueprint: 'purple',
  approved: 'green',
  payment_pending: 'yellow',
  fabrication: 'orange',

  // Blueprint
  uploaded: 'yellow',
  revision_uploaded: 'yellow',
  revision_requested: 'orange',

  // Payment
  proof_submitted: 'blue',
  verified: 'green',
  declined: 'red',

  // Fabrication
  queued: 'gray',
  material_prep: 'blue',
  cutting: 'cyan',
  welding: 'orange',
  finishing: 'purple',
  quality_check: 'indigo',
  ready_for_delivery: 'yellow',
  done: 'green',

  // Cash
  received: 'green',
  discrepancy: 'red',

  // Visit Report
  returned: 'orange',
  // draft, submitted, completed already defined above
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = STATUS_COLOR_MAP[status] || 'gray';

  return (
    <span className={cn(statusBadgeVariants({ color }), className)}>
      {formatStatus(status)}
    </span>
  );
}
