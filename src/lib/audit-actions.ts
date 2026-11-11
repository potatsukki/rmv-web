import type { ElementType } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  FolderOpen,
  Hammer,
  LogIn,
  MapPin,
  Receipt,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import type { AuditLog } from '@/lib/types';

export interface AuditActionDisplay {
  icon: ElementType;
  label: string;
  color: string;
}

// ── Audit action display mapping (shared by the dashboard, Activity timelines and Activity Log) ──
export const AUDIT_ACTION_MAP: Record<string, AuditActionDisplay> = {
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
  delivery_crew_assigned: { icon: Users,    label: 'Delivery / installation crew assigned', color: 'text-orange-600 bg-orange-50' },
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
  appointment_updated:   { icon: CalendarDays,  label: 'Appointment updated',    color: 'text-blue-600 bg-blue-50' },
  appointment_preparing: { icon: Clock,         label: 'Preparing for the visit', color: 'text-sky-600 bg-sky-50' },
  appointment_on_the_way: { icon: MapPin,       label: 'On the way to the site', color: 'text-sky-600 bg-sky-50' },
  appointment_arrived_at_site: { icon: MapPin,  label: 'Arrived at the site',    color: 'text-indigo-600 bg-indigo-50' },
  appointment_in_progress: { icon: Clock,       label: 'Site visit started',     color: 'text-indigo-600 bg-indigo-50' },
  appointment_attendance_updated: { icon: UserCheck, label: 'Attendance updated', color: 'text-blue-600 bg-blue-50' },
  appointment_location_submitted: { icon: MapPin, label: 'Site location submitted', color: 'text-cyan-600 bg-cyan-50' },
  visit_report_deleted:  { icon: ClipboardCheck, label: 'Visit report deleted',  color: 'text-red-600 bg-red-50' },
  lifecycle_mismatch_blocked: { icon: AlertCircle, label: 'Blocked step',        color: 'text-amber-600 bg-amber-50' },
};

export const DEFAULT_ACTION_DISPLAY: AuditActionDisplay = { icon: Activity, label: 'Action performed', color: 'text-gray-500 bg-gray-50' };

export function getAuditDisplay(action: string): AuditActionDisplay {
  return AUDIT_ACTION_MAP[action] ?? DEFAULT_ACTION_DISPLAY;
}

/** The page that shows the record an audit entry is about. */
export function getAuditNavPath(log: Pick<AuditLog, 'targetType' | 'targetId'>): string | undefined {
  if (!log.targetType || !log.targetId) return undefined;
  const map: Record<string, string> = {
    appointment: `/appointments/${log.targetId}`,
    project: `/projects/${log.targetId}`,
    payment: '/payments',
    user: '/users',
    blueprint: '/projects',
    fabrication: '/projects',
    visit_report: `/visit-reports/${log.targetId}`,
  };
  return map[log.targetType];
}

const humanize = (value: string) => value.replace(/_/g, ' ');

/** A short line from an entry's details, e.g. "confirmed → on the way" or "Nov 12 → Nov 15". */
export function describeAuditDetails(details?: Record<string, unknown>): string | undefined {
  if (!details) return undefined;
  const parts: string[] = [];
  const from = details.fromStatus ?? details.from ?? details.previousAttendanceStatus;
  const to = details.toStatus ?? details.to ?? details.attendanceStatus;
  if (typeof from === 'string' && typeof to === 'string' && from !== to) parts.push(`${humanize(from)} → ${humanize(to)}`);
  else if (typeof to === 'string' && !from) parts.push(humanize(to));
  if (typeof details.oldDate === 'string' && typeof details.newDate === 'string') {
    parts.push(`${details.oldDate} ${details.oldSlotCode ?? ''} → ${details.newDate} ${details.newSlotCode ?? ''}`.replace(/\s+/g, ' ').trim());
  }
  if (typeof details.action === 'string') parts.push(humanize(details.action));
  if (typeof details.reason === 'string' && !details.automatic) parts.push(humanize(details.reason));
  return parts.length ? parts.join(' · ') : undefined;
}
