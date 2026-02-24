import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Settings, Calendar, Power, RefreshCw, Save, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageError } from '@/components/shared/PageError';
import {
  useConfigs,
  useUpdateConfig,
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useToggleMaintenance,
} from '@/hooks/useConfig';
import type { ConfigItem, Holiday } from '@/hooks/useConfig';

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required (YYYY-MM-DD)'),
  name: z.string().min(1, 'Name is required').max(100),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

export function SettingsPage() {
  const [editConfig, setEditConfig] = useState<ConfigItem | null>(null);
  const [configValue, setConfigValue] = useState('');
  const [configDesc, setConfigDesc] = useState('');
  const [holidayYear, setHolidayYear] = useState(String(new Date().getFullYear()));
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [deleteHoliday, setDeleteHoliday] = useState<{ open: boolean; holiday: Holiday | null }>({
    open: false,
    holiday: null,
  });

  // Payment settings state
  const [surchargePercent, setSurchargePercent] = useState('10');
  const [splitValues, setSplitValues] = useState(['30', '40', '30']);
  const [stageLabels, setStageLabels] = useState(['Down Payment', 'Mid-Project', 'Final Payment']);
  const [paymentSettingsLoaded, setPaymentSettingsLoaded] = useState(false);

  const {
    data: configs,
    isLoading: configsLoading,
    error: configsError,
    refetch: refetchConfigs,
  } = useConfigs();
  const {
    data: holidays,
    isLoading: holidaysLoading,
  } = useHolidays(holidayYear);

  const updateConfig = useUpdateConfig();
  const createHoliday = useCreateHoliday();
  const deleteHolidayMut = useDeleteHoliday();
  const toggleMaintenance = useToggleMaintenance();

  const holidayForm = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { date: '', name: '' },
  });

  const maintenanceEnabled = configs?.find((c) => c.key === 'maintenance_mode')?.value === true;

  // Load payment settings from configs when available
  useEffect(() => {
    if (!configs || paymentSettingsLoaded) return;
    const surchargeConfig = configs.find((c) => c.key === 'installment_surcharge_percent');
    const splitConfig = configs.find((c) => c.key === 'installment_split');
    const labelsConfig = configs.find((c) => c.key === 'installment_stage_labels');

    if (surchargeConfig) setSurchargePercent(String(surchargeConfig.value));
    if (splitConfig && Array.isArray(splitConfig.value)) {
      setSplitValues(splitConfig.value.map(String));
    }
    if (labelsConfig && Array.isArray(labelsConfig.value)) {
      setStageLabels(labelsConfig.value.map(String));
    }
    setPaymentSettingsLoaded(true);
  }, [configs, paymentSettingsLoaded]);

  const handleSavePaymentSettings = async () => {
    const splits = splitValues.map(Number);
    const surcharge = Number(surchargePercent);

    if (isNaN(surcharge) || surcharge < 0 || surcharge > 100) {
      toast.error('Surcharge must be between 0 and 100');
      return;
    }
    if (splits.some(isNaN) || splits.some((v) => v <= 0)) {
      toast.error('All split values must be positive numbers');
      return;
    }
    const sum = splits.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      toast.error(`Split values must sum to 100 (currently ${sum})`);
      return;
    }
    if (stageLabels.length !== splits.length || stageLabels.some((l) => !l.trim())) {
      toast.error('Each stage must have a label');
      return;
    }

    try {
      await Promise.all([
        updateConfig.mutateAsync({
          key: 'installment_surcharge_percent',
          value: surcharge,
          description: 'Surcharge percentage applied to installment payments',
        }),
        updateConfig.mutateAsync({
          key: 'installment_split',
          value: splits,
          description: 'Installment split percentages for each stage (must sum to 100)',
        }),
        updateConfig.mutateAsync({
          key: 'installment_stage_labels',
          value: stageLabels.map((l) => l.trim()),
          description: 'Labels for each installment stage',
        }),
      ]);
      toast.success('Payment settings saved');
    } catch {
      toast.error('Failed to save payment settings');
    }
  };

  const addStage = () => {
    if (splitValues.length >= 6) return;
    setSplitValues([...splitValues, '0']);
    setStageLabels([...stageLabels, `Stage ${splitValues.length + 1}`]);
  };

  const removeStage = (idx: number) => {
    if (splitValues.length <= 1) return;
    setSplitValues(splitValues.filter((_, i) => i !== idx));
    setStageLabels(stageLabels.filter((_, i) => i !== idx));
  };

  const openEditConfig = (cfg: ConfigItem) => {
    setEditConfig(cfg);
    setConfigValue(typeof cfg.value === 'string' ? cfg.value : JSON.stringify(cfg.value));
    setConfigDesc(cfg.description || '');
  };

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    try {
      let parsed: unknown = configValue;
      try { parsed = JSON.parse(configValue); } catch { /* keep as string */ }
      await updateConfig.mutateAsync({
        key: editConfig.key,
        value: parsed,
        description: configDesc || undefined,
      });
      toast.success('Config updated');
      setEditConfig(null);
    } catch {
      toast.error('Failed to update config');
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      await toggleMaintenance.mutateAsync(!maintenanceEnabled);
      toast.success(maintenanceEnabled ? 'Maintenance mode disabled' : 'Maintenance mode enabled');
    } catch {
      toast.error('Failed to toggle maintenance');
    }
  };

  const handleAddHoliday = async (data: HolidayFormData) => {
    try {
      await createHoliday.mutateAsync(data);
      toast.success('Holiday added');
      setAddHolidayOpen(false);
      holidayForm.reset();
    } catch {
      toast.error('Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deleteHoliday.holiday) return;
    try {
      await deleteHolidayMut.mutateAsync(deleteHoliday.holiday._id);
      toast.success('Holiday removed');
      setDeleteHoliday({ open: false, holiday: null });
    } catch {
      toast.error('Failed to delete holiday');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (configsError) return <PageError message="Failed to load settings" onRetry={refetchConfigs} />;

  const inputClasses =
    'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage global configuration, holidays, and maintenance mode.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Maintenance Toggle */}
        <div className="md:col-span-2">
          <Card
            className={`border-l-4 rounded-xl ${
              maintenanceEnabled ? 'border-l-red-500 bg-red-50/50' : 'border-l-emerald-500'
            }`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      maintenanceEnabled
                        ? 'bg-red-100 text-red-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}
                  >
                    <Power className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900">
                      System Maintenance Mode
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      {maintenanceEnabled
                        ? 'The system is currently unavailable to non-admin users.'
                        : 'The system is fully operational and accessible to all users.'}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant={maintenanceEnabled ? 'default' : 'destructive'}
                  onClick={handleToggleMaintenance}
                  disabled={toggleMaintenance.isPending}
                  className={`rounded-xl ${maintenanceEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  {toggleMaintenance.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : maintenanceEnabled ? (
                    'Disable Maintenance'
                  ) : (
                    'Enable Maintenance'
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Payment Settings */}
        <div className="md:col-span-2">
          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                <CreditCard className="h-5 w-5 text-gray-400" />
                Payment &amp; Installment Settings
              </CardTitle>
              <CardDescription className="text-gray-500">
                Configure installment surcharge and stage split for project payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Surcharge */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Installment Surcharge (%)
                </Label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    type="number"
                    value={surchargePercent}
                    onChange={(e) => setSurchargePercent(e.target.value)}
                    min={0}
                    max={100}
                    step={1}
                    className={inputClasses}
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    % surcharge on total
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Customers paying in installments pay total + this surcharge. Set to 0 for no surcharge.
                </p>
              </div>

              {/* Stages */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-medium text-gray-700">
                    Installment Stages
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStage}
                    disabled={splitValues.length >= 6}
                    className="h-7 text-xs border-gray-200 rounded-lg"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Stage
                  </Button>
                </div>

                <div className="space-y-2">
                  {splitValues.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={stageLabels[idx] || ''}
                        onChange={(e) => {
                          const newLabels = [...stageLabels];
                          newLabels[idx] = e.target.value;
                          setStageLabels(newLabels);
                        }}
                        placeholder={`Stage ${idx + 1}`}
                        className={`flex-1 ${inputClasses}`}
                      />
                      <Input
                        type="number"
                        value={val}
                        onChange={(e) => {
                          const newSplits = [...splitValues];
                          newSplits[idx] = e.target.value;
                          setSplitValues(newSplits);
                        }}
                        min={1}
                        max={100}
                        className={`w-20 text-center ${inputClasses}`}
                      />
                      <span className="text-sm text-gray-500">%</span>
                      {splitValues.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStage(idx)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-400">
                    Total:{' '}
                    <span
                      className={
                        Math.abs(
                          splitValues.map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0) - 100,
                        ) < 0.01
                          ? 'text-emerald-600 font-medium'
                          : 'text-red-500 font-medium'
                      }
                    >
                      {splitValues.map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)}%
                    </span>{' '}
                    (must be 100%)
                  </p>
                  <Button
                    onClick={handleSavePaymentSettings}
                    disabled={updateConfig.isPending}
                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                    size="sm"
                  >
                    {updateConfig.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Payment Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Config Values */}
        <Card className="h-full flex flex-col rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
              <Settings className="h-5 w-5 text-gray-400" />
              General Configuration
            </CardTitle>
            <CardDescription className="text-gray-500">
              Technical settings and global constants.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {configsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : !configs || configs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-200 rounded-xl">
                No configuration entries found.
              </div>
            ) : (
              <div className="space-y-4">
                {configs
                  .filter((c) => c.key !== 'maintenance_mode' && !c.key.startsWith('installment_'))
                  .map((cfg) => (
                    <div
                      key={cfg._id}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 group hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {cfg.key}
                          </p>
                          {cfg.description && (
                            <p className="text-sm text-gray-600 mt-1">{cfg.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditConfig(cfg)}
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Settings className="h-4 w-4 text-gray-400" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200 font-mono text-sm text-gray-700 break-all">
                        {typeof cfg.value === 'string' ? cfg.value : JSON.stringify(cfg.value)}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Holidays */}
        <Card className="h-full flex flex-col rounded-xl border-gray-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  Holiday Calendar
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Manage blocked dates for appointments.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={holidayYear}
                  onChange={(e) => setHolidayYear(e.target.value)}
                  className="w-20 h-8 text-sm border-gray-200"
                  min={2020}
                  max={2050}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="mb-4">
              <Button
                size="sm"
                onClick={() => {
                  holidayForm.reset();
                  setAddHolidayOpen(true);
                }}
                className="w-full border-dashed border-2 bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-gray-200 rounded-xl"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Holiday
              </Button>
            </div>

            {holidaysLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !holidays || holidays.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No holidays set for {holidayYear}.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {holidays.map((h) => (
                  <div
                    key={h._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg h-10 w-10 text-gray-600 font-bold text-xs uppercase">
                        <span>
                          {new Date(h.date).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span>{new Date(h.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{h.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(h.date)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteHoliday({ open: true, holiday: h })}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Config Dialog */}
      <Dialog
        open={!!editConfig}
        onOpenChange={(o) => {
          if (!o) setEditConfig(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Update Configuration</DialogTitle>
            <DialogDescription className="text-gray-500">
              Modifying system constants can affect application behavior.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-gray-500 uppercase">Key</Label>
              <Input
                value={editConfig?.key || ''}
                disabled
                className="bg-gray-50 font-mono text-sm border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="cfg-value"
                className="text-[13px] font-medium text-gray-700"
              >
                Value
              </Label>
              <Input
                id="cfg-value"
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                className={`font-mono ${inputClasses}`}
              />
              <p className="text-xs text-gray-400">JSON objects are supported.</p>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="cfg-desc"
                className="text-[13px] font-medium text-gray-700"
              >
                Description
              </Label>
              <Input
                id="cfg-desc"
                value={configDesc}
                onChange={(e) => setConfigDesc(e.target.value)}
                placeholder="Optional description"
                className={inputClasses}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setEditConfig(null)}
                className="border-gray-200 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={updateConfig.isPending}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
              >
                {updateConfig.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Holiday Dialog */}
      <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add Holiday</DialogTitle>
            <DialogDescription className="text-gray-500">
              Block appointments for a specific date.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={holidayForm.handleSubmit(handleAddHoliday)}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="h-name"
                className="text-[13px] font-medium text-gray-700"
              >
                Holiday Name
              </Label>
              <Input
                id="h-name"
                placeholder="e.g. New Year's Day"
                {...holidayForm.register('name')}
                className={inputClasses}
              />
              {holidayForm.formState.errors.name && (
                <p className="text-xs text-red-500">
                  {holidayForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="h-date"
                className="text-[13px] font-medium text-gray-700"
              >
                Date
              </Label>
              <Input
                id="h-date"
                type="date"
                {...holidayForm.register('date')}
                className={inputClasses}
              />
              {holidayForm.formState.errors.date && (
                <p className="text-xs text-red-500">
                  {holidayForm.formState.errors.date.message}
                </p>
              )}
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddHolidayOpen(false)}
                className="border-gray-200 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                disabled={createHoliday.isPending}
              >
                {createHoliday.isPending ? 'Adding...' : 'Add Holiday'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Holiday Confirm */}
      <ConfirmDialog
        open={deleteHoliday.open}
        title="Remove Holiday"
        description={`Are you sure you want to remove "${deleteHoliday.holiday?.name}"? Appointments will be allowed on this date.`}
        confirmLabel="Remove Holiday"
        destructive
        loading={deleteHolidayMut.isPending}
        onConfirm={handleDeleteHoliday}
        onCancel={() => setDeleteHoliday({ open: false, holiday: null })}
      />
    </div>
  );
}
