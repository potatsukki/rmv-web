import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Hammer, Plus, Clock, User, Paperclip, Lock, CreditCard, Pencil, Trash2, PackageCheck, CalendarCheck, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
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
  useUpdateFabricationUpdate,
  useDeleteFabricationUpdate,
  useFabricationStatus,
} from '@/hooks/useFabrication';
import { useConfirmInstallation } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket } from '@/lib/socket';
import { FabricationStatus, Role } from '@/lib/constants';

interface FabricationTabProps {
  projectId: string;
  installationConfirmedAt?: string;
}

export function FabricationTab({ projectId, installationConfirmedAt }: FabricationTabProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>(FabricationStatus.MATERIAL_PREP);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);

  // Edit / delete state
  const [editingUpdate, setEditingUpdate] = useState<{
    _id: string; notes: string; photoKeys: string[]; createdBy: string; status: string;
  } | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPhotoKeys, setEditPhotoKeys] = useState<string[]>([]);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);

  // Upload-in-progress guards
  const [uploading, setUploading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);

  const {
    data: updates,
    isLoading,
    isError,
    refetch,
  } = useFabricationUpdates(projectId);
  const { data: fabricationStatus } = useFabricationStatus(projectId);

  // ── Live updates via WebSocket ──
  useEffect(() => {
    if (!projectId) return;
    const sock = connectSocket();

    const handleFabricationUpdate = (data: { projectId: string }) => {
      if (data.projectId !== projectId) return;
      queryClient.invalidateQueries({ queryKey: ['fabrication', 'project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['fabrication', 'status', projectId] });
    };

    sock.on('fabrication:update', handleFabricationUpdate);

    return () => {
      sock.off('fabrication:update', handleFabricationUpdate);
    };
  }, [projectId, queryClient]);

  const addUpdateMutation = useCreateFabricationUpdate();
  const updateMutation = useUpdateFabricationUpdate(projectId);
  const deleteMutation = useDeleteFabricationUpdate(projectId);
  const confirmInstallationMutation = useConfirmInstallation();

  const canAddUpdate = user?.roles.some((r: string) =>
    [Role.FABRICATION_STAFF, Role.ENGINEER, Role.ADMIN].includes(r as Role),
  );
  const isCustomer = user?.roles.some((r: string) => r === Role.CUSTOMER);

  const isReadyForDelivery = fabricationStatus?.currentStatus === FabricationStatus.READY_FOR_DELIVERY;
  const installationConfirmed = !!installationConfirmedAt;

  const handleConfirmInstallation = async () => {
    try {
      await confirmInstallationMutation.mutateAsync(projectId);
      toast.success('Installation confirmed! The fabrication team will coordinate delivery and installation.', { duration: 5000 });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to confirm installation'));
    }
  };

  const canManageUpdate = (createdById: string) => {
    const isAdmin = user?.roles.some((r: string) => r === Role.ADMIN);
    const isAuthorStaff = user?._id === createdById && canAddUpdate;
    return !!(isAdmin || isAuthorStaff);
  };

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

    if (status === FabricationStatus.DONE && !installationConfirmed) {
      toast.error('The customer must confirm the installation schedule before marking as Done');
      return;
    }

    try {
      await addUpdateMutation.mutateAsync({
        projectId,
        status,
        notes,
        photoKeys: photoKeys.length > 0 ? photoKeys : undefined,
      });
      toast.success(
        status === 'done'
          ? 'Fabrication complete! The project is now finished.'
          : 'Update added — the customer has been notified of the progress.',
        { duration: 5000 },
      );
      setUpdateDialogOpen(false);
      setNotes('');
      setPhotoKeys([]);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to add update'));
    }
  };

  const handleEditUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUpdate || !editNotes.trim()) {
      toast.error('Notes cannot be empty');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingUpdate._id,
        notes: editNotes,
        photoKeys: editPhotoKeys,
      });
      toast.success('Update saved');
      setEditingUpdate(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save update'));
    }
  };

  const handleDeleteUpdate = async () => {
    if (!deletingUpdateId) return;
    try {
      await deleteMutation.mutateAsync(deletingUpdateId);
      toast.success('Update deleted');
      setDeletingUpdateId(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete update'));
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
      {/* Customer Fabrication Guide Banner */}
      {isCustomer && fabricationStatus?.currentStatus && fabricationStatus.currentStatus !== FabricationStatus.READY_FOR_DELIVERY && fabricationStatus.currentStatus !== FabricationStatus.DONE && (
        <Card className="rounded-xl border-indigo-200 bg-indigo-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <Info className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                Fabrication: {fabricationStatus.currentStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Your order is being fabricated. The team posts updates with photos below. You&apos;ll be notified when it&apos;s ready for delivery.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCustomer && fabricationStatus?.currentStatus === FabricationStatus.DONE && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <PackageCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Fabrication Complete</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your order has been delivered and installed. Thank you!</p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Installation Confirmation Banners */}
      {isReadyForDelivery && !installationConfirmed && isCustomer && (
        <Card className="rounded-xl border-blue-200 bg-blue-50/60">
          <CardContent className="p-4 flex items-start gap-3">
            <CalendarCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Your product is ready for installation!</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Fabrication is complete. Please confirm your installation schedule so our team can proceed.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0"
              disabled={confirmInstallationMutation.isPending}
              onClick={handleConfirmInstallation}
            >
              {confirmInstallationMutation.isPending ? 'Confirming...' : 'Confirm Installation'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isReadyForDelivery && !installationConfirmed && canAddUpdate && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <CalendarCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Awaiting Customer Confirmation</p>
              <p className="text-xs text-amber-700 mt-0.5">
                The customer has been notified and must confirm the installation schedule before you can mark this as Done.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isReadyForDelivery && installationConfirmed && (
        <Card className="rounded-xl border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <PackageCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">
              Customer confirmed installation — you may now mark the project as Done.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Updates Card */}
      <Card className="rounded-xl border-[#c8c8cd]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-[#1d1d1f]">Fabrication Updates</CardTitle>
          {canAddUpdate && !(allowedStatuses.includes(FabricationStatus.DONE) && !installationConfirmed && allowedStatuses.length === 1) && (
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
                          const isPaymentBlocked = gate?.blocked === true;
                          const isDoneBlocked = value === FabricationStatus.DONE && !installationConfirmed;
                          const isBlocked = isPaymentBlocked || isDoneBlocked;
                          return (
                            <SelectItem key={value} value={value} disabled={isBlocked}>
                              <span className="flex items-center gap-2">
                                {isBlocked && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                {formatStatus(value)}
                                {isPaymentBlocked && (
                                  <span className="text-[11px] text-amber-600 font-normal">
                                    ({gate.currentPaid}/{gate.requiredPaid} paid)
                                  </span>
                                )}
                                {isDoneBlocked && (
                                  <span className="text-[11px] text-amber-600 font-normal">
                                    (awaiting customer)
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
                    onUploadingChange={setUploading}
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
                      disabled={addUpdateMutation.isPending || uploading}
                      className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                    >
                      {uploading ? 'Uploading...' : addUpdateMutation.isPending ? 'Posting...' : 'Post Update'}
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

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {format(new Date(update.createdAt), 'MMMM d, yyyy')}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(update.createdAt), 'h:mm a')}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {user?._id === update.createdBy
                        ? 'You'
                        : isCustomer
                          ? 'Team Member'
                          : (update.createdByName || 'Team Member')}
                    </span>
                    {canManageUpdate(update.createdBy) && (
                      <div className="ml-auto flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-gray-700"
                          onClick={() => {
                            setEditingUpdate(update);
                            setEditNotes(update.notes);
                            setEditPhotoKeys(update.photoKeys || []);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600"
                          onClick={() => setDeletingUpdateId(String(update._id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
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

      {/* ── Edit Update Dialog ── */}
      <Dialog open={!!editingUpdate} onOpenChange={(open) => { if (!open) setEditingUpdate(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Edit Update</DialogTitle>
            <DialogDescription className="text-gray-500">
              Edit the notes or photos. Status cannot be changed once posted.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUpdate} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Progress Notes</Label>
              <Textarea
                placeholder="Describe work completed..."
                value={editNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value)}
                className="min-h-[100px] bg-gray-50/50 border-gray-200 focus:border-[#6e6e73] focus:ring-[#6e6e73]/20"
              />
            </div>
            <FileUpload
              folder="fabrication"
              accept="image/*"
              maxSizeMB={5}
              maxFiles={10}
              label="Attach photos (optional)"
              onUploadComplete={setEditPhotoKeys}
              onUploadingChange={setEditUploading}
              existingKeys={editPhotoKeys}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUpdate(null)}
                className="border-gray-200 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || editUploading}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
              >
                {editUploading ? 'Uploading...' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingUpdateId} onOpenChange={(open) => { if (!open) setDeletingUpdateId(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Delete Update?</DialogTitle>
            <DialogDescription className="text-gray-500">
              This will permanently remove the update from the timeline. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingUpdateId(null)}
              className="border-gray-200 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
              onClick={handleDeleteUpdate}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
