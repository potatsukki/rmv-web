import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Save, CreditCard, Activity, MapPin, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { PageError } from '@/components/shared/PageError';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import {
  useConfigs,
  useUpdateConfig,
  useToggleMaintenance,
  useScheduleMaintenance,
} from '@/hooks/useConfig';
import type { MapPoint } from '@/lib/maps';

export function SettingsPage() {
  const { data: configs, isLoading: configsLoading, error: configsError, refetch: refetchConfigs } = useConfigs();
  const updateConfig = useUpdateConfig();
  const toggleMaintenance = useToggleMaintenance();
  const scheduleMaintenance = useScheduleMaintenance();

  const [simpleValues, setSimpleValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Scheduling State
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [selectedTime, setSelectedTime] = useState('02:00'); // Default to 2 AM
  const [scheduleReason, setScheduleReason] = useState('');


  // Map State
  const [officeLocation, setOfficeLocation] = useState<MapPoint | null>(null);
  const [locationSaving, setLocationSaving] = useState(false);

  // Payment State
  const [surchargePercent, setSurchargePercent] = useState('10');
  const [splitValues, setSplitValues] = useState(['30', '40', '30']);
  const [stageLabels, setStageLabels] = useState(['Down Payment', 'Mid-Project', 'Final Payment']);
  const [paymentLoaded, setPaymentLoaded] = useState(false);

  const maintenanceEnabled = configs?.find((c) => c.key === 'maintenance_mode')?.value === true;
  const scheduledTime = configs?.find((c) => c.key === 'maintenance_scheduled_at')?.value;
  const isScheduled = !!scheduledTime && !maintenanceEnabled;

  const lifecycleAnalyticsEnabled = (() => {
    const config = configs?.find((c) => c.key === 'feature_lifecycle_mismatch_analytics');
    return typeof config?.value === 'boolean' ? config.value : true;
  })();

  // Sync Effect
  useEffect(() => {
    if (!configs) return;

    // 1. Sync Payments
    if (!paymentLoaded) {
      const sur = configs.find((c) => c.key === 'installment_surcharge_percent');
      const splits = configs.find((c) => c.key === 'installment_split');
      const labels = configs.find((c) => c.key === 'installment_stage_labels');
      
      if (sur) setSurchargePercent(String(sur.value));
      if (splits && Array.isArray(splits.value)) setSplitValues(splits.value.map(String));
      if (labels && Array.isArray(labels.value)) setStageLabels(labels.value.map(String));
      setPaymentLoaded(true);
    }

    // 2. Sync Fees & Durations (Simple values)
    const trackedKeys = [
      'baseFee', 'baseCoveredKm', 'perKmRate', 'maxDistanceKm', 
      'paymentReminderDays', 'paymentEscalationAfterReminders'
    ];
    const nextValues: Record<string, string> = {};
    for (const c of configs) {
      if (trackedKeys.includes(c.key)) {
        nextValues[c.key] = String(c.value);
      }
    }
    setSimpleValues((prev) => {
      const keys = Object.keys(nextValues);
      if (Object.keys(prev).length !== keys.length) return nextValues;
      for (const k of keys) {
        if (prev[k] !== nextValues[k]) return nextValues;
      }
      return prev;
    });

    // 3. Sync Map location
    const lat = configs.find((c) => c.key === 'shopLatitude');
    const lng = configs.find((c) => c.key === 'shopLongitude');
    if (lat && lng) {
      const latitude = Number(lat.value);
      const longitude = Number(lng.value);
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        setOfficeLocation((prev) => {
          if (prev && prev.lat === latitude && prev.lng === longitude) return prev;
          return { lat: latitude, lng: longitude };
        });
      }
    }
  }, [configs, paymentLoaded]);

  // Handlers
  const handleToggleMaintenance = async () => {
    try {
      await toggleMaintenance.mutateAsync(!maintenanceEnabled);
      toast.success(maintenanceEnabled ? 'System handles restored' : 'System paused for maintenance');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to toggle system states'));
    }
  };

  const handleToggleLifecycleAnalytics = async () => {
    try {
      await updateConfig.mutateAsync({
        key: 'feature_lifecycle_mismatch_analytics',
        value: !lifecycleAnalyticsEnabled,
        description: 'Enable operations delay reports and analytics dashboards.',
      });
      toast.success(
        lifecycleAnalyticsEnabled
          ? 'Reporting analytics disabled'
          : 'Reporting analytics enabled',
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to toggle analytics feature'));
    }
  };

  const handleSavePaymentSettings = async () => {
    const splits = splitValues.map(Number);
    const surcharge = Number(surchargePercent);

    if (isNaN(surcharge) || surcharge < 0 || surcharge > 100) {
      toast.error('Surcharge must be a valid percentage');
      return;
    }
    if (splits.some(isNaN) || splits.some((v) => v <= 0)) {
      toast.error('All stage splits must be greater than 0');
      return;
    }
    const sum = splits.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      toast.error(`Installment payments must sum up precisely to 100%`);
      return;
    }
    if (stageLabels.length !== splits.length || stageLabels.some((l) => !l.trim())) {
      toast.error('Every payment stage needs a clear name');
      return;
    }

    try {
      await Promise.all([
        updateConfig.mutateAsync({ key: 'installment_surcharge_percent', value: surcharge }),
        updateConfig.mutateAsync({ key: 'installment_split', value: splits }),
        updateConfig.mutateAsync({ key: 'installment_stage_labels', value: stageLabels.map((l) => l.trim()) }),
      ]);
      toast.success('Billing policies updated');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save billing policy'));
    }
  };

  const handleSaveOfficeLocation = async () => {
    if (!officeLocation) return;
    try {
      setLocationSaving(true);
      await Promise.all([
        updateConfig.mutateAsync({ key: 'shopLatitude', value: officeLocation.lat }),
        updateConfig.mutateAsync({ key: 'shopLongitude', value: officeLocation.lng }),
      ]);
      toast.success('Service area origin pinned');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to anchor service area'));
    } finally {
      setLocationSaving(false);
    }
  };

  const handleSaveSimpleConfig = async (key: string, label: string) => {
    const draft = simpleValues[key];
    if (draft === undefined) return;
    const parsed = Number(draft);
    if (Number.isNaN(parsed)) {
      toast.error(`Please provide a valid number for ${label}`);
      return;
    }
    
    try {
      setSavingKey(key);
      await updateConfig.mutateAsync({ key, value: parsed });
      toast.success(`${label} updated successfully`);
    } catch (err) {
      toast.error(extractErrorMessage(err, `Failed to update ${label}`));
    } finally {
      setSavingKey(null);
    }
  };

  const isSimpleChanged = (key: string) => {
    const cfg = configs?.find((c) => c.key === key);
    if (!cfg) return false;
    return String(cfg.value) !== simpleValues[key];
  };

  // Utilities for UI
  const addStage = () => {
    if (splitValues.length >= 5) return;
    setSplitValues([...splitValues, '0']);
    setStageLabels([...stageLabels, `Stage ${splitValues.length + 1}`]);
  };
  const removeStage = (idx: number) => {
    if (splitValues.length <= 1) return;
    setSplitValues(splitValues.filter((_, i) => i !== idx));
    setStageLabels(stageLabels.filter((_, i) => i !== idx));
  };

  const handleScheduleMaintenance = async () => {
    if (!selectedDate) return;
    
    // Validate 3 day min
    const minDate = startOfDay(addDays(new Date(), 3));
    if (isBefore(selectedDate, minDate)) {
      toast.error('Scheduling requires at least a 3-day notice for users.');
      return;
    }

    try {
      const parts = selectedTime.split(':');
      const hours = parseInt(parts[0] ?? '0', 10) || 0;
      const minutes = parseInt(parts[1] ?? '0', 10) || 0;

      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);


      await scheduleMaintenance.mutateAsync({
        scheduledAt: scheduledAt.toISOString(),
        reason: scheduleReason.trim(),
      });
      
      toast.success('Maintenance scheduled and users notified');
      setIsScheduleDialogOpen(false);
      setScheduleReason('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to schedule maintenance'));
    }
  };

  if (configsError) return <PageError message="Failed to load platform rules" onRetry={refetchConfigs} />;


  const inputClasses = 'metal-input h-11';

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      {/* Header */}
      <div className="metal-panel rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8490] dark:text-slate-400">
              Admin workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#171b21] dark:text-slate-100 sm:text-3xl">
              Business Configuration
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#616a74] dark:text-slate-400">
              Control billing guardrails, customer-facing content, and operational policies from one place.
            </p>
          </div>
        </div>
      </div>

      {configsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Section 1: Core Operations */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[#171b21] dark:text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" /> Operational Authority
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={`border-l-4 rounded-xl ${maintenanceEnabled ? 'border-l-red-500 bg-red-50/50' : isScheduled ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-emerald-500'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-gray-900 dark:text-slate-100">
                        {maintenanceEnabled ? 'System Suspended' : isScheduled ? 'Maintenance Scheduled' : 'System Active'}
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                        {maintenanceEnabled ? (
                          'Platform is currently offline for non-admins.'
                        ) : isScheduled ? (
                          <>System will be paused on <span className="font-bold text-amber-700 dark:text-amber-400">{format(new Date(scheduledTime as string), 'PPP p')}</span></>
                        ) : (
                          'System is currently accepting live traffic.'
                        )}
                      </CardDescription>
                    </div>

                    <div className="flex flex-col gap-2">
                      {maintenanceEnabled ? (
                        <Button variant="default" onClick={handleToggleMaintenance} disabled={toggleMaintenance.isPending} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                          {toggleMaintenance.isPending && <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />}
                          Restore Traffic
                        </Button>
                      ) : isScheduled ? (
                        <Button variant="outline" onClick={() => handleToggleMaintenance()} disabled={toggleMaintenance.isPending} size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                          {toggleMaintenance.isPending && <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />}
                          Cancel Schedule
                        </Button>
                      ) : (
                        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="shadow-md">
                              Suspend Traffic
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md metal-panel rounded-2xl">
                            <DialogHeader>
                              <DialogTitle>Schedule System Suspension</DialogTitle>
                              <DialogDescription className="text-sm text-[#616a74] dark:text-slate-100">
                                To protect your users, you must provide at least <span className="font-bold">3 days notice</span> before the system goes offline.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5 py-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-300">Select Date & Time</Label>
                                <div className="flex gap-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11 rounded-xl", !selectedDate && "text-muted-foreground")}>
                                        <BookOpen className="mr-2 h-4 w-4 opacity-50" />
                                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={(date) => isBefore(date, addDays(new Date(), 3))}
                                        autoFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input 
                                    type="time" 
                                    value={selectedTime} 
                                    onChange={(e) => setSelectedTime(e.target.value)} 
                                    className="w-32 h-11 rounded-xl metal-input"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-300">Reason for downtime (optional)</Label>
                                <Textarea 
                                  placeholder="e.g. Server maintanance, Database upgrade..." 
                                  value={scheduleReason}
                                  onChange={(e) => setScheduleReason(e.target.value)}
                                  className="min-h-[80px] rounded-xl bg-slate-50/50"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-slate-300 italic">This will be included in the notification sent to all users.</p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
                              <Button 
                                onClick={handleScheduleMaintenance} 
                                disabled={scheduleMaintenance.isPending || !selectedDate}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 shadow-lg shadow-red-500/20"
                              >
                                {scheduleMaintenance.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                Confirm & Notify Everyone
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className={`border-l-4 rounded-xl ${lifecycleAnalyticsEnabled ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-gray-900 dark:text-slate-100">Delay Reporting</CardTitle>
                      <CardDescription className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                        Highlights when operations fall behind schedule. Keep this active for dashboard health metrics.
                      </CardDescription>
                    </div>
                    <Button variant={lifecycleAnalyticsEnabled ? 'outline' : 'default'} onClick={handleToggleLifecycleAnalytics} disabled={updateConfig.isPending} size="sm">
                      {updateConfig.isPending && <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      {lifecycleAnalyticsEnabled ? 'Mute Alerts' : 'Activate Alerts'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </section>

          {/* Section 2: Pricing & Follow-ups */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[#171b21] dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" /> Billing & Fees
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              
              <Card className="rounded-xl flex flex-col">
                <CardHeader>
                  <CardTitle className="text-md">Installment Structures</CardTitle>
                  <CardDescription className="text-xs">Adjust how percentages divide when a customer splits their invoice.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 flex-1 p-5 lg:p-6 bg-[var(--color-card)]/50 pt-0">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-slate-300">Markup on installments (%)</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={surchargePercent} onChange={e => setSurchargePercent(e.target.value)} className={`w-28 text-center ${inputClasses}`} />
                      <span className="flex items-center text-xs text-gray-500">% total overhead</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold text-gray-700 dark:text-slate-300">Payment Steps</Label>
                      <Button variant="ghost" size="sm" onClick={addStage} className="h-6 text-[11px] px-2 text-sky-600">
                        + Add step
                      </Button>
                    </div>
                    {splitValues.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input value={stageLabels[idx] || ''} onChange={e => { const n = [...stageLabels]; n[idx] = e.target.value; setStageLabels(n); }} placeholder="Phase name" className={`${inputClasses} flex-1 text-sm`} />
                        <Input type="number" value={val} onChange={e => { const n = [...splitValues]; n[idx] = e.target.value; setSplitValues(n); }} className={`${inputClasses} w-20 text-center font-medium`} />
                        <span className="text-gray-400 text-xs font-medium">%</span>
                        {splitValues.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeStage(idx)} className="h-8 w-8 text-red-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                      <span className={`text-[11px] font-bold ${Math.abs(splitValues.map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0) - 100) < 0.01 ? 'text-emerald-500' : 'text-red-500'}`}>
                        Total calculates to {splitValues.map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)}%
                      </span>
                      <Button onClick={handleSavePaymentSettings} size="sm" disabled={updateConfig.isPending} className="rounded-lg text-white dark:text-white h-8 shadow-sm">
                        {updateConfig.isPending ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin"/> : <Save className="mr-2 h-3.5 w-3.5"/> }
                        Update Policy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-md">Ocular Visitation Rates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      {[{key: 'baseFee', lbl: 'Base Out-of-Area', u: '₱'}, {key: 'baseCoveredKm', lbl: 'Covered Radius', u: 'km'}, {key: 'perKmRate', lbl: 'Addition per Km', u: '₱/km'}].map((cfg) => (
                        <div key={cfg.key} className="space-y-1.5">
                          <Label className="text-xs text-gray-600 dark:text-slate-400">{cfg.lbl}</Label>
                          <div className="flex items-center gap-2">
                            <Input value={simpleValues[cfg.key] || ''} onChange={e => setSimpleValues({...simpleValues, [cfg.key]: e.target.value})} className={`w-full ${inputClasses}`} />
                            <span className="text-xs font-semibold text-gray-500 shrink-0">{cfg.u}</span>
                          </div>
                          {isSimpleChanged(cfg.key) && (
                            <Button onClick={() => handleSaveSimpleConfig(cfg.key, cfg.lbl)} disabled={savingKey === cfg.key} size="sm" variant="secondary" className="h-6 text-[10px] w-full mt-1">
                              Apply changes
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </section>

          {/* Section 3: Map Bounds */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[#171b21] dark:text-slate-100 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" /> Ground Logistics
            </h2>
            <Card className="rounded-xl">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3">
                <div>
                  <CardTitle className="text-md">Operations Anchor</CardTitle>
                  <CardDescription className="text-xs mt-1 max-w-lg">
                    This location acts as kilometer zero. Any ocular requests stretching beyond your maximum radius will automatically apply correct out-of-bounds charges calculated from this pin.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveOfficeLocation} disabled={locationSaving || !officeLocation} className="mt-3 sm:mt-0 shadow-sm h-9">
                  {locationSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Stop coordinates
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-[var(--color-border)]/80 overflow-hidden shadow-inner h-[320px] bg-slate-50 dark:bg-slate-900">
                    <LocationPicker value={officeLocation} onChange={(location) => setOfficeLocation(location)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs shrink-0">Maximum Travel Radius:</Label>
                    <Input value={simpleValues['maxDistanceKm'] || ''} onChange={e => setSimpleValues({...simpleValues, ['maxDistanceKm']: e.target.value})} className={`w-28 ${inputClasses} h-9`} />
                    <span className="text-xs text-gray-500 font-medium">km limits</span>
                    {isSimpleChanged('maxDistanceKm') && (
                      <Button onClick={() => handleSaveSimpleConfig('maxDistanceKm', 'Max allowable distance')} size="sm" variant="secondary" className="h-8 py-0 ml-auto text-xs shrink-0">
                        Apply max km
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      )}
    </div>
  );
}
