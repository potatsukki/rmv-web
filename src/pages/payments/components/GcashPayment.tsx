import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageError } from '@/components/shared/PageError';
import { useGcashContext, useGcashSubmission, useSelectCash, type GcashTarget } from '@/hooks/useGcash';
import { useAuthenticatedUrl, useGetUploadUrl, uploadFileToR2, openAuthenticatedFile } from '@/hooks/useUploads';
import { extractErrorMessage } from '@/lib/utils';

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
function actorName(actor: string | { firstName: string; lastName: string } | null | undefined) {
  return actor && typeof actor === 'object' ? `${actor.firstName} ${actor.lastName}` : actor || '—';
}

export function GcashPayment({ target, allowCash = true }: { target: GcashTarget; allowCash?: boolean }) {
  const { data, isLoading, isError, refetch } = useGcashContext(target);
  const submit = useGcashSubmission();
  const cash = useSelectCash();
  const upload = useGetUploadUrl();
  const qr = useAuthenticatedUrl(data?.settings.qrCodeKey);
  const [method, setMethod] = useState<'gcash' | 'cash'>('gcash');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  useEffect(() => { setMethod(allowCash && data?.attempts[0]?.method === 'cash' ? 'cash' : 'gcash'); }, [allowCash, data?.attempts[0]?._id]);
  if (isLoading) return <p role="status">Loading payment information…</p>;
  if (isError || !data) return <PageError onRetry={refetch} />;
  const configured = Boolean(data.settings.accountNumber || data.settings.qrCodeKey);
  const waiting = data.paymentStatus === 'pending_verification';
  const paid = data.paymentStatus === 'paid';
  const rejected = data.paymentStatus === 'rejected' && !resubmitting;
  const latest = data.attempts[0];
  const pendingAttempt = data.attempts.find((attempt) => attempt.paymentStatus === 'pending_verification');
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmissionError('');
    setSending(true);
    try {
      if (allowCash && method === 'cash') {
        await cash.mutateAsync(target);
        toast.success('Cash / Pay On-site selected. Payment remains unpaid until the cashier records it.');
        return;
      }
      if (!/^\d{13}$/.test(reference.trim())) throw new Error('Enter the 13-digit GCash reference number');
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('Enter the amount paid');
      if (!date || Number.isNaN(Date.parse(date))) throw new Error('Enter a valid payment date and time');
      if (Date.parse(date) > Date.now()) throw new Error('Payment date cannot be in the future. Use the date and time on your GCash receipt.');
      let proofKey: string | undefined;
      if (file) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Use a PNG, JPEG, or WebP screenshot up to 5 MB');
        const signed = await upload.mutateAsync({ folder: 'payment-proofs', fileName: file.name, contentType: file.type });
        await uploadFileToR2(signed.uploadUrl, file);
        proofKey = signed.fileKey;
      }
      await submit.mutateAsync({ ...target, referenceNumber: reference.trim(), amountPaid: Number(amount), paymentDate: new Date(date).toISOString(), proofKey });
      setResubmitting(false);
      setReference(''); setAmount(''); setDate(''); setFile(null);
      toast.success('Payment Submitted. Waiting for cashier verification.');
    } catch (error) {
      const message = extractErrorMessage(error, error instanceof Error ? error.message : 'Payment submission failed');
      setSubmissionError(message);
      toast.error(message);
    }
    finally { setSending(false); }
  };
  return <div className="space-y-5">
    <Card className="metal-panel rounded-2xl"><CardHeader><CardTitle>Payment</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-muted-foreground">Booking / Project Reference</p><p className="font-semibold break-all">{data.reference}</p></div><StatusBadge status={data.paymentStatus} /></div>
        {data.bookingStatus && <p>Booking Status: <span className="capitalize">{data.bookingStatus.replaceAll('_', ' ')}</span></p>}
        {waiting && <div role="status" className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2"><h3 className="font-semibold">Payment Submitted</h3><p>Your GCash payment has been submitted and is waiting for verification by the cashier.</p><p>GCash Reference Number: {pendingAttempt?.referenceNumber}</p><p>Amount Submitted: {money(pendingAttempt?.amountPaid || 0)}</p><p>Payment Status: Pending Verification</p></div>}
        {paid && <p role="status" className="font-semibold text-emerald-600 dark:text-emerald-300">Payment Approved · Payment Status: Paid{data.bookingStatus === 'confirmed' ? ' · Booking Confirmed' : ''}</p>}
        {allowCash && !paid && !waiting && latest?.method === 'cash' && <p role="status">Cash / Pay On-site selected. Payment Status: Unpaid.</p>}
        {rejected && <div role="status" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3"><h3 className="font-semibold">Payment Verification Failed</h3><p>Reason: {latest?.rejectionReason || latest?.declineReason}</p><Button onClick={() => setResubmitting(true)}>Submit Payment Again</Button></div>}
        {!waiting && !paid && !rejected && <form onSubmit={handleSubmit} className="space-y-5">
          {allowCash ? <fieldset className="flex flex-wrap gap-4"><legend className="mb-2 font-semibold">Payment Method</legend>{(['gcash', 'cash'] as const).map((value) => <label key={value} className="flex items-center gap-2"><input type="radio" name="paymentMethod" value={value} checked={method === value} onChange={() => setMethod(value)} />{value === 'gcash' ? 'GCash' : 'Cash / Pay On-site'}</label>)}</fieldset> : <p className="font-semibold">Payment Method: GCash</p>}
          <p className="text-lg font-semibold">Amount to Pay: {money(data.amountRequired)}</p>
          {!allowCash || method === 'gcash' ? <>
            <div className="rounded-xl border p-4 space-y-2"><h3 className="font-bold">GCash</h3><p>Merchant: {data.merchant}</p>{data.settings.accountName && <p>Account Name: {data.settings.accountName}</p>}{data.settings.accountNumber && <p>GCash Number: {data.settings.accountNumber}</p>}{qr.url && <img src={qr.url} alt="Official RMV GCash payment QR code" className="mx-auto max-h-64 max-w-full rounded-lg bg-white p-3" />}{qr.error && <p className="text-destructive">QR could not load. Please retry or use the configured GCash number.</p>}{!configured && <p className="text-amber-600 dark:text-amber-300">RMV GCash information has not been configured. Please contact RMV{allowCash ? ' or choose Cash / Pay On-site' : ''}.</p>}</div>
            <ol className="list-decimal pl-5 space-y-1 text-sm"><li>Open your GCash app.</li><li>Scan the QR code or send the required amount.</li><li>Complete the payment in GCash.</li><li>Copy your GCash reference number.</li><li>Return to this page.</li><li>Submit your payment details for verification.</li></ol>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="gcash-reference">GCash Reference Number</Label><Input id="gcash-reference" inputMode="numeric" value={reference} onChange={(e) => setReference(e.target.value)} required pattern="[0-9]{13}" maxLength={13} /></div><div className="space-y-2"><Label htmlFor="gcash-amount">Amount Paid</Label><Input id="gcash-amount" type="number" step="0.01" min="0.01" max="999999999" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(data.amountRequired)} required /></div><div className="space-y-2"><Label htmlFor="gcash-date">Payment Date</Label><Input id="gcash-date" type="datetime-local" value={date} max={format(new Date(), "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setDate(e.target.value)} aria-describedby="gcash-date-help" required /><p id="gcash-date-help" className="text-xs text-muted-foreground">Use the date and time on your GCash receipt. Future dates are not allowed.</p></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="gcash-proof">Payment Screenshot (optional, up to 5 MB)</Label><Input id="gcash-proof" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div></div>
          </> : <p className="text-sm text-muted-foreground">Pay at RMV or on-site. The cashier will record the payment after receiving your cash.</p>}
          {submissionError && <p role="alert" className="text-sm text-destructive">{submissionError}</p>}
          <Button type="submit" disabled={sending || ((!allowCash || method === 'gcash') && !configured)} className="w-full sm:w-auto">{sending ? 'Submitting…' : !allowCash || method === 'gcash' ? 'Submit Payment for Verification' : 'Choose Cash / Pay On-site'}</Button>
        </form>}
      </CardContent>
    </Card>
    {data.attempts.length > 0 && <Card className="metal-panel rounded-2xl"><CardHeader><CardTitle>Payment Verification History</CardTitle></CardHeader><CardContent className="space-y-4">{data.attempts.map((attempt) => <div key={attempt._id} className="rounded-xl border p-4 space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{money(attempt.amountPaid)} · {attempt.method === 'gcash' ? 'GCash' : 'Cash / Pay On-site'}</span><StatusBadge status={attempt.paymentStatus || attempt.status} /></div><p>Submitted: {new Date(attempt.createdAt).toLocaleString('en-PH')}</p>{attempt.referenceNumber && <p className="break-all">Reference: {attempt.referenceNumber}</p>}{attempt.verifiedAt && <p>Verified: {new Date(attempt.verifiedAt).toLocaleString('en-PH')} · Cashier: {actorName(attempt.verifiedBy)}</p>}{attempt.rejectedAt && <p>Rejected: {new Date(attempt.rejectedAt).toLocaleString('en-PH')} · Rejected By: {attempt.rejectionSource === 'system' ? 'System validation' : actorName(attempt.rejectedBy)}</p>}{attempt.duplicateReference && <p className="font-semibold text-destructive">Duplicate reference number - flagged</p>}{(attempt.rejectionReason || attempt.declineReason) && <p>Reason: {attempt.rejectionReason || attempt.declineReason}</p>}{attempt.proofKey && <Button variant="outline" size="sm" onClick={() => openAuthenticatedFile(attempt.proofKey!).catch(() => toast.error('Unable to open proof'))}>View Proof of Payment</Button>}</div>)}</CardContent></Card>}
  </div>;
}
