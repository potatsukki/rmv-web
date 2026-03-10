import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  FolderOpen,
  CreditCard,
  DollarSign,
  TrendingUp,
  Hammer,
  ArrowRight,
  FileText,
  Activity,
  Banknote,
  AlertCircle,
  CalendarCheck,
  Users,
  CalendarPlus,
  LogIn,
  UserPlus,
  UserCheck,
  ClipboardCheck,
  Receipt,
  Wrench,
  Settings,
  Bell,
  Eye,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageError } from '@/components/shared/PageError';
import { useDashboardSummary, useAuditLogs } from '@/hooks/useReports';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/lib/constants';
import type { AuditLog } from '@/lib/types';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

// ── Audit Action Display Mapping ──
const AUDIT_ACTION_MAP: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  // Auth
  login:            { icon: LogIn,          label: 'Logged in',                  color: 'text-blue-600 bg-blue-50' },
  logout:           { icon: LogIn,          label: 'Logged out',                 color: 'text-gray-500 bg-gray-50' },
  login_failed:     { icon: AlertCircle,    label: 'Failed login attempt',       color: 'text-red-600 bg-red-50' },
  password_changed: { icon: ShieldCheck,    label: 'Password changed',           color: 'text-violet-600 bg-violet-50' },
  password_reset:   { icon: ShieldCheck,    label: 'Password reset',             color: 'text-violet-600 bg-violet-50' },
  email_verified:   { icon: UserCheck,      label: 'Email verified',             color: 'text-emerald-600 bg-emerald-50' },
  // User
  user_created:     { icon: UserPlus,       label: 'User created',               color: 'text-indigo-600 bg-indigo-50' },
  user_updated:     { icon: UserCheck,      label: 'User updated',               color: 'text-blue-600 bg-blue-50' },
  user_disabled:    { icon: AlertCircle,    label: 'User disabled',              color: 'text-red-600 bg-red-50' },
  user_enabled:     { icon: UserCheck,      label: 'User enabled',               color: 'text-emerald-600 bg-emerald-50' },
  // Appointment
  appointment_created:   { icon: CalendarPlus,  label: 'Appointment booked',     color: 'text-indigo-600 bg-indigo-50' },
  appointment_confirmed: { icon: CalendarCheck, label: 'Appointment confirmed',  color: 'text-emerald-600 bg-emerald-50' },
  appointment_cancelled: { icon: CalendarDays,  label: 'Appointment cancelled',  color: 'text-red-600 bg-red-50' },
  appointment_completed: { icon: CalendarCheck, label: 'Appointment completed',  color: 'text-emerald-600 bg-emerald-50' },
  appointment_no_show:   { icon: AlertCircle,   label: 'No-show',                color: 'text-amber-600 bg-amber-50' },
  appointment_reschedule_requested: { icon: Clock, label: 'Reschedule requested', color: 'text-amber-600 bg-amber-50' },
  appointment_rescheduled: { icon: CalendarDays, label: 'Appointment rescheduled', color: 'text-blue-600 bg-blue-50' },
  sales_assigned:    { icon: Users,         label: 'Sales assigned',             color: 'text-indigo-600 bg-indigo-50' },
  // Project
  project_created:   { icon: FolderOpen,    label: 'Project created',            color: 'text-blue-600 bg-blue-50' },
  project_updated:   { icon: FolderOpen,    label: 'Project updated',            color: 'text-blue-600 bg-blue-50' },
  project_cancelled: { icon: FolderOpen,    label: 'Project cancelled',          color: 'text-red-600 bg-red-50' },
  project_completed: { icon: FolderOpen,    label: 'Project completed',          color: 'text-emerald-600 bg-emerald-50' },
  project_reassigned:{ icon: Users,         label: 'Project reassigned',         color: 'text-violet-600 bg-violet-50' },
  // Blueprint
  blueprint_uploaded:          { icon: FileText, label: 'Blueprint uploaded',     color: 'text-sky-600 bg-sky-50' },
  blueprint_approved:          { icon: FileText, label: 'Blueprint approved',     color: 'text-emerald-600 bg-emerald-50' },
  blueprint_revision_requested:{ icon: FileText, label: 'Blueprint revision requested', color: 'text-amber-600 bg-amber-50' },
  blueprint_revision_uploaded: { icon: FileText, label: 'Blueprint revision uploaded',  color: 'text-sky-600 bg-sky-50' },
  // Payment
  payment_plan_created:   { icon: CreditCard, label: 'Payment plan created',     color: 'text-indigo-600 bg-indigo-50' },
  payment_plan_updated:   { icon: CreditCard, label: 'Payment plan updated',     color: 'text-blue-600 bg-blue-50' },
  payment_proof_submitted:{ icon: CreditCard, label: 'Payment proof submitted',  color: 'text-amber-600 bg-amber-50' },
  payment_verified:       { icon: DollarSign,  label: 'Payment verified',         color: 'text-emerald-600 bg-emerald-50' },
  payment_declined:       { icon: CreditCard, label: 'Payment declined',         color: 'text-red-600 bg-red-50' },
  receipt_generated:      { icon: Receipt,    label: 'Receipt generated',        color: 'text-emerald-600 bg-emerald-50' },
  receipt_resent:         { icon: Receipt,    label: 'Receipt resent',           color: 'text-blue-600 bg-blue-50' },
  // Cash
  cash_collected:    { icon: DollarSign,    label: 'Cash collected',             color: 'text-emerald-600 bg-emerald-50' },
  cash_received:     { icon: DollarSign,    label: 'Cash received',              color: 'text-emerald-600 bg-emerald-50' },
  cash_discrepancy:  { icon: AlertCircle,   label: 'Cash discrepancy',           color: 'text-red-600 bg-red-50' },
  // Fabrication
  fabrication_assigned: { icon: Wrench,     label: 'Fabrication assigned',       color: 'text-orange-600 bg-orange-50' },
  fabrication_updated:  { icon: Hammer,     label: 'Fabrication updated',        color: 'text-orange-600 bg-orange-50' },
  // Visit Report
  visit_report_created:   { icon: ClipboardCheck, label: 'Visit report created',   color: 'text-cyan-600 bg-cyan-50' },
  visit_report_updated:   { icon: ClipboardCheck, label: 'Visit report updated',   color: 'text-cyan-600 bg-cyan-50' },
  visit_report_submitted: { icon: ClipboardCheck, label: 'Visit report submitted',  color: 'text-emerald-600 bg-emerald-50' },
  visit_report_returned:  { icon: ClipboardCheck, label: 'Visit report returned',   color: 'text-amber-600 bg-amber-50' },
  visit_report_completed: { icon: ClipboardCheck, label: 'Visit report completed',  color: 'text-emerald-600 bg-emerald-50' },
  // Config
  config_updated:       { icon: Settings,   label: 'Config updated',             color: 'text-gray-600 bg-gray-50' },
  maintenance_toggled:  { icon: Settings,   label: 'Maintenance toggled',        color: 'text-amber-600 bg-amber-50' },
};

