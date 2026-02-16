import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Hammer, Plus, Clock, User, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import { useProjects } from '@/hooks/useProjects';
import {
  useFabricationUpdates,
  useCreateFabricationUpdate,
  useFabricationStatus,
} from '@/hooks/useFabrication';
import { useAuthStore } from '@/stores/auth.store';
import { FabricationStatus, Role } from '@/lib/constants';
import { FileUpload } from '@/components/shared/FileUpload';

export function FabricationPage() {
  const { user } = useAuthStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>(FabricationStatus.MATERIAL_PREP);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);

  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ status: 'active' });
  const projects = projectsData?.items || [];

  const {
    data: updates,
    isLoading: isLoadingUpdates,
    isError: isErrorUpdates,
    refetch,
  } = useFabricationUpdates(selectedProjectId);
  const { data: fabricationStatus } = useFabricationStatus(selectedProjectId);

  const addUpdateMutation = useCreateFabricationUpdate();

  const canAddUpdate = user?.roles.some((r: string) =>
    [Role.FABRICATION_STAFF].includes(r as Role),
  );

  const allowedStatuses = fabricationStatus?.allowedTransitions || [];

  useEffect(() => {
    if (allowedStatuses.length === 0) return;
    setStatus((prev) => {
      if (allowedStatuses.includes(prev)) return prev;
      return allowedStatuses[0] ?? prev;
    });
  }, [allowedStatuses]);

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error('Please enter update notes');
      return;
    }

    try {
      await addUpdateMutation.mutateAsync({
        projectId: selectedProjectId,
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

  const getFileUrl = (key: string) => {
    if (!key) return '#';
    return key.startsWith('http')
      ? key
      : `/api/v1/uploads/view?key=${encodeURIComponent(key)}`;
  };

  if (isLoadingProjects) {
    return <div className="p-8 text-center text-gray-500">Loading projects...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Fabrication Updates
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Track manufacturing progress and shop floor updates.
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {canAddUpdate && selectedProjectId && (
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white shrink-0 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  New Update
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">
                    Add Fabrication Update
                  </DialogTitle>
                  <DialogDescription className="text-gray-500">
                    Log progress from the workshop floor.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUpdate} className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="status"
                      className="text-[13px] font-medium text-gray-700"
                    >
                      Status
                    </Label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                    >
                      {(allowedStatuses.length > 0 ? allowedStatuses : Object.values(FabricationStatus)).map((value) => (
                        <option key={value} value={value}>
                          {formatStatus(value)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="notes"
                      className="text-[13px] font-medium text-gray-700"
                    >
                      Progress Notes
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Describe work completed..."
                      value={notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setNotes(e.target.value)
                      }
                      className="min-h-[100px] bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
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

          <div className="w-full md:w-72">
            <Select
              value={selectedProjectId}
              onValueChange={(val: string) => setSelectedProjectId(val)}
            >
              <SelectTrigger className="bg-white border-gray-200 shadow-sm rounded-xl h-10">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: { _id: string; title: string }) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No Active Projects"
          description="There are no active projects to track fabrication for."
          icon={<Hammer className="h-10 w-10 text-gray-300" />}
        />
      ) : !selectedProjectId ? (
        <EmptyState
          title="Select a Project"
          description="Please select a project from the dropdown above to view fabrication updates."
          icon={<Hammer className="h-10 w-10 text-gray-300" />}
        />
      ) : isLoadingUpdates ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : isErrorUpdates ? (
        <PageError message="Failed to load updates" onRetry={() => refetch()} />
      ) : updates && updates.length === 0 ? (
        <EmptyState
          title="No Updates Yet"
          description="No fabrication updates have been logged for this project."
          icon={<Hammer className="h-10 w-10 text-gray-300" />}
          action={
            canAddUpdate ? (
              <Button
                onClick={() => setUpdateDialogOpen(true)}
                variant="outline"
                className="border-gray-200 rounded-xl"
              >
                Log First Update
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="relative border-l-2 border-gray-200 ml-4 space-y-12 pb-12">
          {updates?.map(
            (update: {
              _id: string;
              createdAt: string;
              createdBy: string;
              createdByName?: string;
              notes: string;
              photoKeys?: string[];
            }) => (
              <div
                key={update._id}
                className="relative pl-8"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white border-4 border-orange-500 shadow-sm" />

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {format(new Date(update.createdAt), 'MMMM d, yyyy')}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(update.createdAt), 'h:mm a')}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1 ml-2">
                    <User className="h-3 w-3" />
                    {user?._id === update.createdBy
                      ? 'You'
                      : update.createdByName || 'Team Member'}
                  </span>
                </div>

                <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-xl">
                  <CardContent className="p-4 space-y-4">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {update.notes}
                    </p>

                    {/* Attachments Grid */}
                    {update.photoKeys && update.photoKeys.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                        {update.photoKeys.map((key: string, idx: number) => (
                          <a
                            key={idx}
                            href={getFileUrl(key)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 block"
                          >
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              <Paperclip className="h-6 w-6" />
                            </div>
                            <img
                              src={getFileUrl(key)}
                              alt="Attachment"
                              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
