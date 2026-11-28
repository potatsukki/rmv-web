import { describe, expect, it } from 'vitest';

import { Role } from '@/lib/constants';
import {
  matchesNotificationFilter,
  notificationFiltersFor,
  notificationHomeFilter,
  type NotificationFilter,
} from '@/lib/notification-filters';

const notice = (category: string, title: string, message = '') => ({ category, title, message });

/** The chips (besides All) a notice shows under for a viewer with these roles. */
function shownUnder(roles: Role[], notification: ReturnType<typeof notice>): NotificationFilter[] {
  const offered = notificationFiltersFor(roles);
  return offered.filter((filter) => filter !== 'all' && matchesNotificationFilter(notification, filter, offered));
}

const FULL = ['all', 'appointment', 'reschedule', 'project', 'payment', 'blueprint', 'fabrication', 'system'];

describe('notification chips per role', () => {
  it.each([
    [Role.APPOINTMENT_AGENT, ['all', 'appointment', 'reschedule', 'system']],
    [Role.ENGINEER, ['all', 'assigned', 'project', 'fabrication', 'system']],
    [Role.CASHIER, ['all', 'project', 'payment', 'blueprint', 'fabrication', 'system']],
    [Role.FABRICATION_STAFF, ['all', 'assigned', 'project', 'payment', 'fabrication', 'system']],
    [Role.SALES_STAFF, ['all', 'assigned', 'appointment', 'reschedule', 'project', 'payment', 'blueprint', 'fabrication', 'system']],
    [Role.ADMIN, FULL],
    [Role.CUSTOMER, FULL],
  ])('%s sees only its own chips', (role, expected) => {
    expect(notificationFiltersFor([role])).toEqual(expected);
  });

  it('combines the chips of every role the user has, in display order', () => {
    expect(notificationFiltersFor([Role.CASHIER, Role.APPOINTMENT_AGENT])).toEqual(FULL);
    expect(notificationFiltersFor([Role.ENGINEER, Role.CASHIER]))
      .toEqual(['all', 'assigned', 'project', 'payment', 'blueprint', 'fabrication', 'system']);
  });

  it('falls back to the full list when no known role is loaded', () => {
    expect(notificationFiltersFor(undefined)).toEqual(FULL);
    expect(notificationFiltersFor(['unknown_role'])).toEqual(FULL);
  });
});

describe('where a notice shows', () => {
  it('moves the engineer\'s old "Project Assigned" (category system) out of System into Assigned only', () => {
    const projectAssigned = notice('system', 'Project Assigned', 'You have been assigned to project "Railings Project".');
    expect(shownUnder([Role.ENGINEER], projectAssigned)).toEqual(['assigned']);
    expect(shownUnder([Role.ENGINEER], notice('system', 'Project Assignment Changed'))).toEqual(['assigned']);
  });

  it('sends the engineer\'s blueprint notices to System, keeps project and fabrication notices in place', () => {
    for (const title of ['Blueprint Fully Approved', 'Component Approved', 'Revision Requested', 'Blueprint Accepted']) {
      expect(shownUnder([Role.ENGINEER], notice('blueprint', title))).toEqual(['system']);
    }
    expect(shownUnder([Role.ENGINEER], notice('system', 'Contract Signed'))).toEqual(['system']);
    expect(shownUnder([Role.ENGINEER], notice('project', 'New Project Submitted'))).toEqual(['project']);
    expect(shownUnder([Role.ENGINEER], notice('fabrication', 'Fabrication Team Assigned Automatically'))).toEqual(['fabrication']);
    expect(shownUnder([Role.ENGINEER], notice('appointment', 'Appointment Rescheduled', 'was rescheduled'))).toEqual(['system']);
  });

  it('sends the agent\'s payment notice to System and keeps reschedules under Appointments and Reschedule', () => {
    expect(shownUnder([Role.APPOINTMENT_AGENT], notice('payment', 'Ocular Fee Cash Request'))).toEqual(['system']);
    expect(shownUnder(
      [Role.APPOINTMENT_AGENT],
      notice('appointment', 'Appointment Rescheduled', 'APT-20261127-0026 was rescheduled to Nov 30 by Alice Admin.'),
    )).toEqual(['appointment', 'reschedule']);
    expect(shownUnder([Role.APPOINTMENT_AGENT], notice('appointment', 'Consultation No-Show'))).toEqual(['appointment']);
  });

  it('puts fabrication assignments under Assigned and the team\'s payment notices under Payments', () => {
    const roles = [Role.FABRICATION_STAFF];
    for (const title of [
      'Auto-assigned as Lead',
      'Fabrication Assignment',
      'Fabrication Assignment Changed',
      'Installation Assignment',
      'Installation Assignment Changed',
    ]) {
      expect(shownUnder(roles, notice('fabrication', title))).toEqual(['assigned']);
    }
    for (const title of ['1st Payment Verified', 'Full Payment Verified', '2nd Payment Verified', 'All Payments Verified']) {
      expect(shownUnder(roles, notice('payment', title))).toEqual(['payment']);
    }
    expect(shownUnder(roles, notice('fabrication', 'Fabrication Team Updated'))).toEqual(['fabrication']);
    expect(shownUnder(roles, notice('project', 'Installation Confirmed'))).toEqual(['project']);
  });

  it('moves the sales staff\'s assignment notices from Appointments / Projects to Assigned', () => {
    const salesAssignments: ReadonlyArray<[string, string]> = [
      ['appointment', 'Ocular Visit Assigned'],
      ['appointment', 'New Appointment Assigned'],
      ['appointment', 'Appointment Reassigned'],
      ['appointment', 'Appointment Reassignment'],
      ['project', 'Project Reassigned'],
      ['project', 'Project Reassignment'],
    ];
    for (const [category, title] of salesAssignments) {
      expect(shownUnder([Role.SALES_STAFF], notice(category, title))).toEqual(['assigned']);
    }
    expect(shownUnder([Role.SALES_STAFF], notice('appointment', 'Appointment Rescheduled', 'was rescheduled')))
      .toEqual(['appointment', 'reschedule']);
  });

  it('leaves the cashier, admin and customer chips as before', () => {
    expect(shownUnder([Role.CASHIER], notice('payment', 'Cash to Receive'))).toEqual(['payment']);
    expect(shownUnder([Role.CASHIER], notice('blueprint', 'Quotation Issued'))).toEqual(['blueprint']);
    expect(shownUnder([Role.ADMIN], notice('project', 'Project Reassigned'))).toEqual(['project']);
    expect(shownUnder([Role.CUSTOMER], notice('fabrication', 'Fabrication Updates Unlocked'))).toEqual(['fabrication']);
  });

  it('shows an unknown category under System', () => {
    expect(notificationHomeFilter(notice('mystery', 'Something new'), notificationFiltersFor([Role.ENGINEER]))).toBe('system');
  });
});
