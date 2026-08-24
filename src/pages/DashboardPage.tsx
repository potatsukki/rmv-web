import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  CalendarDays,
  Clock,
  FolderOpen,
  CreditCard,
  DollarSign,
  Coins,
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
  CheckCircle2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageError } from '@/components/shared/PageError';
import { useDashboardSummary, useAuditLogs } from '@/hooks/useReports';
import { useNotifications } from '@/hooks/useNotifications';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/lib/constants';
import type { AuditLog } from '@/lib/types';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatApiTimeAgo } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  getServiceById,
  getServiceProjectReferences,
  type ServiceProjectReference,
} from '@/lib/service-catalog';
import { buildBookingIntentPath } from '@/lib/booking-intent';

function formatCurrencyCompact(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  const unitTable: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1e12, suffix: 'T' },
    { threshold: 1e9, suffix: 'B' },
    { threshold: 1e6, suffix: 'M' },
    { threshold: 1e3, suffix: 'K' },
  ];

  const unit = unitTable.find((u) => abs >= u.threshold);
  if (!unit) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
  }

  const scaled = abs / unit.threshold;
  const maxFractionDigits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const num = new Intl.NumberFormat('en-PH', { maximumFractionDigits: maxFractionDigits }).format(scaled);
  return `${sign}₱${num}${unit.suffix}`;
}

function formatCurrencyDashboard(v: number) {
  // Keep full currency for normal values; compact only when it would overflow KPI cards.
  if (Math.abs(v) < 1e9) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
  }
  return formatCurrencyCompact(v);
}

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
  payment_proof_submitted:{ icon: CreditCard, label: 'Payment received',  color: 'text-amber-600 bg-amber-50' },
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
  badgeTone?: 'progress' | 'fabrication' | 'pending' | 'success' | 'attention' | 'neutral';
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
    [Role.CASHIER]: { title: 'Finance actions', description: 'Handle payment records and collections before reporting.' },
    [Role.FABRICATION_STAFF]: { title: 'Workshop actions', description: 'Stay on top of active fabrication jobs and today’s completions.' },
    [Role.ADMIN]: { title: 'Operational actions', description: 'Use these shortcuts to resolve system bottlenecks quickly.' },
  };

  return headings[role] || { title: 'Quick Actions', description: 'Primary actions for this workspace.' };
}

function getKpiBadgeClass(tone: KpiItem['badgeTone']) {
  switch (tone) {
    case 'progress':
      return 'border border-sky-300/85 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(191,219,254,0.94)_100%)] text-sky-800 shadow-[0_8px_18px_rgba(14,116,144,0.14)] dark:border-sky-400/45 dark:bg-[linear-gradient(180deg,rgba(8,47,73,0.94)_0%,rgba(12,74,110,0.88)_100%)] dark:text-sky-100 dark:shadow-[0_10px_22px_rgba(2,132,199,0.18)]';
    case 'fabrication':
      return 'border border-orange-300/85 bg-[linear-gradient(180deg,rgba(255,247,237,0.98)_0%,rgba(253,186,116,0.92)_100%)] text-orange-800 shadow-[0_8px_18px_rgba(194,65,12,0.14)] dark:border-orange-400/45 dark:bg-[linear-gradient(180deg,rgba(67,20,7,0.94)_0%,rgba(124,45,18,0.88)_100%)] dark:text-orange-100 dark:shadow-[0_10px_22px_rgba(234,88,12,0.18)]';
    case 'pending':
      return 'border border-amber-300/85 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(253,230,138,0.92)_100%)] text-amber-800 shadow-[0_8px_18px_rgba(180,83,9,0.14)] dark:border-amber-400/45 dark:bg-[linear-gradient(180deg,rgba(69,26,3,0.94)_0%,rgba(120,53,15,0.88)_100%)] dark:text-amber-100 dark:shadow-[0_10px_22px_rgba(245,158,11,0.18)]';
    case 'success':
      return 'border border-emerald-300/85 bg-[linear-gradient(180deg,rgba(236,253,245,0.98)_0%,rgba(167,243,208,0.92)_100%)] text-emerald-800 shadow-[0_8px_18px_rgba(4,120,87,0.14)] dark:border-emerald-400/45 dark:bg-[linear-gradient(180deg,rgba(6,44,34,0.94)_0%,rgba(6,78,59,0.88)_100%)] dark:text-emerald-100 dark:shadow-[0_10px_22px_rgba(16,185,129,0.18)]';
    case 'attention':
      return 'border border-fuchsia-300/85 bg-[linear-gradient(180deg,rgba(253,244,255,0.98)_0%,rgba(240,171,252,0.92)_100%)] text-fuchsia-800 shadow-[0_8px_18px_rgba(162,28,175,0.14)] dark:border-fuchsia-400/45 dark:bg-[linear-gradient(180deg,rgba(74,4,78,0.94)_0%,rgba(112,26,117,0.88)_100%)] dark:text-fuchsia-100 dark:shadow-[0_10px_22px_rgba(192,38,211,0.18)]';
    default:
      return 'border border-white/70 bg-white/90 text-[#364152] shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/10 dark:text-slate-100 dark:shadow-[0_10px_22px_rgba(0,0,0,0.2)]';
  }
}

