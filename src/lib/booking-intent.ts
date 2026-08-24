export interface BookingIntent {
  serviceType: string;
  serviceId?: string;
  designId?: string;
  design?: string;
  designImage?: string;
}

export function buildBookingIntentPath(intent: BookingIntent): string {
  const params = new URLSearchParams();
  const entries: Array<[string, string | undefined]> = [
    ['serviceType', intent.serviceType],
    ['serviceId', intent.serviceId],
    ['designId', intent.designId],
    ['design', intent.design],
    ['designImage', intent.designImage],
  ];

  for (const [key, value] of entries) {
    const normalizedValue = value?.trim();
    if (normalizedValue) params.set(key, normalizedValue);
  }

  const query = params.toString();
  return query ? `/appointments/book?${query}` : '/appointments/book';
}
