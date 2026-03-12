import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText, CheckCircle, AlertCircle, Eye, Info,
  Clock, MessageSquare, Download, Upload, Loader2, Image, X,
  Plus, Trash2, Calendar, ArrowRight, CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AuthImage } from '@/components/shared/AuthImage';
import { openAuthenticatedFile, useAuthenticatedUrl } from '@/hooks/useUploads';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/shared/FileUpload';

import {
  useBlueprintsByProject,
  useLatestBlueprint,
  useApproveComponent,
  useRequestBlueprintRevision,
  useUploadBlueprint,
  useUploadRevision,
} from '@/hooks/useBlueprints';
import { useConfigs } from '@/hooks/useConfig';
import { uploadFileToR2 } from '@/hooks/useUploads';
import { useProject, useSelectProjectPaymentPlan } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { api } from '@/lib/api';
import { Role } from '@/lib/constants';
import type { Blueprint, VisitReport } from '@/lib/types';

interface BlueprintTabProps {
  projectId: string;
  onNavigateToDetails?: () => void;
}

interface BlueprintDraftLineItem {
  label: string;
  quantity: number;
  materials: string;
  labor: string;
}

interface BlueprintDraftMilestone {
  label: string;
  description: string;
}

interface BlueprintDraftState {
  blueprintFileMeta: { name: string; type: string } | null;
  designFileMeta: { name: string; type: string } | null;
  costingFileMeta: { name: string; type: string } | null;
  quotLineItems: BlueprintDraftLineItem[];
  quotFees: string;
  quotValidityDays: string;
  quotBreakdown: string;
  quotDuration: string;
  quotNotes: string;
  quotMilestones: BlueprintDraftMilestone[];
}

interface BlueprintDraftCacheEntry {
  blueprintFile: File | null;
  designFile: File | null;
  costingFile: File | null;
}

const buildBlueprintDraftKey = (projectId: string) => `rmv:blueprint-draft:${projectId}`;
const blueprintDraftFileCache = new Map<string, BlueprintDraftCacheEntry>();

function getFileMeta(file: File | null) {
  return file ? { name: file.name, type: file.type } : null;
}

function requestSignedUploadUrl(body: {
  folder: string;
  fileName: string;
  contentType: string;
}) {
  return api
    .post('/uploads/signed-upload-url', {
      folder: body.folder,
      filename: body.fileName,
      contentType: body.contentType,
    })
    .then((res) => ({
      uploadUrl: res.data.data.uploadUrl as string,
      fileKey: res.data.data.key as string,
    }));
}

// ── File Picker with Preview ──
function FilePickerWithPreview({
  file,
  onFileChange,
  accept,
  label,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
  accept: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const isImage = file?.type.startsWith('image/');
  const previewUrl = useMemo(
    () => (file && isImage ? URL.createObjectURL(file) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file],
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePreview = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  return (
    <div>
      <label className={`mb-1.5 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        className="hidden"
      />
      {file ? (
        <div className={`relative group overflow-hidden rounded-xl border ${isDark ? 'border-slate-700/80 bg-slate-950/55 shadow-[0_18px_38px_rgba(2,6,23,0.34)]' : 'border-[#c8c8cd]/50 bg-[#f5f5f7]/30'}`}>
          <button
            type="button"
            onClick={handlePreview}
            className={`w-full text-left transition-colors ${isDark ? 'hover:bg-slate-900/70' : 'hover:bg-[#f0f0f5]/50'}`}
          >
            {isImage && previewUrl ? (
              <div className={`aspect-[3/2] flex items-center justify-center p-2 ${isDark ? 'bg-slate-950/80' : 'bg-[#f5f5f7]'}`}>
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className={`aspect-[3/2] flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-slate-950/80' : 'bg-[#f5f5f7]'}`}>
                <FileText className={`h-10 w-10 ${isDark ? 'text-slate-300' : 'text-[#86868b]'}`} />
                <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                  {file.name.split('.').pop()}
                </span>
              </div>
            )}
            <div className={`p-3 ${isDark ? 'border-t border-slate-800/80' : 'border-t border-[#c8c8cd]/30'}`}>
              <p className={`truncate text-xs font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>{file.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>{formatSize(file.size)}</p>
                <span className={`text-[10px] ${isDark ? 'text-sky-300' : 'text-[#0066cc]'}`}>Click to preview</span>
              </div>
            </div>
          </button>
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              title="Change file"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="h-7 w-7 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${isDark ? 'border-slate-700 bg-slate-950/45 hover:border-slate-500 hover:bg-slate-900/70' : 'border-[#c8c8cd] hover:border-[#86868b] hover:bg-[#f5f5f7]/30'}`}
        >
          <Upload className={`mx-auto mb-1.5 h-6 w-6 ${isDark ? 'text-slate-300' : 'text-[#86868b]'}`} />
          <p className={`text-xs font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>Choose file</p>
          <p className={`mt-0.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
            {accept.replace(/\./g, '').split(',').join(', ').toUpperCase()}
          </p>
        </button>
      )}
    </div>
  );
}


// -- Inline preview thumbnail (loads signed URL via hook) --
function FilePreviewThumb({ fileKey, label }: { fileKey: string | undefined | null; label: string }) {
  const { url, isLoading } = useAuthenticatedUrl(fileKey ?? null);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const isImage = fileKey ? /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileKey) : false;

  if (isLoading) {
    return (
      <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),rgba(2,6,23,0.94)_62%)] dark:bg-slate-900/70' : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(241,245,249,0.95)_62%)]'} aspect-[4/3] rounded-xl border border-[color:var(--color-border)]/55 flex items-center justify-center dark:border-slate-700`}>
        <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-gray-300 dark:text-slate-500' : 'text-[var(--text-metal-muted-color)]'}`} />
      </div>
    );
  }

  if (url && isImage) {
    return (
      <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),rgba(2,6,23,0.94)_62%)] dark:bg-slate-900/70' : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(241,245,249,0.95)_62%)]'} aspect-[4/3] rounded-xl border border-[color:var(--color-border)]/55 flex items-center justify-center overflow-hidden dark:border-slate-700`}>
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  // Non-image file or no URL � show icon placeholder
  const isPdf = fileKey ? /\.pdf$/i.test(fileKey) : false;
  const isSpreadsheet = fileKey ? /\.(xlsx?|csv)$/i.test(fileKey) : false;
  return (
    <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),rgba(2,6,23,0.94)_62%)] dark:bg-slate-900/70' : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(241,245,249,0.95)_62%)]'} aspect-[4/3] rounded-xl border border-[color:var(--color-border)]/55 flex items-center justify-center dark:border-slate-700`}>
      <div className="text-center p-6">
        {isPdf ? (
          <FileText className={`mx-auto mb-3 h-12 w-12 ${isDark ? 'text-red-300' : 'text-red-500'}`} />
        ) : isSpreadsheet ? (
          <Info className={`mx-auto mb-3 h-12 w-12 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`} />
        ) : (
          <Image className={`mx-auto mb-3 h-12 w-12 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
        )}
        <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>{label}</p>
        <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-color)]'}`}>Click to view full document</p>
      </div>
    </div>
  );
}