const DEFAULT_ACTION_DISPLAY = { icon: Activity, label: 'Action performed', color: 'text-gray-500 bg-gray-50' };

function getAuditDisplay(action: string) {
  return AUDIT_ACTION_MAP[action] ?? DEFAULT_ACTION_DISPLAY;
}

function getAuditNavPath(log: AuditLog): string | undefined {
  if (!log.targetType || !log.targetId) return undefined;
  const map: Record<string, string> = {
    appointment: '/appointments',
    project: `/projects/${log.targetId}`,
    payment: '/payments',
    user: '/users',
    blueprint: '/projects',
    fabrication: '/projects',
    visit_report: '/visit-reports',
  };
  return map[log.targetType];
}

function getNotificationCategory(category: string): { icon: React.ElementType; color: string } {
  const map: Record<string, { icon: React.ElementType; color: string }> = {
    appointment: { icon: CalendarDays, color: 'text-indigo-600 bg-indigo-50' },
    project:     { icon: FolderOpen,   color: 'text-blue-600 bg-blue-50' },
    payment:     { icon: CreditCard,   color: 'text-emerald-600 bg-emerald-50' },
    fabrication: { icon: Hammer,       color: 'text-orange-600 bg-orange-50' },
    blueprint:   { icon: FileText,     color: 'text-sky-600 bg-sky-50' },
    system:      { icon: Settings,     color: 'text-gray-600 bg-gray-50' },
  };
  return map[category] ?? { icon: Bell, color: 'text-gray-500 bg-gray-50' };
}

