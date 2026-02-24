import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, CheckCircle, AlertCircle, Eye, Info, Upload, DollarSign, Clock, MessageSquare, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  useUploadBlueprint,
  useUploadRevision,
  useAcceptBlueprint,
} from '@/hooks/useBlueprints';
import { useProjects } from '@/hooks/useProjects';
import { useConfigs } from '@/hooks/useConfig';
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
import { FileUpload } from '@/components/shared/FileUpload';
import type { Blueprint } from '@/lib/types';

export function BlueprintsPage() {
  const { user } = useAuthStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [revisionDialog, setRevisionDialog] = useState<{ open: boolean; blueprintId: string }>({
    open: false,
    blueprintId: '',
  });
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionRefKeys, setRevisionRefKeys] = useState<string[]>([]);

  // Upload blueprint dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadRevisionFor, setUploadRevisionFor] = useState<string | null>(null);
  const [blueprintFileKeys, setBlueprintFileKeys] = useState<string[]>([]);
  const [costingFileKeys, setCostingFileKeys] = useState<string[]>([]);
  const [quotMaterials, setQuotMaterials] = useState('');
  const [quotLabor, setQuotLabor] = useState('');
  const [quotFees, setQuotFees] = useState('');
  const [quotBreakdown, setQuotBreakdown] = useState('');
  const [quotDuration, setQuotDuration] = useState('');
  const [quotNotes, setQuotNotes] = useState('');

  // Accept blueprint dialog
  const [acceptDialog, setAcceptDialog] = useState<{ open: boolean; blueprint: Blueprint | null }>({
    open: false,
    blueprint: null,
  });
  const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');

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
  const uploadBlueprintMut = useUploadBlueprint();
  const uploadRevisionMut = useUploadRevision();
  const acceptMutation = useAcceptBlueprint();

  const { data: configs } = useConfigs();
  const surchargePercent = (() => {
    const cfg = configs?.find((c) => c.key === 'installment_surcharge_percent');
    return typeof cfg?.value === 'number' ? cfg.value : 10;
  })();

  const isEngineer = user?.roles.some((r: string) => r === Role.ENGINEER);
  const canReviewBlueprint = user?.roles.some((r: string) =>
    [Role.CUSTOMER].includes(r as Role),
  );

  const formatCurrency = (n: number) =>
    `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const resetUploadForm = () => {
    setBlueprintFileKeys([]);
    setCostingFileKeys([]);
    setQuotMaterials('');
    setQuotLabor('');
    setQuotFees('');
    setQuotBreakdown('');
    setQuotDuration('');
    setQuotNotes('');
  };

  const handleUploadBlueprint = async () => {
    if (!blueprintFileKeys.length || !costingFileKeys.length) {
      toast.error('Please upload both a blueprint drawing and costing sheet');
      return;
    }
    const materials = Number(quotMaterials) || 0;
    const labor = Number(quotLabor) || 0;
    const fees = Number(quotFees) || 0;
    const total = materials + labor + fees;

    try {
      if (uploadRevisionFor) {
        await uploadRevisionMut.mutateAsync({
          id: uploadRevisionFor,
          blueprintKey: blueprintFileKeys[0],
          costingKey: costingFileKeys[0],
        });
        toast.success('Revision uploaded');
      } else {
        await uploadBlueprintMut.mutateAsync({
          projectId: selectedProjectId,
          blueprintKey: blueprintFileKeys[0],
          costingKey: costingFileKeys[0],
          quotation: total > 0
            ? {
                materials,
                labor,
                fees,
                total,
                breakdown: quotBreakdown || undefined,
                estimatedDuration: quotDuration || undefined,
                engineerNotes: quotNotes || undefined,
              }
            : undefined,
        });
        toast.success('Blueprint uploaded');
      }
      setUploadOpen(false);
      setUploadRevisionFor(null);
      resetUploadForm();
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleAcceptBlueprint = async () => {
    if (!acceptDialog.blueprint) return;
    try {
      await acceptMutation.mutateAsync({
        id: acceptDialog.blueprint._id,
        paymentType,
      });
      toast.success('Blueprint accepted! Payment plan created.');
      setAcceptDialog({ open: false, blueprint: null });
      setPaymentType('full');
    } catch {
      toast.error('Failed to accept blueprint');
    }
  };

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
        revisionRefKeys,
      });
      toast.success('Revision requested');
      setRevisionDialog({ open: false, blueprintId: '' });
      setRevisionNotes('');
      setRevisionRefKeys([]);
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
        <div className="flex items-center gap-3">
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
          {isEngineer && selectedProjectId && (
            <Button
              onClick={() => {
                resetUploadForm();
                setUploadRevisionFor(null);
                setUploadOpen(true);
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Blueprint
            </Button>
          )}
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
          {blueprints?.map((bp: Blueprint) => (
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
                      {!canReviewBlueprint && bp.uploadedBy && ` by ${bp.uploadedBy.firstName} ${bp.uploadedBy.lastName}`}
                    </span>
                    {!canReviewBlueprint && bp.uploadedBy?.phone && (
                      <a
                        href={`tel:${bp.uploadedBy.phone}`}
                        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
                      >
                        <Phone className="h-3 w-3" />
                        {bp.uploadedBy.phone}
                      </a>
                    )}
                    {bp.status === 'approved' && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none">
                        <CheckCircle className="mr-1 h-3 w-3" /> Fully Approved
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEngineer && bp.status === 'revision_requested' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          resetUploadForm();
                          setUploadRevisionFor(bp._id);
                          setUploadOpen(true);
                        }}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Revision
                      </Button>
                    )}
                    {canReviewBlueprint && !bp.blueprintApproved && bp.status !== 'revision_requested' && (
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
                    {canReviewBlueprint &&
                      bp.blueprintApproved &&
                      bp.costingApproved &&
                      bp.quotation &&
                      bp.quotation.total > 0 && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                        onClick={() => {
                          setPaymentType('full');
                          setAcceptDialog({ open: true, blueprint: bp });
                        }}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Accept &amp; Choose Payment
                      </Button>
                    )}
                  </div>
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

                {/* Quotation Display */}
                {bp.quotation && bp.quotation.total > 0 && (
                  <Card className="border-gray-100 rounded-xl">
                    <CardHeader className="pb-3 bg-gray-50/50 border-b border-gray-100 rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-gray-900">Quotation Summary</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {/* Staff sees full breakdown, customers see total + duration only */}
                      {!canReviewBlueprint ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Materials</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(bp.quotation.materials)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Labor</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(bp.quotation.labor)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Other Fees</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(bp.quotation.fees)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total</p>
                            <p className="text-lg font-bold text-emerald-700">{formatCurrency(bp.quotation.total)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Total Project Cost</p>
                            <p className="text-xl font-bold text-emerald-700">{formatCurrency(bp.quotation.total)}</p>
                          </div>
                        </div>
                      )}
                      {bp.quotation.estimatedDuration && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Estimated Duration:</span>
                          <span>{bp.quotation.estimatedDuration}</span>
                        </div>
                      )}
                      {/* Internal details — staff only */}
                      {!canReviewBlueprint && (bp.quotation.breakdown || bp.quotation.engineerNotes) && (
                        <div className="space-y-3 border-t border-gray-100 pt-4 mt-3">
                          {bp.quotation.breakdown && (
                            <div className="text-sm text-gray-600">
                              <p className="font-medium text-gray-700 mb-1">Cost Breakdown:</p>
                              <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {bp.quotation.breakdown}
                              </p>
                            </div>
                          )}
                          {bp.quotation.engineerNotes && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                              <MessageSquare className="h-4 w-4 mt-0.5 text-gray-400" />
                              <div>
                                <span className="font-medium">Engineer Notes:</span>
                                <p className="mt-0.5">{bp.quotation.engineerNotes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {/* Upload Blueprint Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadOpen(false);
            setUploadRevisionFor(null);
            resetUploadForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {uploadRevisionFor ? 'Upload Revision' : 'Upload Blueprint & Costing'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {uploadRevisionFor
                ? 'Upload revised blueprint drawing and costing sheet.'
                : 'Upload the technical drawing, costing sheet, and provide a quotation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-gray-700">Blueprint Drawing (PDF)</Label>
              <FileUpload
                accept="application/pdf"
                maxFiles={1}
                value={blueprintFileKeys}
                onChange={setBlueprintFileKeys}
                folder="blueprints"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-gray-700">Costing Sheet (PDF)</Label>
              <FileUpload
                accept="application/pdf"
                maxFiles={1}
                value={costingFileKeys}
                onChange={setCostingFileKeys}
                folder="costings"
              />
            </div>

            {!uploadRevisionFor && (
              <>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Quotation Details</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Materials (₱)</Label>
                      <Input
                        type="number"
                        value={quotMaterials}
                        onChange={(e) => setQuotMaterials(e.target.value)}
                        min={0}
                        step={0.01}
                        className="h-9 bg-gray-50/50 border-gray-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Labor (₱)</Label>
                      <Input
                        type="number"
                        value={quotLabor}
                        onChange={(e) => setQuotLabor(e.target.value)}
                        min={0}
                        step={0.01}
                        className="h-9 bg-gray-50/50 border-gray-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Other Fees (₱)</Label>
                      <Input
                        type="number"
                        value={quotFees}
                        onChange={(e) => setQuotFees(e.target.value)}
                        min={0}
                        step={0.01}
                        className="h-9 bg-gray-50/50 border-gray-200"
                      />
                    </div>
                  </div>
                  {(Number(quotMaterials) + Number(quotLabor) + Number(quotFees)) > 0 && (
                    <p className="text-sm font-semibold text-emerald-700 mt-2">
                      Total: {formatCurrency(Number(quotMaterials) + Number(quotLabor) + Number(quotFees))}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Estimated Duration</Label>
                  <Input
                    value={quotDuration}
                    onChange={(e) => setQuotDuration(e.target.value)}
                    placeholder="e.g. 2-3 weeks"
                    className="h-9 bg-gray-50/50 border-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Cost Breakdown</Label>
                  <Textarea
                    value={quotBreakdown}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuotBreakdown(e.target.value)}
                    placeholder="Detailed breakdown of costs..."
                    className="min-h-[60px] bg-gray-50/50 border-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Engineer Notes</Label>
                  <Textarea
                    value={quotNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuotNotes(e.target.value)}
                    placeholder="Any additional notes for the customer..."
                    className="min-h-[60px] bg-gray-50/50 border-gray-200"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setUploadOpen(false);
                setUploadRevisionFor(null);
                resetUploadForm();
              }}
              className="border-gray-200 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadBlueprint}
              disabled={uploadBlueprintMut.isPending || uploadRevisionMut.isPending}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
            >
              {(uploadBlueprintMut.isPending || uploadRevisionMut.isPending) ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog
        open={revisionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRevisionDialog({ open: false, blueprintId: '' });
            setRevisionRefKeys([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Reference Files (optional)
              </Label>
              <p className="text-xs text-gray-500">
                Attach photos, sketches, or documents to help illustrate the changes you need.
              </p>
              <FileUpload
                folder="revision-refs"
                accept="image/*,.pdf,.doc,.docx"
                maxFiles={5}
                maxSizeMB={10}
                onUploadComplete={(keys) => setRevisionRefKeys(keys)}
                existingKeys={revisionRefKeys}
                label="Upload reference files"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevisionDialog({ open: false, blueprintId: '' });
                setRevisionRefKeys([]);
              }}
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

      {/* Accept Blueprint & Payment Selection Dialog */}
      <Dialog
        open={acceptDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setAcceptDialog({ open: false, blueprint: null });
            setPaymentType('full');
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Accept Blueprint & Choose Payment</DialogTitle>
            <DialogDescription className="text-gray-500">
              Review the quotation and select your preferred payment method.
            </DialogDescription>
          </DialogHeader>

          {acceptDialog.blueprint?.quotation && (
            <div className="space-y-5 mt-2">
              {/* Quotation Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Quotation Summary</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Materials</span>
                  <span className="text-right font-medium">{formatCurrency(acceptDialog.blueprint.quotation.materials)}</span>
                  <span className="text-gray-500">Labor</span>
                  <span className="text-right font-medium">{formatCurrency(acceptDialog.blueprint.quotation.labor)}</span>
                  <span className="text-gray-500">Other Fees</span>
                  <span className="text-right font-medium">{formatCurrency(acceptDialog.blueprint.quotation.fees)}</span>
                  <span className="text-gray-700 font-semibold border-t border-gray-200 pt-2">Base Total</span>
                  <span className="text-right font-bold text-emerald-700 border-t border-gray-200 pt-2">
                    {formatCurrency(acceptDialog.blueprint.quotation.total)}
                  </span>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Payment Option</p>

                {/* Full Payment */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentType === 'full'
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value="full"
                    checked={paymentType === 'full'}
                    onChange={() => setPaymentType('full')}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Full Payment</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pay the full amount in one go — no surcharge.
                    </p>
                    <p className="text-sm font-bold text-emerald-700 mt-1">
                      {formatCurrency(acceptDialog.blueprint.quotation.total)}
                    </p>
                  </div>
                </label>

                {/* Installment */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentType === 'installment'
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value="installment"
                    checked={paymentType === 'installment'}
                    onChange={() => setPaymentType('installment')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Installment</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Split into multiple stages with a {surchargePercent}% surcharge.
                    </p>
                    <p className="text-sm font-bold text-blue-700 mt-1">
                      {formatCurrency(
                        acceptDialog.blueprint.quotation.total *
                          (1 + surchargePercent / 100),
                      )}{' '}
                      <span className="text-xs font-normal text-gray-400">
                        (+{surchargePercent}%)
                      </span>
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAcceptDialog({ open: false, blueprint: null });
                setPaymentType('full');
              }}
              className="border-gray-200 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptBlueprint}
              disabled={acceptMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              {acceptMutation.isPending ? 'Processing...' : 'Confirm & Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
