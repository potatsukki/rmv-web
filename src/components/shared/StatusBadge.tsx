import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
  {
    variants: {
      color: {
        gray: 'border-[#c6ccd3] bg-[linear-gradient(180deg,#eef2f5_0%,#dde3e8_100%)] text-[#5b6470] dark:border-slate-600 dark:bg-none dark:bg-slate-700/60 dark:text-slate-200',
        blue: 'border-[#8da4b8] bg-[linear-gradient(180deg,#eef4f9_0%,#d8e4ee_100%)] text-[#4f6679] dark:border-blue-700/50 dark:bg-none dark:bg-blue-900/40 dark:text-blue-200',
        green: 'border-[#93ad9d] bg-[linear-gradient(180deg,#eef6f1_0%,#dceade_100%)] text-[#4e6c5a] dark:border-emerald-700/50 dark:bg-none dark:bg-emerald-900/40 dark:text-emerald-200',
        yellow: 'border-[#c7aa7a] bg-[linear-gradient(180deg,#f8f0e5_0%,#ebdcc6_100%)] text-[#7e6239] dark:border-amber-700/50 dark:bg-none dark:bg-amber-900/40 dark:text-amber-200',
        red: 'border-[#cb8b86] bg-[linear-gradient(180deg,#fbefed_0%,#efd7d4_100%)] text-[#87544f] dark:border-red-700/50 dark:bg-none dark:bg-red-900/40 dark:text-red-200',
        purple: 'border-[#afa7c5] bg-[linear-gradient(180deg,#f2f1f8_0%,#e0dced_100%)] text-[#665d82] dark:border-purple-700/50 dark:bg-none dark:bg-purple-900/40 dark:text-purple-200',
        orange: 'border-[#c4a07d] bg-[linear-gradient(180deg,#f8f1e9_0%,#ecdcc8_100%)] text-[#7b5d3f] dark:border-orange-700/50 dark:bg-none dark:bg-orange-900/40 dark:text-orange-200',
        indigo: 'border-[#98a6c4] bg-[linear-gradient(180deg,#eff1f9_0%,#dce2f0_100%)] text-[#5b6785] dark:border-indigo-700/50 dark:bg-none dark:bg-indigo-900/40 dark:text-indigo-200',
        cyan: 'border-[#8eafbb] bg-[linear-gradient(180deg,#eef7f8_0%,#d8eaee_100%)] text-[#4f6d78] dark:border-cyan-700/50 dark:bg-none dark:bg-cyan-900/40 dark:text-cyan-200',
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
