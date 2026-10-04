import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAppointmentSalesNotes } from '@/hooks/useAppointments';
import { cleanSalesNotes } from '@/lib/sales-notes';
import { extractErrorMessage } from '@/lib/utils';

export function AppointmentSalesNotes({ appointmentId, value, canEdit }: { appointmentId: string; value?: string; canEdit: boolean }) {
  const savedNotes = cleanSalesNotes(value);
  const [notes, setNotes] = useState(savedNotes);
  const update = useUpdateAppointmentSalesNotes();
  useEffect(() => { setNotes(savedNotes); }, [appointmentId, savedNotes]);
  if (!canEdit && !savedNotes) return null;
  return <Card>
    <CardHeader><CardTitle>Sales Notes</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {canEdit ? <>
        <Label htmlFor="appointment-sales-notes">Sales Notes (optional)</Label>
        <Textarea id="appointment-sales-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} disabled={update.isPending} placeholder="Enter your notes and clarified customer requirements." />
        <Button type="button" disabled={update.isPending} onClick={async () => {
          try {
            await update.mutateAsync({ id: appointmentId, initialDesignNotes: cleanSalesNotes(notes) });
            toast.success('Sales notes saved.');
          } catch (error) { toast.error(extractErrorMessage(error, 'Failed to save sales notes.')); }
        }}>{update.isPending ? 'Saving…' : 'Save Sales Notes'}</Button>
      </> : <p className="whitespace-pre-wrap text-sm">{savedNotes}</p>}
    </CardContent>
  </Card>;
}
