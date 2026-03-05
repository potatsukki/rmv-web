import { useState, useMemo, useCallback } from 'react';
import { format, addDays, parse, isWeekend } from 'date-fns';
import {
  CalendarOff,
  ShieldBan,
  Trash2,
  Loader2,
  Clock,
  CheckSquare,
  Square,
  Ban,
  ListChecks,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import {
  useBlockedSlots,
  useCreateBlockedSlot,
  useDeleteBlockedSlot,
  useBulkBlockSlots,
  useBulkDeleteBlockedSlots,
  type BlockedSlot,
} from '@/hooks/useConfig';

const SLOT_CODES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'] as const;
const TYPES = ['office', 'ocular'] as const;

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

export function SlotManagementPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeType, setActiveType] = useState<'office' | 'ocular'>('office');

  // Single-slot dialogs (unchanged)
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; slotCode: string }>({
    open: false,
    slotCode: '',
  });
  const [reason, setReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; slot: BlockedSlot | null }>({
    open: false,
    slot: null,
  });

  // Multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [selectedBlockedIds, setSelectedBlockedIds] = useState<Set<string>>(new Set());

  // Block Entire Day dialog
  const [blockDayDialog, setBlockDayDialog] = useState(false);
  const [blockDayType, setBlockDayType] = useState<'office' | 'ocular' | 'both'>('both');
  const [blockDayReason, setBlockDayReason] = useState('');

  // Bulk Block Selected dialog
  const [bulkBlockDialog, setBulkBlockDialog] = useState(false);
  const [bulkBlockReason, setBulkBlockReason] = useState('');

  // Bulk Unblock confirm
  const [bulkUnblockConfirm, setBulkUnblockConfirm] = useState(false);

  const { data: blockedSlots, isLoading } = useBlockedSlots(selectedDate);
  const createBlock = useCreateBlockedSlot();
  const deleteBlock = useDeleteBlockedSlot();
  const bulkBlock = useBulkBlockSlots();
  const bulkDelete = useBulkDeleteBlockedSlots();

  const blockedSet = useMemo(() => {
    if (!blockedSlots) return new Set<string>();
    return new Set(
      blockedSlots.filter((s) => s.type === activeType).map((s) => s.slotCode),
    );
  }, [blockedSlots, activeType]);

  const blockedMap = useMemo(() => {
    if (!blockedSlots) return new Map<string, BlockedSlot>();
    const map = new Map<string, BlockedSlot>();
    blockedSlots
      .filter((s) => s.type === activeType)
      .forEach((s) => map.set(s.slotCode, s));
    return map;
  }, [blockedSlots, activeType]);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Clear selections when date/type changes
  const clearSelections = useCallback(() => {
    setSelectedAvailable(new Set());
    setSelectedBlockedIds(new Set());
  }, []);

  const handleDateChange = (val: string) => {
    setSelectedDate(val);
    clearSelections();
  };

  const handleTypeChange = (t: 'office' | 'ocular') => {
    setActiveType(t);
    clearSelections();
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    clearSelections();
  };

  // ── Single slot handlers (unchanged) ──
  const handleBlock = async () => {
    try {
      await createBlock.mutateAsync({
        date: selectedDate,
        slotCode: blockDialog.slotCode,
        type: activeType,
        reason: reason.trim() || undefined,
      });
      toast.success(
        `Blocked ${formatSlotTime(blockDialog.slotCode)} on ${selectedDate} (${activeType})`,
      );
      setBlockDialog({ open: false, slotCode: '' });
      setReason('');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to block slot'));
    }
  };

  const handleUnblock = async () => {
    if (!deleteConfirm.slot) return;
    try {
      await deleteBlock.mutateAsync(deleteConfirm.slot._id);
      toast.success('Slot unblocked');
      setDeleteConfirm({ open: false, slot: null });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to unblock slot'));
    }
  };

  // ── Bulk Block Entire Day ──
  const handleBlockDay = async () => {
    const types: Array<'office' | 'ocular'> =
      blockDayType === 'both' ? ['office', 'ocular'] : [blockDayType];
    const slots = types.flatMap((t) =>
      SLOT_CODES.map((code) => ({ slotCode: code as string, type: t })),
    );

    try {
      const result = await bulkBlock.mutateAsync({
        date: selectedDate,
        slots,
        reason: blockDayReason.trim() || undefined,
      });
      const label =
        blockDayType === 'both' ? 'all' : blockDayType;
      toast.success(
        `Blocked ${result.created} ${label} slot${result.created !== 1 ? 's' : ''} for ${selectedDate}${result.skipped ? ` (${result.skipped} already blocked)` : ''}`,
      );
      setBlockDayDialog(false);
      setBlockDayReason('');
      setBlockDayType('both');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to block day'));
    }
  };

  // ── Bulk Block Selected ──
  const handleBulkBlock = async () => {
    const slots = Array.from(selectedAvailable).map((code) => ({
      slotCode: code,
      type: activeType,
    }));

    try {
      const result = await bulkBlock.mutateAsync({
        date: selectedDate,
        slots,
        reason: bulkBlockReason.trim() || undefined,
      });
      toast.success(
        `Blocked ${result.created} slot${result.created !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} already blocked)` : ''}`,
      );
      setBulkBlockDialog(false);
      setBulkBlockReason('');
      clearSelections();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to block slots'));
    }
  };

  // ── Bulk Unblock Selected ──
  const handleBulkUnblock = async () => {
    try {
      const result = await bulkDelete.mutateAsync(Array.from(selectedBlockedIds));
      toast.success(`Unblocked ${result.deleted} slot${result.deleted !== 1 ? 's' : ''}`);
      setBulkUnblockConfirm(false);
      clearSelections();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to unblock slots'));
    }
  };

  // ── Grid slot click ──
  const handleSlotClick = (slot: string) => {
    const isBlocked = blockedSet.has(slot);
    const blockedInfo = blockedMap.get(slot);

    if (selectMode) {
      if (isBlocked && blockedInfo) {
        setSelectedBlockedIds((prev) => {
          const next = new Set(prev);
          if (next.has(blockedInfo._id)) next.delete(blockedInfo._id);
          else next.add(blockedInfo._id);
          return next;
        });
      } else if (!isBlocked) {
        setSelectedAvailable((prev) => {
          const next = new Set(prev);
          if (next.has(slot)) next.delete(slot);
          else next.add(slot);
          return next;
        });
      }
    } else {
      if (isBlocked && blockedInfo) {
        setDeleteConfirm({ open: true, slot: blockedInfo });
      } else {
        setBlockDialog({ open: true, slotCode: slot });
      }
    }
  };

  // ── List row checkbox toggle ──
  const toggleListRowSelection = (s: BlockedSlot) => {
    setSelectedBlockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(s._id)) next.delete(s._id);
      else next.add(s._id);
      return next;
    });
  };

  const selectedDateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
  const isWeekendDate = isWeekend(selectedDateObj);

  const hasAvailableSelected = selectedAvailable.size > 0;
  const hasBlockedSelected = selectedBlockedIds.size > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Slot Management</h1>
        <p className="text-sm text-gray-500">
          Block or unblock appointment time slots for specific dates. Blocked slots cannot be booked
          by anyone.
        </p>
      </div>

      {/* Date + Type Selector */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-900">Select Date &amp; Type</CardTitle>
          <CardDescription>Pick a date and appointment type to manage slots</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                min={today}
                max={format(addDays(new Date(), 90), 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <Button
                  key={t}
                  variant={activeType === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange(t)}
                  className={cn(
                    'capitalize',
                    activeType === t && 'bg-[#1d1d1f] hover:bg-[#2d2d2f]',
                  )}
                >
                  {t === 'office' ? 'Office Visit' : 'Ocular Visit'}
                </Button>
              ))}
            </div>
          </div>
          {isWeekendDate && (
            <p className="text-sm font-medium text-amber-600">
              ⚠ This date falls on a weekend. Appointments are not available on weekends.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Slot Grid */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
            <Clock className="h-5 w-5 text-gray-500" />
            Time Slots — {selectedDate}
            <Badge variant="outline" className="ml-auto capitalize text-xs">
              {activeType}
            </Badge>
          </CardTitle>
          <CardDescription>
            {selectMode
              ? 'Select available slots to block or blocked slots to unblock in bulk'
              : 'Click an available slot to block it, or unblock a blocked slot'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={selectMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className={cn(
                selectMode && 'bg-[#1d1d1f] hover:bg-[#2d2d2f]',
              )}
            >
              <ListChecks className="mr-1.5 h-4 w-4" />
              {selectMode ? 'Exit Select Mode' : 'Select Mode'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlockDayDialog(true)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Ban className="mr-1.5 h-4 w-4" />
              Block Entire Day
            </Button>

            {selectMode && hasAvailableSelected && (
              <Button
                size="sm"
                onClick={() => setBulkBlockDialog(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <ShieldBan className="mr-1.5 h-4 w-4" />
                Block Selected ({selectedAvailable.size})
              </Button>
            )}

            {selectMode && hasBlockedSelected && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkUnblockConfirm(true)}
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <CheckSquare className="mr-1.5 h-4 w-4" />
                Unblock Selected ({selectedBlockedIds.size})
              </Button>
            )}

            {selectMode && (hasAvailableSelected || hasBlockedSelected) && (
              <button
                type="button"
                onClick={clearSelections}
                className="ml-1 text-xs text-gray-400 underline hover:text-gray-600"
              >
                Clear selection
              </button>
            )}
          </div>

          {/* ── Grid ── */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {SLOT_CODES.map((s) => (
                <Skeleton key={s} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {SLOT_CODES.map((slot) => {
                const isBlocked = blockedSet.has(slot);
                const blockedInfo = blockedMap.get(slot);
                const isSelectedAvailable = selectMode && selectedAvailable.has(slot);
                const isSelectedBlocked =
                  selectMode && isBlocked && blockedInfo && selectedBlockedIds.has(blockedInfo._id);

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleSlotClick(slot)}
                    className={cn(
                      'relative rounded-xl border-2 p-3 text-center transition-all',
                      isBlocked
                        ? isSelectedBlocked
                          ? 'border-green-400 bg-green-50 text-red-700 ring-2 ring-green-300'
                          : 'border-red-300 bg-red-50 text-red-700 hover:border-red-400'
                        : isSelectedAvailable
                          ? 'border-[#1d1d1f] bg-[#f0f0f5] text-gray-700 ring-2 ring-[#c8c8cd]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c8c8cd] hover:bg-[#f0f0f5]/30',
                    )}
                  >
                    {/* Checkbox indicator in select mode */}
                    {selectMode && (
                      <span className="absolute right-1.5 top-1.5">
                        {isSelectedAvailable || isSelectedBlocked ? (
                          <CheckSquare className="h-4 w-4 text-[#1d1d1f]" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-300" />
                        )}
                      </span>
                    )}
                    <p className="text-sm font-semibold">{formatSlotTime(slot)}</p>
                    {isBlocked ? (
                      <div className="mt-1.5 flex items-center justify-center gap-1">
                        <ShieldBan className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-500">Blocked</span>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs font-medium text-green-600">Available</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Slots List */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
              <CalendarOff className="h-5 w-5 text-red-500" />
              Blocked Slots for {selectedDate}
            </CardTitle>
            {selectMode && hasBlockedSelected && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkUnblockConfirm(true)}
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                Unblock Selected ({selectedBlockedIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : !blockedSlots?.length ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No blocked slots for this date
            </p>
          ) : (
            <div className="space-y-2">
              {blockedSlots.map((s) => {
                const isChecked = selectMode && selectedBlockedIds.has(s._id);
                return (
                  <div
                    key={s._id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3 transition-all',
                      isChecked
                        ? 'border-green-300 bg-green-50/50'
                        : 'border-gray-100 bg-gray-50/50',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {selectMode ? (
                        <button
                          type="button"
                          onClick={() => toggleListRowSelection(s)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-5 w-5 text-green-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-300" />
                          )}
                        </button>
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
                          <ShieldBan className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatSlotTime(s.slotCode)}{' '}
                          <Badge variant="outline" className="ml-1 capitalize text-xs">
                            {s.type}
                          </Badge>
                        </p>
                        {s.reason && (
                          <p className="text-xs text-gray-500">Reason: {s.reason}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Blocked by {s.blockedBy?.firstName} {s.blockedBy?.lastName}
                        </p>
                      </div>
                    </div>
                    {!selectMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm({ open: true, slot: s })}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Single Block Dialog ── */}
      <Dialog
        open={blockDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setBlockDialog({ open: false, slotCode: '' });
            setReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Block Time Slot</DialogTitle>
            <DialogDescription>
              Block <span className="font-semibold">{formatSlotTime(blockDialog.slotCode)}</span> on{' '}
              <span className="font-semibold">{selectedDate}</span> for{' '}
              <span className="font-semibold capitalize">{activeType}</span> appointments. Customers
              will not be able to book this slot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm font-medium">Reason (optional)</Label>
              <Textarea
                placeholder="e.g. Staff meeting, maintenance..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBlockDialog({ open: false, slotCode: '' });
                setReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlock}
              disabled={createBlock.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {createBlock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Single Unblock Confirm ── */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Unblock Time Slot"
        description={
          deleteConfirm.slot
            ? `Remove the block on ${formatSlotTime(deleteConfirm.slot.slotCode)} (${deleteConfirm.slot.type}) for ${deleteConfirm.slot.date}? Customers will be able to book this slot again.`
            : ''
        }
        confirmLabel="Unblock"
        variant="destructive"
        loading={deleteBlock.isPending}
        onConfirm={handleUnblock}
        onCancel={() => setDeleteConfirm({ open: false, slot: null })}
      />

      {/* ── Block Entire Day Dialog ── */}
      <Dialog
        open={blockDayDialog}
        onOpenChange={(open) => {
          if (!open) {
            setBlockDayDialog(false);
            setBlockDayReason('');
            setBlockDayType('both');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Block Entire Day
            </DialogTitle>
            <DialogDescription>
              Block <strong>all 7 time slots</strong> for{' '}
              <span className="font-semibold">{selectedDate}</span>. No one will be able to book any
              appointment on this date for the selected type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block text-sm font-medium">Appointment Type</Label>
              <div className="flex gap-2">
                {(['office', 'ocular', 'both'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={blockDayType === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBlockDayType(t)}
                    className={cn(
                      'capitalize',
                      blockDayType === t && 'bg-[#1d1d1f] hover:bg-[#2d2d2f]',
                    )}
                  >
                    {t === 'office'
                      ? 'Office Only'
                      : t === 'ocular'
                        ? 'Ocular Only'
                        : 'Both Types'}
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {blockDayType === 'both'
                  ? 'This will block all 14 slots (7 office + 7 ocular)'
                  : `This will block all 7 ${blockDayType} slots`}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Reason (optional)</Label>
              <Textarea
                placeholder="e.g. Company team building, holiday..."
                value={blockDayReason}
                onChange={(e) => setBlockDayReason(e.target.value)}
                maxLength={200}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBlockDayDialog(false);
                setBlockDayReason('');
                setBlockDayType('both');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlockDay}
              disabled={bulkBlock.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkBlock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block Entire Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Block Selected Dialog ── */}
      <Dialog
        open={bulkBlockDialog}
        onOpenChange={(open) => {
          if (!open) {
            setBulkBlockDialog(false);
            setBulkBlockReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldBan className="h-5 w-5 text-red-500" />
              Block {selectedAvailable.size} Selected Slot{selectedAvailable.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Block the following <span className="capitalize">{activeType}</span> slots on{' '}
              <span className="font-semibold">{selectedDate}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedAvailable)
                .sort()
                .map((code) => (
                  <Badge key={code} variant="outline" className="text-sm">
                    {formatSlotTime(code)}
                  </Badge>
                ))}
            </div>
            <div>
              <Label className="text-sm font-medium">Reason (optional)</Label>
              <Textarea
                placeholder="e.g. Staff meeting, maintenance..."
                value={bulkBlockReason}
                onChange={(e) => setBulkBlockReason(e.target.value)}
                maxLength={200}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkBlockDialog(false);
                setBulkBlockReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkBlock}
              disabled={bulkBlock.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkBlock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block {selectedAvailable.size} Slot{selectedAvailable.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Unblock Confirm ── */}
      <ConfirmDialog
        open={bulkUnblockConfirm}
        title={`Unblock ${selectedBlockedIds.size} Slot${selectedBlockedIds.size !== 1 ? 's' : ''}`}
        description={`Remove the block on ${selectedBlockedIds.size} selected slot${selectedBlockedIds.size !== 1 ? 's' : ''}? Customers will be able to book these slots again.`}
        confirmLabel={`Unblock ${selectedBlockedIds.size}`}
        variant="destructive"
        loading={bulkDelete.isPending}
        onConfirm={handleBulkUnblock}
        onCancel={() => setBulkUnblockConfirm(false)}
      />
    </div>
  );
}