function roleCanOpenDashboardPath(role: Role, path: string) {
  const basePath = path.split('?')[0] || path;
  const allowedRolesByPath: Array<{ prefix: string; roles: Role[] }> = [
    { prefix: '/projects', roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN] },
    { prefix: '/appointments', roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN] },
    { prefix: '/payments', roles: [Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN] },
    { prefix: '/cash', roles: [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN] },
    { prefix: '/visit-reports', roles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN] },
    { prefix: '/reports', roles: [Role.CASHIER, Role.ADMIN] },
    { prefix: '/users', roles: [Role.ADMIN] },
    { prefix: '/notifications', roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ENGINEER, Role.CASHIER, Role.FABRICATION_STAFF, Role.ADMIN] },
  ];

  const rule = allowedRolesByPath.find((item) => basePath === item.prefix || basePath.startsWith(`${item.prefix}/`));
  return !rule || rule.roles.includes(role);
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
    badgeTone: 'progress',
  };

  switch (role) {
    case Role.CUSTOMER:
      return [
        activeProjects,
        { label: 'Pending Visits', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Awaiting confirmation', detail: 'Visit requests you submitted that are still waiting for the team to confirm a schedule.', path: '/appointments', color: 'text-[#2b3138] silver-sheen', badgeTone: 'attention' },
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Invoices due', detail: 'Payments that still need your action before the project can move forward.', path: '/payments', color: 'text-[#2b3138] silver-sheen', badgeTone: 'pending' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', detail: 'Projects currently in the workshop and not yet ready for installation or handover.', path: '/projects', color: 'text-[#2b3138] silver-sheen', badgeTone: 'fabrication' },
      ];
    case Role.APPOINTMENT_AGENT:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Scheduled for today', detail: 'Appointments already booked for today that you may need to monitor or coordinate.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'progress' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Need action', detail: 'New visit requests waiting for assignment, confirmation, or follow-up.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'pending' },
      ];
    case Role.SALES_STAFF:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Visits for today', detail: 'Customer visits assigned to you today, including office and ocular appointments.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'progress' },
        { label: 'Pending Reports', value: d?.pendingVisitReports ?? 0, icon: FileText, description: 'Draft / returned', detail: 'Visit reports that still need to be completed or corrected before project handoff.', path: '/appointments?tab=visit-reports&reportStatus=pending', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'attention' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Ocular cash to collect', detail: 'Cash-based ocular fees you still need to collect and turn over.', path: '/cash', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'pending' },
        { label: 'Active Projects', value: d?.activeProjects ?? 0, icon: FolderOpen, description: 'In progress', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]' },
      ];
    case Role.ENGINEER:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'In workshop', detail: 'Projects that already left engineering review and are now being built by fabrication.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'fabrication' },
        { label: 'Pending Review', value: d?.pendingBlueprints ?? 0, icon: FileText, description: 'Blueprints', detail: 'Blueprint packages waiting for your review, approval, or revision request.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'attention' },
      ];
    case Role.CASHIER:
      return [
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Awaiting verification', detail: 'Received payment records that still need cashier review before they can be marked paid.', path: '/payments?tab=cashier-queue', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'pending' },
        { label: 'Monthly Revenue', value: formatCurrencyDashboard(d?.revenueThisMonth ?? 0), icon: Coins, description: 'Collected this month', detail: 'Total verified revenue collected during the current month.', path: '/reports', trend: 'up', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'success' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Cash to collect', detail: 'Cash transactions that still need collection, confirmation, or posting.', path: '/cash', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'pending' },
      ];
    case Role.FABRICATION_STAFF:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Active jobs', detail: 'Projects currently assigned to the workshop and still under fabrication.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'fabrication' },
        { label: 'Completed Today', value: d?.completedToday ?? 0, icon: Activity, description: 'Finished', detail: 'Fabrication tasks or project stages marked complete today.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'success' },
      ];
    case Role.ADMIN:
      return [
        { label: 'Monthly Revenue', value: formatCurrencyDashboard(d?.revenueThisMonth ?? 0), icon: Coins, description: 'Collected this month', detail: 'Verified revenue booked during the current reporting month.', path: '/reports', trend: 'up', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'success' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: AlertCircle, description: 'Records to verify', detail: 'Received payment records waiting for cashier review or admin visibility.', path: '/payments?tab=cashier-queue', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'pending' },
        { label: 'Today\'s Schedule', value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Appointments', detail: 'All appointments scheduled for today across the operation.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'progress' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', detail: 'Projects currently active in the workshop.', path: '/projects', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'fabrication' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Appointment requests', detail: 'Customer appointment requests still waiting for scheduling action.', path: '/appointments', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'pending' },
        { label: 'Pending Cash', value: d?.pendingCashPayments ?? 0, icon: Banknote, description: 'Cash to collect', detail: 'Cash-linked payments still waiting for collection or posting.', path: '/cash', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'pending' },
        { label: 'Team Members', value: d?.totalUsers ?? 0, icon: Users, description: 'Active accounts', detail: 'User accounts currently active in the system.', path: '/users', color: 'text-[#1d1d1f] bg-[#f0f0f5]', badgeTone: 'neutral' },
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
        { label: 'Book Appointment', path: '/appointments/book', icon: CalendarCheck, description: 'Schedule appointment', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
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
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'Blueprints & fabrication', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Visit Reports', path: '/visit-reports', icon: FileText, description: 'Review site inspections', color: 'from-[#2d2d2f] to-[#1d1d1f]' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Analytics & metrics', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
      );
      break;
    case Role.CASHIER:
      actions.push(
        { label: 'Cashier Queue', path: '/payments?tab=cashier-queue', icon: CreditCard, description: 'Verify payment records', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Financial analytics', color: 'from-[#5a5a5e] to-[#4a4a4e]' },
      );
      break;
    case Role.FABRICATION_STAFF:
      actions.push(
        { label: 'Job Queue', path: '/projects', icon: Hammer, description: 'Active fabrication tasks', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'All assigned projects', color: 'from-[#2d2d2f] to-[#1d1d1f]' },
        { label: 'Visit Reports', path: '/visit-reports', icon: FileText, description: 'Site inspection data', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
      );
      break;
    case Role.ADMIN:
      actions.push(
        { label: 'Appointments', path: '/appointments', icon: CalendarDays, description: 'Manage schedule', color: 'from-[#1d1d1f] to-[#2d2d2f]' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'All projects', color: 'from-[#2d2d2f] to-[#1d1d1f]' },
        { label: 'Cashier Queue', path: '/payments?tab=cashier-queue', icon: CreditCard, description: 'Verify payment records', color: 'from-[#3a3a3e] to-[#2a2a2e]' },
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
  const activeProjectQuery = useProjects({ status: 'active', limit: '1' });

  // Decide which data source to use
  const activityLoading = isAdmin ? auditQuery.isLoading : notifQuery.isLoading;

  if (isError) return <PageError onRetry={refetch} />;

  const primaryRole =
    user?.roles.find((r) => r !== Role.ADMIN) ?? user?.roles[0] ?? Role.CUSTOMER;
  const dashboardRole = primaryRole as Role;
  const kpis = getRoleKpis(
    primaryRole as Role,
    data as Record<string, unknown> | undefined,
  ).filter((item) => roleCanOpenDashboardPath(dashboardRole, item.path));
  const actions = getRoleActions(primaryRole as Role)
    .filter((action) => roleCanOpenDashboardPath(dashboardRole, action.path));
  const featuredKpis = kpis.slice(0, Math.min(2, kpis.length));
  const secondaryKpis = kpis.slice(featuredKpis.length);
  const actionHeading = getRoleActionHeading(primaryRole as Role);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (primaryRole === Role.CUSTOMER) {
    return (
      <CustomerDashboard
        firstName={user?.firstName || 'there'}
        summary={data as Record<string, number> | undefined}
        isLoading={isLoading}
        notifications={notifQuery.data?.items ?? []}
        notificationsLoading={notifQuery.isLoading}
        activeProject={activeProjectQuery.data?.items?.[0]}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-metal-muted-color)]">
            Overview
          </p>
          <div className="metal-pill mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-color)]">
            {getRoleWorkspaceLabel(primaryRole as Role)}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-card-foreground)] sm:text-[2rem]">
            {greeting()}, {user?.firstName}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-metal-color)]">
            {getRoleGreeting(primaryRole as Role)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="metal-pill rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-metal-color)]">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-2">
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
              return (
                <Link key={i} to={item.path} className="block">
                  <Card
                    className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_22px_36px_rgba(18,22,27,0.12)] focus-within:ring-2 focus-within:ring-[#c7d0da]"
                  >
                    <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_68%)] sm:hidden" />
                    <CardContent className="relative flex min-h-[172px] flex-col p-4 sm:min-h-0 sm:p-6">
                      <div className="mb-4 flex flex-col items-start gap-2.5 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between sm:mb-4">
                        <div
                          className="silver-sheen flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(18,22,27,0.12)] transition-transform group-hover:scale-[1.03] sm:h-11 sm:w-11 sm:rounded-2xl dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_12px_26px_rgba(0,0,0,0.26)]"
                        >
                          <item.icon className="h-4.5 w-4.5 text-[#2b3138] sm:h-5 sm:w-5" />
                        </div>
                        {item.description && (
                          <span className={`hidden whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.01em] backdrop-blur-sm sm:inline-flex sm:self-auto sm:text-[11px] ${getKpiBadgeClass(item.badgeTone)}`}>
                            {item.description}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a838d] sm:text-[11px]">
                        {item.label}
                      </p>
                      <div className="mt-2 truncate text-[clamp(1.95rem,7.4vw,2.25rem)] font-bold leading-none tracking-[-0.035em] text-[#171b21] dark:text-slate-100 sm:mt-2 sm:text-4xl">
                        {item.value}
                      </div>
                      <div className="mt-auto pt-3 sm:mt-0 sm:pt-0">
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
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
          {secondaryKpis.map((item, i) => {
            return (
              <Link key={`${item.label}-${i}`} to={item.path} className="block">
                <Card
                  className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_20px_34px_rgba(18,22,27,0.1)] focus-within:ring-2 focus-within:ring-[#c7d0da]"
                >
                  <div className="absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_70%)] sm:hidden" />
                  <CardContent className="relative flex min-h-[142px] flex-col p-3.5 sm:min-h-0 sm:p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="silver-sheen flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_22px_rgba(18,22,27,0.1)] transition-transform group-hover:scale-[1.03] sm:h-9 sm:w-9 sm:rounded-xl dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_12px_24px_rgba(0,0,0,0.24)]">
                        <item.icon className="h-4.5 w-4.5 text-[#2b3138] sm:h-4 sm:w-4" />
                      </div>
                    </div>
                    <div className="truncate text-[clamp(1.55rem,6.1vw,1.95rem)] font-bold leading-none tracking-[-0.03em] text-[#171b21] dark:text-slate-100 sm:text-2xl">{item.value}</div>
                    <div className="mt-auto pt-3">
                      <p className="text-[12px] font-semibold text-[#434c56] dark:text-slate-300 sm:text-[11px]">{item.label}</p>
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
            <h3 className="text-base font-semibold text-[var(--color-card-foreground)]">{actionHeading.title}</h3>
            <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">{actionHeading.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {actions.map((action) => (
            <Link key={action.label} to={action.path} className="group outline-none">
              <div className="relative flex items-center gap-4 overflow-hidden rounded-[1.25rem] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 transition-all duration-300 hover:border-transparent hover:bg-[color:var(--color-primary)] hover:shadow-xl hover:-translate-y-1 focus-within:ring-2 focus-within:ring-[color:var(--color-primary)] focus-within:ring-offset-2 dark:bg-[color:var(--color-muted)]/30 dark:hover:bg-slate-100">
                <div className="silver-sheen flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_4px_12px_rgba(18,22,27,0.08)] transition-all duration-300 group-hover:scale-110 dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_4px_12px_rgba(0,0,0,0.2)]">
                  <action.icon className="h-5 w-5 text-[#2b3138]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-[color:var(--color-foreground)] transition-colors duration-300 group-hover:text-white dark:group-hover:text-slate-900 sm:text-[15px]">
                    {action.label}
                  </p>
                  <p className="truncate text-xs font-medium text-[color:var(--text-metal-muted-color)] transition-colors duration-300 group-hover:text-white/80 dark:group-hover:text-slate-600">
                    {action.description}
                  </p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent opacity-0 transition-all duration-300 group-hover:bg-white/20 dark:group-hover:bg-slate-200 group-hover:opacity-100">
                  <ArrowRight className="h-4 w-4 text-[color:var(--color-foreground)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-white dark:group-hover:text-slate-900" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Section */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]/65">
          <CardTitle className="text-base font-semibold text-[var(--color-card-foreground)]">
            Recent Activity
          </CardTitle>
          <Link
            to="/notifications"
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-card-foreground)] underline underline-offset-4 hover:text-[var(--text-metal-color)]"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="divide-y divide-[color:var(--color-border)]">
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
              <div className="divide-y divide-[color:var(--color-border)]">
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
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${navPath ? 'cursor-pointer hover:bg-[color:var(--color-muted)]/70' : ''}`}
                      onClick={navPath ? () => navigate(navPath) : undefined}
                      role={navPath ? 'button' : undefined}
                      tabIndex={navPath ? 0 : undefined}
                      onKeyDown={navPath ? (e) => { if (e.key === 'Enter') navigate(navPath); } : undefined}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor} flex-shrink-0`}>
                        <IconComp className={`h-4 w-4 ${textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-card-foreground)] truncate">
                          {display.label}
                        </p>
                        <p className="text-xs text-[#6b7480] dark:text-slate-300 truncate">
                          {actorName}
                          {log.targetType && (
                            <span className="text-[#8a94a3] dark:text-slate-400"> · {log.targetType}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-[#7b8592] dark:text-slate-300">
                          {formatApiTimeAgo(log.createdAt, true)}
                        </span>
                        {navPath && (
                          <Eye className="h-3.5 w-3.5 text-[#8a94a3] dark:text-slate-400" />
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
              <div className="divide-y divide-[color:var(--color-border)]">
                {notifQuery.data.items.map((notif) => {
                  const cat = getNotificationCategory(notif.category);
                  const IconComp = cat.icon;
                  const colorParts = cat.color.split(' ');
                  const textColor = colorParts[0] || '';
                  const bgColor = colorParts[1] || '';

                  return (
                    <div
                      key={notif._id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${notif.link ? 'cursor-pointer hover:bg-[color:var(--color-muted)]/70' : ''} ${!notif.isRead ? 'bg-[color:var(--color-muted)]/82' : ''}`}
                      onClick={notif.link ? () => navigate(notif.link!) : undefined}
                      role={notif.link ? 'button' : undefined}
                      tabIndex={notif.link ? 0 : undefined}
                      onKeyDown={notif.link ? (e) => { if (e.key === 'Enter') navigate(notif.link!); } : undefined}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor} flex-shrink-0`}>
                        <IconComp className={`h-4 w-4 ${textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${notif.isRead ? 'text-[var(--text-metal-color)]' : 'text-[var(--color-card-foreground)]'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-[#6b7480] dark:text-slate-300 truncate">
                          {notif.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-[#7b8592] dark:text-slate-300">
                          {formatApiTimeAgo(notif.createdAt, true)}
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

const CUSTOMER_SAMPLE_PROJECT_REFS = [
  { serviceId: 'kitchen-counter', projectIndex: 0 },
  { serviceId: 'kitchen-cabinet', projectIndex: 0 },
  { serviceId: 'custom', projectIndex: 0 },
  { serviceId: 'railings', projectIndex: 0 },
] as const;

const CUSTOMER_SAMPLE_PROJECTS = CUSTOMER_SAMPLE_PROJECT_REFS.flatMap(({ serviceId, projectIndex }) => {
  const service = getServiceById(serviceId);
  if (!service) return [];
  const project = getServiceProjectReferences(service)[projectIndex];
  return project ? [project] : [];
});

function CustomerDashboard({
  firstName,
  summary,
  isLoading,
  notifications,
  notificationsLoading,
  activeProject,
}: {
  firstName: string;
  summary?: Record<string, number>;
  isLoading: boolean;
  notifications: Array<{ _id: string; title: string; message: string; createdAt: string; link?: string; category: string; isRead: boolean }>;
  notificationsLoading: boolean;
  activeProject?: { _id: string; title: string; projectNumber?: string; serviceType?: string; status: string; updatedAt: string };
}) {
  const [selectedSample, setSelectedSample] = useState<ServiceProjectReference | null>(null);
  const metrics = [
    { label: 'Active projects', value: summary?.activeProjects ?? 0, detail: 'Projects currently moving forward', icon: FolderOpen, to: '/projects' },
    { label: 'Pending visits', value: summary?.pendingAppointments ?? 0, detail: 'Appointments awaiting confirmation', icon: CalendarDays, to: '/appointments' },
    { label: 'Pending payments', value: summary?.pendingPayments ?? 0, detail: 'Items that may need your action', icon: CreditCard, to: '/payments' },
    { label: 'In fabrication', value: summary?.fabricationInProgress ?? 0, detail: 'Projects being built in the workshop', icon: Hammer, to: '/projects' },
  ];

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Customer workspace"
        title={<><span>Good to see you, </span><em>{firstName}.</em></>}
        description="Track your project, review important updates, and take the next step whenever you are ready."
        image="/landing/hero/hero-stainless-railing-bg.png"
        actions={<Link to="/appointments/book" className="workspace-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f5b400] px-5 text-sm font-bold text-[#090b0d] hover:bg-[#ffd047]"><CalendarPlus className="h-4 w-4" /> Request a quote <ArrowRight className="h-4 w-4" /></Link>}
      />

      <section aria-labelledby="customer-sample-projects-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="workspace-eyebrow">Explore our work</p>
            <h2 id="customer-sample-projects-heading" className="mt-1 text-xl font-bold text-[#f7f7f5]">
              Sample projects
            </h2>
            <p className="mt-1 text-sm text-slate-400">Browse fabrication ideas before requesting your quotation.</p>
          </div>
          <Link to="/appointments/book" className="workspace-focus hidden text-sm font-semibold text-[#f5b400] hover:text-[#ffd047] sm:inline-flex sm:items-center sm:gap-1">
            View all designs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CUSTOMER_SAMPLE_PROJECTS.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedSample(project)}
              className="workspace-focus group relative min-h-48 overflow-hidden rounded-xl border border-white/10 bg-[#11161c] sm:min-h-56"
            >
              <img
                src={project.image}
                alt={project.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080a0d] via-[#080a0d]/55 to-transparent" />
              <div className="relative flex h-full min-h-48 flex-col justify-end p-4 sm:min-h-56 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f5b400]">{project.serviceLabel}</p>
                <h3 className="mt-1 text-sm font-bold leading-5 text-white sm:text-base">{project.title}</h3>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/75 group-hover:text-[#f5b400]">
                  View sample <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <Dialog open={Boolean(selectedSample)} onOpenChange={(open) => !open && setSelectedSample(null)}>
        <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto border-white/10 bg-[#0b0f13] p-0 text-white">
          {selectedSample && (
            <>
              <div className="grid md:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
                <img
                  src={selectedSample.image}
                  alt={selectedSample.alt}
                  className="h-72 w-full object-cover md:h-full md:min-h-[420px]"
                />
                <div className="p-6 sm:p-7">
                  <DialogHeader className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f5b400]">{selectedSample.serviceLabel}</p>
                    <DialogTitle className="text-2xl font-bold text-white">{selectedSample.title}</DialogTitle>
                    <DialogDescription className="text-sm leading-7 text-slate-300">
                      {selectedSample.description || 'Use this completed project as the starting reference for your RMV fabrication request.'}
                    </DialogDescription>
                  </DialogHeader>

                  {selectedSample.estimatedPrice && (
                    <div className="mt-5 rounded-xl border border-[#f5b400]/25 bg-[#f5b400]/10 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f5b400]">Estimated Price</p>
                      <p className="mt-2 text-lg font-bold text-white">{selectedSample.estimatedPrice}</p>
                      {selectedSample.priceNote && <p className="mt-2 text-xs leading-5 text-slate-300">{selectedSample.priceNote}</p>}
                    </div>
                  )}

                  {(selectedSample.measurements?.length || selectedSample.detailGroups?.length) ? (
                    <div className="mt-5 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Details to Confirm</p>
                      <ul className="space-y-2 text-sm leading-6 text-slate-300">
                        {(selectedSample.measurements || selectedSample.detailGroups?.flatMap((group) => group.items) || []).slice(0, 6).map((item) => (
                          <li key={item} className="flex gap-2.5">
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#f5b400]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
              <DialogFooter className="border-t border-white/10 bg-[#080b0e] p-4 sm:justify-end">
                <Link
                  to={buildBookingIntentPath({
                    serviceType: selectedSample.serviceType,
                    serviceId: selectedSample.serviceId,
                    designId: selectedSample.id,
                    design: selectedSample.title,
                    designImage: selectedSample.image,
                  })}
                  className="workspace-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f5b400] px-5 text-sm font-bold text-[#090b0d] hover:bg-[#ffd047] sm:w-auto"
                >
                  Avail Service <ArrowRight className="h-4 w-4" />
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Project overview">
        {metrics.map((metric) => (
          <Link key={metric.label} to={metric.to} className="workspace-panel workspace-focus group p-5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-4">
              <span className="workspace-icon"><metric.icon className="h-5 w-5" /></span>
              <ArrowRight className="mt-1 h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-[#f5b400]" />
            </div>
            <p className="mt-6 text-3xl font-bold tracking-tight text-[#f7f7f5]">{isLoading ? '—' : metric.value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-200">{metric.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{metric.detail}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="workspace-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
            <div><p className="workspace-eyebrow">Project overview</p><h2 className="mt-1 text-lg font-bold text-[#f7f7f5]">Your current work</h2></div>
            <Link to="/projects" className="workspace-focus text-sm font-semibold text-[#f5b400] hover:text-[#ffd047]">View projects</Link>
          </div>
          {activeProject ? (
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="workspace-icon shrink-0"><FolderOpen className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold text-[#f7f7f5]">{activeProject.title}</p><p className="mt-1 text-sm text-slate-400">{activeProject.projectNumber || activeProject.serviceType || 'RMV project'}</p><div className="mt-4"><StatusBadge status={activeProject.status} /></div></div>
              </div>
              <Link to={`/projects/${activeProject._id}`} className="workspace-focus mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#f5b400] hover:text-[#ffd047]">Open project <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : (
            <div className="p-6"><p className="text-sm font-semibold text-slate-200">No active project yet</p><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">When a project starts, its current status and next steps will appear here.</p><Link to="/appointments/book" className="workspace-focus mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#f5b400] hover:text-[#ffd047]">Request a quote <ArrowRight className="h-4 w-4" /></Link></div>
          )}
        </div>
        <div className="workspace-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6"><div><p className="workspace-eyebrow">Recent activity</p><h2 className="mt-1 text-lg font-bold text-[#f7f7f5]">Latest updates</h2></div><Link to="/notifications" className="workspace-focus text-sm font-semibold text-[#f5b400] hover:text-[#ffd047]">View all</Link></div>
          <div className="divide-y divide-white/8">
            {notificationsLoading ? <div className="p-6 text-sm text-slate-400">Loading updates…</div> : notifications.length ? notifications.slice(0, 4).map((notification) => <Link key={notification._id} to={notification.link || '/notifications'} className="workspace-focus block px-5 py-4 hover:bg-white/[.035] sm:px-6"><p className="truncate text-sm font-semibold text-slate-100">{notification.title}</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">{notification.message}</p><p className="mt-2 text-xs text-slate-500">{formatApiTimeAgo(notification.createdAt, true)}</p></Link>) : <div className="p-6 text-sm text-slate-400">Updates about your appointments, projects, and payments will appear here.</div>}
          </div>
        </div>
      </section>

      <section className="workspace-panel flex flex-col gap-5 overflow-hidden px-6 py-6 md:flex-row md:items-center md:justify-between" style={{ backgroundImage: "linear-gradient(90deg, rgba(9,11,13,.96), rgba(9,11,13,.7)), url('/landing/about-legacy-welder.png')", backgroundSize: 'cover', backgroundPosition: 'right center' }}>
        <div><p className="workspace-eyebrow">Ready when you are</p><h2 className="mt-2 text-xl font-bold text-[#f7f7f5]">Have a new fabrication project in mind?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Tell us what you need and the RMV team will guide you through the existing consultation and site-review process.</p></div>
        <Link to="/appointments/book" className="workspace-focus inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#f5b400] px-5 text-sm font-bold text-[#090b0d] hover:bg-[#ffd047]">Request a quote <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}

function EmptyActivityState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-44 items-center justify-center">
      <div className="text-center">
        <div className="silver-sheen mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <Activity className="h-5 w-5 text-[var(--text-metal-color)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-metal-color)]">{title}</p>
        <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">{description}</p>
      </div>
    </div>
  );
}
