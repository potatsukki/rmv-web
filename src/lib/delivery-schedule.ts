import type { DeliverySchedule } from './types';

/** Today's date in Asia/Manila as YYYY-MM-DD (the delivery date picker's minimum). */
export function manilaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function dayParts(date: string) {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

export function isSunday(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && dayParts(date).getUTCDay() === 0;
}

/** "Nov 25, 2026" for a YYYY-MM-DD day. */
export function formatDeliveryDay(date: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(dayParts(date));
}

/** Client-side check before saving; the server applies the same rules plus holidays. */
export function deliveryDateError(date: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choose the delivery / installation date';
  if (date < manilaToday(now)) return 'The delivery / installation date cannot be in the past';
  if (isSunday(date)) return 'Delivery / installation is Monday to Saturday. Choose another date.';
  return null;
}

/** e.g. "Nov 25, 2026". The drive time / distance is no longer shown. */
export function describeDeliverySchedule(schedule?: DeliverySchedule | null) {
  if (!schedule?.date) return '';
  return formatDeliveryDay(schedule.date);
}
