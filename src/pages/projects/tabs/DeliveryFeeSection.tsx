import { useEffect } from 'react';
import { Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useDeliveryChargeInfo } from '@/hooks/useBlueprints';
import { describeDeliveryFee } from '@/lib/delivery-fee';
import type { Blueprint, DeliveryChargeInfo, DraftDeliveryFee } from '@/lib/types';

const peso = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function asAmount(value: string) {
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** The amount that will be billed: the typed courier estimate, or 0 when off or charged on another item. */
export function getBilledDeliveryAmount(value: DraftDeliveryFee | null, chargeInfo?: DeliveryChargeInfo) {
  if (!value || !value.enabled) return 0;
  if (chargeInfo && !chargeInfo.chargedHere) return 0;
  return value.amount.trim() ? asAmount(value.amount) : 0;
}

/** Customer / cashier view: the delivery line included in the quotation total. */
export function DeliveryFeeSummary({ quotation, isDark }: { quotation?: Blueprint['quotation']; isDark: boolean }) {
  const fee = quotation?.deliveryFee;
  if (!fee || !(fee.amount > 0)) return null;
  const total = Number(quotation?.total) || 0;
  return (
    <div className={`mt-2 space-y-0.5 text-xs ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
      <p className="flex justify-between gap-3"><span>Materials & work</span><span>{peso(Math.max(total - fee.amount, 0))}</span></p>
      <p className="flex justify-between gap-3"><span>{describeDeliveryFee(fee)}</span><span className="shrink-0">{peso(fee.amount)}</span></p>
    </div>
  );
}

interface DeliveryFeeSectionProps {
  projectId: string;
  projectItemId?: string;
  value: DraftDeliveryFee;
  onChange: (next: DraftDeliveryFee) => void;
  onBilledAmountChange: (amount: number) => void;
  disabled?: boolean;
  isDark: boolean;
  inputCls: string;
}

/**
 * Third-party delivery fee: the engineer types the courier's estimated fee (e.g. Lalamove, booked
 * by RMV outside the system). Nothing is computed; the amount is added to the quotation total.
 */
export function DeliveryFeeSection({
  projectId, projectItemId, value, onChange, onBilledAmountChange, disabled, isDark, inputCls,
}: DeliveryFeeSectionProps) {
  const chargeQuery = useDeliveryChargeInfo(projectId, projectItemId, { enabled: value.enabled });
  const chargeInfo = chargeQuery.data;
  const billed = getBilledDeliveryAmount(value, chargeInfo);

  useEffect(() => {
    onBilledAmountChange(billed);
  }, [billed, onBilledAmountChange]);

  const patch = (next: Partial<DraftDeliveryFee>) => onChange({ ...value, ...next });
  const muted = isDark ? 'text-slate-400' : 'text-[#6e6e73]';
  const labelCls = `mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`;
  const chargedElsewhereMessage = chargeInfo && 'message' in chargeInfo ? chargeInfo.message : null;

  return (
    <section className={`rounded-xl border p-4 ${isDark ? 'border-emerald-500/20 bg-slate-950/45' : 'border-emerald-100 bg-emerald-50/40'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Truck className={`h-4 w-4 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Transport / Delivery (third party)</p>
            <Badge variant="outline" className={isDark ? 'border-emerald-300/40 text-emerald-200' : 'border-emerald-300 text-emerald-700'}>Manual</Badge>
          </div>
          <p className={`mt-1 text-xs ${muted}`}>
            Estimated courier fee (e.g. Lalamove). RMV books the courier outside the system; this amount is added to the quotation total and paid with the payment plan.
          </p>
        </div>
        <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-200' : 'text-[#1d1d1f]'}`}>
          <input
            type="checkbox"
            checked={value.enabled}
            disabled={disabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
            className="h-4 w-4"
          />
          Charge delivery
        </label>
      </div>

      {!value.enabled ? (
        <p className={`mt-3 text-xs ${muted}`}>No delivery fee on this quotation (e.g. the customer picks up the order).</p>
      ) : chargedElsewhereMessage ? (
        <p className={`mt-3 text-xs ${muted}`}>{chargedElsewhereMessage} Nothing is added to this item.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block max-w-xs">
            <span className={labelCls}>Estimated delivery fee *</span>
            <input
              type="number" min={0} step={0.01}
              value={value.amount}
              disabled={disabled}
              placeholder="0.00"
              onChange={(event) => patch({ amount: event.target.value })}
              className={inputCls}
            />
            <span className={`mt-1 block text-[11px] ${muted}`}>Enter 0 if there is no delivery charge.</span>
          </label>
          <p className={`text-right text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Delivery: {peso(billed)}</p>
        </div>
      )}
    </section>
  );
}
