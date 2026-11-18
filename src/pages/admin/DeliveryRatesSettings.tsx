import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfigs, useUpdateConfig } from '@/hooks/useConfig';
import { extractErrorMessage } from '@/lib/utils';
import type { DeliveryVehicleRate } from '@/lib/types';

const CONFIG_KEY = 'delivery_vehicle_rates';
type RateRow = Record<keyof DeliveryVehicleRate, string>;

const toRows = (rates: DeliveryVehicleRate[]): RateRow[] => rates.map((rate) => ({
  key: rate.key,
  label: rate.label,
  baseFee: String(rate.baseFee),
  baseCoveredKm: String(rate.baseCoveredKm),
  perKmRate: String(rate.perKmRate),
}));

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

/** Admin-editable per-vehicle rates used to compute the delivery / mobilization fee in costing. */
export function DeliveryRatesSettings({ inputClasses }: { inputClasses: string }) {
  const { data: configs } = useConfigs();
  const updateConfig = useUpdateConfig();
  const stored = configs?.find((config) => config.key === CONFIG_KEY)?.value;
  const storedRates = Array.isArray(stored) ? (stored as DeliveryVehicleRate[]) : [];
  const storedJson = JSON.stringify(storedRates);
  const [rows, setRows] = useState<RateRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(toRows(JSON.parse(storedJson) as DeliveryVehicleRate[]));
  }, [storedJson]);

  const changed = JSON.stringify(toRows(storedRates)) !== JSON.stringify(rows);
  const patchRow = (index: number, patch: Partial<RateRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSave = async () => {
    const rates = rows.map((row) => ({
      key: row.key.trim() || slug(row.label),
      label: row.label.trim(),
      baseFee: Number(row.baseFee),
      baseCoveredKm: Number(row.baseCoveredKm),
      perKmRate: Number(row.perKmRate),
    }));
    if (rates.length === 0) return toast.error('Add at least one vehicle');
    if (rates.some((rate) => !rate.label || !rate.key)) return toast.error('Every vehicle needs a name');
    if (rates.some((rate) => [rate.baseFee, rate.baseCoveredKm, rate.perKmRate].some((n) => !Number.isFinite(n) || n < 0))) {
      return toast.error('Rates must be numbers of 0 or more');
    }
    if (new Set(rates.map((rate) => rate.key)).size !== rates.length) return toast.error('Vehicle names must be different');

    try {
      setSaving(true);
      await updateConfig.mutateAsync({ key: CONFIG_KEY, value: rates });
      toast.success('Delivery rates updated');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save delivery rates'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-md">Delivery &amp; Mobilization Rates</CardTitle>
        <CardDescription className="text-xs">
          Used to auto-compute the delivery fee in the engineer's costing: base fee + (one-way road km beyond the covered km × rate per km), for each hauling trip and each crew trip day. Only new costings use changed rates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {rows.map((row, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-gray-600 dark:text-slate-400">Vehicle</Label>
                <Input value={row.label} onChange={(e) => patchRow(index, { label: e.target.value })} placeholder="e.g. L300 / Light Van" className={inputClasses} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${row.label || 'vehicle'}`} onClick={() => setRows((current) => current.filter((_, i) => i !== index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { field: 'baseFee', lbl: 'Base fee', u: '₱' },
                { field: 'baseCoveredKm', lbl: 'Covered', u: 'km' },
                { field: 'perKmRate', lbl: 'Per extra km', u: '₱' },
              ] as const).map((cfg) => (
                <div key={cfg.field} className="space-y-1">
                  <Label className="text-[11px] text-gray-600 dark:text-slate-400">{cfg.lbl} ({cfg.u})</Label>
                  <Input inputMode="decimal" value={row[cfg.field]} onChange={(e) => patchRow(index, { [cfg.field]: e.target.value })} className={inputClasses} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rows.length >= 10}
            onClick={() => setRows((current) => [...current, { key: '', label: '', baseFee: '0', baseCoveredKm: '0', perKmRate: '0' }])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add vehicle
          </Button>
          {changed && (
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save rates'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
