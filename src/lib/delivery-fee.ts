import type { QuotationDeliveryFee } from './types';

/** e.g. "Delivery / Mobilization (25 km · Truck ×1 trip + crew 3 days)"; same wording as the contract. */
export function describeDeliveryFee(fee?: QuotationDeliveryFee | null) {
  if (!fee) return 'Delivery / Mobilization';
  const label = (key?: string) => fee.ratesSnapshot?.find((rate) => rate.key === key)?.label || key || '';
  const parts: string[] = [];
  if (fee.haulingTrips) parts.push(`${label(fee.haulingVehicle)} ×${fee.haulingTrips} trip${fee.haulingTrips === 1 ? '' : 's'}`.trim());
  if (fee.crewDays) parts.push(`crew ${fee.crewDays} day${fee.crewDays === 1 ? '' : 's'}`);
  const distance = typeof fee.distanceKm === 'number' ? `${fee.distanceKm} km` : '';
  const detail = [distance, parts.join(' + ')].filter(Boolean).join(' · ');
  return detail ? `Delivery / Mobilization (${detail})` : 'Delivery / Mobilization';
}
