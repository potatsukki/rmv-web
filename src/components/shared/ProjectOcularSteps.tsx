import { useState } from 'react';
import { CalendarClock, CheckCircle2, FileSignature, Info, Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScheduleOcularDialog } from '@/components/shared/ScheduleOcularDialog';
import { useMarkOcularDone } from '@/hooks/useProjects';
import { extractErrorMessage } from '@/lib/utils';

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
}

/**
 * "For Ocular" project steps: Sign Contract → Schedule Ocular Visit (blocked until the contract is
 * uploaded) → ocular visit + report → Done Ocular ("For Review").
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
}: ProjectOcularStepsProps) {
  const markOcularDone = useMarkOcularDone();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [ocularNeededOpen, setOcularNeededOpen] = useState(false);
  const ocularScheduled = Boolean(ocularAppointmentId);
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
          ? 'Complete the ocular visit and submit its report, then press Done Ocular.'
          : 'The ocular visit is finished. Press Done Ocular to send the project for review.';

  async function handleDoneOcular() {
    if (!ocularScheduled || !ocularCompleted) {
      setOcularNeededOpen(true);
      return;
    }
    try {
      await markOcularDone.mutateAsync(projectId);
      toast.success('Ocular visit done. The project is now For Review.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Unable to mark the ocular visit as done.'), { duration: 7000 });
    }
  }

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
                <Button type="button" onClick={handleDoneOcular} disabled={markOcularDone.isPending}>
                  {markOcularDone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Done Ocular
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {canManage && (
        <ScheduleOcularDialog projectId={projectId} open={scheduleOpen} onOpenChange={setScheduleOpen} />
      )}

      <Dialog open={ocularNeededOpen} onOpenChange={setOcularNeededOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>An ocular visit is needed</DialogTitle>
            <DialogDescription>
              {ocularScheduled
                ? 'Finish the ocular visit and submit its report before marking it as done.'
                : 'Schedule and finish the ocular visit before this project can go for review.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {ocularScheduled && (
              <Button type="button" variant="outline" onClick={() => { setOcularNeededOpen(false); onViewOcular(); }}>
                View Ocular Visit
              </Button>
            )}
            <Button type="button" onClick={() => setOcularNeededOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
