import { useState } from 'react';
import { RotateCcw, Clock3 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useMyRefundRequests, useSubmitRefundRequest, useCancelMyRefundRequest } from '@/hooks/useRefunds';
import type { PaymentHistoryItem } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/lib/constants';

interface InlineRefundDetailsProps {
  payment: PaymentHistoryItem;
}

export function InlineRefundDetails({ payment }: InlineRefundDetailsProps) {
  const { user } = useAuthStore();
  const isCustomer = user?.roles.includes(Role.CUSTOMER);
  
  // For customers, we fetch their refunds
  const { data: myRefunds } = useMyRefundRequests(isCustomer);
  
  const refundReq = myRefunds?.find(r => 
    (typeof r.appointmentId === 'string' ? r.appointmentId : r.appointmentId._id) === payment._id
  );

  const [isRequesting, setIsRequesting] = useState(false);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'gcash' | 'bank_transfer'>('gcash');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const submitMutation = useSubmitRefundRequest();
  const cancelMutation = useCancelMyRefundRequest();

  if (!isCustomer) return null; // We'll handle cashier separately

  // Payment must be verified/paid to be refunded
  if (payment.status !== 'verified') return null;

  if (refundReq) {
    return (
      <div className="mt-6 border-t border-[color:var(--color-border)] pt-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 dark:text-slate-100">
          <RotateCcw className="h-4 w-4" /> Refund Status
        </h3>
        
        <div className="metal-panel p-4 rounded-xl space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-semibold capitalize text-[#1d1d1f] dark:text-slate-100">Status: {refundReq.status}</span>
            {refundReq.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-red-600 hover:text-red-700"
                onClick={async () => {
                  try {
                    await cancelMutation.mutateAsync({ id: refundReq._id, reason: 'Cancelled by user' });
                    toast.success('Refund request cancelled');
                  } catch (err) {
                    toast.error(extractErrorMessage(err, 'Failed to cancel refund'));
                  }
                }}
                disabled={cancelMutation.isPending}
              >
                Cancel Request
              </Button>
            )}
          </div>

          <div className="text-[#6e6e73] dark:text-slate-300">
            <p><span className="font-medium text-[#1d1d1f] dark:text-slate-100">Method:</span> {refundReq.refundMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}</p>
            <p><span className="font-medium text-[#1d1d1f] dark:text-slate-100">Account:</span> {refundReq.accountName} - {refundReq.accountNumber}</p>
            <p className="mt-1"><span className="font-medium text-[#1d1d1f] dark:text-slate-100">Reason:</span> {refundReq.reason}</p>
          </div>

          {refundReq.timeline && refundReq.timeline.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              {refundReq.timeline.map((item) => (
                <div key={`${refundReq._id}-${item.key}`} className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 text-[#86868b]" />
                  <div>
                    <p className="text-xs font-medium text-[#1d1d1f] dark:text-slate-100">{item.label}</p>
                    <p className="text-[10px] text-[#86868b]">{format(new Date(item.at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not requested yet, enable requesting
  if (!isRequesting) {
    return (
      <div className="mt-6 border-t border-[color:var(--color-border)] pt-5 flex justify-center">
        <Button variant="outline" className="text-[#1d1d1f] group dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => setIsRequesting(true)}>
          <RotateCcw className="h-4 w-4 mr-2 group-hover:-rotate-90 transition-transform" />
          Request Refund
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({
        appointmentId: payment._id,
        reason,
        refundMethod,
        accountName,
        accountNumber,
        ...(refundMethod === 'bank_transfer' ? { bankName } : {}),
      });
      toast.success('Refund requested successfully');
      setIsRequesting(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to request refund'));
    }
  };

  return (
    <div className="mt-6 border-t border-[color:var(--color-border)] pt-5">
      <h3 className="text-sm font-semibold flex items-center gap-2 dark:text-slate-100 mb-4">
        <RotateCcw className="h-4 w-4" /> Request Refund
      </h3>

      <div className="space-y-4 rounded-xl border border-[color:var(--color-border)]/60 p-4">
        <div>
          <Label className="text-xs text-gray-500">Refund Method</Label>
          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant={refundMethod === 'gcash' ? 'default' : 'outline'}
              size="sm"
              aria-pressed={refundMethod === 'gcash'}
              className={cn(
                'flex-1 text-xs',
                refundMethod === 'gcash'
                  ? 'ring-1 ring-cyan-300/45 dark:ring-cyan-300/55'
                  : 'opacity-85 hover:opacity-100',
              )}
              onClick={() => {
                setRefundMethod('gcash');
                setBankName('');
              }}
            >
              GCash
            </Button>
            <Button
              type="button"
              variant={refundMethod === 'bank_transfer' ? 'default' : 'outline'}
              size="sm"
              aria-pressed={refundMethod === 'bank_transfer'}
              className={cn(
                'flex-1 text-xs',
                refundMethod === 'bank_transfer'
                  ? 'ring-1 ring-cyan-300/45 dark:ring-cyan-300/55'
                  : 'opacity-85 hover:opacity-100',
              )}
              onClick={() => setRefundMethod('bank_transfer')}
            >
              Bank Transfer
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-[#86868b] dark:text-slate-400">
            Selected: {refundMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}
          </p>
        </div>

        <div>
          <Label className="text-xs text-gray-500">Account Name</Label>
          <Input 
            className="mt-1 h-8 text-sm" 
            value={accountName} 
            onChange={(e) => setAccountName(e.target.value)} 
          />
        </div>

        <div>
          <Label className="text-xs text-gray-500">Account Number</Label>
          <Input 
            className="mt-1 h-8 text-sm" 
            value={accountNumber} 
            onChange={(e) => setAccountNumber(e.target.value)} 
          />
        </div>

        {refundMethod === 'bank_transfer' && (
          <div>
            <Label className="text-xs text-gray-500">Bank Name</Label>
            <Input 
              className="mt-1 h-8 text-sm" 
              value={bankName} 
              onChange={(e) => setBankName(e.target.value)} 
            />
          </div>
        )}

        <div>
          <Label className="text-xs text-gray-500">Reason for Refund</Label>
          <Textarea 
            className="mt-1 min-h-[60px] text-sm" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setIsRequesting(false)}>
            Cancel
          </Button>
          <Button 
            size="sm" 
            disabled={!accountName || !accountNumber || !reason || submitMutation.isPending}
            onClick={handleSubmit}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}
