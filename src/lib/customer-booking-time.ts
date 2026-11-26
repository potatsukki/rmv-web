import { addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const CUSTOMER_BOOKING_CUTOFF = '16:00';

export function getCustomerBookingWindow(now: Date) {
  const manilaNow = toZonedTime(now, 'Asia/Manila');
  const today = format(manilaNow, 'yyyy-MM-dd');
  const time = format(manilaNow, 'HH:mm');
  const earliestDate = time < CUSTOMER_BOOKING_CUTOFF
    ? today
    : format(addDays(manilaNow, 1), 'yyyy-MM-dd');
  return { today, time, earliestDate };
}
