/**
 * The server's "this customer already has an appointment at that time" error
 * (409 CUSTOMER_SCHEDULE_CONFLICT): a consultation and an ocular visit of the same customer
 * can't overlap, whoever the sales staff are.
 */
export interface CustomerScheduleConflict {
  /** Names the appointment in the way and its date and time. */
  message: string;
  /** The date (yyyy-MM-dd) and time slot the form sent: the ones to change. */
  requestedDate?: string;
  requestedSlotCode?: string;
}

export function getCustomerScheduleConflict(error: unknown): CustomerScheduleConflict | null {
  const apiError = (error as {
    response?: { data?: { error?: { code?: string; message?: string; details?: Record<string, unknown> } } };
  } | null)?.response?.data?.error;
  if (apiError?.code !== 'CUSTOMER_SCHEDULE_CONFLICT' || !apiError.message) return null;
  const text = (value: unknown) => (typeof value === 'string' ? value : undefined);
  return {
    message: apiError.message,
    requestedDate: text(apiError.details?.requestedDate),
    requestedSlotCode: text(apiError.details?.requestedSlotCode),
  };
}

/** The conflict to show for the date and time chosen in the form: gone once either one changes. */
export function conflictForSelection(
  conflict: CustomerScheduleConflict | null,
  date: string | undefined,
  slotCode: string | undefined,
): CustomerScheduleConflict | null {
  return conflict && conflict.requestedDate === date && conflict.requestedSlotCode === slotCode ? conflict : null;
}

/** "Nov 18, 2026, 9:00 AM" for the date and time that must be changed. */
export function formatConflictRequest(conflict: CustomerScheduleConflict): string {
  const [year = 0, month = 1, day = 1] = (conflict.requestedDate ?? '').split('-').map(Number);
  const dateLabel = conflict.requestedDate
    ? new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const [hour = 0, minute = 0] = (conflict.requestedSlotCode ?? '').split(':').map(Number);
  const timeLabel = conflict.requestedSlotCode
    ? `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
    : '';
  return [dateLabel, timeLabel].filter(Boolean).join(', ');
}
