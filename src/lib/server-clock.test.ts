import { afterEach, describe, expect, it } from 'vitest';
import { serverNow, serverNowMs, syncServerClock } from './server-clock';
import { formatApiTimeAgo } from './utils';
import { getNoShowAvailability } from './consultation-attendance';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('server clock (Date header of API responses)', () => {
  afterEach(() => {
    // Back to "this device's clock is right".
    syncServerClock(new Date().toUTCString());
  });

  it('follows the server when the device clock is a day ahead', () => {
    const deviceNow = Date.now();
    syncServerClock(new Date(deviceNow - DAY_MS).toUTCString(), deviceNow);

    expect(Math.abs(serverNowMs() - (Date.now() - DAY_MS))).toBeLessThan(2_000);
  });

  it('ignores a difference of a few seconds (header precision and latency)', () => {
    const deviceNow = Date.now();
    syncServerClock(new Date(deviceNow + 3_000).toUTCString(), deviceNow);

    expect(Math.abs(serverNowMs() - Date.now())).toBeLessThan(50);
  });

  it('ignores a missing or unreadable header', () => {
    syncServerClock(undefined);
    syncServerClock('not a date');

    expect(Math.abs(serverNow().getTime() - Date.now())).toBeLessThan(50);
  });

  it('keeps "time ago" right on a device whose clock was moved a day ahead', () => {
    syncServerClock(new Date(Date.now() - DAY_MS).toUTCString());
    const threeHoursAgoOnServer = new Date(serverNowMs() - 3 * 60 * 60 * 1000).toISOString();

    expect(formatApiTimeAgo(threeHoursAgoOnServer)).toBe('3 hours ago');
  });

  it('opens Mark as No Show by the server clock, not the device clock', () => {
    // The server says it is 9:16 AM on the appointment date; the device clock says otherwise.
    const serverTime = new Date('2026-11-25T09:16:00+08:00');
    syncServerClock(serverTime.toUTCString());

    expect(getNoShowAvailability('2026-11-25', '09:00').allowed).toBe(true);

    syncServerClock(new Date('2026-11-25T09:14:00+08:00').toUTCString());
    expect(getNoShowAvailability('2026-11-25', '09:00')).toMatchObject({ allowed: false, hint: 'Available on Nov 25 from 9:15 AM' });
  });
});
