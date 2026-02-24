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
  AlertCircle,
  CalendarCheck,
  Package,
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
    blueprint: '/blueprints',
    fabrication: '/fabrication',
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
    color: 'text-blue-600 bg-blue-50',
  };

  switch (role) {
    case Role.CUSTOMER:
      return [
        { label: 'Pending Visits', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Awaiting confirmation', color: 'text-amber-600 bg-amber-50' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Invoices due', color: 'text-rose-600 bg-rose-50' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', color: 'text-orange-600 bg-orange-50' },
      ];
    case Role.APPOINTMENT_AGENT:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Scheduled for today', color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Need action', color: 'text-amber-600 bg-amber-50' },
      ];
    case Role.SALES_STAFF:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Pending Reports', value: d?.pendingVisitReports ?? 0, icon: FileText, description: 'Draft / returned', color: 'text-amber-600 bg-amber-50' },
      ];
    case Role.ENGINEER:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'In workshop', color: 'text-orange-600 bg-orange-50' },
        { label: 'Pending Review', value: d?.pendingBlueprints ?? 0, icon: FileText, description: 'Blueprints', color: 'text-sky-600 bg-sky-50' },
      ];
    case Role.CASHIER:
      return [
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Unpaid', color: 'text-rose-600 bg-rose-50' },
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, trend: 'up', color: 'text-emerald-600 bg-emerald-50' },
        activeProjects,
      ];
    case Role.FABRICATION_STAFF:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Active jobs', color: 'text-orange-600 bg-orange-50' },
        { label: 'Completed Today', value: d?.completedToday ?? 0, icon: Activity, description: 'Finished', color: 'text-emerald-600 bg-emerald-50' },
      ];
    case Role.ADMIN:
      return [
        { label: 'Today\'s Schedule', value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, color: 'text-indigo-600 bg-indigo-50' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, trend: 'up', color: 'text-emerald-600 bg-emerald-50' },
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
        { label: 'Book Visit', path: '/appointments/book', icon: CalendarCheck, description: 'Schedule appointment', color: 'from-indigo-500 to-indigo-600' },
        { label: 'My Projects', path: '/projects', icon: FolderOpen, description: 'View project status', color: 'from-blue-500 to-blue-600' },
        { label: 'Payments', path: '/payments', icon: CreditCard, description: 'Payment history', color: 'from-emerald-500 to-emerald-600' },
      );
      break;
    case Role.APPOINTMENT_AGENT:
      actions.push(
        { label: 'Appointments', path: '/appointments', icon: CalendarDays, description: 'Manage schedule', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Create Appointment', path: '/appointments/create-for-customer', icon: CalendarPlus, description: 'Book for a customer', color: 'from-emerald-500 to-emerald-600' },
      );
      break;
    case Role.SALES_STAFF:
      actions.push(
        { label: 'Calendar', path: '/appointments', icon: CalendarDays, description: 'View appointments', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Visit Reports', path: '/visit-reports', icon: FileText, description: 'Site inspections', color: 'from-cyan-500 to-cyan-600' },
      );
      break;
    case Role.ENGINEER:
      actions.push(
        { label: 'Report Queue', path: '/visit-reports', icon: FileText, description: 'Review visit reports', color: 'from-cyan-500 to-cyan-600' },
        { label: 'Blueprints', path: '/blueprints', icon: FileText, description: 'Technical drawings', color: 'from-sky-500 to-sky-600' },
        { label: 'Fabrication', path: '/fabrication', icon: Hammer, description: 'Workshop status', color: 'from-orange-500 to-orange-600' },
        { label: 'Projects', path: '/projects', icon: Package, description: 'View all projects', color: 'from-teal-500 to-teal-600' },
      );
      break;
    case Role.CASHIER:
      actions.push(
        { label: 'Process Payment', path: '/cashier-queue', icon: DollarSign, description: 'Accept payments', color: 'from-emerald-500 to-emerald-600' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Financial reports', color: 'from-violet-500 to-violet-600' },
      );
      break;
    case Role.FABRICATION_STAFF:
      actions.push(
        { label: 'Job Queue', path: '/fabrication', icon: Hammer, description: 'Pending tasks', color: 'from-orange-500 to-orange-600' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'All projects', color: 'from-blue-500 to-blue-600' },
      );
      break;
    case Role.ADMIN:
      actions.push(
        { label: 'Team', path: '/users', icon: Users, description: 'Manage staff', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Analytics', color: 'from-violet-500 to-violet-600' },
        { label: 'Settings', path: '/settings', icon: CalendarDays, description: 'System config', color: 'from-gray-600 to-gray-700' },
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {greeting()}, {user?.firstName}
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            {getRoleGreeting(primaryRole as Role)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-gray-100 shadow-sm">
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
                  className="border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}
                      >
                        <item.icon className={`h-5 w-5 ${textColor}`} />
                      </div>
                      {/* Trend indicator — only show when data is available */}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">
                      {item.value}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                      {item.description && (
                        <span className="text-[10px] text-gray-400">
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
          <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.path} to={action.path} className="group">
              <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm flex-shrink-0`}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Section */}
      <Card className="border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-50 bg-gray-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">
            Recent Activity
          </CardTitle>
          <Link
            to="/notifications"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="divide-y divide-gray-50">
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
              <div className="divide-y divide-gray-50">
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
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${navPath ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                      onClick={navPath ? () => navigate(navPath) : undefined}
                      role={navPath ? 'button' : undefined}
                      tabIndex={navPath ? 0 : undefined}
                      onKeyDown={navPath ? (e) => { if (e.key === 'Enter') navigate(navPath); } : undefined}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor} flex-shrink-0`}>
                        <IconComp className={`h-4 w-4 ${textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {display.label}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {actorName}
                          {log.targetType && (
                            <span className="text-gray-300"> · {log.targetType}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-gray-400">
                          {formatDistanceToNowStrict(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                        {navPath && (
                          <Eye className="h-3.5 w-3.5 text-gray-300" />
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
              <div className="divide-y divide-gray-50">
                {notifQuery.data.items.map((notif) => {
                  const cat = getNotificationCategory(notif.category);
                  const IconComp = cat.icon;
                  const colorParts = cat.color.split(' ');
                  const textColor = colorParts[0] || '';
                  const bgColor = colorParts[1] || '';

                  return (
                    <div
                      key={notif._id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${notif.link ? 'hover:bg-gray-50 cursor-pointer' : ''} ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                      onClick={notif.link ? () => navigate(notif.link!) : undefined}
                      role={notif.link ? 'button' : undefined}
                      tabIndex={notif.link ? 0 : undefined}
                      onKeyDown={notif.link ? (e) => { if (e.key === 'Enter') navigate(notif.link!); } : undefined}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor} flex-shrink-0`}>
                        <IconComp className={`h-4 w-4 ${textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {notif.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-gray-400">
                          {formatDistanceToNowStrict(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
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
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 mx-auto mb-3">
          <Activity className="h-5 w-5 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-400">No recent activity</p>
        <p className="text-xs text-gray-300 mt-1">
          Activity will appear here as things happen
        </p>
      </div>
    </div>
  );
}
