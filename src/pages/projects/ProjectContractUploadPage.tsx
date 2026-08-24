import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, Download, FileSignature, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/FileUpload';
import { PageError } from '@/components/shared/PageError';
import { PageLoader } from '@/components/shared/PageLoader';
import { useProject, useUploadProjectContract } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { ContractStatus, ProjectStatus, Role } from '@/lib/constants';
import { cn, extractErrorMessage } from '@/lib/utils';

const getFileName = (fileKey: string) => fileKey.split('/').pop() || fileKey;
const formatCurrency = (value: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
}).format(value);

export function ProjectContractUploadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: project, isLoading, isError, refetch } = useProject(id || '');
  const uploadProjectContract = useUploadProjectContract();
  const [contractFileKeys, setContractFileKeys] = useState<string[]>([]);

  useEffect(() => {
    setContractFileKeys(project?.contractFileKey ? [project.contractFileKey] : []);
  }, [project?.contractFileKey]);

  const canManageContract = useMemo(() => {
    if (!user || !project) return false;
    if (user.roles.includes(Role.ADMIN)) return true;
    if (!user.roles.includes(Role.SALES_STAFF)) return false;
    const salesStaffId = typeof project.salesStaffId === 'string'
      ? project.salesStaffId
      : project.salesStaffId?._id;
    return salesStaffId === user._id;
  }, [project, user]);

  const isReplacementLocked = Boolean(project && project.engineerIds.length > 0);
  const canUpload = Boolean(
    canManageContract
    && project
    && !isReplacementLocked
    && [ProjectStatus.DRAFT, ProjectStatus.SUBMITTED].includes(project.status as ProjectStatus),
  );

  const handleUploadSignedContract = async () => {
    if (!id) return;
    const contractFileKey = contractFileKeys[0];
    if (!contractFileKey) {
      toast.error('Upload the signed contract file first.');
      return;
    }

    try {
      await uploadProjectContract.mutateAsync({
        id,
        contractFileKey,
        contractFileName: getFileName(contractFileKey),
      });
      toast.success('Signed contract uploaded. The project is now ready for engineering.', { duration: 5000 });
      navigate(`/projects/${id}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save signed contract'));
    }
  };

  const handleDownloadContract = async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/projects/${id}/contract-url`);
      window.open(data.data.url, '_blank');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to open contract'));
    }
  };

  if (isLoading) return <PageLoader />;
  if (isError || !project) return <PageError onRetry={refetch} />;

  const isUploaded = project.contractStatus === ContractStatus.UPLOADED;
  const rawProjectCost = Number(project.totalCost);
  const approvedProjectCost = Number.isFinite(rawProjectCost) && rawProjectCost > 0
    ? rawProjectCost
    : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/projects/${id}`)}
            className="rounded-xl"
            aria-label="Back to project"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Contract Upload
            </p>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-100">
              Upload Signed Contract
            </h1>
          </div>
        </div>
        {isUploaded && (
          <Button type="button" variant="outline" onClick={handleDownloadContract} className="rounded-xl">
            <Download className="mr-2 h-4 w-4" />
            View / Download
          </Button>
        )}
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSignature className="h-5 w-5 text-blue-500" />
            {project.projectNumber || project.title || 'Project'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className={cn(
            'rounded-2xl border p-4',
            isUploaded
              ? 'border-emerald-500/35 bg-emerald-500/10'
              : 'border-amber-500/35 bg-amber-500/10',
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                isUploaded ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300',
              )}>
                {isUploaded ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                  {isUploaded ? 'Signed contract uploaded' : 'Signed contract required'}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {isUploaded
                    ? project.contractFileName || getFileName(project.contractFileKey || '')
                    : 'Accepted files: PDF, JPG, JPEG, PNG.'}
                </p>
              </div>
            </div>
          </div>

          <div className={cn(
            'rounded-2xl border p-4',
            approvedProjectCost !== undefined
              ? 'border-emerald-500/30 bg-emerald-500/[0.07]'
              : 'border-amber-500/35 bg-amber-500/10',
          )}>
            <div className="flex items-start gap-3">
              <span className={cn(
                'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                approvedProjectCost !== undefined
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
              )}>
                {approvedProjectCost !== undefined
                  ? <Calculator className="h-5 w-5" />
                  : <AlertTriangle className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                  {approvedProjectCost !== undefined ? 'Approved project cost' : 'Finalized contract amount not available'}
                </p>
                {approvedProjectCost !== undefined ? (
                  <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(approvedProjectCost)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    This project response does not provide a positive approved project cost. Confirm the agreed amount directly from the manually signed document before uploading it.
                  </p>
                )}
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  This page does not read or verify the amount printed in the file. The uploaded signed contract remains the authoritative contract record.
                </p>
              </div>
            </div>
          </div>

          {!canManageContract && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              Only the assigned sales staff or an admin can upload the signed contract.
            </div>
          )}

          {canManageContract && isReplacementLocked && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              Contract replacement is locked because engineering has already started.
            </div>
          )}

          {canUpload && (
            <div className="space-y-4">
              <FileUpload
                folder="contracts"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                maxSizeMB={25}
                maxFiles={1}
                existingKeys={contractFileKeys}
                label={isUploaded ? 'Replace signed contract' : 'Upload signed contract'}
                onUploadComplete={(keys) => setContractFileKeys(keys.slice(-1))}
              />
              <Button
                variant="prominent"
                onClick={handleUploadSignedContract}
                disabled={
                  uploadProjectContract.isPending ||
                  !contractFileKeys[0] ||
                  contractFileKeys[0] === project.contractFileKey
                }
                className="w-full rounded-xl sm:w-auto"
              >
                {uploadProjectContract.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isUploaded ? 'Save Replacement' : 'Submit Signed Contract'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
