import { useState } from 'react';
import toast from 'react-hot-toast';
import { useConfigs, useUpdateConfig } from '@/hooks/useConfig';
import { useAuthenticatedUrl, useGetUploadUrl, uploadFileToR2 } from '@/hooks/useUploads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/lib/utils';

export function GcashSettings() {
  const { data: configs } = useConfigs();
  const update = useUpdateConfig();
  const upload = useGetUploadUrl();
  const config = configs?.find((item) => item.key === 'gcash_payment')?.value as { accountName?: string; accountNumber?: string; qrCodeKey?: string } | undefined;
  const [draft, setDraft] = useState<{ accountName: string; accountNumber: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const values = draft || { accountName: config?.accountName || '', accountNumber: config?.accountNumber || '' };
  const qr = useAuthenticatedUrl(config?.qrCodeKey);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      let qrCodeKey = config?.qrCodeKey || '';
      if (file) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Use a PNG, JPEG, or WebP image up to 5 MB');
        const signed = await upload.mutateAsync({ folder: 'gcash-qr', fileName: file.name, contentType: file.type });
        await uploadFileToR2(signed.uploadUrl, file); qrCodeKey = signed.fileKey;
      }
      await update.mutateAsync({ key: 'gcash_payment', value: { ...values, qrCodeKey }, description: 'Official RMV GCash payment information' });
      toast.success('GCash payment information saved'); setDraft(null); setFile(null);
    } catch (error) { toast.error(extractErrorMessage(error, 'Unable to save GCash settings')); }
    finally { setSaving(false); }
  };
  return <Card className="rounded-xl"><CardHeader><CardTitle>Official GCash Payment Information</CardTitle></CardHeader><CardContent><form onSubmit={save} className="space-y-4">
    <p className="text-sm text-muted-foreground">Customers use this account or QR to pay RMV. The cashier verifies every submission.</p>
    <div className="space-y-2"><Label htmlFor="gcash-account-name">GCash Account Name</Label><Input id="gcash-account-name" value={values.accountName} maxLength={200} onChange={(e) => setDraft({ ...values, accountName: e.target.value })} /></div>
    <div className="space-y-2"><Label htmlFor="gcash-account-number">GCash Mobile Number</Label><Input id="gcash-account-number" inputMode="numeric" pattern="09[0-9]{9}" maxLength={11} value={values.accountNumber} onChange={(e) => setDraft({ ...values, accountNumber: e.target.value })} /></div>
    <div className="space-y-2"><Label htmlFor="gcash-official-qr">Official RMV GCash QR (optional)</Label><Input id="gcash-official-qr" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
    {qr.url && <img src={qr.url} alt="Configured RMV GCash QR" className="max-h-40 rounded-lg bg-white p-2" />}
    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save GCash Information'}</Button>
  </form></CardContent></Card>;
}
