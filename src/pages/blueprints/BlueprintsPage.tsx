import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, CheckCircle, AlertCircle, Eye, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBlueprintsByProject,
  useApproveComponent,
  useRequestBlueprintRevision,
} from '@/hooks/useBlueprints';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function BlueprintsPage() {
  const { user } = useAuthStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [revisionDialog, setRevisionDialog] = useState<{ open: boolean; blueprintId: string }>({
    open: false,
    blueprintId: '',
  });
  const [revisionNotes, setRevisionNotes] = useState('');

  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ status: 'active' });
  const projects = projectsData?.items || [];

  const {
    data: blueprints,
    isLoading: isLoadingBlueprints,
    isError: isErrorBlueprints,
    refetch,
  } = useBlueprintsByProject(selectedProjectId);

  const approveMutation = useApproveComponent();
  const revisionMutation = useRequestBlueprintRevision();

  const canReviewBlueprint = user?.roles.some((r: string) =>
    [Role.CUSTOMER].includes(r as Role),
  );

  const handleApprove = async (id: string, component: 'blueprint' | 'costing') => {
    try {
      await approveMutation.mutateAsync({ id, component });
      toast.success(`${component === 'blueprint' ? 'Blueprint' : 'Costing'} approved`);
    } catch {
      toast.error('Approval failed');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      toast.error('Please provide revision notes');
      return;
    }
    try {
      await revisionMutation.mutateAsync({
        id: revisionDialog.blueprintId,
        revisionNotes,
      });
      toast.success('Revision requested');
      setRevisionDialog({ open: false, blueprintId: '' });
      setRevisionNotes('');
    } catch {
      toast.error('Failed to request revision');
    }
  };

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
            Blueprints & Costing
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Review technical drawings and approve project specifications.
          </p>
        </div>

        {/* Project Selector */}
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

      {projects.length === 0 ? (
        <EmptyState
          title="No Active Projects"
          description="There are no active projects to review blueprints for."
          icon={<FileText className="h-10 w-10 text-gray-300" />}
        />
      ) : !selectedProjectId ? (
        <EmptyState
          title="Select a Project"
          description="Please select a project from the dropdown above to view its blueprints."
          icon={<FileText className="h-10 w-10 text-gray-300" />}
        />
      ) : isLoadingBlueprints ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      ) : isErrorBlueprints ? (
        <PageError message="Failed to load blueprints" onRetry={() => refetch()} />
      ) : blueprints && blueprints.length === 0 ? (
        <EmptyState
          title="No Blueprints Found"
          description="No blueprints have been uploaded for this project yet."
          icon={<FileText className="h-10 w-10 text-gray-300" />}
        />
      ) : (
        <div className="grid gap-8">
          {blueprints?.map(
            (bp: {
              _id: string;
              version: number;
              createdAt: string;
              blueprintApproved: boolean;
              costingApproved: boolean;
              blueprintKey: string;
              costingKey: string;
              revisionNotes?: string;
            }) => (
              <div key={bp._id} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="text-lg px-3 py-1 bg-gray-100 text-gray-700 border-gray-200 font-mono rounded-lg"
                    >
                      v{bp.version}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Uploaded on {format(new Date(bp.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {canReviewBlueprint && !bp.blueprintApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-lg"
                      onClick={() =>
                        setRevisionDialog({ open: true, blueprintId: bp._id })
                      }
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Request Revision
                    </Button>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Technical Drawing Card */}
                  <Card className="border-gray-100 shadow-sm transition-all hover:shadow-md rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50 border-b border-gray-100 rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Technical Drawing</h3>
                      </div>
                      {bp.blueprintApproved ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100">
                          <CheckCircle className="mr-1 h-3 w-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700"
                        >
                          Pending Review
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                        <div className="text-center p-6">
                          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-600">PDF Document</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click to view full document
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                          asChild
                        >
                          <a
                            href={getFileUrl(bp.blueprintKey)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Drawing
                          </a>
                        </Button>
                        {canReviewBlueprint && !bp.blueprintApproved && (
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                            onClick={() => handleApprove(bp._id, 'blueprint')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Costing Sheet Card */}
                  <Card className="border-gray-100 shadow-sm transition-all hover:shadow-md rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50 border-b border-gray-100 rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900">Costing Sheet</h3>
                      </div>
                      {bp.costingApproved ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100">
                          <CheckCircle className="mr-1 h-3 w-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700"
                        >
                          Pending Review
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                        <div className="text-center p-6">
                          <Info className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-600">Spreadsheet</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click to view full analysis
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                          asChild
                        >
                          <a
                            href={getFileUrl(bp.costingKey)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Sheet
                          </a>
                        </Button>
                        {canReviewBlueprint && !bp.costingApproved && (
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                            onClick={() => handleApprove(bp._id, 'costing')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {bp.revisionNotes && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-sm text-red-800">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-900">Revision Requested</p>
                      <p className="mt-1">{bp.revisionNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {/* Revision Dialog */}
      <Dialog
        open={revisionDialog.open}
        onOpenChange={(open) =>
          !open && setRevisionDialog({ open: false, blueprintId: '' })
        }
      >
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Request Revision</DialogTitle>
            <DialogDescription className="text-gray-500">
              Provide detailed feedback for the engineering team regarding required changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="notes"
                className="text-[13px] font-medium text-gray-700"
              >
                Revision Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Describe the changes needed..."
                className="col-span-3 min-h-[100px] bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                value={revisionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRevisionNotes(e.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevisionDialog({ open: false, blueprintId: '' })}
              className="border-gray-200 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestRevision}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
