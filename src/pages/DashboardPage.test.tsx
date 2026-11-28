import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@/lib/constants';

const { auth, countQuery, reviewQuery, requests, todaySchedule } = vi.hoisted(() => ({
  auth: { user: { _id: 'staff-1', firstName: 'Test', roles: ['engineer'] } },
  countQuery: { data: { items: [{ _id: 'first-project' }], total: 173 } as { items: { _id: string }[]; total: number } | undefined, isLoading: false, isError: false },
  reviewQuery: { data: { items: [{ _id: 'review-project' }], total: 1 } as { items: { _id: string }[]; total: number } | undefined, isLoading: false, isError: false },
  requests: [] as { params: Record<string, string>; options: { live?: boolean; enabled?: boolean } }[],
  todaySchedule: { items: [] as { _id: string }[], loaded: true, enabledCalls: [] as boolean[] },
}));

vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => auth }));
vi.mock('@/hooks/useReports', () => ({
  useDashboardSummary: () => ({ data: { activeProjects: 18, fabricationInProgress: 7, pendingBlueprints: 7, totalAppointmentsToday: 9 }, isLoading: false, isError: false }),
  useAuditLogs: () => ({ data: { items: [] }, isLoading: false }),
}));
vi.mock('@/hooks/useAppointments', () => ({
  useTodaySchedule: (enabled: boolean) => {
    todaySchedule.enabledCalls.push(enabled);
    return { items: todaySchedule.items, data: todaySchedule.loaded ? { items: todaySchedule.items } : undefined };
  },
}));
vi.mock('@/hooks/useNotifications', () => ({ useNotifications: () => ({ data: { items: [] }, isLoading: false }) }));
vi.mock('@/hooks/useProjects', () => ({
  useProjects: (params: Record<string, string>, options = {}) => {
    requests.push({ params, options });
    if (params.stage === 'design') return countQuery;
    if (params.stage === 'review') return reviewQuery;
    return { data: { items: [] }, isLoading: false };
  },
}));

import { DashboardPage } from './DashboardPage';

function renderDashboard() {
  return renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

function designCard(html: string) {
  return html.match(/<a\b[^>]*href="\/projects\?stage=design"[^>]*>[\s\S]*?<\/a>/)?.[0];
}

beforeEach(() => {
  auth.user.roles = [Role.ENGINEER];
  countQuery.data = { items: [{ _id: 'first-project' }], total: 173 };
  countQuery.isLoading = false;
  countQuery.isError = false;
  reviewQuery.data = { items: [{ _id: 'review-project' }], total: 1 };
  reviewQuery.isLoading = false;
  reviewQuery.isError = false;
  requests.length = 0;
  todaySchedule.items = [];
  todaySchedule.loaded = true;
  todaySchedule.enabledCalls.length = 0;
});

describe('Engineer Pending Review count and destination', () => {
  function reviewCard() {
    return renderDashboard().match(/<a\b[^>]*href="\/projects\?stage=review"[^>]*>[\s\S]*?<\/a>/)?.[0];
  }

  it('counts the visible For Review projects instead of the unrelated seven blueprint records', () => {
    const card = reviewCard();
    expect(card).toContain('Pending Review');
    expect(card).toContain('>1</div>');
    expect(card).not.toContain('>7</div>');
    expect(requests).toContainEqual({ params: { stage: 'review', limit: '1' }, options: { live: true, enabled: true } });
  });

  it('uses the full review total rather than the size of a page', () => {
    reviewQuery.data = { items: [{ _id: 'first-review' }], total: 128 };
    expect(reviewCard()).toContain('>128</div>');
  });

  it('shows zero when the For Review list is empty', () => {
    reviewQuery.data = { items: [], total: 0 };
    expect(reviewCard()).toContain('>0</div>');
  });

  it('shows an unknown count while review totals have not loaded', () => {
    reviewQuery.data = undefined;
    reviewQuery.isLoading = true;
    expect(reviewCard()).toContain('>\u2014</div>');
  });
});

describe('Dashboard Design / Blueprint count', () => {
  it.each([Role.ENGINEER, Role.SALES_STAFF, Role.ADMIN])('shows the complete matching total and filtered link for %s', (role) => {
    auth.user.roles = [role];
    const card = designCard(renderDashboard());
    expect(card).toBeDefined();
    expect(card).toContain('Design / Blueprint');
    expect(card).toContain('>173</div>');
    expect(requests).toContainEqual({ params: { stage: 'design', limit: '1' }, options: { live: true, enabled: true } });
  });

  it('shows zero when no visible projects are in the design stage', () => {
    countQuery.data = { items: [], total: 0 };
    expect(designCard(renderDashboard())).toContain('>0</div>');
  });

  it.each(['loading', 'error'])('does not report a false zero while the count is %s', (state) => {
    countQuery.data = undefined;
    countQuery.isLoading = state === 'loading';
    countQuery.isError = state === 'error';
    const card = designCard(renderDashboard());
    expect(card).toContain('>\u2014</div>');
    expect(card).not.toContain('>0</div>');
  });

  it.each([Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.CASHIER, Role.FABRICATION_STAFF])('keeps the card and count request inactive for %s', (role) => {
    auth.user.roles = [role];
    expect(designCard(renderDashboard())).toBeUndefined();
    expect(requests).toContainEqual({ params: { stage: 'design', limit: '1' }, options: { live: true, enabled: false } });
  });
});

describe("Today's Schedule card", () => {
  /** The dashboard link with this exact href that holds the Today's Schedule card. */
  function todayCard(html: string, href: string) {
    return html.split('<a ').slice(1)
      .map((chunk) => chunk.slice(0, chunk.indexOf('</a>')))
      .find((card) => card.includes(`href="${href}"`) && card.includes('Today&#x27;s Schedule'));
  }

  it("opens the Sales Staff Today's Schedule page and counts the same Appointed rows", () => {
    auth.user.roles = [Role.SALES_STAFF];
    todaySchedule.items = [{ _id: 'office-9am' }, { _id: 'ocular-10am' }];
    const card = todayCard(renderDashboard(), '/appointments/today');
    expect(card).toBeDefined();
    expect(card).toContain('>2</div>');
    expect(card).not.toContain('>9</div>');
    expect(todaySchedule.enabledCalls).toContain(true);
  });

  it('shows a dash, not a false zero, until the Sales Staff list has loaded', () => {
    auth.user.roles = [Role.SALES_STAFF];
    todaySchedule.loaded = false;
    expect(todayCard(renderDashboard(), '/appointments/today')).toContain('>—</div>');
  });

  it.each([Role.ADMIN, Role.APPOINTMENT_AGENT])('keeps the %s card on the server count and the Appointments page', (role) => {
    auth.user.roles = [role];
    const html = renderDashboard();
    expect(todayCard(html, '/appointments/today')).toBeUndefined();
    expect(todayCard(html, '/appointments')).toContain('>9</div>');
    expect(todaySchedule.enabledCalls.every((enabled) => !enabled)).toBe(true);
  });
});
