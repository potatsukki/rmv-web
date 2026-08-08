import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
  {
    variants: {
      color: {
        gray: 'border-white/15 bg-white/[0.06] text-slate-300',
        blue: 'border-sky-400/25 bg-sky-400/[0.10] text-sky-200',
        green: 'border-emerald-400/25 bg-emerald-400/[0.10] text-emerald-200',
        yellow: 'border-[#f5b400]/30 bg-[#f5b400]/[0.10] text-[#ffd36b]',
        red: 'border-red-400/25 bg-red-400/[0.10] text-red-200',
        purple: 'border-violet-400/25 bg-violet-400/[0.10] text-violet-200',
        orange: 'border-orange-400/25 bg-orange-400/[0.10] text-orange-200',
        indigo: 'border-indigo-400/25 bg-indigo-400/[0.10] text-indigo-200',
        cyan: 'border-cyan-400/25 bg-cyan-400/[0.10] text-cyan-200',
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
  arrived_at_site: 'cyan',
  completed: 'green',
  cancelled: 'red',
  no_show: 'gray',
  reschedule_requested: 'orange',
  ready_for_ocular: 'purple',
  awaiting_payment: 'orange',
  awaiting_ocular_fee: 'orange',
  appointment_requested: 'yellow',
  appointment_confirmed: 'blue',
  appointment_completed: 'green',
  scheduled: 'blue',
  on_time: 'green',
  late_arrival: 'orange',
  in_progress: 'indigo',
  rescheduled: 'orange',
  customer_declined: 'red',

  // Project
  draft: 'gray',
  submitted: 'blue',
  blueprint: 'purple',
  approved: 'green',
  payment_pending: 'yellow',
  payment_required: 'yellow',
  payment_for_verification: 'blue',
  partially_paid: 'cyan',
  paid: 'green',
  fabrication: 'orange',
  in_fabrication: 'orange',
  active: 'blue',
  in_review: 'blue',
  contract_required: 'yellow',
  review_design_billing: 'purple',

  // Blueprint
  uploaded: 'yellow',
  revision_uploaded: 'yellow',
  revision_requested: 'orange',
  preparing_blueprint: 'blue',
  design_billing_approved: 'green',

  // Payment
  proof_submitted: 'blue',
  verified: 'green',
  declined: 'red',
  awaiting_proof: 'yellow',

  enabled: 'green',
  disabled: 'red',
  inactive: 'gray',

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
  proof_submitted: 'Awaiting Cashier Verification',
  requested: 'Awaiting Confirmation',
  appointment_requested: 'Appointment Requested',
  appointment_confirmed: 'Appointment Confirmed',
  appointment_completed: 'Appointment Completed',
  payment_pending: 'Payment Required',
  payment_required: 'Payment Required',
  payment_for_verification: 'Payment Received, Awaiting Cashier Verification',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  fabrication: 'In Fabrication',
  in_fabrication: 'In Fabrication',
  in_review: 'In Review',
  contract_required: 'Contract Required',
  review_design_billing: 'Review Design & Billing',
  cash_pending: 'Cash to Collect',
  awaiting_payment: 'Awaiting Ocular Fee',
  awaiting_ocular_fee: 'Awaiting Ocular Fee',
  ready_for_ocular: 'Ready for Ocular',
  reschedule_requested: 'Reschedule Requested',
  no_show: 'No Show',
  on_time: 'On Time',
  late_arrival: 'Late Arrival',
  in_progress: 'In Progress',
  customer_declined: 'Customer Declined',
  arrived_at_site: 'Arrived at Site',
  returned: 'Returned for Revision',
  awaiting_proof: 'Waiting for Proof',
  preparing_blueprint: 'Preparing Blueprint',
  design_billing_approved: 'Design & Billing Approved',
  done: 'Completed',
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