export function BlueprintTab({ projectId, onNavigateToDetails }: BlueprintTabProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const isEngineer = user?.roles?.some((r: string) => r === 'engineer');
  const isCustomer = user?.roles?.some((r: string) => r === Role.CUSTOMER);
  const isFabricationStaff = user?.roles?.some((r: string) => r === Role.FABRICATION_STAFF);

  const { data: project, refetch: refetchProject } = useProject(projectId);
  const { data: blueprint, refetch: refetchBlueprint } = useLatestBlueprint(projectId);
  const { data: blueprints, isLoading, isError, refetch } = useBlueprintsByProject(projectId);

  // Engineer-specific mutations
  const uploadBlueprint = useUploadBlueprint();
  const uploadRevision = useUploadRevision();
  // Customer-specific mutations
  const approveMutation = useApproveComponent();
  const revisionMutation = useRequestBlueprintRevision();
  const selectPaymentPlanMutation = useSelectProjectPaymentPlan();
  const [approvingComponent, setApprovingComponent] = useState<'blueprint' | 'costing' | null>(null);

  const { data: configs } = useConfigs();
  const surchargePercent = (() => {
    const cfg = configs?.find((c) => c.key === 'installment_surcharge_percent');
    return typeof cfg?.value === 'number' ? cfg.value : 10;
  })();

  // Check if user is assigned engineer for this project
  const isAssigned = (() => {
    if (!user?._id || !project) return false;
    return project.engineerIds.some(
      (e: any) => (typeof e === 'string' ? e : e._id) === user._id,
    );
  })();

  const canReviewBlueprint = isCustomer;

  // ── Customer review state ──
  const [revisionDialog, setRevisionDialog] = useState<{ open: boolean; blueprintId: string }>({
    open: false,
    blueprintId: '',
  });
  const [approveConfirmDialog, setApproveConfirmDialog] = useState<{
    open: boolean;
    blueprintId: string;
    component: 'blueprint' | 'costing' | null;
  }>({ open: false, blueprintId: '', component: null });
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionRefKeys, setRevisionRefKeys] = useState<string[]>([]);
  const [acceptDialog, setAcceptDialog] = useState<{ open: boolean; blueprint: Blueprint | null }>({
    open: false,
    blueprint: null,
  });
  const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');

  // ── Engineer upload state ──
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [costingFile, setCostingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [quotLineItems, setQuotLineItems] = useState<{ label: string; quantity: number; materials: string; labor: string }[]>([]);
  const [quotFees, setQuotFees] = useState('');
  const [quotValidityDays, setQuotValidityDays] = useState('30');
  const [quotBreakdown, setQuotBreakdown] = useState('');
  const [quotDuration, setQuotDuration] = useState('');
  const [quotNotes, setQuotNotes] = useState('');
  const [quotMilestones, setQuotMilestones] = useState<{ label: string; description: string }[]>([]);
  const [quotInitialized, setQuotInitialized] = useState(false);
  const blueprintDraftKey = useMemo(() => buildBlueprintDraftKey(projectId), [projectId]);

  // ── Derive visit report line items ──
  const visitReport: VisitReport | null = useMemo(() => {
    if (!project?.visitReportId || typeof project.visitReportId === 'string') return null;
    return project.visitReportId as VisitReport;
  }, [project]);

  const vrLineItems = visitReport?.lineItems;

  // Pre-populate installment milestones from config defaults (once)
  const cfgSplit: number[] = (() => {
    const c = configs?.find(cfg => cfg.key === 'installment_split');
    return Array.isArray(c?.value) ? (c.value as number[]) : [30, 40, 30];
  })();
  const cfgLabels: string[] = (() => {
    const c = configs?.find(cfg => cfg.key === 'installment_stage_labels');
    return Array.isArray(c?.value) ? (c.value as string[]) : ['Down Payment', 'Mid-Project', 'Final Payment'];
  })();
  const cfgDescriptions: string[] = (() => {
    const c = configs?.find(cfg => cfg.key === 'installment_stage_descriptions');
    return Array.isArray(c?.value) ? (c.value as string[]) : ['Due upon contract signing', 'Due when fabrication is complete', 'Due after installation & acceptance'];
  })();

  useEffect(() => {
    const cachedFiles = blueprintDraftFileCache.get(projectId);
    if (cachedFiles) {
      setBlueprintFile(cachedFiles.blueprintFile);
      setDesignFile(cachedFiles.designFile);
      setCostingFile(cachedFiles.costingFile);
    }

    if (quotInitialized) return;

    const storedDraftRaw = sessionStorage.getItem(blueprintDraftKey);
    if (storedDraftRaw) {
      try {
        const storedDraft = JSON.parse(storedDraftRaw) as BlueprintDraftState;
        setQuotLineItems(storedDraft.quotLineItems || []);
        setQuotFees(storedDraft.quotFees || '');
        setQuotValidityDays(storedDraft.quotValidityDays || '30');
        setQuotBreakdown(storedDraft.quotBreakdown || '');
        setQuotDuration(storedDraft.quotDuration || '');
        setQuotNotes(storedDraft.quotNotes || '');
        setQuotMilestones(storedDraft.quotMilestones || []);
        setQuotInitialized(true);
        return;
      } catch {
        sessionStorage.removeItem(blueprintDraftKey);
      }
    }

    if (vrLineItems && vrLineItems.length > 0) {
      setQuotLineItems(vrLineItems.map((li) => ({
        label: li.label,
        quantity: li.quantity || 1,
        materials: '',
        labor: '',
      })));
    }

    if (cfgSplit.length > 0) {
      setQuotMilestones(cfgSplit.map((_, idx) => ({
        label: cfgLabels[idx] || `Stage ${idx + 1}`,
        description: cfgDescriptions[idx] || '',
      })));
    }

    setQuotInitialized(true);
  }, [blueprintDraftKey, cfgDescriptions, cfgLabels, cfgSplit, quotInitialized, vrLineItems]);

  useEffect(() => {
    blueprintDraftFileCache.set(projectId, {
      blueprintFile,
      designFile,
      costingFile,
    });

    if (!quotInitialized) return;

    const draft: BlueprintDraftState = {
      blueprintFileMeta: getFileMeta(blueprintFile),
      designFileMeta: getFileMeta(designFile),
      costingFileMeta: getFileMeta(costingFile),
      quotLineItems,
      quotFees,
      quotValidityDays,
      quotBreakdown,
      quotDuration,
      quotNotes,
      quotMilestones,
    };

    const hasDraft = Boolean(
      draft.blueprintFileMeta
      || draft.designFileMeta
      || draft.costingFileMeta
      || draft.quotLineItems.length
      || draft.quotFees
      || draft.quotBreakdown
      || draft.quotDuration
      || draft.quotNotes
      || draft.quotMilestones.length,
    );

    if (!hasDraft) {
      sessionStorage.removeItem(blueprintDraftKey);
      if (!blueprintFile && !designFile && !costingFile) {
        blueprintDraftFileCache.delete(projectId);
      }
      return;
    }

    sessionStorage.setItem(blueprintDraftKey, JSON.stringify(draft));
  }, [
    blueprintDraftKey,
    blueprintFile,
    costingFile,
    designFile,
    projectId,
    quotBreakdown,
    quotDuration,
    quotFees,
    quotInitialized,
    quotLineItems,
    quotMilestones,
    quotNotes,
    quotValidityDays,
  ]);

  // Computed totals
  const quotItemTotals = quotLineItems.map(li => {
    const m = Number(li.materials) || 0;
    const l = Number(li.labor) || 0;
    return (m + l) * li.quantity;
  });
  const quotSubtotal = quotItemTotals.reduce((s, v) => s + v, 0);
  const quotFeesNum = Number(quotFees) || 0;
  const quotGrandTotal = quotSubtotal + quotFeesNum;
  const quotTotalMaterials = quotLineItems.reduce((s, li) => s + (Number(li.materials) || 0) * li.quantity, 0);
  const quotTotalLabor = quotLineItems.reduce((s, li) => s + (Number(li.labor) || 0) * li.quantity, 0);

  // Line item mutation helpers
  const updateLineItem = (idx: number, field: string, value: string | number) => {
    setQuotLineItems(prev => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)));
  };
  const addLineItem = () => {
    setQuotLineItems(prev => [...prev, { label: '', quantity: 1, materials: '', labor: '' }]);
  };
  const removeLineItem = (idx: number) => {
    setQuotLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const inputCls = `w-full h-9 rounded-lg border px-3 text-sm transition-colors focus:outline-none focus:ring-2 ${isDark ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-sky-400/25' : 'border-[#d2d2d7] bg-[#f5f5f7]/50 focus:border-[#b8b8bd] focus:ring-[#6e6e73]'}`;
  const uploadActionButtonClass = isDark
    ? 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300/70 bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-3 text-sm font-medium text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(2,6,23,0.28)] transition-[background,color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#ffffff_0%,#edf2f7_100%)] disabled:cursor-not-allowed disabled:opacity-100 disabled:border-slate-600 disabled:bg-[#94a3b8] disabled:text-slate-800 disabled:shadow-none'
    : 'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1d1d1f] px-3 text-sm font-medium text-white transition-colors hover:bg-[#2d2d2f] disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-[#c8c8cd] disabled:text-[#3a3a3e]';

  const formatCurrency = (n: number | undefined | null) => {
    const val = Number(n);
    return `₱${(Number.isFinite(val) ? val : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Shared quotation form used in both first-upload and revision-upload
  const quotationFormJSX = (
    <div className={`space-y-4 border-t pt-3 ${isDark ? 'border-slate-800/80' : 'border-[#c8c8cd]/50'}`}>
      <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>Quotation Details <span className="text-xs text-red-500">*</span></p>

      {/* ── Itemized pricing table ── */}
      {quotLineItems.length > 0 && (
        <div className="space-y-2">
          {/* Table header (hidden on small screens, visible on >=640) */}
          <div className={`hidden gap-2 px-1 text-[10px] font-medium uppercase tracking-wider sm:grid sm:grid-cols-[1fr_60px_100px_100px_90px_32px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
            <span>Item</span>
            <span>Qty</span>
            <span>Materials (₱)</span>
            <span>Labor (₱)</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {quotLineItems.map((li, idx) => {
            const rowTotal = quotItemTotals[idx] || 0;
            return (
              <div key={idx} className={`space-y-2 rounded-lg p-3 sm:grid sm:grid-cols-[1fr_60px_100px_100px_90px_32px] sm:items-center sm:gap-2 sm:space-y-0 sm:border-0 sm:bg-transparent sm:p-0 ${isDark ? 'border border-slate-800/80 bg-slate-950/45' : 'border border-[#d2d2d7]/60 bg-white'}`}>
                {/* Item name */}
                <div>
                  <span className={`mb-1 block text-[10px] font-medium uppercase tracking-wider sm:hidden ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Item</span>
                  <input value={li.label} onChange={e => updateLineItem(idx, 'label', e.target.value)} placeholder="Item name" className={inputCls} />
                </div>
                {/* Quantity */}
                <div>
                  <span className={`mb-1 block text-[10px] font-medium uppercase tracking-wider sm:hidden ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Qty</span>
                  <input type="number" value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))} min={1} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div>
                    <span className={`mb-1 block text-[10px] font-medium uppercase tracking-wider sm:hidden ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Materials (₱)</span>
                    <input type="number" value={li.materials} onChange={e => updateLineItem(idx, 'materials', e.target.value)} min={0} step={0.01} placeholder="0.00" className={inputCls} />
                  </div>
                  <div>
                    <span className={`mb-1 block text-[10px] font-medium uppercase tracking-wider sm:hidden ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Labor (₱)</span>
                    <input type="number" value={li.labor} onChange={e => updateLineItem(idx, 'labor', e.target.value)} min={0} step={0.01} placeholder="0.00" className={inputCls} />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end">
                  <span className={`text-[10px] font-medium uppercase tracking-wider sm:hidden ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Total</span>
                  <p className={`flex h-9 items-center text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>{formatCurrency(rowTotal)}</p>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeLineItem(idx)} className={`rounded p-1 transition-colors ${isDark ? 'text-red-300 hover:text-red-200' : 'text-red-400 hover:text-red-600'}`} title="Remove item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={addLineItem}
        className={isDark ? 'w-fit border border-slate-600/80 text-slate-100' : 'w-fit border border-[#d2d2d7]/80 text-[#3a3a3e]'}
      >
        <Plus className="h-3.5 w-3.5" /> Add Item
      </Button>

      {/* Other Fees */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
        <div>
          <label className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Other Fees (₱)</label>
          <input type="number" value={quotFees} onChange={(e) => setQuotFees(e.target.value)} min={0} step={0.01} placeholder="Delivery, permits, etc." className={inputCls} />
        </div>
        <div>
          <label className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Quotation Validity</label>
          <Select value={quotValidityDays} onValueChange={setQuotValidityDays}>
            <SelectTrigger className={`h-9 w-full rounded-lg border px-3 text-sm transition-colors focus:outline-none focus:ring-2 ${isDark ? 'border-slate-700 bg-slate-950/70 text-slate-100 focus:border-sky-400/70 focus:ring-sky-400/25' : 'border-[#d2d2d7] bg-[#f5f5f7]/50 focus:border-[#b8b8bd] focus:ring-[#6e6e73]'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={`rounded-xl border shadow-lg ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-[#d2d2d7] bg-white'}`}>
              <SelectItem value="15" className="rounded-lg text-sm">15 days</SelectItem>
              <SelectItem value="30" className="rounded-lg text-sm">30 days</SelectItem>
              <SelectItem value="45" className="rounded-lg text-sm">45 days</SelectItem>
              <SelectItem value="60" className="rounded-lg text-sm">60 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live totals */}
      {quotGrandTotal > 0 && (
        <div className={`space-y-1.5 rounded-lg border p-3 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-[#e8e8ed] bg-[#f5f5f7]'}`}>
          <div className={`flex justify-between text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>
            <span>Materials</span>
            <span>{formatCurrency(quotTotalMaterials)}</span>
          </div>
          <div className={`flex justify-between text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>
            <span>Labor</span>
            <span>{formatCurrency(quotTotalLabor)}</span>
          </div>
          {quotFeesNum > 0 && (
            <div className={`flex justify-between text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>
              <span>Other Fees</span>
              <span>{formatCurrency(quotFeesNum)}</span>
            </div>
          )}
          <div className={`flex justify-between border-t pt-1.5 text-sm font-bold ${isDark ? 'border-slate-800 text-emerald-300' : 'border-[#d2d2d7] text-emerald-700'}`}>
            <span>Grand Total</span>
            <span>{formatCurrency(quotGrandTotal)}</span>
          </div>
        </div>
      )}

      {/* Duration + Scope + Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Estimated Duration</label>
          <input value={quotDuration} onChange={e => setQuotDuration(e.target.value)} placeholder="e.g. 2-3 weeks" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Scope of Work</label>
        <textarea value={quotBreakdown} onChange={e => setQuotBreakdown(e.target.value)} placeholder="Describe what will be fabricated and installed..." rows={3} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${isDark ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-sky-400/25' : 'border-[#d2d2d7] bg-[#f5f5f7]/50 focus:border-[#b8b8bd] focus:ring-[#6e6e73]'}`} />
      </div>
      <div>
        <label className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Engineer Notes</label>
        <textarea value={quotNotes} onChange={e => setQuotNotes(e.target.value)} placeholder="Any additional notes for the customer..." rows={2} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${isDark ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-sky-400/25' : 'border-[#d2d2d7] bg-[#f5f5f7]/50 focus:border-[#b8b8bd] focus:ring-[#6e6e73]'}`} />
      </div>

      {/* ── Installment Payment Milestones ── */}
      {quotMilestones.length > 0 && (
        <div className={`space-y-3 border-t pt-3 ${isDark ? 'border-slate-800/80' : 'border-[#c8c8cd]/50'}`}>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>Installment Payment Schedule</p>
            <p className={`mt-0.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Describe when each payment stage is due. Only applies if the customer chooses installment.</p>
          </div>
          {quotMilestones.map((ms, idx) => (
            <div key={idx} className={`space-y-2 rounded-lg border p-3 ${isDark ? 'border-slate-800 bg-slate-950/55' : 'border-[#d2d2d7]/60 bg-[#f5f5f7]/30'}`}>
              <div className="flex items-center gap-2">
                <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Stage {idx + 1}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#e8e8ed] text-[#6e6e73]'}`}>{cfgSplit[idx]}%</span>
              </div>
              <input
                value={ms.label}
                onChange={e => setQuotMilestones(prev => prev.map((m, i) => i === idx ? { ...m, label: e.target.value } : m))}
                placeholder="Stage label (e.g. Down Payment)"
                className={inputCls}
              />
              <input
                value={ms.description}
                onChange={e => setQuotMilestones(prev => prev.map((m, i) => i === idx ? { ...m, description: e.target.value } : m))}
                placeholder="When is this due? (e.g. Due upon contract signing)"
                className={inputCls}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Helpers ──
  const handleViewFile = (key: string) => {
    if (!key) return;
    if (key.startsWith('http')) {
      window.open(key, '_blank');
    } else {
      openAuthenticatedFile(key);
    }
  };

  // ── Customer handlers ──
  const handleApprove = (blueprintId: string, component: 'blueprint' | 'costing') => {
    setApprovingComponent(component);
    approveMutation.mutate(
      { id: blueprintId, component },
      {
        onSuccess: () => {
          toast.success(
            component === 'blueprint'
              ? 'Design approved! Next: review and approve the costing breakdown.'
              : 'Costing approved! You can now accept the full blueprint to proceed.',
            { duration: 5000 },
          );
          refetch();
          refetchBlueprint();
        },
        onError: (err) => toast.error(extractErrorMessage(err, 'Approval failed')),
        onSettled: () => setApprovingComponent(null),
      },
    );
  };

  const handleRequestRevision = () => {
    if (!revisionNotes.trim()) {
      toast.error('Please enter revision notes');
      return;
    }
    revisionMutation.mutate(
      {
        id: revisionDialog.blueprintId,
        revisionNotes,
        revisionRefKeys: revisionRefKeys.length > 0 ? revisionRefKeys : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Revision requested — the engineer has been notified and will upload a revised version.', { duration: 5000 });
          setRevisionDialog({ open: false, blueprintId: '' });
          setRevisionNotes('');
          setRevisionRefKeys([]);
          refetch();
          refetchBlueprint();
        },
        onError: (err) => toast.error(extractErrorMessage(err, 'Failed to request revision')),
      },
    );
  };

  const handleChoosePaymentPlan = () => {
    if (!acceptDialog.blueprint) return;
    selectPaymentPlanMutation.mutate(
      { id: projectId, paymentType },
      {
        onSuccess: () => {
          toast.success('Payment plan created. Your contract is now ready for signing.', { duration: 6000 });
          setAcceptDialog({ open: false, blueprint: null });
          setPaymentType('full');
          refetch();
          refetchBlueprint();
          refetchProject();
        },
        onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create payment plan')),
      },
    );
  };

  // ── Engineer handlers ──
  const handleDownloadFile = async (fileKey: string) => {
    try {
      const res = await api.post('/uploads/signed-download-url', { key: fileKey });
      window.open(res.data.data.downloadUrl, '_blank');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to get download link'));
    }
  };

  const uploadInProgressRef = useRef(false);
  const handleBlueprintUpload = async () => {
    if (uploadInProgressRef.current) return;
    if (!blueprintFile || !designFile || !costingFile) {
      toast.error('Please select blueprint, design, and costing files');
      return;
    }
    uploadInProgressRef.current = true;
    setUploading(true);
    try {
      const [bpUrl, designUrl, costUrl] = await Promise.all([
        requestSignedUploadUrl({
          folder: 'blueprints',
          fileName: blueprintFile.name,
          contentType: blueprintFile.type,
        }),
        requestSignedUploadUrl({
          folder: 'blueprints',
          fileName: designFile.name,
          contentType: designFile.type,
        }),
        requestSignedUploadUrl({
          folder: 'blueprints',
          fileName: costingFile.name,
          contentType: costingFile.type,
        }),
      ]);
      await Promise.all([
        uploadFileToR2(bpUrl.uploadUrl, blueprintFile),
        uploadFileToR2(designUrl.uploadUrl, designFile),
        uploadFileToR2(costUrl.uploadUrl, costingFile),
      ]);

      // Build itemized quotation
      const lineItems = quotLineItems
        .filter(li => li.label.trim())
        .map(li => {
          const m = Number(li.materials) || 0;
          const l = Number(li.labor) || 0;
          return { label: li.label, quantity: li.quantity, materials: m, labor: l, amount: (m + l) * li.quantity };
        });
      const validMilestones = quotMilestones.filter(ms => ms.label.trim() && ms.description.trim());
      const quotation = quotGrandTotal > 0
        ? {
            materials: quotTotalMaterials,
            labor: quotTotalLabor,
            fees: quotFeesNum,
            total: quotGrandTotal,
            lineItems: lineItems.length > 0 ? lineItems : undefined,
            validityDays: Number(quotValidityDays) || 30,
            breakdown: quotBreakdown || undefined,
            estimatedDuration: quotDuration || undefined,
            engineerNotes: quotNotes || undefined,
            paymentMilestones: validMilestones.length > 0 ? validMilestones : undefined,
          }
        : undefined;

      if (blueprint) {
        await uploadRevision.mutateAsync({
          id: blueprint._id,
          blueprintKey: bpUrl.fileKey,
          designKey: designUrl.fileKey,
          costingKey: costUrl.fileKey,
          quotation,
        });
        toast.success('Revision uploaded! The customer will be notified to review the updated version.', { duration: 5000 });
      } else {
        await uploadBlueprint.mutateAsync({
          projectId,
          blueprintKey: bpUrl.fileKey,
          designKey: designUrl.fileKey,
          costingKey: costUrl.fileKey,
          quotation,
        });
        toast.success('Blueprint uploaded! The customer will be notified to review it.', { duration: 5000 });
      }
      setBlueprintFile(null);
      setDesignFile(null);
      setCostingFile(null);
      setQuotLineItems([]);
      setQuotFees('');
      setQuotValidityDays('30');
      setQuotBreakdown('');
      setQuotDuration('');
      setQuotNotes('');
      setQuotMilestones([]);
      setQuotInitialized(false);
      sessionStorage.removeItem(blueprintDraftKey);
      blueprintDraftFileCache.delete(projectId);
      refetchBlueprint();
      refetchProject();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to upload blueprint'));
    } finally {
      uploadInProgressRef.current = false;
      setUploading(false);
    }
  };

  // ═══════════════════════════════════════════
  // ═══  ENGINEER VIEW  ═══════════════════════
  // ═══════════════════════════════════════════
  if (isEngineer) {
    return (
      <Card className={`-mx-3 rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x ${isDark ? 'metal-panel-strong border-[color:var(--color-border)]/60 dark:border-slate-700 dark:bg-slate-950/85' : 'border-[#c8c8cd]/50'}`}>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className={`flex items-center gap-2 text-lg ${isDark ? 'text-slate-50' : 'text-[#1d1d1f]'}`}>
            <Image className="h-5 w-5" />
            Blueprint & Design
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {blueprint ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Version {blueprint.version}</p>
                <StatusBadge status={blueprint.status} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_34px_rgba(2,6,23,0.24)]' : 'border-[#c8c8cd]/50 bg-[#f5f5f7]/50'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Blueprint</p>
                  <p className={`mt-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Technical (for fabrication)</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`mt-2 h-auto p-0 text-xs ${isDark ? 'text-slate-100 hover:bg-transparent hover:text-white' : 'text-[#1d1d1f] hover:text-[#3a3a3e]'}`}
                    onClick={() => handleDownloadFile(blueprint.blueprintKey)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </div>
                <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_34px_rgba(2,6,23,0.24)]' : 'border-[#c8c8cd]/50 bg-[#f5f5f7]/50'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Design</p>
                  <p className={`mt-1 text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>
                    {blueprint.blueprintApproved ? 'Approved' : 'Pending Review'}
                  </p>
                  {blueprint.designKey ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`mt-2 h-auto p-0 text-xs ${isDark ? 'text-slate-100 hover:bg-transparent hover:text-white' : 'text-[#1d1d1f] hover:text-[#3a3a3e]'}`}
                      onClick={() => handleDownloadFile(blueprint.designKey!)}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                  ) : (
                    <p className={`mt-1 text-[10px] italic ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Not uploaded</p>
                  )}
                </div>
                <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_34px_rgba(2,6,23,0.24)]' : 'border-[#c8c8cd]/50 bg-[#f5f5f7]/50'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Costing</p>
                  <p className={`mt-1 text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>
                    {blueprint.costingApproved ? 'Approved' : 'Pending Review'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`mt-2 h-auto p-0 text-xs ${isDark ? 'text-slate-100 hover:bg-transparent hover:text-white' : 'text-[#1d1d1f] hover:text-[#3a3a3e]'}`}
                    onClick={() => handleDownloadFile(blueprint.costingKey)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </div>
              </div>
              {(blueprint.revisionNotes || (blueprint.revisionRefKeys && blueprint.revisionRefKeys.length > 0)) && (
                <div className={`space-y-3 rounded-xl border p-4 ${isDark ? 'border-amber-500/35 bg-amber-500/10' : 'border-amber-200 bg-amber-50/50'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>Revision Notes</p>
                  {blueprint.revisionNotes && (
                    <p className={`text-sm ${isDark ? 'text-amber-100' : 'text-amber-800'}`}>{blueprint.revisionNotes}</p>
                  )}
                  {blueprint.revisionRefKeys && blueprint.revisionRefKeys.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                      {blueprint.revisionRefKeys.map((key, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openAuthenticatedFile(key)}
                          className="group relative aspect-[4/3] bg-white rounded-lg overflow-hidden border border-amber-200 block"
                        >
                          <AuthImage
                            fileKey={key}
                            alt={`Reference ${idx + 1}`}
                            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-[#86868b]">
                Uploaded {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
              </p>

              {/* Revision upload (when revision requested) */}
              {blueprint.status === 'revision_requested' && isAssigned && (
                <div className={`space-y-3 rounded-xl border border-dashed p-4 ${isDark ? 'border-slate-700 bg-slate-950/35' : 'border-[#c8c8cd]'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>Upload Revision</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FilePickerWithPreview
                      file={blueprintFile}
                      onFileChange={setBlueprintFile}
                      accept=".pdf,.png,.jpg,.jpeg,.dwg"
                      label="Blueprint File *"
                    />
                    <FilePickerWithPreview
                      file={designFile}
                      onFileChange={setDesignFile}
                      accept=".pdf,.png,.jpg,.jpeg"
                      label="Design File *"
                    />
                    <FilePickerWithPreview
                      file={costingFile}
                      onFileChange={setCostingFile}
                      accept=".pdf,.xlsx,.xls,.csv"
                      label="Costing File *"
                    />
                  </div>

                  {quotationFormJSX}

                  <button
                    type="button"
                    className={uploadActionButtonClass}
                    onClick={handleBlueprintUpload}
                    disabled={uploading || !blueprintFile || !designFile || !costingFile}
                  >
                    {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    Upload Revision
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* First blueprint upload */}
              {isAssigned && project && ['blueprint', 'submitted'].includes(project.status) ? (
                <div className={`space-y-3 rounded-xl border border-dashed p-4 ${isDark ? 'border-slate-700 bg-slate-950/35' : 'border-[#c8c8cd]'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>Upload Blueprint, Design & Costing</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FilePickerWithPreview
                      file={blueprintFile}
                      onFileChange={setBlueprintFile}
                      accept=".pdf,.png,.jpg,.jpeg,.dwg"
                      label="Blueprint File *"
                    />
                    <FilePickerWithPreview
                      file={designFile}
                      onFileChange={setDesignFile}
                      accept=".pdf,.png,.jpg,.jpeg"
                      label="Design File *"
                    />
                    <FilePickerWithPreview
                      file={costingFile}
                      onFileChange={setCostingFile}
                      accept=".pdf,.xlsx,.xls,.csv"
                      label="Costing File *"
                    />
                  </div>

                  {quotationFormJSX}

                  <button
                    type="button"
                    className={uploadActionButtonClass}
                    onClick={handleBlueprintUpload}
                    disabled={uploading || !blueprintFile || !designFile || !costingFile}
                  >
                    {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    Upload Blueprint
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#6e6e73] py-4">No blueprint uploaded yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════
  // ═══  FABRICATION STAFF VIEW  ═════════════
  // ═══════════════════════════════════════════
  if (isFabricationStaff) {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      );
    }

    if (!blueprint) {
      return (
        <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-[#c8c8cd]/50">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[#6e6e73]">No blueprint uploaded yet.</p>
            <p className="text-xs text-[#86868b] mt-1">
              The engineering team will upload drawings before fabrication begins.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4 -mx-3 sm:mx-0 px-3 sm:px-0">
        {/* Version + status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-white/12 bg-slate-900/65 text-slate-200 font-medium rounded-lg dark:border-white/12 dark:bg-slate-900/65 dark:text-slate-200">
              v{blueprint.version}
            </Badge>
            <span className="text-xs text-slate-400">
              {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          <StatusBadge status={blueprint.status} />
        </div>

        {/* Two file cards: Blueprint + Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Technical Blueprint */}
          <Card className="metal-panel-strong border-[color:var(--color-border)]/60 rounded-none sm:rounded-xl border-x-0 sm:border-x dark:border-slate-700 dark:bg-slate-950/85">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-900/35 border-b border-[color:var(--color-border)]/55 sm:rounded-t-xl px-4 sm:px-6 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-300" />
                <h3 className="font-semibold text-slate-50">Technical Blueprint</h3>
              </div>
              <span className="rounded-md border border-white/12 bg-white/8 px-2 py-1 text-[10px] font-medium text-slate-300">Fabrication reference</span>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 px-4 sm:px-6">
              <p className="text-xs text-slate-300">Engineering drawing for fabrication use.</p>
              <div className="flex gap-2">
                <Button
                  variant="prominent"
                  className="flex-1 rounded-xl"
                  onClick={() => handleViewFile(blueprint.blueprintKey)}
                >
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl border-white/12 bg-slate-900/55 text-slate-100 hover:bg-slate-800/80"
                  onClick={() => handleDownloadFile(blueprint.blueprintKey)}
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Design */}
          <Card className="metal-panel-strong border-[color:var(--color-border)]/60 rounded-none sm:rounded-xl border-x-0 sm:border-x dark:border-slate-700 dark:bg-slate-950/85">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-900/35 border-b border-[color:var(--color-border)]/55 sm:rounded-t-xl px-4 sm:px-6 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-slate-300" />
                <h3 className="font-semibold text-slate-50">Design</h3>
              </div>
              {blueprint.blueprintApproved ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100">
                  <CheckCircle className="mr-1 h-3 w-3" /> Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  Pending Review
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-3 px-4 sm:px-6">
              <p className="text-xs text-slate-300">Customer-facing design render.</p>
              {blueprint.designKey ? (
                <div className="flex gap-2">
                  <Button
                    variant="prominent"
                    className="flex-1 rounded-xl"
                    onClick={() => handleViewFile(blueprint.designKey!)}
                  >
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-white/12 bg-slate-900/55 text-slate-100 hover:bg-slate-800/80"
                    onClick={() => handleDownloadFile(blueprint.designKey!)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">Not uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revision notes if any */}
        {(blueprint.revisionNotes || (blueprint.revisionRefKeys && blueprint.revisionRefKeys.length > 0)) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Revision Notes from Customer</p>
            {blueprint.revisionNotes && (
              <p className="text-sm text-amber-800">{blueprint.revisionNotes}</p>
            )}
            {blueprint.revisionRefKeys && blueprint.revisionRefKeys.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                {blueprint.revisionRefKeys.map((key, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openAuthenticatedFile(key)}
                    className="group relative aspect-[4/3] bg-white rounded-lg overflow-hidden border border-amber-200 block"
                  >
                    <AuthImage
                      fileKey={key}
                      alt={`Reference ${idx + 1}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // ═══  CUSTOMER / STAFF VIEW  ══════════════
  // ═══════════════════════════════════════════
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-[#c8c8cd]/50">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-red-600">Failed to load blueprints.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!blueprints || blueprints.length === 0) {
    return (
      <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-[#c8c8cd]/50">
        <CardContent className="p-8 text-center">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[#6e6e73]">No blueprints have been uploaded yet.</p>
          <p className="text-xs text-[#86868b] mt-1">
            The engineering team will upload drawings and costing for your review.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show the latest blueprint with full review experience
  return (
    <div className="space-y-6 -mx-3 sm:mx-0">
      {blueprints.map((bp: Blueprint) => (
        <div key={bp._id} className="space-y-4 px-3 sm:px-0">
          {/* Version header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`${isDark ? 'border-white/12 bg-slate-900/65 text-slate-200' : 'border-[color:var(--color-border)] bg-white text-[var(--text-metal-color)]'} font-medium rounded-lg`}>
                v{bp.version}
              </Badge>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                {format(new Date(bp.createdAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <StatusBadge status={bp.status} />
          </div>

          {/* ── Customer Step Guide ── */}
          {canReviewBlueprint && ['uploaded', 'revision_uploaded', 'approved'].includes(bp.status) && (
            <div className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} overflow-hidden rounded-none border border-[color:var(--color-border)]/60 sm:rounded-xl border-x-0 sm:border-x dark:border-slate-700`}>
              <div className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} border-b border-[color:var(--color-border)]/55 px-4 py-3 sm:px-5 dark:border-slate-700`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>Your Review Progress</p>
              </div>
              <div className="px-4 sm:px-5 py-4">
                <div className="flex items-center gap-0">
                  {/* Step 1 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                      bp.blueprintApproved
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-[#1d1d1f] text-white dark:bg-slate-100 dark:text-slate-900'
                    }`}>
                      {bp.blueprintApproved ? <CheckCircle className="h-4 w-4" /> : '1'}
                    </div>
                    <span className={`text-xs font-medium truncate ${bp.blueprintApproved ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#1d1d1f] dark:text-slate-100'}`}>Design</span>
                  </div>
                  <ArrowRight className="mx-1 h-3.5 w-3.5 flex-shrink-0 text-[#c8c8cd] dark:text-slate-500" />
                  {/* Step 2 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                      bp.costingApproved
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : bp.blueprintApproved
                          ? 'bg-[#1d1d1f] text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-[#e8e8ed] text-[#86868b] dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {bp.costingApproved ? <CheckCircle className="h-4 w-4" /> : '2'}
                    </div>
                    <span className={`text-xs font-medium truncate ${bp.costingApproved ? 'text-emerald-700 dark:text-emerald-300' : bp.blueprintApproved ? 'text-[#1d1d1f] dark:text-slate-100' : 'text-[#86868b] dark:text-slate-400'}`}>Costing</span>
                  </div>
                  <ArrowRight className="mx-1 h-3.5 w-3.5 flex-shrink-0 text-[#c8c8cd] dark:text-slate-500" />
                  {/* Step 3 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                      bp.blueprintApproved && bp.costingApproved
                        ? 'bg-[#1d1d1f] text-white animate-pulse dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-[#e8e8ed] text-[#86868b] dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      3
                    </div>
                    <span className={`text-xs font-medium truncate ${bp.blueprintApproved && bp.costingApproved ? 'font-semibold text-[#1d1d1f] dark:text-slate-100' : 'text-[#86868b] dark:text-slate-400'}`}>Payment</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Design + Costing cards (customer sees these) + Blueprint (staff only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Design Card — shown to everyone */}
            <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
              <CardHeader className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} flex flex-row items-center justify-between border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6 dark:border-slate-700`}>
                <div className="flex items-center gap-2">
                  <Image className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
                  <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Design</h3>
                </div>
                {bp.blueprintApproved ? (
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/25">
                    <CheckCircle className="mr-1 h-3 w-3" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300">
                    Pending Review
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4 px-4 sm:px-6">
                <FilePreviewThumb fileKey={bp.designKey || bp.blueprintKey} label="Design Preview" />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    variant="prominent"
                    className="flex-1 rounded-xl"
                    onClick={() => handleViewFile(bp.designKey || bp.blueprintKey)}
                  >
                    <Eye className="mr-2 h-4 w-4" /> View Design
                  </Button>
                  {canReviewBlueprint && !bp.blueprintApproved && (
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      onClick={() => setApproveConfirmDialog({ open: true, blueprintId: bp._id, component: 'blueprint' })}
                      disabled={approveMutation.isPending}
                    >
                      {approvingComponent === 'blueprint' && approveMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...</>
                      ) : (
                        <><CheckCircle className="mr-2 h-4 w-4" /> Approve</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Costing Card */}
            <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
              <CardHeader className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} flex flex-row items-center justify-between border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6 dark:border-slate-700`}>
                <div className="flex items-center gap-2">
                  <Info className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
                  <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Costing Sheet</h3>
                </div>
                {bp.costingApproved ? (
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/25">
                    <CheckCircle className="mr-1 h-3 w-3" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300">
                    Pending Review
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4 px-4 sm:px-6">
                <FilePreviewThumb fileKey={bp.costingKey} label="Costing Sheet" />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button variant="prominent" className="flex-1 rounded-xl" onClick={() => handleViewFile(bp.costingKey)}>
                      <Eye className="mr-2 h-4 w-4" /> View Sheet
                  </Button>
                  {canReviewBlueprint && !bp.costingApproved && (
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      onClick={() => setApproveConfirmDialog({ open: true, blueprintId: bp._id, component: 'costing' })}
                      disabled={approveMutation.isPending}
                    >
                      {approvingComponent === 'costing' && approveMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...</>
                      ) : (
                        <><CheckCircle className="mr-2 h-4 w-4" /> Approve</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Technical Blueprint — staff/engineer/admin only, hidden from customers */}
          {!canReviewBlueprint && (
            <div className="metal-panel-strong rounded-[1.25rem] border border-[color:var(--color-border)]/60 px-4 py-3.5 dark:border-slate-700 dark:bg-slate-950/85">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-300" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Technical Blueprint</p>
                  <span className="rounded-md border border-white/12 bg-white/8 px-2 py-1 text-[10px] font-medium text-slate-200">Fabrication only</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto p-0 text-xs font-semibold text-slate-100 hover:bg-transparent hover:text-white"
                  onClick={() => handleViewFile(bp.blueprintKey)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View
                </Button>
              </div>
            </div>
          )}

          {/* -- Prominent Accept CTA -- shown when both approved and customer hasn't accepted yet */}
          {canReviewBlueprint && bp.blueprintApproved && bp.costingApproved &&
           ['uploaded', 'revision_uploaded', 'approved'].includes(bp.status) && (
            <Card className="rounded-none border-x-0 border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50 shadow-sm sm:rounded-xl sm:border-x dark:border-emerald-500/35 dark:from-emerald-500/12 dark:to-slate-900 dark:bg-none">
              <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-5 px-4 sm:px-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <CreditCard className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                </div>
                {project && ['payment_pending', 'in_progress', 'fabrication', 'ready_for_delivery', 'delivered', 'completed'].includes(project.status) ? (
                  /* Payment plan exists — show contract-aware CTA */
                  project.contractSignedAt ? (
                    /* Contract signed — Go to Payments */
                    <>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Contract Signed &amp; Payment Plan Ready!</p>
                        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">Your contract is signed. Head to Payments to view or pay.</p>
                      </div>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 w-full sm:w-auto flex-shrink-0"
                        onClick={() => navigate('/payments')}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Go to Payments
                      </Button>
                    </>
                  ) : project.contractKey ? (
                    /* Contract generated but not signed — prompt to sign */
                    <>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Contract Ready for Signing</p>
                        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">Your contract has been generated. Please read and sign it before proceeding to payments.</p>
                      </div>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 w-full sm:w-auto flex-shrink-0"
                        onClick={() => onNavigateToDetails ? onNavigateToDetails() : navigate(`/projects/${projectId}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Read &amp; Sign Contract
                      </Button>
                    </>
                  ) : (
                    /* Payment plan selected but contract still syncing */
                    <>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Payment Plan Created!</p>
                        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">Your contract is being finalized. Refresh in a moment if the signing prompt doesn&apos;t appear right away.</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 text-emerald-600 dark:text-emerald-300">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span className="text-xs font-medium">Pending</span>
                      </div>
                    </>
                  )
                ) : (
                  /* No plan yet — show payment-plan CTA */
                  <>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Blueprint Approved</p>
                      <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">Choose your payment plan to generate the contract and move into signing.</p>
                    </div>
                    <Button
                      className="w-full flex-shrink-0 rounded-xl border border-emerald-500/70 bg-[linear-gradient(180deg,#22c55e_0%,#15803d_100%)] px-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_32px_rgba(8,68,39,0.28)] hover:bg-[linear-gradient(180deg,#34d399_0%,#16a34a_100%)] hover:text-white sm:w-auto dark:border-emerald-400/55 dark:bg-[linear-gradient(180deg,#34d399_0%,#15803d_100%)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_rgba(6,78,59,0.36)] dark:hover:bg-[linear-gradient(180deg,#6ee7b7_0%,#16a34a_100%)]"
                      onClick={() => setAcceptDialog({ open: true, blueprint: bp })}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Choose Payment Plan
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Revision Notes Banner */}
          {(bp.revisionNotes || (bp.revisionRefKeys && bp.revisionRefKeys.length > 0)) && (
            <div className="space-y-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-200">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Revision Requested</p>
                  {bp.revisionNotes && <p className="mt-1">{bp.revisionNotes}</p>}
                </div>
              </div>
              {bp.revisionRefKeys && bp.revisionRefKeys.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {bp.revisionRefKeys.map((key, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openAuthenticatedFile(key)}
                      className="group relative block aspect-[4/3] overflow-hidden rounded-lg border border-red-200 bg-white dark:border-red-500/35 dark:bg-slate-900/85"
                    >
                      <AuthImage
                        fileKey={key}
                        alt={`Reference ${idx + 1}`}
                        className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quotation Summary */}
          {bp.quotation && bp.quotation.total > 0 && (
            <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
              <CardHeader className={`${isDark ? 'bg-slate-900/70 dark:border-slate-700' : 'bg-[color:var(--color-muted)]/55'} border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6`}>
                <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Quotation Summary</h3>
                  {bp.quotation.validityDays && (
                    <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`}>
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Valid {bp.quotation.validityDays} days</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-4 sm:px-6">
                {/* Itemized line items table */}
                {bp.quotation.lineItems && bp.quotation.lineItems.length > 0 && (
                  <div className="mb-4">
                    {/* Table header */}
                    <div className={`hidden sm:grid gap-2 border-b border-[color:var(--color-border)]/45 px-2 pb-2 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400 dark:border-slate-700 dark:text-slate-500' : 'text-[var(--text-metal-muted-color)]'} ${!canReviewBlueprint ? 'sm:grid-cols-[1fr_50px_100px_100px_100px]' : 'sm:grid-cols-[1fr_60px_100px]'}`}>
                      <span>Item</span>
                      <span>Qty</span>
                      {!canReviewBlueprint && <span>Materials</span>}
                      {!canReviewBlueprint && <span>Labor</span>}
                      <span className="text-right">{canReviewBlueprint ? 'Amount' : 'Total'}</span>
                    </div>
                    <div className={`divide-y divide-[color:var(--color-border)]/35 ${isDark ? 'dark:divide-slate-800' : ''}`}>
                      {bp.quotation.lineItems.map((li: { label: string; quantity: number; materials: number; labor: number; amount: number }, liIdx: number) => (
                        <div key={liIdx} className="py-2.5 px-2">
                          {/* Mobile: stacked */}
                          <div className="sm:hidden space-y-1">
                            <div className="flex justify-between items-center">
                              <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>{li.label}</p>
                              <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>{formatCurrency(li.amount)}</p>
                            </div>
                            <div className={`flex gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                              <span>Qty: {li.quantity}</span>
                              {!canReviewBlueprint && <span>Mat: {formatCurrency(li.materials * li.quantity)}</span>}
                              {!canReviewBlueprint && <span>Lab: {formatCurrency(li.labor * li.quantity)}</span>}
                            </div>
                          </div>
                          {/* Desktop: grid */}
                          <div className={`hidden sm:grid gap-2 items-center ${!canReviewBlueprint ? 'sm:grid-cols-[1fr_50px_100px_100px_100px]' : 'sm:grid-cols-[1fr_60px_100px]'}`}>
                            <p className={`text-sm ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>{li.label}</p>
                            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{li.quantity}</p>
                            {!canReviewBlueprint && <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{formatCurrency(li.materials * li.quantity)}</p>}
                            {!canReviewBlueprint && <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>{formatCurrency(li.labor * li.quantity)}</p>}
                            <p className={`text-right text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[var(--color-card-foreground)]'}`}>{formatCurrency(li.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fee + Totals */}
                <div className={`space-y-1.5 rounded-xl border border-[color:var(--color-border)]/50 p-3 ${isDark ? 'bg-slate-900/45 dark:border-slate-700 dark:bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'}`}>
                  {!canReviewBlueprint && (
                    <>
                      <div className={`flex justify-between text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                        <span>Materials Subtotal</span>
                        <span>{formatCurrency(bp.quotation.materials)}</span>
                      </div>
                      <div className={`flex justify-between text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                        <span>Labor Subtotal</span>
                        <span>{formatCurrency(bp.quotation.labor)}</span>
                      </div>
                    </>
                  )}
                  {bp.quotation.fees > 0 && (
                    <div className={`flex justify-between text-xs ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>
                      <span>Other Fees</span>
                      <span>{formatCurrency(bp.quotation.fees)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between border-t border-[color:var(--color-border)]/55 pt-1.5 text-sm font-bold ${isDark ? 'text-emerald-300 dark:border-slate-600' : 'text-emerald-600'}`}>
                    <span>Grand Total</span>
                    <span>{formatCurrency(bp.quotation.total)}</span>
                  </div>
                </div>

                {/* Duration + Validity */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                  {bp.quotation.estimatedDuration && (
                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                      <Clock className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`} />
                      <span className="font-medium">Duration:</span>
                      <span>{bp.quotation.estimatedDuration}</span>
                    </div>
                  )}
                </div>

                {/* Scope + Notes — staff only */}
                {!canReviewBlueprint && (bp.quotation.breakdown || bp.quotation.engineerNotes) && (
                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-4 dark:border-slate-700">
                    {bp.quotation.breakdown && (
                      <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                        <p className={`mb-1 font-medium ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>Scope of Work:</p>
                        <p className={`whitespace-pre-wrap rounded-lg border border-[color:var(--color-border)]/50 p-3 ${isDark ? 'bg-slate-900/45 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200' : 'bg-[color:var(--color-muted)]/45 text-[var(--text-metal-color)]'}`}>
                          {bp.quotation.breakdown}
                        </p>
                      </div>
                    )}
                    {bp.quotation.engineerNotes && (
                      <div className={`flex items-start gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                        <MessageSquare className={`mt-0.5 h-4 w-4 ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`} />
                        <div>
                          <span className="font-medium">Engineer Notes:</span>
                          <p className="mt-0.5">{bp.quotation.engineerNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer sees scope of work too (if provided) */}
                {canReviewBlueprint && bp.quotation.breakdown && (
                  <div className={`mt-3 border-t border-[color:var(--color-border)]/45 pt-3 text-sm ${isDark ? 'text-slate-300 dark:border-slate-700' : 'text-[var(--text-metal-color)]'}`}>
                    <p className={`mb-1 font-medium ${isDark ? 'text-slate-200' : 'text-[var(--color-card-foreground)]'}`}>Scope of Work:</p>
                    <p className={`whitespace-pre-wrap rounded-lg border border-[color:var(--color-border)]/50 p-3 ${isDark ? 'bg-slate-900/45 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200' : 'bg-[color:var(--color-muted)]/45 text-[var(--text-metal-color)]'}`}>
                      {bp.quotation.breakdown}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action buttons for customer review */}
          {canReviewBlueprint && ['uploaded', 'revision_uploaded'].includes(bp.status) && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50 rounded-xl"
                onClick={() => setRevisionDialog({ open: true, blueprintId: bp._id })}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Request Revision
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={approveConfirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setApproveConfirmDialog({ open: false, blueprintId: '', component: null });
        }}
      >
          <DialogContent className="sm:max-w-[420px] rounded-2xl dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-slate-100">
              Approve {approveConfirmDialog.component === 'blueprint' ? 'Design' : 'Costing Sheet'}?
            </DialogTitle>
            <DialogDescription className="pt-1 text-gray-500 dark:text-slate-400">
              Please make sure you have carefully reviewed the{' '}
              <span className="font-medium text-gray-700 dark:text-slate-200">
                {approveConfirmDialog.component === 'blueprint' ? 'design' : 'costing sheet'}
              </span>{' '}
              before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="my-1 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/35 dark:bg-amber-500/10">
            <span className="shrink-0 text-amber-500 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Once you approve <span className="font-semibold">both</span> the design and costing sheet, you will{' '}
              <span className="font-semibold">no longer be able to request a revision</span>. This action is final.
            </p>
          </div>
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={() => setApproveConfirmDialog({ open: false, blueprintId: '', component: null })}
            >
              Go Back
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              onClick={() => {
                if (approveConfirmDialog.blueprintId && approveConfirmDialog.component) {
                  handleApprove(approveConfirmDialog.blueprintId, approveConfirmDialog.component);
                }
                setApproveConfirmDialog({ open: false, blueprintId: '', component: null });
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Yes, Approve
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
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[480px] dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-slate-100">Request Revision</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              Provide detailed feedback for the engineering team regarding required changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-[13px] font-medium text-gray-700 dark:text-slate-200">
                Revision Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Describe the changes needed..."
                className="col-span-3 min-h-[100px] border-gray-200 bg-gray-50/50 focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                value={revisionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRevisionNotes(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700 dark:text-slate-200">
                Reference Files (optional)
              </Label>
              <p className="text-xs text-gray-500 dark:text-slate-400">
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
              className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
      {/* Payment Selection Dialog */}
      <Dialog
        open={acceptDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setAcceptDialog({ open: false, blueprint: null });
            setPaymentType('full');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-slate-100">Choose Payment Plan</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              Select how you want to pay. This generates your contract for signing.
            </DialogDescription>
          </DialogHeader>

          {acceptDialog.blueprint?.quotation && (
            <div className="space-y-5 mt-2">
              {/* Quotation Summary */}
              <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-slate-800/70">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Quotation Summary</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Materials</span>
                  <span className="text-right font-medium dark:text-slate-100">{formatCurrency(acceptDialog.blueprint.quotation.materials)}</span>
                  <span className="text-gray-500 dark:text-slate-400">Labor</span>
                  <span className="text-right font-medium dark:text-slate-100">{formatCurrency(acceptDialog.blueprint.quotation.labor)}</span>
                  <span className="text-gray-500 dark:text-slate-400">Other Fees</span>
                  <span className="text-right font-medium dark:text-slate-100">{formatCurrency(acceptDialog.blueprint.quotation.fees)}</span>
                  <span className="border-t border-gray-200 pt-2 font-semibold text-gray-700 dark:border-slate-600 dark:text-slate-200">Base Total</span>
                  <span className="border-t border-gray-200 pt-2 text-right font-bold text-emerald-700 dark:border-slate-600 dark:text-emerald-300">
                    {formatCurrency(acceptDialog.blueprint.quotation.total)}
                  </span>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Payment Option</p>

                {/* Full Payment */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentType === 'full'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-500/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500'
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Full Payment</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                      Pay the full amount in one go — no surcharge.
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(acceptDialog.blueprint.quotation.total)}
                    </p>
                  </div>
                </label>

                {/* Installment */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentType === 'installment'
                      ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-500/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500'
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Installment</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                      Split into multiple stages with a {surchargePercent}% surcharge.
                    </p>
                    <p className="mt-1 text-sm font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(
                        (acceptDialog.blueprint.quotation.total || 0) *
                          (1 + surchargePercent / 100),
                      )}{' '}
                      <span className="text-xs font-normal text-gray-400 dark:text-slate-500">
                        (+{surchargePercent}%)
                      </span>
                    </p>
                    {/* Milestone breakdown */}
                    {paymentType === 'installment' && (() => {
                      const milestones = acceptDialog.blueprint?.quotation?.paymentMilestones;
                      const installTotal = (acceptDialog.blueprint.quotation.total || 0) * (1 + surchargePercent / 100);
                      return (
                        <div className="mt-2.5 space-y-1.5 border-t border-blue-200 pt-2">
                          {cfgSplit.map((pct, idx) => {
                            const stageLabel = milestones?.[idx]?.label || cfgLabels[idx] || `Stage ${idx + 1}`;
                            const stageDesc = milestones?.[idx]?.description || cfgDescriptions[idx] || '';
                            const stageAmount = Math.round(installTotal * pct / 100 * 100) / 100;
                            return (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="mt-0.5 shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">{pct}%</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 dark:text-slate-200">{stageLabel} — {formatCurrency(stageAmount)}</p>
                                  {stageDesc && <p className="text-[10px] text-gray-500 dark:text-slate-400">{stageDesc}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
              className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChoosePaymentPlan}
              disabled={selectPaymentPlanMutation.isPending}
              className="rounded-lg border border-emerald-500/70 bg-[linear-gradient(180deg,#22c55e_0%,#15803d_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_32px_rgba(8,68,39,0.28)] hover:bg-[linear-gradient(180deg,#34d399_0%,#16a34a_100%)] hover:text-white dark:border-emerald-400/55 dark:bg-[linear-gradient(180deg,#34d399_0%,#15803d_100%)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_rgba(6,78,59,0.36)] dark:hover:bg-[linear-gradient(180deg,#6ee7b7_0%,#16a34a_100%)]"
            >
              {selectPaymentPlanMutation.isPending ? 'Creating Plan...' : 'Create Plan & Generate Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}