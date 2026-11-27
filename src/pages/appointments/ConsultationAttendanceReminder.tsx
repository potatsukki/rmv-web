import { Clock } from 'lucide-react';

import { NO_SHOW_GRACE_MINUTES } from '@/lib/consultation-attendance';

export function ConsultationAttendanceReminder() {
  return (
    <aside
      aria-label="Attendance reminder"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
      <div>
        <p className="text-sm font-semibold">Attendance reminder</p>
        <p className="mt-1 text-sm leading-relaxed">
          Once your office consultation is confirmed, please arrive on time. If there’s no check-in{' '}
          {NO_SHOW_GRACE_MINUTES} minutes after the scheduled start, the system will automatically mark your appointment as No Show.
        </p>
      </div>
    </aside>
  );
}
