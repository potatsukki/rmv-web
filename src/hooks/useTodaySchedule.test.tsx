import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppointmentStatus } from '@/lib/constants';

const { clock, queries, result } = vi.hoisted(() => ({
  clock: { now: new Date('2026-11-28T02:00:00.000Z') },
  queries: [] as { queryKey: unknown[]; enabled?: boolean; refetchInterval?: unknown }[],
  result: { data: undefined as { items: unknown[] } | undefined, isLoading: false, isError: false },
}));

vi.mock('@/lib/server-clock', () => ({ serverNow: () => clock.now, serverNowMs: () => clock.now.getTime() }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQuery: (options: { queryKey: unknown[]; enabled?: boolean; refetchInterval?: unknown }) => {
    queries.push(options);
    return result;
  },
}));

import { useTodaySchedule } from './useAppointments';

function Probe({ enabled = true }: { enabled?: boolean }) {
  const { today, items, data } = useTodaySchedule(enabled);
  return <output>{JSON.stringify({ today, ids: items.map((item) => item._id), loaded: Boolean(data) })}</output>;
}

function render(enabled = true) {
  const html = renderToStaticMarkup(<Probe enabled={enabled} />);
  return JSON.parse(html.replace(/^<output>|<\/output>$/g, '').replace(/&quot;/g, '"'));
}

beforeEach(() => {
  queries.length = 0;
  clock.now = new Date('2026-11-28T02:00:00.000Z');
  result.data = undefined;
});

describe('useTodaySchedule', () => {
  it('asks the appointments list for today in Manila, live (30 s poll + socket refetch)', () => {
    render();
    expect(queries).toHaveLength(1);
    expect(queries[0]!.queryKey).toEqual(['appointments', 'list', {
      date: '2026-11-28', sortBy: 'slotCode', sortOrder: 'asc', limit: '100',
    }]);
    expect(queries[0]!.enabled).toBe(true);
    expect(queries[0]!.refetchInterval).toBeTruthy();
  });

  it('uses the Manila date from the server clock, which turns over at Manila midnight', () => {
    clock.now = new Date('2026-11-28T15:59:00.000Z'); // 11:59 PM Manila
    expect(render().today).toBe('2026-11-28');
    clock.now = new Date('2026-11-28T16:00:00.000Z'); // 12:00 AM Manila, Nov 29
    expect(render().today).toBe('2026-11-29');
  });

  it('returns only the Appointed rows, and no rows until the list has loaded', () => {
    expect(render()).toMatchObject({ ids: [], loaded: false });
    result.data = {
      items: [
        { _id: 'ocular', type: 'ocular', slotCode: '15:00', status: AppointmentStatus.CONFIRMED, salesStaffId: 's' },
        { _id: 'requested', type: 'office', slotCode: '09:00', status: AppointmentStatus.REQUESTED },
        { _id: 'office', type: 'office', slotCode: '10:00', status: AppointmentStatus.CONFIRMED, salesStaffId: 's' },
        { _id: 'done', type: 'office', slotCode: '11:00', status: AppointmentStatus.COMPLETED, salesStaffId: 's' },
      ],
    };
    expect(render()).toMatchObject({ ids: ['office', 'ocular'], loaded: true });
  });

  it('does not fetch when disabled (dashboards of other roles)', () => {
    render(false);
    expect(queries[0]!.enabled).toBe(false);
  });
});
