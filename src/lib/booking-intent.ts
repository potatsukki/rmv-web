export interface BookingIntent {
  serviceType: string;
  serviceId?: string;
  designId?: string;
  design?: string;
  designImage?: string;
}

export function buildAppointmentPurpose(designName?: string, notes = ''): string {
  const design = designName?.trim();
  const request = design ? `I would like to have this design made: ${design}.` : '';
  return [request, notes.trim()].filter(Boolean).join('\n\n');
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
