import { useState } from 'react';
import { CalendarClock, CheckCircle2, FileSignature, Info, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatSlotTime, formatTravelDuration, ScheduleOcularDialog } from '@/components/shared/ScheduleOcularDialog';

/** Who takes the scheduled ocular visit, when, and how far the site is from the shop. */
export interface OcularVisitSummary {
  staffName?: string;
  date?: string;
  slotCode?: string;
  travelDurationMinutes?: number;
  distanceKm?: number;
}

function formatVisitDate(dateStr: string) {
  const [year = 0, month = 1, day = 1] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ProjectOcularStepsProps {
  projectId: string;
  contractUploaded: boolean;
  ocularAppointmentId?: string;
  ocularStatus?: string;
  /** Assigned sales staff or admin: the only ones who see the action buttons. */
  canManage: boolean;
  isCustomer: boolean;
  onSignContract: () => void;
  onViewOcular: () => void;
  /** Consultation date (yyyy-MM-dd); the ocular visit must be at least 3 days after it. */
  consultationDate?: string;
  /** The project's sales staff: picked by default when scheduling the ocular visit. */
  salesStaffId?: string;
  /** Staff only: the scheduled visit's staff, schedule, and travel time. */
  ocularVisit?: OcularVisitSummary;
}

/**
 * "For Ocular" project steps: Sign Contract → Schedule Ocular Visit (blocked until the contract is
 * uploaded) → ocular visit + report. Submitting the ocular report moves the project to "For Review".
 */
export function ProjectOcularSteps({
  projectId,
  contractUploaded,
  ocularAppointmentId,
  ocularStatus,
  canManage,
  isCustomer,
  onSignContract,
  onViewOcular,
  consultationDate,
  salesStaffId,
  ocularVisit,
}: ProjectOcularStepsProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const ocularScheduled = Boolean(ocularAppointmentId);
  const showVisitSummary = ocularScheduled && !isCustomer && Boolean(ocularVisit?.staffName || ocularVisit?.date);
  const ocularCompleted = ocularStatus === 'completed';

  const title = ocularCompleted ? 'For Ocular · Visit Finished' : 'For Ocular';
  const description = isCustomer
    ? ocularScheduled
      ? 'Your ocular site visit is scheduled. Our sales staff will send your project for review after the visit.'
      : 'Our sales staff will upload your signed contract and schedule the ocular site visit with you.'
    : !contractUploaded
      ? 'Upload the signed contract first, then schedule the ocular visit agreed with the customer.'
      : !ocularScheduled
        ? 'The signed contract is uploaded. Schedule the ocular visit next.'
        : !ocularCompleted
          ? 'Complete the ocular visit and submit its report. The project moves to For Review automatically.'
          : 'The ocular visit is finished. Submit any remaining ocular report and the project moves to For Review automatically.';

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {showVisitSummary && ocularVisit && (
          <dl className="grid gap-x-6 gap-y-2 rounded-lg border bg-background p-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Ocular staff</dt>
              <dd className="font-medium">{ocularVisit.staffName || 'Not assigned'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Schedule</dt>
              <dd className="font-medium">
                {ocularVisit.date ? formatVisitDate(ocularVisit.date) : '—'}
                {ocularVisit.slotCode ? `, ${formatSlotTime(ocularVisit.slotCode)}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Travel from RMV shop</dt>
              <dd className="font-medium">
                {ocularVisit.travelDurationMinutes != null
                  ? `~${formatTravelDuration(ocularVisit.travelDurationMinutes)}${ocularVisit.distanceKm != null ? ` (${ocularVisit.distanceKm.toFixed(1)} km)` : ''}`
                  : ocularVisit.distanceKm != null ? `${ocularVisit.distanceKm.toFixed(1)} km` : '—'}
              </dd>
            </div>
          </dl>
        )}

        {canManage && (
          <>
            {!ocularScheduled ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={contractUploaded ? 'outline' : 'default'} onClick={onSignContract}>
                    {contractUploaded ? <CheckCircle2 className="h-4 w-4" /> : <FileSignature className="h-4 w-4" />}
                    {contractUploaded ? 'Contract Uploaded' : 'Sign Contract'}
                  </Button>
                  <Button type="button" disabled={!contractUploaded} onClick={() => setScheduleOpen(true)}>
                    <CalendarClock className="h-4 w-4" />
                    Schedule Ocular Visit
                  </Button>
                </div>
                {!contractUploaded && (
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Upload the signed contract first before scheduling the ocular visit.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onViewOcular}>
                  <MapPin className="h-4 w-4" />
                  View Ocular Visit
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {canManage && (
        <ScheduleOcularDialog
          projectId={projectId}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          consultationDate={consultationDate}
          salesStaffId={salesStaffId}
        />
      )}

    </Card>
  );
}