interface KpiItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  detail?: string;
  path: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

interface QuickAction {
  label: string;
  path: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

function getRoleGreeting(role: Role): string {
  const greetings: Partial<Record<Role, string>> = {
    [Role.CUSTOMER]: 'Start a new project or track your orders.',
    [Role.APPOINTMENT_AGENT]: 'Manage schedules and ocular visits.',
    [Role.SALES_STAFF]: 'Manage your appointments and visit reports.',
    [Role.ENGINEER]: 'Review blueprints and technical specs.',
    [Role.CASHIER]: 'Process payments and manage cash flow.',
    [Role.FABRICATION_STAFF]: 'Monitor fabrication stages and output.',
    [Role.ADMIN]: 'System overview and performance metrics.',
  };
  return greetings[role] || 'Welcome to your dashboard.';
}

function getRoleWorkspaceLabel(role: Role): string {
  const labels: Partial<Record<Role, string>> = {
    [Role.CUSTOMER]: 'Customer workspace',
    [Role.APPOINTMENT_AGENT]: 'Scheduling workspace',
    [Role.SALES_STAFF]: 'Sales workspace',
    [Role.ENGINEER]: 'Engineering workspace',
    [Role.CASHIER]: 'Cashiering workspace',
    [Role.FABRICATION_STAFF]: 'Fabrication workspace',
    [Role.ADMIN]: 'Operations workspace',
  };

  return labels[role] || 'Workspace';
}

function getRoleActionHeading(role: Role): { title: string; description: string } {
  const headings: Partial<Record<Role, { title: string; description: string }>> = {
    [Role.CUSTOMER]: { title: 'Your next steps', description: 'The fastest paths for booking, tracking work, and paying dues.' },
    [Role.APPOINTMENT_AGENT]: { title: 'Scheduling actions', description: 'Prioritize booking flow and pending appointment requests first.' },
    [Role.SALES_STAFF]: { title: 'Sales actions', description: 'Focus on visits, reports, and cash handoff tasks tied to active customers.' },
    [Role.ENGINEER]: { title: 'Engineering actions', description: 'Review incoming technical work before project execution slows down.' },
    [Role.CASHIER]: { title: 'Finance actions', description: 'Handle proofs, collections, and refund queues before reporting.' },
    [Role.FABRICATION_STAFF]: { title: 'Workshop actions', description: 'Stay on top of active fabrication jobs and today’s completions.' },
    [Role.ADMIN]: { title: 'Operational actions', description: 'Use these shortcuts to resolve system bottlenecks quickly.' },
  };

  return headings[role] || { title: 'Quick Actions', description: 'Primary actions for this workspace.' };
}

function getRoleKpis(role: Role, data: Record<string, unknown> | undefined): KpiItem[] {
  const d = data as Record<string, number> | undefined;

  const activeProjects: KpiItem = {
    label: 'Active Projects',
    value: d?.activeProjects ?? 0,
    icon: FolderOpen,
    description: 'In progress',
    detail: 'Projects that are still moving through design, payment, fabrication, or delivery.',
    path: '/projects',
    color: 'text-[#2b3138] silver-sheen',
  };

  switch (role) {
    case Role.CUSTOMER:
      return [
        { label: 'Pending Visits', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Awaiting confirmation', detail: 'Visit requests you submitted that are still waiting for the team to confirm a schedule.', path: '/appointments', color: 'text-[#2b3138] silver-sheen' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Invoices due', detail: 'Payments that still need your action before the project can move forward.', path: '/payments', color: 'text-[#2b3138] silver-sheen' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', detail: 'Projects currently in the workshop and not yet ready for installation or handover.', path: '/projects', color: 'text-[#2b3138] silver-sheen' },
      ];
    case Role.APPOINTMENT_AGENT:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Scheduled for today', detail: 'Appointments already booked for today that you may need to monitor or coordinate.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Need action', detail: 'New visit requests waiting for assignment, confirmation, or follow-up.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.SALES_STAFF:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Visits for today', detail: 'Customer visits assigned to you today, including office and ocular appointments.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Reports', value: d?.pendingVisitReports ?? 0, icon: FileText, description: 'Draft / returned', detail: 'Visit reports that still need to be completed or corrected before project handoff.', path: '/visit-reports', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Ocular cash to collect', detail: 'Cash-based ocular fees you still need to collect and turn over.', path: '/cash', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Active Projects', value: d?.activeProjects ?? 0, icon: FolderOpen, description: 'In progress', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.ENGINEER:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'In workshop', detail: 'Projects that already left engineering review and are now being built by fabrication.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Review', value: d?.pendingBlueprints ?? 0, icon: FileText, description: 'Blueprints', detail: 'Blueprint packages waiting for your review, approval, or revision request.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.CASHIER:
      return [
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Awaiting verification', detail: 'Submitted payment proofs that still need cashier review before they can be marked paid.', path: '/cashier-queue', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, description: 'Collected this month', detail: 'Total verified revenue collected during the current month.', path: '/reports', trend: 'up', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Cash to collect', detail: 'Cash transactions that still need collection, confirmation, or posting.', path: '/cash', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        activeProjects,
      ];
    case Role.FABRICATION_STAFF:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Active jobs', detail: 'Projects currently assigned to the workshop and still under fabrication.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Completed Today', value: d?.completedToday ?? 0, icon: Activity, description: 'Finished', detail: 'Fabrication tasks or project stages marked complete today.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.ADMIN:
      return [
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, description: 'Collected this month', detail: 'Verified revenue booked during the current reporting month.', path: '/reports', trend: 'up', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: AlertCircle, description: 'Proofs to verify', detail: 'Payment submissions waiting for cashier review or admin visibility.', path: '/cashier-queue', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Today\'s Schedule', value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Appointments', detail: 'All appointments scheduled for today across the operation.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', detail: 'Projects currently active in the workshop.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Appointment requests', detail: 'Customer appointment requests still waiting for scheduling action.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Cash to collect', detail: 'Cash-linked payments still waiting for collection or posting.', path: '/cash', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Team Members', value: d?.totalUsers ?? 0, icon: Users, description: 'Active accounts', detail: 'User accounts currently active in the system.', path: '/users', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    default:
      return [activeProjects];
  }
}

function getRoleActions(role: Role): QuickAction[] {
  const actions: QuickAction[] = [];

  switch (role) {
    case Role.CUSTOMER:
      actions.push(
        { label: 'Book Visit', path: '/appointments/book', icon: CalendarCheck, description: 'Schedule appointment', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'My Projects', path: '/projects', icon: FolderOpen, description: 'View project status', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
        { label: 'Payments', path: '/payments', icon: CreditCard, description: 'Payment history', color: 'from-[#4a4a4e] to-[#3a3a3e]' },
      );
      break;
    case Role.APPOINTMENT_AGENT:
      actions.push(
        { label: 'Appointments', path: '/appointments', icon: CalendarDays, description: 'Manage schedule', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Create Appointment', path: '/appointments/create-for-customer', icon: CalendarPlus, description: 'Book for a customer', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
      );
      break;
    case Role.SALES_STAFF:
      actions.push(
        { label: 'Calendar', path: '/appointments', icon: CalendarDays, description: 'View appointments', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Visit Reports', path: '/visit-reports', icon: FileText, description: 'Site inspections', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
        { label: 'Cash Flow', path: '/cash', icon: Banknote, description: 'Pending cash payments', color: 'from-[#4a4a4e] to-[#3a3a3e]' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'View projects', color: 'from-[#5a5a5e] to-[#4a4a4e]' },
      );
      break;
    case Role.ENGINEER:
      actions.push(
        { label: 'Report Queue', path: '/visit-reports', icon: FileText, description: 'Review visit reports', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'Blueprints & fabrication', color: 'from-[#2d2d2f] to-[#1d1d1f]' },
      );
      break;
    case Role.CASHIER:
      actions.push(
        { label: 'Cashier Queue', path: '/cashier-queue', icon: CreditCard, description: 'Verify payment proofs', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Cash Flow', path: '/cash', icon: Banknote, description: 'Record cash collections', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
        { label: 'Refund Requests', path: '/refund-requests', icon: Receipt, description: 'Pending refunds', color: 'from-[#4a4a4e] to-[#3a3a3e]' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Financial analytics', color: 'from-[#5a5a5e] to-[#4a4a4e]' },
      );
      break;
    case Role.FABRICATION_STAFF:
      actions.push(
        { label: 'Job Queue', path: '/projects', icon: Hammer, description: 'Pending tasks', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'All projects', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
      );
      break;
    case Role.ADMIN:
      actions.push(
        { label: 'Appointments', path: '/appointments', icon: CalendarDays, description: 'Manage schedule', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'All projects', color: 'from-[#2d2d2f] to-[#1d1d1f]' },
        { label: 'Cashier Queue', path: '/cashier-queue', icon: CreditCard, description: 'Verify proofs', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
        { label: 'Manage Accounts', path: '/users', icon: Users, description: 'User access and roles', color: 'from-[#4a4a4e] to-[#3a3a3e]' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Analytics', color: 'from-[#5a5a5e] to-[#4a4a4e]' },
        { label: 'Settings', path: '/settings', icon: Settings, description: 'System config', color: 'from-[#6a6a6e] to-[#5a5a5e]' },
      );
      break;
  }

  return actions;
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  const isAdmin = user?.roles.includes(Role.ADMIN);

  // Fetch activity: audit logs for admin, notifications for everyone else
  const auditQuery = useAuditLogs({ limit: 5 }, !!isAdmin);
  const notifQuery = useNotifications({ limit: '5' }, !isAdmin);

  // Decide which data source to use
  const activityLoading = isAdmin ? auditQuery.isLoading : notifQuery.isLoading;

  if (isError) return <PageError onRetry={refetch} />;

  const primaryRole =
    user?.roles.find((r) => r !== Role.ADMIN) ?? user?.roles[0] ?? Role.CUSTOMER;
  const isCustomerRole = user?.roles.includes(Role.CUSTOMER);
  const kpis = getRoleKpis(
    primaryRole as Role,
    data as Record<string, unknown> | undefined,
  );
  const actions = getRoleActions(primaryRole as Role);
  const featuredKpis = kpis.slice(0, Math.min(2, kpis.length));
  const secondaryKpis = kpis.slice(featuredKpis.length);
  const actionHeading = getRoleActionHeading(primaryRole as Role);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a838d]">
            Overview
          </p>
          <div className="metal-pill mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4d5660]">
            {getRoleWorkspaceLabel(primaryRole as Role)}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#171b21] sm:text-[2rem]">
            {greeting()}, {user?.firstName}
          </h2>
          <p className="mt-1 text-sm text-[#616a74]">
            {getRoleGreeting(primaryRole as Role)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="metal-pill rounded-lg px-3 py-1.5 text-xs font-medium text-[#616a74]">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Payment Due Alert Banner (customers with pending payments) */}
      {isCustomerRole && (data as any)?.pendingPayments > 0 && (
        <Link to="/payments">
          <div className="flex cursor-pointer items-center gap-3 rounded-[1.35rem] border border-[#c7aa7a]/70 bg-[linear-gradient(180deg,rgba(248,240,229,0.82)_0%,rgba(235,220,198,0.58)_100%)] p-4 transition-colors hover:bg-[linear-gradient(180deg,rgba(250,244,235,0.9)_0%,rgba(237,225,205,0.7)_100%)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f8f0e5_0%,#ebdcc6_100%)]">
              <AlertCircle className="h-5 w-5 text-[#a97d49]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#7e6239]">
                You have {(data as any).pendingPayments} payment{(data as any).pendingPayments > 1 ? 's' : ''} due
              </p>
              <p className="text-xs text-[#8f6e42]">
                Tap here to view and pay your outstanding balances.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#a97d49]" />
          </div>
        </Link>
      )}

      {/* Installation Confirmation Banner (customers with projects ready for delivery) */}
      {isCustomerRole && (data as any)?.pendingInstallationConfirmations?.length > 0 && (
        (data as any).pendingInstallationConfirmations.map((proj: { _id: string; title: string }) => (
          <Link key={proj._id} to={`/projects/${proj._id}/fabrication`}>
            <div className="flex cursor-pointer items-center gap-3 rounded-[1.35rem] border border-[#8da4b8]/70 bg-[linear-gradient(180deg,rgba(238,244,249,0.9)_0%,rgba(216,228,238,0.7)_100%)] p-4 transition-colors hover:bg-[linear-gradient(180deg,rgba(244,248,251,0.94)_0%,rgba(221,232,241,0.82)_100%)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#eef4f9_0%,#d8e4ee_100%)]">
                <PackageCheck className="h-5 w-5 text-[#4f6679]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#4f6679]">
                  Your product is ready for installation!
                </p>
                <p className="text-xs text-[#5d768a]">
                  &quot;{proj.title}&quot; fabrication is complete. Tap here to confirm your installation schedule.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#708ca6]" />
            </div>
          </Link>
        ))
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="silver-sheen h-10 w-10 rounded-2xl sm:h-11 sm:w-11" />
                  <Skeleton className="mt-4 h-8 w-20 sm:mt-5 sm:h-9 sm:w-32" />
                  <Skeleton className="mt-2 h-4 w-16 sm:w-40" />
                </CardContent>
              </Card>
            ))
          : featuredKpis.map((item, i) => {
              const colorParts = item.color.split(' ');
              const textColor = colorParts[0] || '';
              const bgColor = colorParts[1] || '';

              return (
                <Link key={i} to={item.path} className="block">
                  <Card
                    className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_22px_36px_rgba(18,22,27,0.12)] focus-within:ring-2 focus-within:ring-[#c7d0da]"
                  >
                    <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_68%)] sm:hidden" />
                    <CardContent className="relative flex min-h-[196px] flex-col p-5 sm:min-h-0 sm:p-6">
                      <div className="mb-5 flex flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between sm:mb-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-[1.35rem] ${bgColor} ring-1 ring-black/5 transition-transform group-hover:scale-[1.03] sm:h-11 sm:w-11 sm:rounded-2xl`}
                        >
                          <item.icon className={`h-5 w-5 ${textColor}`} />
                        </div>
                        {item.description && (
                          <span className="metal-pill hidden rounded-full px-2.5 py-1 text-[10px] font-medium text-[#616a74] sm:inline-flex sm:self-auto sm:text-[11px]">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a838d] sm:text-[11px]">
                        {item.label}
                      </p>
                      <div className="mt-3 text-[2.35rem] font-bold tracking-[-0.03em] text-[#171b21] sm:mt-2 sm:text-4xl">
                        {item.value}
                      </div>
                      <div className="mt-auto pt-4 sm:mt-0 sm:pt-0">
                        <div className="h-px w-full bg-[linear-gradient(90deg,rgba(29,29,31,0.08),rgba(29,29,31,0))] sm:hidden" />
                      </div>
                      <p className="mt-2 hidden max-w-sm text-sm leading-6 text-[#616a74] sm:block">
                        {item.detail || (item.trend === 'up'
                          ? 'Healthy movement compared with the rest of the current reporting window.'
                          : 'This number highlights the main work queue or customer action that currently needs attention.')}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
      </div>

      {secondaryKpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {secondaryKpis.map((item, i) => {
            const colorParts = item.color.split(' ');
            const textColor = colorParts[0] || '';
            const bgColor = colorParts[1] || '';

            return (
              <Link key={`${item.label}-${i}`} to={item.path} className="block">
                <Card
                  className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_20px_34px_rgba(18,22,27,0.1)] focus-within:ring-2 focus-within:ring-[#c7d0da]"
                >
                  <div className="absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_70%)] sm:hidden" />
                  <CardContent className="relative flex min-h-[152px] flex-col p-4 sm:min-h-0 sm:p-4">
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bgColor} ring-1 ring-black/5 transition-transform group-hover:scale-[1.03] sm:h-9 sm:w-9 sm:rounded-xl`}>
                        <item.icon className={`h-4.5 w-4.5 ${textColor} sm:h-4 sm:w-4`} />
                      </div>
                    </div>
                    <div className="text-[2rem] font-bold tracking-[-0.03em] text-[#171b21] sm:text-2xl">{item.value}</div>
                    <div className="mt-auto pt-4">
                      <p className="text-[12px] font-semibold text-[#434c56] sm:text-[11px]">{item.label}</p>
                      {item.description && <p className="mt-1 text-[11px] leading-5 text-[#7a838d] sm:text-[10px]">{item.description}</p>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#1d1d1f]">{actionHeading.title}</h3>
            <p className="mt-1 text-xs text-[#86868b]">{actionHeading.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {actions.map((action) => (
            <Link key={action.label} to={action.path} className="group">
              <div className="metal-panel flex items-center gap-2 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_20px_32px_rgba(18,22,27,0.1)] sm:gap-4 sm:p-4">
                <div
                  className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm flex-shrink-0`}
                >
                  <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-tight text-[#171b21] group-hover:text-[#4d5660] sm:text-sm">
                    {action.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[#68727d] sm:text-xs">{action.description}</p>
                </div>
                <ArrowRight className="hidden h-3.5 w-3.5 text-[#9ca6b1] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 sm:block sm:h-4 sm:w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Section */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#dde3ea] bg-white/28">
          <CardTitle className="text-base font-semibold text-[#171b21]">
            Recent Activity
          </CardTitle>
          <Link
            to="/notifications"
            className="flex items-center gap-1 text-xs font-medium text-[#171b21] underline underline-offset-4 hover:text-[#616a74]"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="divide-y divide-[#dde3ea]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : isAdmin ? (
            /* Admin: Audit Logs */
            auditQuery.data?.items && auditQuery.data.items.length > 0 ? (
              <div className="divide-y divide-[#dde3ea]">
                {auditQuery.data.items.map((log) => {
                  const display = getAuditDisplay(log.action);
                  const navPath = getAuditNavPath(log);
                  const IconComp = display.icon;
                  const colorParts = display.color.split(' ');
                  const textColor = colorParts[0] || '';
                  const bgColor = colorParts[1] || '';
                  const actorName = log.actorId
                    ? `${log.actorId.firstName} ${log.actorId.lastName}`
                    : (log.actorEmail ?? 'System');

                  return (
                    <div
                      key={log._id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${navPath ? 'cursor-pointer hover:bg-white/45' : ''}`}
                      onClick={navPath ? () => navigate(navPath) : undefined}
                      role={navPath ? 'button' : undefined}
                      tabIndex={navPath ? 0 : undefined}
                      onKeyDown={navPath ? (e) => { if (e.key === 'Enter') navigate(navPath); } : undefined}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor} flex-shrink-0`}>
                        <IconComp className={`h-4 w-4 ${textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1d1d1f] truncate">
                          {display.label}
                        </p>
                        <p className="text-xs text-[#86868b] truncate">
                          {actorName}
                          {log.targetType && (
                            <span className="text-[#c8c8cd]"> · {log.targetType}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-[#86868b]">
                          {formatDistanceToNowStrict(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                        {navPath && (
                          <Eye className="h-3.5 w-3.5 text-[#c8c8cd]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyActivityState
                title="No recent system activity"
                description="Audit events and staff actions will appear here as the day progresses."
              />
            )
          ) : (
            /* Non-admin: Notifications */
            notifQuery.data?.items && notifQuery.data.items.length > 0 ? (
              <div className="divide-y divide-[#dde3ea]">
                {notifQuery.data.items.map((notif) => {
                  const cat = getNotificationCategory(notif.category);
                  const IconComp = cat.icon;
                  const colorParts = cat.color.split(' ');
                  const textColor = colorParts[0] || '';
                  const bgColor = colorParts[1] || '';

                  return (
                    <div
                      key={notif._id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${notif.link ? 'cursor-pointer hover:bg-white/45' : ''} ${!notif.isRead ? 'bg-white/28' : ''}`}
                      onClick={notif.link ? () => navigate(notif.link!) : undefined}
                      role={notif.link ? 'button' : undefined}
                      tabIndex={notif.link ? 0 : undefined}
                      onKeyDown={notif.link ? (e) => { if (e.key === 'Enter') navigate(notif.link!); } : undefined}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor} flex-shrink-0`}>
                        <IconComp className={`h-4 w-4 ${textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${notif.isRead ? 'text-[#6e6e73]' : 'text-[#1d1d1f]'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-[#86868b] truncate">
                          {notif.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-[#86868b]">
                          {formatDistanceToNowStrict(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-[#4f6679]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyActivityState
                title="No recent updates"
                description="Notifications tied to your work will appear here as soon as something needs attention."
              />
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyActivityState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-44 items-center justify-center">
      <div className="text-center">
        <div className="silver-sheen mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <Activity className="h-5 w-5 text-[#6a7480]" />
        </div>
        <p className="text-sm font-medium text-[#68727d]">{title}</p>
        <p className="mt-1 text-xs text-[#9aa4af]">{description}</p>
      </div>
    </div>
  );
}
