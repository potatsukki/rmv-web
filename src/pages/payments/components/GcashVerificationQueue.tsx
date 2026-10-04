import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';
import { useSignature } from '@/hooks/useUsers';
import { useAuthenticatedUrl } from '@/hooks/useUploads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { StatusBadge } from '@/components/shared/StatusBadge';

export interface GcashQueuePayment {
  _id: string; customerName: string; projectTitle: string; bookingReference: string; service: string;
  customerId?: { email?: string; phone?: string }; bookingId?: { date?: string; slotCode?: string; customerAddress?: string };
  amountRequired: number; amountPaid: number; referenceNumber: string; paymentDate: string;
  proofKey?: string; createdAt: string; paymentStatus: string;
  duplicateReference?: boolean; rejectionReason?: string; declineReason?: string; rejectedAt?: string;
  rejectionSource?: 'system' | 'cashier'; rejectedBy?: { firstName: string; lastName: string } | null;
}
const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const date = (value: string) => value ? new Date(value).toLocaleString('en-PH') : '—';
function PaymentProof({ fileKey }: { fileKey?: string }) {
  const { url, isLoading, error } = useAuthenticatedUrl(fileKey);
  if (!fileKey) return <p>No proof uploaded (optional).</p>;
  if (isLoading) return <p>Loading proof…</p>;
  if (error || !url) return <p>Unable to load proof. Close and reopen to retry.</p>;
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Customer GCash proof of payment" className="max-h-80 max-w-full rounded-lg object-contain" /></a>;
}
export function GcashVerificationQueue({ payments, flaggedOnly = false }: { payments: GcashQueuePayment[]; flaggedOnly?: boolean }) {
  const qc = useQueryClient();
  const { data: savedSignature } = useSignature();
  const [selected, setSelected] = useState<GcashQueuePayment | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const review = async () => {
    if (!selected || !decision || selected.paymentStatus !== 'pending_verification') return;
    if (decision === 'approve' && selected.duplicateReference) return;
    if (decision === 'reject' && !reason.trim()) { toast.error('Enter a rejection reason'); return; }
    setBusy(true);
    try {
      await api.post(`/payments/gcash/${selected._id}/${decision}`, decision === 'approve' ? { signatureKey: signature || savedSignature?.signatureKey } : { reason: reason.trim() });
      toast.success(decision === 'approve' ? 'Payment approved. Customer notified.' : 'Payment rejected. Customer can resubmit.');
      setDecision(null); setSelected(null); setReason(''); setSignature('');
      for (const key of ['payments', 'payment-plans', 'appointments', 'projects', 'reports']) qc.invalidateQueries({ queryKey: [key] });
    } catch (error) { toast.error(extractErrorMessage(error, 'Payment review failed')); }
    finally { setBusy(false); }
  };
  if (!payments.length) return null;
  return <section className="metal-panel rounded-2xl p-4 space-y-4"><h2 className="text-lg font-bold">{flaggedOnly ? 'Flagged GCash Payment History' : 'GCash Payment Verification'}</h2>
    {flaggedOnly && <p className="text-sm text-muted-foreground">Rejected attempts with duplicate reference numbers. Showing the latest {payments.length} flagged attempts; all attempts remain in payment history.</p>}
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{['Booking Reference', 'Customer', 'Service', 'Amount Required', 'Amount Submitted', 'GCash Reference', 'Payment Date', 'Proof', 'Date Submitted', 'Status', 'Actions'].map((label) => <th className="p-3 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead><tbody>{payments.map((payment) => <tr key={payment._id} className="border-b"><td className="p-3">{payment.bookingReference}</td><td className="p-3">{payment.customerName}</td><td className="p-3">{payment.service}</td><td className="p-3 whitespace-nowrap">{money(payment.amountRequired)}</td><td className="p-3 whitespace-nowrap">{money(payment.amountPaid)}</td><td className="p-3 font-mono">{payment.referenceNumber}{payment.duplicateReference && <p className="mt-1 font-sans font-semibold text-destructive">Duplicate reference number</p>}</td><td className="p-3 whitespace-nowrap">{date(payment.paymentDate)}</td><td className="p-3">{payment.proofKey ? 'Uploaded' : 'None'}</td><td className="p-3 whitespace-nowrap">{date(payment.createdAt)}</td><td className="p-3"><StatusBadge status={payment.paymentStatus} /></td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(payment)}>View</Button>{payment.paymentStatus === 'pending_verification' && <>{!payment.duplicateReference && <Button size="sm" onClick={() => { setSelected(payment); setDecision('approve'); }}>Approve</Button>}<Button size="sm" variant="destructive" onClick={() => { setSelected(payment); setDecision('reject'); }}>Reject</Button></>}</div></td></tr>)}</tbody></table></div>
    <Dialog open={!!selected && !decision} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="metal-panel-strong max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>GCash Payment Details</DialogTitle></DialogHeader>{selected && <><dl className="grid grid-cols-2 gap-3 text-sm">{Object.entries({ Customer: selected.customerName, Email: selected.customerId?.email || '—', Phone: selected.customerId?.phone || '—', 'Booking Reference': selected.bookingReference, Service: selected.service, 'Booking Date': selected.bookingId?.date || '—', 'Required Amount': money(selected.amountRequired), 'Submitted Amount': money(selected.amountPaid), 'GCash Reference': selected.referenceNumber, 'Payment Date': date(selected.paymentDate), 'Date Submitted': date(selected.createdAt), Status: selected.paymentStatus.replaceAll('_', ' '), ...(selected.rejectionReason || selected.declineReason ? { 'Rejection Reason': selected.rejectionReason || selected.declineReason } : {}), ...(selected.rejectedAt ? { 'Rejected At': date(selected.rejectedAt), 'Rejected By': selected.rejectedBy ? `${selected.rejectedBy.firstName} ${selected.rejectedBy.lastName}` : selected.rejectionSource === 'system' ? 'System validation' : 'Unknown' } : {}) }).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold break-all">{value}</dd></div>)}</dl><PaymentProof fileKey={selected.proofKey} />{selected.duplicateReference && <p role="status" className="font-semibold text-destructive">Duplicate reference number - flagged and rejected.</p>}{selected.paymentStatus === 'pending_verification' && <div className="flex gap-2">{!selected.duplicateReference && <Button onClick={() => setDecision('approve')}>Approve Payment</Button>}<Button variant="destructive" onClick={() => setDecision('reject')}>Reject Payment</Button></div>}</>}</DialogContent></Dialog>
    <ConfirmDialog open={decision === 'approve'} onOpenChange={(open) => !open && setDecision(null)} title="Approve Payment" description="Are you sure you want to approve this payment?" confirmLabel="Approve Payment" onConfirm={review} isLoading={busy} confirmDisabled={busy || !(signature || savedSignature?.signatureKey)}>
      {selected && <div className="space-y-3"><p>{selected.customerName} · {money(selected.amountPaid)}</p><p>Required: {money(selected.amountRequired)} · Reference: {selected.referenceNumber}</p><PaymentProof fileKey={selected.proofKey} />{savedSignature?.signatureKey && !signature ? <p>Saved cashier signature will be used.</p> : <SignaturePad onSave={setSignature} />}</div>}
    </ConfirmDialog>
    <ConfirmDialog open={decision === 'reject'} onOpenChange={(open) => { if (!open) { setDecision(null); setReason(''); } }} title="Reject Payment" description="Enter the reason the customer needs to correct their payment." confirmLabel="Reject Payment" onConfirm={review} isLoading={busy} confirmDisabled={busy || !reason.trim()}>
      <div className="space-y-2"><Label htmlFor={flaggedOnly ? "gcash-flagged-rejection" : "gcash-rejection"}>Rejection Reason</Label><Input id={flaggedOnly ? "gcash-flagged-rejection" : "gcash-rejection"} list={flaggedOnly ? "gcash-flagged-rejection-reasons" : "gcash-rejection-reasons"} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Choose or enter a rejection reason" /><datalist id={flaggedOnly ? "gcash-flagged-rejection-reasons" : "gcash-rejection-reasons"}>{['Invalid reference number', 'Duplicate reference number', 'Payment not found', 'Incorrect amount', 'Invalid proof of payment'].map((value) => <option key={value} value={value} />)}</datalist></div>
    </ConfirmDialog>
  </section>;
}
