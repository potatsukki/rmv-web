import { Role } from '@/lib/constants';
import type { Notification } from '@/lib/types';

/**
 * Notifications page filters (2026-11-28). Each role sees only the chips it needs. A notice whose
 * own chip is not offered to the viewer shows under System. "Assigned" collects the "you were
 * assigned / removed" notices, and only there, for the roles that have it.
 */
export type NotificationFilter =
  | 'all'
  | 'assigned'
  | 'appointment'
  | 'reschedule'
  | 'project'
  | 'payment'
  | 'blueprint'
  | 'fabrication'
  | 'system';

/** Display order of the chips. */
const FILTER_ORDER: readonly NotificationFilter[] = [
  'all', 'assigned', 'appointment', 'reschedule', 'project', 'payment', 'blueprint', 'fabrication', 'system',
];

const FULL_FILTERS: readonly NotificationFilter[] = [
  'appointment', 'reschedule', 'project', 'payment', 'blueprint', 'fabrication', 'system',
];

/** The chips each role sees besides All. */
export const ROLE_NOTIFICATION_FILTERS: Readonly<Record<Role, readonly NotificationFilter[]>> = {
  [Role.CUSTOMER]: FULL_FILTERS,
  [Role.ADMIN]: FULL_FILTERS,
  [Role.SALES_STAFF]: ['assigned', ...FULL_FILTERS],
  [Role.APPOINTMENT_AGENT]: ['appointment', 'reschedule', 'system'],
  [Role.ENGINEER]: ['assigned', 'project', 'fabrication', 'system'],
  [Role.CASHIER]: ['project', 'payment', 'blueprint', 'fabrication', 'system'],
  [Role.FABRICATION_STAFF]: ['assigned', 'project', 'payment', 'fabrication', 'system'],
};

/**
 * Exact titles of the "you were assigned / removed" notices, from rmv-server:
 * - Engineer: Project Assigned, Project Assignment Changed (projects.service assignEngineers).
 * - Fabrication staff: Auto-assigned as Lead, Fabrication Assignment, Fabrication Assignment Changed
 *   (finishFabricationTeamAssignment, updateFabricationAssistants); Installation Assignment,
 *   Installation Assignment Changed (assignDeliveryCrew).
 * - Sales staff: Ocular Visit Assigned (attachOcularAppointmentToProject, reassignAppointmentSales);
 *   New Appointment Assigned, Appointment Reassigned, Appointment Reassignment
 *   (reassignAppointmentSales); Project Reassigned, Project Reassignment (reassignProjectSalesStaff).
 */
export const ASSIGNMENT_NOTIFICATION_TITLES: ReadonlySet<string> = new Set([
  'Project Assigned',
  'Project Assignment Changed',
  'Auto-assigned as Lead',
  'Fabrication Assignment',
  'Fabrication Assignment Changed',
  'Installation Assignment',
  'Installation Assignment Changed',
  'Ocular Visit Assigned',
  'New Appointment Assigned',
  'Appointment Reassigned',
  'Appointment Reassignment',
  'Project Reassigned',
  'Project Reassignment',
]);

type FilterableNotification = Pick<Notification, 'category' | 'title' | 'message'>;

/** The viewer's chips (every role they have), in display order, All first. */
export function notificationFiltersFor(roles: readonly string[] | null | undefined): NotificationFilter[] {
  const offered = new Set<NotificationFilter>();
  for (const role of roles ?? []) {
    for (const filter of ROLE_NOTIFICATION_FILTERS[role as Role] ?? []) offered.add(filter);
  }
  if (offered.size === 0) FULL_FILTERS.forEach((filter) => offered.add(filter));
  return FILTER_ORDER.filter((filter) => filter === 'all' || offered.has(filter));
}

export function isAssignmentNotification(notification: FilterableNotification): boolean {
  return ASSIGNMENT_NOTIFICATION_TITLES.has(String(notification.title ?? '').trim());
}

export function isRescheduleNotification(notification: FilterableNotification): boolean {
  const haystack = `${notification.title ?? ''} ${notification.message ?? ''}`.toLowerCase();
  return notification.category === 'appointment' && haystack.includes('reschedule');
}

/** The one chip (besides All and Reschedule) a notice belongs to for this viewer. */
export function notificationHomeFilter(
  notification: FilterableNotification,
  offered: readonly NotificationFilter[],
): NotificationFilter {
  if (offered.includes('assigned') && isAssignmentNotification(notification)) return 'assigned';
  const category = notification.category as NotificationFilter;
  const isCategoryChip = FULL_FILTERS.includes(category) && category !== 'reschedule';
  return isCategoryChip && offered.includes(category) ? category : 'system';
}

/** Reschedule notices also stay under Appointments, as before. */
export function matchesNotificationFilter(
  notification: FilterableNotification,
  filter: NotificationFilter,
  offered: readonly NotificationFilter[],
): boolean {
  if (filter === 'all') return true;
  if (filter === 'reschedule') return isRescheduleNotification(notification);
  return notificationHomeFilter(notification, offered) === filter;
}
