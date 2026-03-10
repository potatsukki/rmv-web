import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
  {
    variants: {
      color: {
        gray: 'border-[#c6ccd3] bg-[linear-gradient(180deg,#eef2f5_0%,#dde3e8_100%)] text-[#5b6470]',
        blue: 'border-[#8da4b8] bg-[linear-gradient(180deg,#eef4f9_0%,#d8e4ee_100%)] text-[#4f6679]',
        green: 'border-[#93ad9d] bg-[linear-gradient(180deg,#eef6f1_0%,#dceade_100%)] text-[#4e6c5a]',
        yellow: 'border-[#c7aa7a] bg-[linear-gradient(180deg,#f8f0e5_0%,#ebdcc6_100%)] text-[#7e6239]',
        red: 'border-[#cb8b86] bg-[linear-gradient(180deg,#fbefed_0%,#efd7d4_100%)] text-[#87544f]',
        purple: 'border-[#afa7c5] bg-[linear-gradient(180deg,#f2f1f8_0%,#e0dced_100%)] text-[#665d82]',
        orange: 'border-[#c4a07d] bg-[linear-gradient(180deg,#f8f1e9_0%,#ecdcc8_100%)] text-[#7b5d3f]',
        indigo: 'border-[#98a6c4] bg-[linear-gradient(180deg,#eff1f9_0%,#dce2f0_100%)] text-[#5b6785]',
        cyan: 'border-[#8eafbb] bg-[linear-gradient(180deg,#eef7f8_0%,#d8eaee_100%)] text-[#4f6d78]',
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
  preparing: 'indigo',
  on_the_way: 'cyan',
  completed: 'green',
  cancelled: 'red',
  no_show: 'gray',
  reschedule_requested: 'orange',
  ready_for_ocular: 'purple',
  awaiting_payment: 'orange',

  // Project
  draft: 'gray',
  submitted: 'blue',
  blueprint: 'purple',
  approved: 'green',
  payment_pending: 'yellow',
  fabrication: 'orange',
  active: 'blue',

  // Blueprint
  uploaded: 'yellow',
  revision_uploaded: 'yellow',
  revision_requested: 'orange',

  // Payment
  proof_submitted: 'blue',
  verified: 'green',
  declined: 'red',
  awaiting_proof: 'yellow',
  refunded: 'purple',

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
  cash_pending: 'yellow',

  // Visit Report
  returned: 'orange',
  // draft, submitted, completed already defined above
};

const STATUS_LABEL_OVERRIDE: Record<string, string> = {
  proof_submitted: 'Awaiting Verification',
  requested: 'Awaiting Confirmation',
  payment_pending: 'Payment Required',
  fabrication: 'In Fabrication',
  cash_pending: 'Cash to Collect',
  awaiting_payment: 'Awaiting Ocular Fee',
  ready_for_ocular: 'Ready for Ocular',
  reschedule_requested: 'Reschedule Requested',
  no_show: 'No Show',
  returned: 'Returned for Revision',
  awaiting_proof: 'Waiting for Proof',
};

function formatStatus(status: string): string {
  if (STATUS_LABEL_OVERRIDE[status]) return STATUS_LABEL_OVERRIDE[status];
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  className?: string;
  label?: string;
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const color = STATUS_COLOR_MAP[status] || 'gray';

  return (
    <span className={cn(statusBadgeVariants({ color }), className)}>
      {label || formatStatus(status)}
    </span>
  );
}
