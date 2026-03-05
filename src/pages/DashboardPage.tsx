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

function getRoleKpis(role: Role, data: Record<string, unknown> | undefined): KpiItem[] {
  const d = data as Record<string, number> | undefined;

  const activeProjects: KpiItem = {
    label: 'Active Projects',
    value: d?.activeProjects ?? 0,
    icon: FolderOpen,
    description: 'In progress',
    color: 'text-[#1d1d1f] bg-[#f0f0f5]',
  };

  switch (role) {
    case Role.CUSTOMER:
      return [
        { label: 'Pending Visits', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Awaiting confirmation', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Invoices due', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.APPOINTMENT_AGENT:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Scheduled for today', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Need action', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.SALES_STAFF:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Reports', value: d?.pendingVisitReports ?? 0, icon: FileText, description: 'Draft / returned', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Ocular cash to collect', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Active Projects', value: d?.activeProjects ?? 0, icon: FolderOpen, description: 'In progress', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.ENGINEER:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'In workshop', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Review', value: d?.pendingBlueprints ?? 0, icon: FileText, description: 'Blueprints', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.CASHIER:
      return [
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Awaiting verification', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, trend: 'up', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Cash to collect', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        activeProjects,
      ];
    case Role.FABRICATION_STAFF:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Active jobs', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Completed Today', value: d?.completedToday ?? 0, icon: Activity, description: 'Finished', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.ADMIN:
      return [
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, trend: 'up', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: AlertCircle, description: 'Proofs to verify', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Today\'s Schedule', value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Appointment requests', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Cash to collect', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
        { label: 'Team Members', value: d?.totalUsers ?? 0, icon: Users, description: 'Active accounts', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
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
        { label: 'Team', path: '/users', icon: Users, description: 'Manage staff', color: 'from-[#4a4a4e] to-[#3a3a3e]' },
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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            {greeting()}, {user?.firstName}
          </h2>
          <p className="text-[#6e6e73] mt-1 text-sm">
            {getRoleGreeting(primaryRole as Role)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#86868b] bg-[#f0f0f5] px-3 py-1.5 rounded-lg font-medium">
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
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 hover:bg-amber-50 transition-colors cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">
                You have {(data as any).pendingPayments} payment{(data as any).pendingPayments > 1 ? 's' : ''} due
              </p>
              <p className="text-xs text-amber-600">
                Tap here to view and pay your outstanding balances.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-500" />
          </div>
        </Link>
      )}

      {/* Installation Confirmation Banner (customers with projects ready for delivery) */}
      {isCustomerRole && (data as any)?.pendingInstallationConfirmations?.length > 0 && (
        (data as any).pendingInstallationConfirmations.map((proj: { _id: string; title: string }) => (
          <Link key={proj._id} to={`/projects/${proj._id}/fabrication`}>
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 hover:bg-blue-50 transition-colors cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <PackageCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-800 text-sm">
                  Your product is ready for installation!
                </p>
                <p className="text-xs text-blue-600">
                  &quot;{proj.title}&quot; fabrication is complete. Tap here to confirm your installation schedule.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-500" />
            </div>
          </Link>
        ))
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-[#c8c8cd]/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </CardContent>
              </Card>
            ))
          : kpis.map((item, i) => {
              const colorParts = item.color.split(' ');
              const textColor = colorParts[0] || '';
              const bgColor = colorParts[1] || '';

              return (
                <Card
                  key={i}
                  className="border-[#c8c8cd]/50 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow group"
                >
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div
                        className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl ${bgColor}`}
                      >
                        <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${textColor}`} />
                      </div>
                      {/* Trend indicator — only show when data is available */}
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-[#1d1d1f] tracking-tight">
                      {item.value}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
                      <p className="text-[11px] sm:text-xs text-[#6e6e73] font-medium leading-tight">{item.label}</p>
                      {item.description && (
                        <span className="text-[9px] sm:text-[10px] text-[#86868b] mt-0.5 sm:mt-0">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#1d1d1f]">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.label} to={action.path} className="group">
              <div className="flex items-center gap-2 sm:gap-4 rounded-xl border border-[#c8c8cd]/50 bg-white/70 backdrop-blur-sm p-2.5 sm:p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#b8b8bd] hover:-translate-y-0.5">
                <div
                  className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm flex-shrink-0`}
                >
                  <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-[#1d1d1f] group-hover:text-[#3a3a3e] leading-tight">
                    {action.label}
                  </p>
                  <p className="text-[10px] sm:text-xs text-[#86868b] mt-0.5 leading-tight line-clamp-2">{action.description}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#c8c8cd] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all hidden sm:block" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Section */}
      <Card className="border-[#c8c8cd]/50 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#e8e8ed] bg-[#f5f5f7]/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#1d1d1f]">
            Recent Activity
          </CardTitle>
          <Link
            to="/notifications"
            className="text-xs font-medium text-[#1d1d1f] hover:text-[#6e6e73] flex items-center gap-1 underline underline-offset-4"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="divide-y divide-[#f0f0f5]">
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
              <div className="divide-y divide-[#f0f0f5]">
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
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${navPath ? 'hover:bg-[#f5f5f7] cursor-pointer' : ''}`}
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
              <EmptyActivityState />
            )
          ) : (
            /* Non-admin: Notifications */
            notifQuery.data?.items && notifQuery.data.items.length > 0 ? (
              <div className="divide-y divide-[#f0f0f5]">
                {notifQuery.data.items.map((notif) => {
                  const cat = getNotificationCategory(notif.category);
                  const IconComp = cat.icon;
                  const colorParts = cat.color.split(' ');
                  const textColor = colorParts[0] || '';
                  const bgColor = colorParts[1] || '';

                  return (
                    <div
                      key={notif._id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${notif.link ? 'hover:bg-[#f5f5f7] cursor-pointer' : ''} ${!notif.isRead ? 'bg-[#f0f0f5]/50' : ''}`}
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
                          <span className="h-2 w-2 rounded-full bg-[#1d1d1f]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyActivityState />
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyActivityState() {
  return (
    <div className="flex h-44 items-center justify-center">
      <div className="text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f0f5] mx-auto mb-3">
          <Activity className="h-5 w-5 text-[#c8c8cd]" />
        </div>
        <p className="text-sm font-medium text-[#86868b]">No recent activity</p>
        <p className="text-xs text-[#c8c8cd] mt-1">
          Activity will appear here as things happen
        </p>
      </div>
    </div>
  );
}
