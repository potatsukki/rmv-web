import { useEffect } from 'react';
import { Loader2, Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useDeliveryFeeEstimate } from '@/hooks/useBlueprints';
import { describeDeliveryFee } from '@/lib/delivery-fee';
import type { Blueprint, DeliveryFeeEstimate, DraftDeliveryFee } from '@/lib/types';

const peso = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function asAmount(value: string) {
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * The amount that will be billed: 0 when turned off or charged on another item, the typed amount
 * when the engineer changed it, otherwise the server-computed fee.
 */
export function getBilledDeliveryAmount(value: DraftDeliveryFee | null, estimate?: DeliveryFeeEstimate) {
  if (!value || !value.enabled) return 0;
  if (estimate && !estimate.available && estimate.reason === 'charged_on_other_item') return 0;
  if (value.amount.trim()) return asAmount(value.amount);
  return estimate?.available ? estimate.breakdown.computedAmount : 0;
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
  workingDays: string;
  value: DraftDeliveryFee;
  onChange: (next: DraftDeliveryFee) => void;
  onBilledAmountChange: (amount: number) => void;
  disabled?: boolean;
  isDark: boolean;
  inputCls: string;
}

export function DeliveryFeeSection({
  projectId, projectItemId, workingDays, value, onChange, onBilledAmountChange, disabled, isDark, inputCls,
}: DeliveryFeeSectionProps) {
  const estimateQuery = useDeliveryFeeEstimate(projectId, {
    projectItemId,
    haulingVehicle: value.haulingVehicle,
    haulingTrips: value.haulingTrips,
    crewVehicle: value.crewVehicle,
    crewDays: value.crewDays,
    workingDays,
  }, { enabled: value.enabled });
  const estimate = estimateQuery.data;
  const billed = getBilledDeliveryAmount(value, estimate);

  useEffect(() => {
    onBilledAmountChange(billed);
  }, [billed, onBilledAmountChange]);

  const patch = (next: Partial<DraftDeliveryFee>) => onChange({ ...value, ...next });
  const muted = isDark ? 'text-slate-400' : 'text-[#6e6e73]';
  const labelCls = `mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`;
  const vehicles = estimate?.vehicles ?? [];
  const chargedElsewhere = estimate && !estimate.available && estimate.reason === 'charged_on_other_item';
  const manualOnly = estimate && !estimate.available && !chargedElsewhere;
  const computed = estimate?.available ? estimate.breakdown : null;
  const isOverridden = Boolean(computed && value.amount.trim() && Math.abs(asAmount(value.amount) - computed.computedAmount) >= 0.01);
  const vehicleLabel = (key?: string) => vehicles.find((vehicle) => vehicle.key === key)?.label || key || '';

  return (
    <section className={`rounded-xl border p-4 ${isDark ? 'border-emerald-500/20 bg-slate-950/45' : 'border-emerald-100 bg-emerald-50/40'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Truck className={`h-4 w-4 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Delivery / Mobilization</p>
            <Badge variant="outline" className={isDark ? 'border-emerald-300/40 text-emerald-200' : 'border-emerald-300 text-emerald-700'}>Auto-computed</Badge>
          </div>
          <p className={`mt-1 text-xs ${muted}`}>
            Road distance from the shop × vehicle rate. Covers hauling materials or the finished work, and the crew trips for each installation day. The customer sees this line on the quotation.
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
      ) : chargedElsewhere ? (
        <p className={`mt-3 text-xs ${muted}`}>{estimate.message} Nothing is added to this item.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {computed && estimate?.available && (
            <p className={`text-xs ${muted}`}>
              Site: {estimate.siteAddress || 'ocular site pin'} · <span className="font-medium">{computed.distanceKm} km</span> one way
            </p>
          )}
          {estimateQuery.isError && !estimate && (
            <p role="alert" className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'border-red-500/40 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-800'}`}>
              Unable to load the delivery estimate. <button type="button" className="underline" onClick={() => estimateQuery.refetch()}>Retry</button>
            </p>
          )}
          {manualOnly && (
            <p role="status" className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'border-amber-500/40 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {estimate.message}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Hauling vehicle (materials / finished work)</span>
              <select
                value={value.haulingVehicle || computed?.haulingVehicle || ''}
                disabled={disabled || vehicles.length === 0}
                onChange={(event) => patch({ haulingVehicle: event.target.value })}
                className={inputCls}
              >
                {vehicles.map((vehicle) => <option key={vehicle.key} value={vehicle.key}>{vehicle.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Hauling trips</span>
              <input
                type="number" min={0} max={50} step={1} inputMode="numeric"
                value={value.haulingTrips || (computed ? String(computed.haulingTrips) : '')}
                disabled={disabled}
                onChange={(event) => patch({ haulingTrips: event.target.value.replace(/[^\d]/g, '') })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Crew vehicle (installation)</span>
              <select
                value={value.crewVehicle || computed?.crewVehicle || ''}
                disabled={disabled || vehicles.length === 0}
                onChange={(event) => patch({ crewVehicle: event.target.value })}
                className={inputCls}
              >
                {vehicles.map((vehicle) => <option key={vehicle.key} value={vehicle.key}>{vehicle.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Crew trip days</span>
              <input
                type="number" min={0} max={365} step={1} inputMode="numeric"
                value={value.crewDays || (computed ? String(computed.crewDays) : '')}
                disabled={disabled}
                onChange={(event) => patch({ crewDays: event.target.value.replace(/[^\d]/g, '') })}
                className={inputCls}
              />
              <span className={`mt-1 block text-[11px] ${muted}`}>Defaults to the working days for on-site installation. Set 0 if the crew trips are already in the installation cost.</span>
            </label>
          </div>

          {computed && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'border-slate-700 text-slate-300' : 'border-[#d2d2d7] text-[#3a3a3c]'}`}>
              <p>Hauling: {computed.haulingTrips} × {vehicleLabel(computed.haulingVehicle)} ({peso(computed.haulingTripCost)}) = <span className="font-medium">{peso(computed.hauling)}</span></p>
              <p>Crew: {computed.crewDays} day{computed.crewDays === 1 ? '' : 's'} × {vehicleLabel(computed.crewVehicle)} ({peso(computed.crewTripCost)}) = <span className="font-medium">{peso(computed.crew)}</span></p>
              <p className="mt-1 font-semibold">Computed: {peso(computed.computedAmount)}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>{manualOnly ? 'Delivery fee (manual)' : 'Billed amount (leave blank to use the computed fee)'}</span>
              <input
                type="number" min={0} step={0.01}
                value={value.amount}
                disabled={disabled}
                placeholder={computed ? String(computed.computedAmount) : '0.00'}
                onChange={(event) => patch({ amount: event.target.value })}
                className={inputCls}
              />
            </label>
            {(isOverridden || manualOnly) && (
              <label className="block">
                <span className={labelCls}>Reason {isOverridden ? '(required)' : '(optional)'}</span>
                <input
                  type="text"
                  maxLength={500}
                  value={value.overrideReason}
                  disabled={disabled}
                  placeholder="e.g. Shared trip with another project"
                  onChange={(event) => patch({ overrideReason: event.target.value })}
                  className={inputCls}
                />
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            {estimateQuery.isFetching && <Loader2 className={`h-3.5 w-3.5 animate-spin ${muted}`} aria-label="Computing delivery fee" />}
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Delivery: {peso(billed)}</p>
          </div>
        </div>
      )}
    </section>
  );
}
