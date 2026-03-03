import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Hammer, Plus, Clock, User, Paperclip, Lock, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthImage } from '@/components/shared/AuthImage';
import { openAuthenticatedFile } from '@/hooks/useUploads';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileUpload } from '@/components/shared/FileUpload';

import {
  useFabricationUpdates,
  useCreateFabricationUpdate,
  useFabricationStatus,
} from '@/hooks/useFabrication';
import { useAuthStore } from '@/stores/auth.store';
import { FabricationStatus, Role } from '@/lib/constants';

interface FabricationTabProps {
  projectId: string;
}

export function FabricationTab({ projectId }: FabricationTabProps) {
  const { user } = useAuthStore();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>(FabricationStatus.MATERIAL_PREP);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);

  const {
    data: updates,
    isLoading,
    isError,
    refetch,
  } = useFabricationUpdates(projectId);
  const { data: fabricationStatus } = useFabricationStatus(projectId);

  const addUpdateMutation = useCreateFabricationUpdate();

  const canAddUpdate = user?.roles.some((r: string) =>
    [Role.FABRICATION_STAFF, Role.ENGINEER, Role.ADMIN].includes(r as Role),
  );
  const isCustomer = user?.roles.some((r: string) => r === Role.CUSTOMER);

  const allowedStatuses = fabricationStatus?.allowedTransitions || [];

  useEffect(() => {
    if (allowedStatuses.length === 0) return;
    setStatus((prev) => {
      if (allowedStatuses.includes(prev)) {
        const gate = fabricationStatus?.paymentGate?.stageGates?.[prev];
        if (!gate?.blocked) return prev;
      }
      const unblocked = allowedStatuses.find(
        (s) => !fabricationStatus?.paymentGate?.stageGates?.[s]?.blocked,
      );
      return unblocked ?? allowedStatuses[0] ?? prev;
    });
  }, [allowedStatuses, fabricationStatus]);

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error('Please enter update notes');
      return;
    }

    try {
      await addUpdateMutation.mutateAsync({
        projectId,
        status,
        notes,
        photoKeys: photoKeys.length > 0 ? photoKeys : undefined,
      });
      toast.success('Update added successfully');
      setUpdateDialogOpen(false);
      setNotes('');
      setPhotoKeys([]);
    } catch {
      toast.error('Failed to add update');
    }
  };

  const formatStatus = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const handleViewFile = (key: string) => {
    if (!key) return;
    if (key.startsWith('http')) {
      window.open(key, '_blank');
    } else {
      openAuthenticatedFile(key);
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Gate Banners */}
      {fabricationStatus?.paymentGate && !fabricationStatus.paymentGate.allPaid && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Payment Gate Active</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {fabricationStatus.paymentGate.unpaidCount} payment stage(s) remain unpaid.
                Fabrication cannot proceed to &quot;Ready for Delivery&quot; until all stages are verified.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {fabricationStatus?.paymentGate?.allPaid && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">
              All payments verified — fabrication is unblocked
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Updates Card */}
      <Card className="rounded-xl border-[#c8c8cd]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-[#1d1d1f]">Fabrication Updates</CardTitle>
          {canAddUpdate && (
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white shrink-0 rounded-xl" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Update
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Add Fabrication Update</DialogTitle>
                  <DialogDescription className="text-gray-500">
                    Log progress from the workshop floor.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUpdate} className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fab-status" className="text-[13px] font-medium text-gray-700">
                      Status
                    </Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-full h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-[#6e6e73]/20 focus:border-[#6e6e73]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {(allowedStatuses.length > 0 ? allowedStatuses : Object.values(FabricationStatus)).map((value) => {
                          const gate = fabricationStatus?.paymentGate?.stageGates?.[value];
                          const isBlocked = gate?.blocked === true;
                          return (
                            <SelectItem key={value} value={value} disabled={isBlocked}>
                              <span className="flex items-center gap-2">
                                {isBlocked && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                {formatStatus(value)}
                                {isBlocked && (
                                  <span className="text-[11px] text-amber-600 font-normal">
                                    ({gate.currentPaid}/{gate.requiredPaid} paid)
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {/* Payment gate warning for selected status */}
                    {fabricationStatus?.paymentGate?.stageGates?.[status]?.blocked && (
                      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mt-1.5">
                        <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          This stage requires {fabricationStatus.paymentGate.stageGates[status]!.requiredPaid} of {fabricationStatus.paymentGate.totalStages} payment stages to be verified.
                          Currently {fabricationStatus.paymentGate.stageGates[status]!.currentPaid} paid.
                          {fabricationStatus.paymentGate.stageGates[status]!.nextUnpaidLabel && (
                            <> Next: <span className="font-medium">{fabricationStatus.paymentGate.stageGates[status]!.nextUnpaidLabel}</span></>
                          )}
                        </p>
                      </div>
                    )}
                    {/* Payment notification hint */}
                    {status && ['finishing', 'quality_check', 'ready_for_delivery', 'done'].includes(status) && (
                      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 mt-1.5">
                        <CreditCard className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700">
                          Advancing to this stage will notify the customer about an upcoming or due payment.
                          {['quality_check', 'done'].includes(status)
                            ? ' Their next payment stage will be unlocked for payment.'
                            : ' They\'ll receive a heads-up to prepare their payment.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fab-notes" className="text-[13px] font-medium text-gray-700">
                      Progress Notes
                    </Label>
                    <Textarea
                      id="fab-notes"
                      placeholder="Describe work completed..."
                      value={notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                      className="min-h-[100px] bg-gray-50/50 border-gray-200 focus:border-[#6e6e73] focus:ring-[#6e6e73]/20"
                    />
                  </div>

                  <FileUpload
                    folder="fabrication"
                    accept="image/*"
                    maxSizeMB={5}
                    maxFiles={10}
                    label="Attach photos (optional)"
                    onUploadComplete={setPhotoKeys}
                    existingKeys={photoKeys}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setUpdateDialogOpen(false)}
                      className="border-gray-200 rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addUpdateMutation.isPending}
                      className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                    >
                      {addUpdateMutation.isPending ? 'Posting...' : 'Post Update'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600">Failed to load updates.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : updates && updates.length > 0 ? (
            <div className="relative border-l-2 border-gray-200 ml-4 space-y-12 pb-4">
              {updates.map((update) => (
                <div key={String(update._id)} className="relative pl-8">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white border-4 border-[#1d1d1f] shadow-sm" />

                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {format(new Date(update.createdAt), 'MMMM d, yyyy')}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(update.createdAt), 'h:mm a')}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1 ml-0 sm:ml-2">
                      <User className="h-3 w-3" />
                      {user?._id === update.createdBy
                        ? 'You'
                        : isCustomer
                          ? 'Team Member'
                          : (update.createdByName || 'Team Member')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={String(update.status)} />
                  </div>

                  <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-xl">
                    <CardContent className="p-4 space-y-4">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {update.notes}
                      </p>

                      {/* Attachments Grid */}
                      {update.photoKeys && update.photoKeys.length > 0 && (
                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                          {update.photoKeys.map((key: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleViewFile(key)}
                              className="group relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 block"
                            >
                              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <Paperclip className="h-6 w-6" />
                              </div>
                              <AuthImage
                                fileKey={key}
                                alt="Attachment"
                                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Hammer className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-[#6e6e73]">No fabrication updates yet.</p>
              <p className="text-xs text-[#86868b] mt-1">
                Updates will appear here as the fabrication team logs progress.
              </p>
              {canAddUpdate && (
                <Button
                  onClick={() => setUpdateDialogOpen(true)}
                  variant="outline"
                  className="border-gray-200 rounded-xl mt-3"
                  size="sm"
                >
                  Log First Update
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
