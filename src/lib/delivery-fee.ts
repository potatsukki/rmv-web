import type { QuotationDeliveryFee } from './types';

/** Label of the engineer's manual courier fee; same wording as the server and the contract (no "(third party)"). */
export const THIRD_PARTY_DELIVERY_LABEL = 'Transport / Delivery';

/**
 * Manual third-party fees read THIRD_PARTY_DELIVERY_LABEL; older auto-computed fees keep
 * "Delivery / Mobilization (25 km · Truck ×1 trip + crew 3 days)".
 */
export function describeDeliveryFee(fee?: QuotationDeliveryFee | null) {
  if (!fee) return THIRD_PARTY_DELIVERY_LABEL;
  const isLegacyComputed = typeof fee.distanceKm === 'number' || Boolean(fee.haulingTrips) || Boolean(fee.crewDays);
  if (!isLegacyComputed) return THIRD_PARTY_DELIVERY_LABEL;
  const label = (key?: string) => fee.ratesSnapshot?.find((rate) => rate.key === key)?.label || key || '';
  const parts: string[] = [];
  if (fee.haulingTrips) parts.push(`${label(fee.haulingVehicle)} ×${fee.haulingTrips} trip${fee.haulingTrips === 1 ? '' : 's'}`.trim());
  if (fee.crewDays) parts.push(`crew ${fee.crewDays} day${fee.crewDays === 1 ? '' : 's'}`);
  const distance = typeof fee.distanceKm === 'number' ? `${fee.distanceKm} km` : '';
  const detail = [distance, parts.join(' + ')].filter(Boolean).join(' · ');
  return detail ? `Delivery / Mobilization (${detail})` : 'Delivery / Mobilization';
}
