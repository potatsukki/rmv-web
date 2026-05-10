import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText, CheckCircle, AlertCircle, Eye, Info,
  Download, Upload, Loader2, Image, X,
  ArrowRight, CreditCard, Send, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { cn, extractErrorMessage } from '@/lib/utils';
import { resolveBlockedAction, type BlockedActionInfo } from '@/lib/blocked-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BlockedActionPrompt } from '@/components/shared/BlockedActionPrompt';
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
  useBlueprintDraft,
  useUpsertBlueprintDraft,
  useFinalizeBlueprintDraft,
  useQuotationHistory,
} from '@/hooks/useBlueprints';
import { useConfigs } from '@/hooks/useConfig';
import { usePaymentPlan } from '@/hooks/usePayments';
import { uploadFileToR2 } from '@/hooks/useUploads';
import { useProject, useSelectProjectPaymentPlan } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { api } from '@/lib/api';
import { Role } from '@/lib/constants';
import type { Blueprint, BlueprintDraft, QuotationComplexity, QuotationInternalCosts } from '@/lib/types';
import { resolveBlueprintWorkflowStatus } from '@/lib/workflow-status';

interface BlueprintTabProps {
  projectId: string;
  projectItemId?: string;
  mode?: 'blueprint' | 'costing';
}

type DraftFileMeta = { name: string; type: string; size: number; key: string; uploadedAt: string };
type InternalCostKey = keyof QuotationInternalCosts<string>;
type QuotationDraftState = {
  internalCosts: QuotationInternalCosts<string>;
  costPreset: {
    serviceType: string;
    complexity: QuotationComplexity;
    suggestedAt?: string;
    suggestedValues?: Partial<QuotationInternalCosts<string>>;
  };
  discount: string;
  subtotal: string;
  total: string;
  validityDays: string;
  systemEstimatedDuration: string;
  adjustedEstimatedDuration: string;
  estimatedDuration: string;
  inclusions: string;
  exclusions: string;
  engineerNotes: string;
  paymentMilestones: NonNullable<BlueprintDraft['quotation']>['paymentMilestones'];
};
type BlueprintTabDraftCache = {
  blueprintFileMeta: DraftFileMeta | null;
  designFileMeta: DraftFileMeta | null;
  costingFileMeta: DraftFileMeta | null;
  quotInternalCosts: QuotationInternalCosts<string>;
  quotValidityDays: string;
  quotSystemDuration: string;
};

const INTERNAL_COST_FIELDS: Array<{ key: InternalCostKey; label: string }> = [
  { key: 'estimatedMaterials', label: 'Estimated Materials' },
  { key: 'fabricationWork', label: 'Fabrication Work' },
  { key: 'finishingPolishing', label: 'Finishing / Polishing' },
  { key: 'installation', label: 'Installation' },
  { key: 'deliveryMobilization', label: 'Delivery / Mobilization' },
  { key: 'overheadMisc', label: 'Overhead / Miscellaneous' },
  { key: 'markupProfit', label: 'Markup / Profit' },
];

const EMPTY_INTERNAL_COSTS: QuotationInternalCosts<string> = {
  estimatedMaterials: '',
  fabricationWork: '',
  finishingPolishing: '',
  installation: '',
  deliveryMobilization: '',
  overheadMisc: '',
  markupProfit: '',
};

const SERVICE_PRESETS: Record<string, { duration: string; costs: QuotationInternalCosts<number> }> = {
  railings: { duration: '2-3 Weeks', costs: { estimatedMaterials: 18000, fabricationWork: 6500, finishingPolishing: 3500, installation: 4000, deliveryMobilization: 1500, overheadMisc: 2200, markupProfit: 4500 } },
  grills: { duration: '1-2 Weeks', costs: { estimatedMaterials: 12000, fabricationWork: 4200, finishingPolishing: 2200, installation: 2600, deliveryMobilization: 1200, overheadMisc: 1600, markupProfit: 3000 } },
  gates: { duration: '3-4 Weeks', costs: { estimatedMaterials: 30000, fabricationWork: 10000, finishingPolishing: 5000, installation: 6500, deliveryMobilization: 2500, overheadMisc: 3500, markupProfit: 8000 } },
  door: { duration: '1-2 Weeks', costs: { estimatedMaterials: 15000, fabricationWork: 4800, finishingPolishing: 2500, installation: 3000, deliveryMobilization: 1200, overheadMisc: 1800, markupProfit: 3400 } },
  staircase: { duration: '2-4 Weeks', costs: { estimatedMaterials: 26000, fabricationWork: 9000, finishingPolishing: 4500, installation: 6000, deliveryMobilization: 2200, overheadMisc: 3200, markupProfit: 7200 } },
  balustrade: { duration: '2-4 Weeks', costs: { estimatedMaterials: 23000, fabricationWork: 8200, finishingPolishing: 4200, installation: 5500, deliveryMobilization: 2000, overheadMisc: 2900, markupProfit: 6500 } },
  fences: { duration: '2-3 Weeks', costs: { estimatedMaterials: 22000, fabricationWork: 7000, finishingPolishing: 3400, installation: 5200, deliveryMobilization: 2200, overheadMisc: 2600, markupProfit: 5800 } },
  canopy: { duration: '2-4 Weeks', costs: { estimatedMaterials: 28000, fabricationWork: 9000, finishingPolishing: 3500, installation: 6500, deliveryMobilization: 2500, overheadMisc: 3200, markupProfit: 7200 } },
  signage: { duration: '1-3 Weeks', costs: { estimatedMaterials: 11000, fabricationWork: 3800, finishingPolishing: 2500, installation: 2200, deliveryMobilization: 1000, overheadMisc: 1300, markupProfit: 2800 } },
  custom: { duration: '2-4 Weeks', costs: { estimatedMaterials: 18000, fabricationWork: 6500, finishingPolishing: 3200, installation: 4000, deliveryMobilization: 1600, overheadMisc: 2200, markupProfit: 4800 } },
};

function normalizeServiceType(serviceType?: string) {
  const normalized = (serviceType || 'custom').toLowerCase().replace(/\s+/g, '_');
  if (normalized.includes('rail')) return 'railings';
  if (normalized.includes('grill')) return 'grills';
  if (normalized.includes('gate')) return 'gates';
  if (normalized.includes('door')) return 'door';
  if (normalized.includes('stair')) return 'staircase';
  if (normalized.includes('balustrade')) return 'balustrade';
  if (normalized.includes('fence')) return 'fences';
  if (normalized.includes('canopy')) return 'canopy';
  if (normalized.includes('sign')) return 'signage';
  if (normalized.includes('kitchen') || normalized.includes('shelv') || normalized.includes('window') || normalized.includes('table') || normalized.includes('chair')) return 'custom';
  return SERVICE_PRESETS[normalized] ? normalized : 'custom';
}

function adjustDuration(duration: string, complexity: QuotationComplexity) {
  const match = duration.match(/(\d+)(?:-(\d+))?\s*Weeks?/i);
  if (!match) return duration;
  const low = Number(match[1]);
  const high = Number(match[2] || match[1]);
  if (complexity === 'simple') return `${low} Week${low === 1 ? '' : 's'}`;
  if (complexity === 'complex') return `${low}-${high + 1} Weeks`;
  return `${low}-${high} Weeks`;
}

function getSystemDuration(serviceType: string, complexity: QuotationComplexity = 'standard') {
  const preset = SERVICE_PRESETS[normalizeServiceType(serviceType)] ?? SERVICE_PRESETS.custom!;
  return adjustDuration(preset.duration, complexity);
}

function asMoney(value: string | number | undefined | null) {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getEmptyQuotation(serviceType = 'custom', complexity: QuotationComplexity = 'standard'): QuotationDraftState {
  const systemEstimatedDuration = getSystemDuration(serviceType, complexity);
  return {
    internalCosts: { ...EMPTY_INTERNAL_COSTS },
    costPreset: { serviceType, complexity },
    discount: '',
    subtotal: '',
    total: '',
    validityDays: '30',
    systemEstimatedDuration,
    adjustedEstimatedDuration: '',
    estimatedDuration: systemEstimatedDuration,
    inclusions: '',
    exclusions: '',
    engineerNotes: '',
    paymentMilestones: [],
  };
}

function normalizeDraftQuotation(
  quotation?: BlueprintDraft['quotation'],
  serviceType = 'custom',
  complexity: QuotationComplexity = 'standard',
): QuotationDraftState {
  const empty = getEmptyQuotation(serviceType, quotation?.costPreset?.complexity || complexity);
  const legacyMaterials = quotation?.lineItems?.reduce((sum, li) => sum + asMoney(li.materials) * (li.quantity || 1), 0) || 0;
  const legacyFabrication = quotation?.lineItems?.reduce((sum, li) => sum + asMoney(li.labor) * (li.quantity || 1), 0) || 0;
  const internalCosts = {
    ...empty.internalCosts,
    ...(legacyMaterials || legacyFabrication ? {
      estimatedMaterials: String(legacyMaterials || ''),
      fabricationWork: String(legacyFabrication || ''),
    } : {}),
    ...(quotation?.internalCosts || {}),
  };
  const subtotal = INTERNAL_COST_FIELDS.reduce((sum, field) => sum + asMoney(internalCosts[field.key]), 0);
  const discount = quotation?.discount || '';
  const total = Math.max(subtotal - asMoney(discount), 0);
  const systemEstimatedDuration = quotation?.systemEstimatedDuration || empty.systemEstimatedDuration;
  const adjustedEstimatedDuration = quotation?.adjustedEstimatedDuration || '';
  return {
    internalCosts,
    costPreset: {
      serviceType: quotation?.costPreset?.serviceType || serviceType,
      complexity: quotation?.costPreset?.complexity || complexity,
      suggestedAt: quotation?.costPreset?.suggestedAt,
      suggestedValues: quotation?.costPreset?.suggestedValues,
    },
    discount: String(discount || ''),
    subtotal: String(quotation?.subtotal || subtotal || ''),
    total: String(quotation?.total || total || ''),
    validityDays: quotation?.validityDays || '30',
    systemEstimatedDuration,
    adjustedEstimatedDuration,
    estimatedDuration: adjustedEstimatedDuration || quotation?.estimatedDuration || systemEstimatedDuration,
    inclusions: quotation?.inclusions || quotation?.breakdown || '',
    exclusions: quotation?.exclusions || '',
    engineerNotes: quotation?.engineerNotes || '',
    paymentMilestones: quotation?.paymentMilestones || [],
  };
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
  fileMeta,
  isUploading,
  onFileSelect,
  onRemove,
  onPreview,
  accept,
  label,
}: {
  fileMeta: DraftFileMeta | null;
  isUploading?: boolean;
  onFileSelect: (f: File | null) => void;
  onRemove: () => void;
  onPreview: (file: { key: string; name: string; type?: string }) => void;
  accept: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const isImage = fileMeta?.type.startsWith('image/');
  const isDesign = /design/i.test(label);
  const [isDragActive, setIsDragActive] = useState(false);
  const { url } = useAuthenticatedUrl(fileMeta?.key || null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePreview = () => {
    if (fileMeta?.key) {
      onPreview({ key: fileMeta.key, name: fileMeta.name, type: fileMeta.type });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const dropped = e.dataTransfer.files?.[0] || null;
    onFileSelect(dropped);
  };

  const FileKindIcon = isDesign ? Image : FileText;

  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/45' : 'border-[#d2d2d7] bg-white/70'}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          isDesign
            ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
            : (isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-100 text-sky-700')
        }`}>
          <FileKindIcon className="h-6 w-6" />
        </span>
        <div>
          <p className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>
            {label.replace('*', '')}<span className="text-red-400">*</span>
          </p>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-[#6e6e73]'}`}>Required</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          onFileSelect(e.target.files?.[0] || null);
          if (inputRef.current) inputRef.current.value = '';
        }}
        className="hidden"
      />
      {isUploading ? (
        <div className={`w-full min-h-[184px] rounded-xl border border-dashed p-6 text-center flex flex-col items-center justify-center ${isDark ? 'border-slate-700 bg-slate-950/45' : 'border-[#c8c8cd] bg-[#f5f5f7]/30'}`}>
          <Loader2 className={`h-6 w-6 animate-spin ${isDark ? 'text-sky-400' : 'text-[#0066cc]'}`} />
          <p className={`mt-2 text-xs font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>Uploading...</p>
        </div>
      ) : fileMeta ? (
        <div className={`relative group overflow-hidden rounded-xl border ${isDark ? 'border-slate-700/80 bg-slate-950/55 shadow-[0_18px_38px_rgba(2,6,23,0.34)]' : 'border-[#c8c8cd]/50 bg-[#f5f5f7]/30'}`}>
          <button
            type="button"
            onClick={handlePreview}
            className={`w-full text-left transition-colors ${isDark ? 'hover:bg-slate-900/70' : 'hover:bg-[#f0f0f5]/50'}`}
          >
            {isImage && url ? (
              <div className={`aspect-[3/2] flex items-center justify-center p-2 ${isDark ? 'bg-slate-950/80' : 'bg-[#f5f5f7]'}`}>
                <img
                  src={url}
                  alt={fileMeta.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className={`aspect-[3/2] flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-slate-950/80' : 'bg-[#f5f5f7]'}`}>
                <FileText className={`h-10 w-10 ${isDark ? 'text-slate-300' : 'text-[#86868b]'}`} />
                <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                  {fileMeta.name.split('.').pop() || 'FILE'}
                </span>
              </div>
            )}
            <div className={`p-3 ${isDark ? 'border-t border-slate-800/80' : 'border-t border-[#c8c8cd]/30'}`}>
              <p className={`truncate text-xs font-medium ${isDark ? 'text-slate-100' : 'text-[#3a3a3e]'}`}>{fileMeta.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>{formatSize(fileMeta.size)}</p>
                <span className={`text-[10px] ${isDark ? 'text-sky-300' : 'text-[#0066cc]'}`}>Click to view</span>
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
                onRemove();
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full min-h-[184px] cursor-pointer rounded-xl border border-dashed px-6 py-7 text-center transition-colors ${
            isDesign
              ? (isDark ? 'border-emerald-500/55 bg-slate-950/45 hover:border-emerald-400/80 hover:bg-slate-900/70' : 'border-emerald-400 hover:border-emerald-500 hover:bg-emerald-50/30')
              : (isDark ? 'border-sky-500/55 bg-slate-950/45 hover:border-sky-400/80 hover:bg-slate-900/70' : 'border-sky-400 hover:border-sky-500 hover:bg-sky-50/30')
          } ${
            isDragActive
              ? (isDesign
                ? (isDark ? 'border-emerald-300 bg-emerald-500/10' : 'border-emerald-600 bg-emerald-50/60')
                : (isDark ? 'border-sky-300 bg-sky-500/10' : 'border-sky-600 bg-sky-50/60'))
              : ''
          }`}
        >
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
            isDesign
              ? (isDark ? 'border-emerald-400/35 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50')
              : (isDark ? 'border-sky-400/35 bg-sky-500/10' : 'border-sky-300 bg-sky-50')
          }`}>
            <Upload className={`h-8 w-8 ${
              isDesign
                ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                : (isDark ? 'text-sky-300' : 'text-sky-600')
            }`} />
          </div>
          <p className={`mt-5 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Drag and drop your file here</p>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-[#3a3a3e]'}`}>
            or <span className={`font-semibold ${
              isDesign
                ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                : (isDark ? 'text-sky-300' : 'text-sky-600')
            }`}>Choose file</span>
          </p>
          <div className={`mx-auto mt-4 h-px w-[86%] ${isDark ? 'bg-slate-800' : 'bg-[#d2d2d7]'}`} />
          <p className={`mt-4 text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>
            Supported formats: {accept.replace(/\./g, '').split(',').join(', ').toUpperCase()}
          </p>
          <p className={`mt-2 text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Max file size: 50MB</p>
        </button>
      )}
    </div>
  );
}

function AutoLinkedDesignFileCard({
  fileKey,
  onPreview,
}: {
  fileKey: string;
  onPreview: (file: { key: string; name: string; type?: string }) => void;
}) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/45' : 'border-[#d2d2d7] bg-white/70'}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
          <Image className="h-6 w-6" />
        </span>
        <div>
          <p className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Design File <span className="text-red-400">*</span></p>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-[#6e6e73]'}`}>Required</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onPreview({ key: fileKey, name: fileKey.split('/').pop() || 'design-file', type: 'image/*' })}
        className={`group w-full overflow-hidden rounded-xl border border-dashed p-4 text-center transition-colors ${
          isDark
            ? 'border-emerald-500/55 bg-slate-950/45 hover:border-emerald-400/80 hover:bg-slate-900/70'
            : 'border-emerald-400 bg-emerald-50/20 hover:border-emerald-500 hover:bg-emerald-50/30'
        }`}
      >
        <div className={`relative mx-auto aspect-[16/9] max-h-[190px] w-full overflow-hidden rounded-xl border ${isDark ? 'border-slate-700 bg-slate-950/75' : 'border-emerald-200 bg-white'}`}>
          <AuthImage
            fileKey={fileKey}
            alt="Approved design from Design Review"
            className="absolute inset-0 h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
          />
        </div>
        <p className={`mt-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Approved Design Review file</p>
        <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-[#3a3a3e]'}`}>or <span className={`${isDark ? 'text-emerald-300' : 'text-emerald-600'} font-semibold`}>View file</span></p>
        <div className={`mx-auto mt-3 h-px w-[86%] ${isDark ? 'bg-slate-800' : 'bg-[#d2d2d7]'}`} />
        <p className={`mt-3 text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Automatically attached from Design Review</p>
        <p className={`mt-2 text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Linked</p>
      </button>
    </div>
  );
}


// -- Inline preview thumbnail (loads signed URL via hook) --
function FilePreviewThumb({
  fileKey,
  label,
  frameClassName,
}: {
  fileKey: string | undefined | null;
  label: string;
  frameClassName?: string;
}) {
  const { url, isLoading } = useAuthenticatedUrl(fileKey ?? null);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const isImage = fileKey ? /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileKey) : false;
  const baseFrameClassName = cn(
    `${isDark ? 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),rgba(2,6,23,0.94)_62%)] dark:bg-slate-900/70' : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(241,245,249,0.95)_62%)]'} w-full rounded-xl border border-[color:var(--color-border)]/55 flex items-center justify-center dark:border-slate-700`,
    'mx-auto aspect-[16/9] max-h-[420px] max-w-[820px] overflow-hidden',
    frameClassName,
  );

  if (isLoading) {
    return (
      <div className={baseFrameClassName}>
        <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-gray-300 dark:text-slate-500' : 'text-[var(--text-metal-muted-color)]'}`} />
      </div>
    );
  }

  if (url && isImage) {
    return (
      <div className={baseFrameClassName}>
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  // Non-image file or no URL � show icon placeholder
  const isPdf = fileKey ? /\.pdf$/i.test(fileKey) : false;
  const isSpreadsheet = fileKey ? /\.(xlsx?|csv)$/i.test(fileKey) : false;
  return (
    <div className={baseFrameClassName}>
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

export function BlueprintTab({ projectId, projectItemId, mode = 'blueprint' }: BlueprintTabProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const isBlueprintMode = mode === 'blueprint';
  const isCostingMode = mode === 'costing';
  const isEngineer = user?.roles?.some((r: string) => r === 'engineer');
  const isAdmin = user?.roles?.some((r: string) => r === Role.ADMIN);
  const isCashier = user?.roles?.some((r: string) => r === Role.CASHIER);
  const isCustomer = user?.roles?.some((r: string) => r === Role.CUSTOMER);
  const isFabricationStaff = user?.roles?.some((r: string) => r === Role.FABRICATION_STAFF);

  const { data: project, refetch: refetchProject } = useProject(projectId);
  const { data: blueprint, refetch: refetchBlueprint } = useLatestBlueprint(projectId, projectItemId);
  const { data: blueprints, isLoading, isError, refetch } = useBlueprintsByProject(projectId, projectItemId);
  const { data: paymentPlan } = usePaymentPlan(projectId, projectItemId);

  // Engineer-specific mutations
  const upsertDraftMutation = useUpsertBlueprintDraft();
  const finalizeDraftMutation = useFinalizeBlueprintDraft();
  const { data: dbDraft } = useBlueprintDraft(projectId, { enabled: isEngineer }, projectItemId);
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
  const activeProjectItem = project?.items?.find((item) => item._id === projectItemId);
  const approvedInitialDesignKey = useMemo(() => {
    const itemStatus = activeProjectItem?.designReviewStatus;
    const projectStatus = project?.designReviewStatus;
    const isApproved = itemStatus === 'approved' || projectStatus === 'approved';
    if (!isApproved) return '';
    return activeProjectItem?.initialDesignKeys?.[0] || project?.initialDesignKeys?.[0] || '';
  }, [
    activeProjectItem?.designReviewStatus,
    activeProjectItem?.initialDesignKeys,
    project?.designReviewStatus,
    project?.initialDesignKeys,
  ]);
  const costingServiceType = activeProjectItem?.serviceType || activeProjectItem?.title || project?.serviceType || 'custom';
  const autoDesignFileMeta = useMemo<DraftFileMeta | null>(() => {
    if (!approvedInitialDesignKey) return null;
    const fallbackName = approvedInitialDesignKey.split('/').pop() || 'approved-design';
    return {
      key: approvedInitialDesignKey,
      name: fallbackName,
      type: 'image/*',
      size: 0,
      uploadedAt: new Date().toISOString(),
    };
  }, [approvedInitialDesignKey]);
  const { data: quotationHistory } = useQuotationHistory(isCostingMode && (isEngineer || isAdmin) ? blueprint?._id : undefined);
  const canUploadInitialBlueprint = Boolean(
    isAssigned
    && project
    && (
      ['blueprint', 'submitted'].includes(project.status)
      || (
        project.status === 'approved'
        && activeProjectItem
        && activeProjectItem.status !== 'approved'
      )
    ),
  );

  const canReviewBlueprint = isCustomer;
  const canViewInternalCosting = Boolean(isEngineer || isAdmin);
  const hasActiveItemPaymentPlan = Boolean(paymentPlan);

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
  const [blockedAction, setBlockedAction] = useState<BlockedActionInfo | null>(null);

  // ── Engineer upload state ──
  const [blueprintFileMeta, setBlueprintFileMeta] = useState<DraftFileMeta | null>(null);
  const [designFileMeta, setDesignFileMeta] = useState<DraftFileMeta | null>(null);
  const [costingFileMeta, setCostingFileMeta] = useState<DraftFileMeta | null>(null);
  const effectiveDesignFileMeta = designFileMeta || autoDesignFileMeta;
  const [previewFile, setPreviewFile] = useState<{ key: string; name: string; type?: string } | null>(null);
  const { url: previewFileUrl, isLoading: isPreviewFileLoading } = useAuthenticatedUrl(
    previewFile?.key && !previewFile.key.startsWith('http') ? previewFile.key : null,
  );
  const [uploadingFile, setUploadingFile] = useState<'blueprint'|'design'|'costing'|null>(null);
  const [uploading, setUploading] = useState(false);
  const [quotInternalCosts, setQuotInternalCosts] = useState<QuotationInternalCosts<string>>({ ...EMPTY_INTERNAL_COSTS });
  const [quotValidityDays, setQuotValidityDays] = useState('30');
  const [quotSystemDuration, setQuotSystemDuration] = useState('');
  const [quotInitialized, setQuotInitialized] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const draftCacheKey = useMemo(
    () => `blueprint-tab-cache:${projectId}:${projectItemId || 'legacy'}:${mode}`,
    [projectId, projectItemId, mode],
  );

  const quotSubtotal = useMemo(
    () => INTERNAL_COST_FIELDS.reduce((sum, field) => sum + asMoney(quotInternalCosts[field.key]), 0),
    [quotInternalCosts],
  );
  const quotGrandTotal = quotSubtotal;
  const quotEstimatedDuration = quotSystemDuration;
  const resolvedPreviewUrl = previewFile?.key?.startsWith('http') ? previewFile.key : previewFileUrl;
  const previewName = previewFile?.name || 'File';
  const previewType = (previewFile?.type || '').toLowerCase();
  const previewKey = (previewFile?.key || '').toLowerCase();
  const isPreviewImage = previewType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(previewKey);

  const currentQuotation = useMemo<BlueprintDraft['quotation']>(() => ({
    internalCosts: quotInternalCosts,
    costPreset: {
      serviceType: costingServiceType,
      complexity: 'standard',
    },
    discount: '',
    subtotal: String(quotSubtotal || ''),
    total: String(quotGrandTotal || ''),
    validityDays: quotValidityDays,
    systemEstimatedDuration: quotSystemDuration,
    adjustedEstimatedDuration: '',
    estimatedDuration: quotEstimatedDuration,
    inclusions: '',
    exclusions: '',
    engineerNotes: '',
    paymentMilestones: [],
  }), [
    costingServiceType,
    quotEstimatedDuration,
    quotGrandTotal,
    quotInternalCosts,
    quotSubtotal,
    quotSystemDuration,
    quotValidityDays,
  ]);

  const lastSavedQuotation = useRef(currentQuotation);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftCacheKey);
      if (!raw) return;
      const cached = JSON.parse(raw) as BlueprintTabDraftCache;
      if (cached.blueprintFileMeta) setBlueprintFileMeta(cached.blueprintFileMeta);
      if (cached.designFileMeta) setDesignFileMeta(cached.designFileMeta);
      if (cached.costingFileMeta) setCostingFileMeta(cached.costingFileMeta);
      if (cached.quotInternalCosts) setQuotInternalCosts(cached.quotInternalCosts);
      if (typeof cached.quotValidityDays === 'string') setQuotValidityDays(cached.quotValidityDays);
      if (typeof cached.quotSystemDuration === 'string') setQuotSystemDuration(cached.quotSystemDuration);
    } catch {
      // ignore corrupted cache payload
    }
  }, [draftCacheKey]);

  useEffect(() => {
    const payload: BlueprintTabDraftCache = {
      blueprintFileMeta,
      designFileMeta,
      costingFileMeta,
      quotInternalCosts,
      quotValidityDays,
      quotSystemDuration,
    };
    sessionStorage.setItem(draftCacheKey, JSON.stringify(payload));
  }, [
    blueprintFileMeta,
    costingFileMeta,
    designFileMeta,
    draftCacheKey,
    quotInternalCosts,
    quotSystemDuration,
    quotValidityDays,
  ]);

  useEffect(() => {
    if (sessionStorage.getItem(draftCacheKey)) {
      setQuotInitialized(false);
      return;
    }
    const emptyQuotation = getEmptyQuotation(costingServiceType, 'standard');
    setBlueprintFileMeta(null);
    setDesignFileMeta(null);
    setCostingFileMeta(null);
    setQuotInternalCosts(emptyQuotation.internalCosts);
    setQuotValidityDays(emptyQuotation.validityDays || '30');
    setQuotSystemDuration(emptyQuotation.systemEstimatedDuration);
    lastSavedQuotation.current = emptyQuotation;
    setQuotInitialized(false);
  }, [costingServiceType, draftCacheKey, projectItemId]);

  // Payment dialogs still use the live config to show surcharge details.
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
    return Array.isArray(c?.value) ? (c.value as string[]) : ['Initial payment before fabrication', 'Due when fabrication is complete', 'Due after installation & acceptance'];
  })();

  // Hydrate from DB Draft
  useEffect(() => {
    if (quotInitialized) return;

    if (dbDraft) {
      const draftProjectItemId = dbDraft.projectItemId ? String(dbDraft.projectItemId) : undefined;
      const activeProjectItemId = projectItemId || undefined;
      if (draftProjectItemId !== activeProjectItemId) return;

      if (dbDraft.files?.blueprint) setBlueprintFileMeta(dbDraft.files.blueprint as DraftFileMeta);
      if (dbDraft.files?.design) setDesignFileMeta(dbDraft.files.design as DraftFileMeta);
      if (dbDraft.files?.costing) setCostingFileMeta(dbDraft.files.costing as DraftFileMeta);

      const nextQuotation = normalizeDraftQuotation(dbDraft.quotation, costingServiceType, 'standard');
      if (dbDraft.quotation) {
        setQuotInternalCosts(nextQuotation.internalCosts);
        setQuotValidityDays(nextQuotation.validityDays || '30');
        setQuotSystemDuration(nextQuotation.systemEstimatedDuration);
      }
      lastSavedQuotation.current = nextQuotation;
      setQuotInitialized(true);
      return;
    } else if (dbDraft === null) {
      // null means successfully fetched but no draft exists
      const nextQuotation = getEmptyQuotation(costingServiceType, 'standard');
      setQuotSystemDuration(nextQuotation.systemEstimatedDuration);
      lastSavedQuotation.current = nextQuotation;
      setQuotInitialized(true);
    }
  }, [costingServiceType, dbDraft, projectItemId, quotInitialized]);

  // DB Autosave Form Hook
  useEffect(() => {
    if (!quotInitialized) return;
    const isDifferent = JSON.stringify(currentQuotation) !== JSON.stringify(lastSavedQuotation.current);
    if (!isDifferent) return;

    const timer = setTimeout(() => {
      setIsSavingDraft(true);
      upsertDraftMutation.mutate({
        projectId,
        projectItemId,
        mode: blueprint ? 'revision' : 'initial',
        sourceBlueprintId: blueprint?._id,
        files: {
          blueprint: blueprintFileMeta,
          design: designFileMeta,
          costing: costingFileMeta,
        },
        quotation: currentQuotation,
      }, {
        onSuccess: () => {
           lastSavedQuotation.current = currentQuotation;
           setIsSavingDraft(false);
        },
        onError: () => {
           setIsSavingDraft(false);
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentQuotation, quotInitialized, blueprint, projectId, projectItemId, blueprintFileMeta, designFileMeta, costingFileMeta, upsertDraftMutation]);

  const handleDraftFileUpload = async (file: File, type: 'blueprint'|'design'|'costing') => {
    setUploadingFile(type);
    try {
      const { uploadUrl, fileKey } = await requestSignedUploadUrl({
        folder: 'blueprints',
        fileName: file.name,
        contentType: file.type,
      });
      await uploadFileToR2(uploadUrl, file);
      
      const newMeta: DraftFileMeta = {
        key: fileKey,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      if (type === 'blueprint') setBlueprintFileMeta(newMeta);
      if (type === 'design') setDesignFileMeta(newMeta);
      if (type === 'costing') setCostingFileMeta(newMeta);

      const updatedFiles = {
        blueprint: type === 'blueprint' ? newMeta : blueprintFileMeta,
        design: type === 'design' ? newMeta : designFileMeta,
        costing: type === 'costing' ? newMeta : costingFileMeta,
      };

      await upsertDraftMutation.mutateAsync({
        projectId,
        projectItemId,
        mode: blueprint ? 'revision' : 'initial',
        sourceBlueprintId: blueprint?._id,
        files: updatedFiles,
        quotation: currentQuotation,
      });

    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to upload file to draft'));
    } finally {
      setUploadingFile(null);
    }
  };

  const handleDraftFileRemove = (type: 'blueprint'|'design'|'costing') => {
    if (type === 'blueprint') setBlueprintFileMeta(null);
    if (type === 'design') setDesignFileMeta(null);
    if (type === 'costing') setCostingFileMeta(null);
    
    const updatedFiles = {
      blueprint: type === 'blueprint' ? null : blueprintFileMeta,
      design: type === 'design' ? null : designFileMeta,
      costing: type === 'costing' ? null : costingFileMeta,
    };

    upsertDraftMutation.mutate({
      projectId,
      projectItemId,
      mode: blueprint ? 'revision' : 'initial',
      sourceBlueprintId: blueprint?._id,
      files: updatedFiles,
      quotation: currentQuotation,
    });
  };

  const handleOpenPreviewModal = (file: { key: string; name: string; type?: string }) => {
    setPreviewFile(file);
  };

  const updateInternalCost = (key: InternalCostKey, value: string) => {
    setQuotInternalCosts((prev) => ({ ...prev, [key]: value }));
  };

  const inputCls = `w-full h-9 rounded-lg border px-3 text-sm transition-colors focus:outline-none focus:ring-2 ${isDark ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-sky-400/25' : 'border-[#d2d2d7] bg-[#f5f5f7]/50 focus:border-[#b8b8bd] focus:ring-[#6e6e73]'}`;
  const uploadActionButtonClass = isDark
    ? 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300/70 bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-3 text-sm font-medium text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(2,6,23,0.28)] transition-[background,color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#ffffff_0%,#edf2f7_100%)] disabled:cursor-not-allowed disabled:opacity-100 disabled:border-slate-600 disabled:bg-[#94a3b8] disabled:text-slate-800 disabled:shadow-none'
    : 'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1d1d1f] px-3 text-sm font-medium text-white transition-colors hover:bg-[#2d2d2f] disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-[#c8c8cd] disabled:text-[#3a3a3e]';

  const formatCurrency = (n: number | undefined | null) => {
    const val = Number(n);
    return `₱${(Number.isFinite(val) ? val : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const getPayableQuotationTotal = (bp?: Blueprint | null) => {
    if (!bp?.quotation) return 0;
    const total = Number(bp.quotation.total);
    return Number.isFinite(total) && total > 0 ? total : 1;
  };
  const hasPayableQuotation = (bp?: Blueprint | null) => Boolean(bp?.quotation);
  const isQuotationSentToCustomer = (bp?: Blueprint | null) => Boolean(bp?.quotation && bp.quotationReviewStatus === 'sent_to_customer');
  const blueprintWorkflowStatus = resolveBlueprintWorkflowStatus(blueprint);
  const previewDialog = (
    <Dialog
      open={Boolean(previewFile)}
      onOpenChange={(open) => {
        if (!open) setPreviewFile(null);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-4xl dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="truncate text-gray-900 dark:text-slate-100">{previewName}</DialogTitle>
        </DialogHeader>
        <div className={`relative min-h-[420px] rounded-xl border p-2 ${isDark ? 'border-slate-700 bg-slate-950/80' : 'border-[#d2d2d7] bg-[#f5f5f7]/60'}`}>
          {isPreviewFileLoading ? (
            <div className="flex h-[420px] items-center justify-center">
              <Loader2 className={`h-7 w-7 animate-spin ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`} />
            </div>
          ) : resolvedPreviewUrl ? (
            isPreviewImage ? (
              <img src={resolvedPreviewUrl} alt={previewName} className="mx-auto max-h-[72vh] w-auto max-w-full object-contain rounded-lg" />
            ) : (
              <iframe
                title={previewName}
                src={resolvedPreviewUrl}
                className="h-[72vh] w-full rounded-lg border-0"
              />
            )
          ) : (
            <div className={`flex h-[420px] items-center justify-center text-sm ${isDark ? 'text-slate-400' : 'text-[#6e6e73]'}`}>
              Preview unavailable for this file.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (previewFile?.key?.startsWith('http')) {
                window.open(previewFile.key, '_blank');
              } else if (previewFile?.key) {
                openAuthenticatedFile(previewFile.key);
              }
            }}
            className="rounded-lg"
            disabled={!previewFile?.key}
          >
            Open in new tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Shared quotation form used in both first-upload and revision-upload
  const quotationFormJSX = (
    <div className={`space-y-4 border-t pt-3 ${isDark ? 'border-slate-800/80' : 'border-[#c8c8cd]/50'}`}>
      <section className={`rounded-xl border p-4 ${isDark ? 'border-sky-500/20 bg-slate-950/45' : 'border-blue-100 bg-blue-50/40'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${isDark ? 'text-sky-300' : 'text-blue-700'}`} />
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Internal Cost Breakdown</p>
              <Badge variant="outline" className={isDark ? 'border-amber-300/40 text-amber-200' : 'border-amber-300 text-amber-700'}>Internal Use Only</Badge>
            </div>
            <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-[#6e6e73]'}`}>Used by engineering/admin for estimation. Customers will not see this breakdown.</p>
          </div>
          <div />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTERNAL_COST_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>{field.label}</span>
              <input type="number" min={0} step={0.01} value={quotInternalCosts[field.key]} onChange={(e) => updateInternalCost(field.key, e.target.value)} placeholder="0.00" className={inputCls} />
            </label>
          ))}
        </div>
      </section>

      <section className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/45' : 'border-[#e8e8ed] bg-white'}`}>
        <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Commercial Terms</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Quotation Validity</span>
            <Select value={quotValidityDays} onValueChange={setQuotValidityDays}>
              <SelectTrigger className={`h-9 rounded-lg border px-3 text-sm ${isDark ? 'border-slate-700 bg-slate-950/70 text-slate-100' : 'border-[#d2d2d7] bg-[#f5f5f7]/50'}`}><SelectValue /></SelectTrigger>
              <SelectContent className={isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-[#d2d2d7] bg-white'}>
                <SelectItem value="15">15 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="45">45 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className={`mb-1 block text-xs ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>System Estimated Duration</span>
            <input value={quotSystemDuration} readOnly className={`${inputCls} opacity-80`} />
          </label>
        </div>
      </section>
    </div>
  );

  // ── Helpers ──
  const handleViewFile = (key: string) => {
    if (!key) return;
    setPreviewFile({
      key,
      name: key.split('/').pop() || 'file',
      type: /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(key) ? 'image/*' : undefined,
    });
  };

  // ── Customer handlers ──
  const handleApprove = (blueprintId: string, component: 'blueprint' | 'costing') => {
    if (component === 'costing' && !hasPayableQuotation(blueprint)) {
      toast.error('Billing cannot be approved until engineering provides a valid quotation total.');
      return;
    }
    if (component === 'costing' && !isQuotationSentToCustomer(blueprint)) {
      toast.error('Billing cannot be approved until the quotation is sent to you.');
      return;
    }

    setApprovingComponent(component);
    approveMutation.mutate(
      { id: blueprintId, component },
      {
        onSuccess: () => {
          toast.success(
            component === 'blueprint'
              ? 'Design approved! Next: review and approve the billing summary.'
              : 'Billing approved! You can now choose a payment plan to proceed.',
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
    if (!hasPayableQuotation(acceptDialog.blueprint)) {
      toast.error('Payment plan cannot be created because this item has no valid quotation total.');
      return;
    }

      setBlockedAction(null);
      selectPaymentPlanMutation.mutate(
        { id: projectId, paymentType, projectItemId },
      {
        onSuccess: () => {
          toast.success('Payment plan created. You can now continue to payments.', { duration: 6000 });
          setAcceptDialog({ open: false, blueprint: null });
          setPaymentType('full');
          refetch();
          refetchBlueprint();
          refetchProject();
        },
        onError: (err) => {
          setBlockedAction(resolveBlockedAction(err, '/help/payments/payment-stage-status-reference#overview'));
          toast.error(extractErrorMessage(err, 'Failed to create payment plan'));
        },
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
    if (!blueprintFileMeta || !effectiveDesignFileMeta) {
      toast.error('Please select a blueprint file before finalizing');
      return;
    }
    if (isCostingMode && quotGrandTotal <= 0) {
      toast.error('Enter internal costing amounts before sending the quotation to the customer.');
      return;
    }
    uploadInProgressRef.current = true;
    setUploading(true);
    try {
      // Wait for any pending draft autosaves to settle
      if (isSavingDraft) {
        toast.loading('Saving final draft changes...', { id: 'draftSave' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.dismiss('draftSave');
      }
      if (!designFileMeta && effectiveDesignFileMeta) {
        await upsertDraftMutation.mutateAsync({
          projectId,
          projectItemId,
          mode: blueprint ? 'revision' : 'initial',
          sourceBlueprintId: blueprint?._id,
          files: {
            blueprint: blueprintFileMeta,
            design: effectiveDesignFileMeta,
            costing: costingFileMeta,
          },
          quotation: currentQuotation,
        });
      }

      await finalizeDraftMutation.mutateAsync({ projectId, projectItemId });

      toast.success(
        isCostingMode
          ? 'Quotation sent to the customer and cashier record.'
          : blueprint
            ? 'Revision submitted. Your part is complete for now; waiting for customer approval of design and billing.'
            : 'Blueprint and quotation sent to the customer.',
        { duration: 7000 },
      );
      
      setBlueprintFileMeta(null);
      setDesignFileMeta(null);
      setCostingFileMeta(null);
      setQuotInternalCosts({ ...EMPTY_INTERNAL_COSTS });
      setQuotValidityDays('30');
      setQuotInitialized(false);
      sessionStorage.removeItem(draftCacheKey);
      lastSavedQuotation.current = currentQuotation;
      refetchBlueprint();
      refetchProject();
      refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to finalise blueprint upload.'));
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
      <>
        <Card className={`-mx-3 rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x ${isDark ? 'metal-panel-strong border-[color:var(--color-border)]/60 dark:border-slate-700 dark:bg-slate-950/85' : 'border-[#c8c8cd]/50'}`}>
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                {isBlueprintMode && (
                  <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${isDark ? 'bg-slate-800/80 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>
                    <Image className="h-8 w-8" />
                  </span>
                )}
                <div>
                  <CardTitle className={`flex items-center gap-2 text-2xl ${isDark ? 'text-slate-50' : 'text-[#1d1d1f]'}`}>
                    {isCostingMode && <Info className="h-5 w-5" />}
                    {isCostingMode ? 'Costing & Quotation' : 'Blueprint & Design'}
                  </CardTitle>
                  {isBlueprintMode && (
                    <p className={`mt-3 text-base ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>
                      Upload the project blueprint and design files to proceed with the review.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {blueprint ? (
              <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Version {blueprint.version}</p>
                <StatusBadge status={blueprintWorkflowStatus.key} label={blueprintWorkflowStatus.label} />
              </div>
              <div className={cn('grid gap-4', isBlueprintMode ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
                {isBlueprintMode && (
                  <>
                    <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
                      <CardHeader className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} flex flex-row items-center justify-between border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6 dark:border-slate-700`}>
                        <div className="flex items-center gap-2">
                          <FileText className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
                          <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Blueprint</h3>
                        </div>
                        <Badge variant="outline" className="border-white/12 bg-white/8 text-slate-200 shadow-none">Technical</Badge>
                      </CardHeader>
                      <CardContent className="space-y-4 px-4 pt-6 sm:px-6">
                        <FilePreviewThumb fileKey={blueprint.blueprintKey} label="Blueprint Preview" />
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                          <Button
                            variant="prominent"
                            className="flex-1 rounded-xl"
                            onClick={() => handleViewFile(blueprint.blueprintKey)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Blueprint
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
                    <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
                      <CardHeader className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} flex flex-row items-center justify-between border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6 dark:border-slate-700`}>
                        <div className="flex items-center gap-2">
                          <Image className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
                          <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Design</h3>
                        </div>
                        {blueprint.blueprintApproved ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100/80 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/25">
                            <CheckCircle className="mr-1 h-3 w-3" /> Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300">
                            Pending Review
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4 px-4 pt-6 sm:px-6">
                        <FilePreviewThumb fileKey={blueprint.designKey || blueprint.blueprintKey} label="Design Preview" />
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                          <Button
                            variant="prominent"
                            className="flex-1 rounded-xl"
                            onClick={() => handleViewFile(blueprint.designKey || blueprint.blueprintKey)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Design
                          </Button>
                          {blueprint.designKey ? (
                            <Button
                              variant="outline"
                              className="flex-1 rounded-xl border-white/12 bg-slate-900/55 text-slate-100 hover:bg-slate-800/80"
                              onClick={() => handleDownloadFile(blueprint.designKey!)}
                            >
                              <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
                {isCostingMode && (
                  <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
                    <CardHeader className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} flex flex-row items-center justify-between border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6 dark:border-slate-700`}>
                      <div className="flex items-center gap-2">
                        <Info className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
                        <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Costing</h3>
                      </div>
                      {blueprint.costingApproved ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100/80 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/25">
                          <CheckCircle className="mr-1 h-3 w-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300">
                          Pending Review
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 pt-6 sm:px-6">
                      {blueprint.costingKey ? (
                        <>
                          <FilePreviewThumb fileKey={blueprint.costingKey} label="Costing Sheet" />
                          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                            <Button
                              variant="prominent"
                              className="flex-1 rounded-xl"
                              onClick={() => handleViewFile(blueprint.costingKey!)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Costing
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 rounded-xl border-white/12 bg-slate-900/55 text-slate-100 hover:bg-slate-800/80"
                              onClick={() => handleDownloadFile(blueprint.costingKey!)}
                            >
                              <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className={`rounded-xl border border-[color:var(--color-border)]/50 p-4 ${isDark ? 'bg-slate-900/45 dark:border-slate-700' : 'bg-[color:var(--color-muted)]/55'}`}>
                          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                            This costing package uses the quotation details entered by engineering. No separate costing file was uploaded.
                          </p>
                          {blueprint.quotation?.total ? (
                            <>
                              <p className={`mt-3 text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Quotation Total</p>
                              <p className={`mt-1 text-2xl font-bold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
                                {formatCurrency(getPayableQuotationTotal(blueprint))}
                              </p>
                              {blueprint.quotation?.estimatedDuration && (
                                <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                                  Estimated duration: {blueprint.quotation.estimatedDuration}
                                </p>
                              )}
                            </>
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
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
                <div className={`space-y-6 rounded-2xl border p-6 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-[#d2d2d7] bg-[#f5f5f7]/45'}`}>
                  {isBlueprintMode && (
                    <div>
                      <p className={`border-l-4 pl-4 text-xl font-semibold ${isDark ? 'border-sky-400 text-slate-100' : 'border-sky-500 text-[#1d1d1f]'}`}>Upload Files</p>
                      <p className={`mt-3 pl-5 text-base ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Upload clear and legible files for accurate review and estimation.</p>
                    </div>
                  )}
                  <div className={cn('grid gap-4', isBlueprintMode ? 'lg:grid-cols-2' : 'sm:grid-cols-1')}>
                    {isBlueprintMode && (
                      <>
                        <FilePickerWithPreview
                          fileMeta={blueprintFileMeta}
                          isUploading={uploadingFile === 'blueprint'}
                          onFileSelect={(f) => f && handleDraftFileUpload(f, 'blueprint')}
                          onRemove={() => handleDraftFileRemove('blueprint')}
                          onPreview={handleOpenPreviewModal}
                          accept=".pdf,.png,.jpg,.jpeg,.dwg"
                          label="Blueprint File *"
                        />
                        {approvedInitialDesignKey ? (
                          <AutoLinkedDesignFileCard fileKey={approvedInitialDesignKey} onPreview={handleOpenPreviewModal} />
                        ) : (
                          <FilePickerWithPreview
                            fileMeta={designFileMeta}
                            isUploading={uploadingFile === 'design'}
                            onFileSelect={(f) => f && handleDraftFileUpload(f, 'design')}
                            onRemove={() => handleDraftFileRemove('design')}
                            onPreview={handleOpenPreviewModal}
                            accept=".pdf,.png,.jpg,.jpeg"
                            label="Design File *"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {isCostingMode && quotationFormJSX}

                  <div className={`flex flex-col gap-3 border-t pt-6 ${isDark ? 'border-slate-800' : 'border-[#d2d2d7]'}`}>
                    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${isDark ? 'border-sky-500/25 bg-sky-500/10' : 'border-sky-200 bg-sky-50'}`}>
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-100 text-sky-700'}`}>
                        {isSavingDraft ? <Loader2 className="h-5 w-5 animate-spin" /> : <Info className="h-5 w-5" />}
                      </span>
                      <div>
                      {isSavingDraft ? (
                          <p className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Saving draft...</p>
                      ) : (
                          <p className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Draft up to date</p>
                      )}
                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Your changes are saved automatically.</p>
                      </div>
                    </div>
                    {isCostingMode && (
                      <button
                        type="button"
                        className={uploadActionButtonClass}
                        onClick={handleBlueprintUpload}
                        disabled={uploading || !blueprintFileMeta || !effectiveDesignFileMeta || quotGrandTotal <= 0 || isSavingDraft || !!uploadingFile}
                      >
                        {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                        Send Quotation to Customer & Cashier
                      </button>
                    )}
                  </div>
                </div>
              )}
              </div>
            ) : (
              <div>
              {/* First blueprint upload */}
              {canUploadInitialBlueprint ? (
                <div className={`space-y-6 rounded-2xl border p-6 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-[#d2d2d7] bg-[#f5f5f7]/45'}`}>
                  {isBlueprintMode && (
                    <div>
                      <p className={`border-l-4 pl-4 text-xl font-semibold ${isDark ? 'border-sky-400 text-slate-100' : 'border-sky-500 text-[#1d1d1f]'}`}>Upload Files</p>
                      <p className={`mt-3 pl-5 text-base ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Upload clear and legible files for accurate review and estimation.</p>
                    </div>
                  )}
                  <div className={cn('grid gap-4', isBlueprintMode ? 'lg:grid-cols-2' : 'sm:grid-cols-1')}>
                    {isBlueprintMode && (
                      <>
                        <FilePickerWithPreview
                          fileMeta={blueprintFileMeta}
                          isUploading={uploadingFile === 'blueprint'}
                          onFileSelect={(f) => f && handleDraftFileUpload(f, 'blueprint')}
                          onRemove={() => handleDraftFileRemove('blueprint')}
                          onPreview={handleOpenPreviewModal}
                          accept=".pdf,.png,.jpg,.jpeg,.dwg"
                          label="Blueprint File *"
                        />
                        {approvedInitialDesignKey ? (
                          <AutoLinkedDesignFileCard fileKey={approvedInitialDesignKey} onPreview={handleOpenPreviewModal} />
                        ) : (
                          <FilePickerWithPreview
                            fileMeta={designFileMeta}
                            isUploading={uploadingFile === 'design'}
                            onFileSelect={(f) => f && handleDraftFileUpload(f, 'design')}
                            onRemove={() => handleDraftFileRemove('design')}
                            onPreview={handleOpenPreviewModal}
                            accept=".pdf,.png,.jpg,.jpeg"
                            label="Design File *"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {isCostingMode && quotationFormJSX}

                  <div className={`flex flex-col gap-3 border-t pt-6 ${isDark ? 'border-slate-800' : 'border-[#d2d2d7]'}`}>
                    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${isDark ? 'border-sky-500/25 bg-sky-500/10' : 'border-sky-200 bg-sky-50'}`}>
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-100 text-sky-700'}`}>
                        {isSavingDraft ? <Loader2 className="h-5 w-5 animate-spin" /> : <Info className="h-5 w-5" />}
                      </span>
                      <div>
                      {isSavingDraft ? (
                          <p className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Saving draft...</p>
                      ) : (
                          <p className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Draft up to date</p>
                      )}
                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-[#6e6e73]'}`}>Your changes are saved automatically.</p>
                      </div>
                    </div>
                    {isCostingMode && (
                      <button
                        type="button"
                        className={uploadActionButtonClass}
                        onClick={handleBlueprintUpload}
                        disabled={uploading || !blueprintFileMeta || !effectiveDesignFileMeta || quotGrandTotal <= 0 || isSavingDraft || !!uploadingFile}
                      >
                        {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                        Send Quotation to Customer & Cashier
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#6e6e73] py-4">
                  {isCostingMode ? 'No costing package uploaded yet.' : 'No blueprint uploaded yet.'}
                </p>
              )}
              </div>
            )}
          </CardContent>
        </Card>
        {previewDialog}
      </>
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
            <div
              key={i}
              className={`h-36 rounded-xl animate-pulse ${
                isDark
                  ? 'bg-slate-900/75 ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                  : 'bg-[color:var(--color-muted)]/55'
              }`}
            />
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
      <>
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
            <StatusBadge status={blueprintWorkflowStatus.key} label={blueprintWorkflowStatus.label} />
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
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 shadow-none">
                  <CheckCircle className="mr-1 h-3 w-3" /> Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="h-5 rounded-full border-amber-400/45 bg-amber-500/8 px-1.5 text-[10px] font-medium tracking-[0.01em] text-amber-200 shadow-none dark:border-amber-400/40 dark:bg-amber-500/8 dark:text-amber-200">
                  Review
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
        {previewDialog}
      </>
    );
  }

  // ═══════════════════════════════════════════
  // ═══  CUSTOMER / STAFF VIEW  ══════════════
  // ═══════════════════════════════════════════
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className={`h-36 rounded-xl animate-pulse ${
              isDark
                ? 'bg-slate-900/75 ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                : 'bg-[color:var(--color-muted)]/55'
            }`}
          />
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
            {isCostingMode
              ? 'The engineering team will upload costing and billing details for your review.'
              : 'The engineering team will upload drawings for your review.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show the latest blueprint with full review experience
  return (
    <>
      <div className="space-y-6 -mx-3 sm:mx-0">
        {blueprints.map((bp: Blueprint) => (
          <div key={bp._id} className="space-y-4 px-3 sm:px-0">
          {/* Design + billing cards for customers; full costing remains staff-only. */}
          <div className={cn('grid grid-cols-1 gap-4', isCostingMode ? 'md:grid-cols-1' : 'md:grid-cols-1')}>
            {/* Design Card — shown to everyone */}
            {isBlueprintMode && (
            <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
              <CardHeader className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} flex flex-row items-center justify-between border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6 dark:border-slate-700`}>
                <div className="flex items-center gap-2">
                  <Image className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
                  <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>Design</h3>
                </div>
                {bp.blueprintApproved ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100/80 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/25">
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
                      className="flex-1 rounded-xl border border-emerald-500/70 bg-[linear-gradient(180deg,#22c55e_0%,#15803d_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_24px_rgba(6,95,70,0.3)] hover:bg-[linear-gradient(180deg,#34d399_0%,#16a34a_100%)] hover:text-white dark:border-emerald-400/55 dark:bg-[linear-gradient(180deg,#34d399_0%,#15803d_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(6,78,59,0.34)] dark:hover:bg-[linear-gradient(180deg,#6ee7b7_0%,#16a34a_100%)]"
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
            )}

            {/* Costing/Billing Card */}
            {isCostingMode && (
            <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
              <CardHeader className={`${isDark ? 'bg-slate-900/70' : 'bg-[color:var(--color-muted)]/55'} flex flex-row items-center justify-between border-b border-[color:var(--color-border)]/55 px-4 pb-3 sm:rounded-t-xl sm:px-6 dark:border-slate-700`}>
                <div className="flex items-center gap-2">
                  <Info className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-muted-color)]'}`} />
                  <h3 className={`font-semibold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>{canReviewBlueprint || isCashier ? 'Billing Summary' : 'Costing Sheet'}</h3>
                </div>
                {bp.costingApproved ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100/80 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/25">
                    <CheckCircle className="mr-1 h-3 w-3" /> Approved
                  </Badge>
                ) : bp.quotationReviewStatus !== 'sent_to_customer' ? (
                  <Badge variant="outline" className="h-5 rounded-full border-sky-400/45 bg-sky-500/10 px-1.5 text-[10px] font-medium tracking-[0.01em] text-sky-200 shadow-none">
                    {bp.quotationReviewStatus === 'for_review' ? 'Preparing Quotation' : 'Draft'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-5 rounded-full border-amber-400/45 bg-amber-500/8 px-1.5 text-[10px] font-medium tracking-[0.01em] text-amber-200 shadow-none dark:border-amber-400/40 dark:bg-amber-500/8 dark:text-amber-200">
                    Review
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4 px-4 sm:px-6">
                  {canReviewBlueprint || isCashier ? (
                  <div className={`rounded-xl border border-[color:var(--color-border)]/50 p-4 ${isDark ? 'bg-slate-900/45 dark:border-slate-700' : 'bg-[color:var(--color-muted)]/55'}`}>
                    {!isQuotationSentToCustomer(bp) ? (
                      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                        The quotation has not been released to the customer yet.
                      </p>
                    ) : (
                      <>
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                          {isCashier ? 'This is the customer-facing quotation retained for finance records.' : 'This billing summary is the customer-facing quotation tied to the approved design.'}
                        </p>
                        <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'}`}>Total Billing</p>
                        <p className={`mt-1 text-2xl font-bold ${isDark ? 'text-slate-50' : 'text-[var(--color-card-foreground)]'}`}>
                          {formatCurrency(getPayableQuotationTotal(bp))}
                        </p>
                        {bp.quotation?.estimatedDuration && (
                          <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>Estimated duration: {bp.quotation.estimatedDuration}</p>
                        )}
                      </>
                    )}
                  </div>
                ) : canViewInternalCosting ? (
                  bp.costingKey ? (
                    <div className="space-y-3">
                      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                        The costing sheet contains the detailed pricing basis that supports the quotation shown to the customer.
                      </p>
                      <FilePreviewThumb fileKey={bp.costingKey} label="Costing Sheet" />
                    </div>
                  ) : (
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                      This costing package uses the quotation details entered by engineering. No separate costing file was uploaded.
                    </p>
                  )
                ) : (
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-[var(--text-metal-color)]'}`}>
                    The customer-facing quotation summary is available for this item.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {canReviewBlueprint && !bp.costingApproved && (
                    <Button
                      className="flex-1 rounded-xl border border-emerald-500/70 bg-[linear-gradient(180deg,#22c55e_0%,#15803d_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_24px_rgba(6,95,70,0.3)] hover:bg-[linear-gradient(180deg,#34d399_0%,#16a34a_100%)] hover:text-white dark:border-emerald-400/55 dark:bg-[linear-gradient(180deg,#34d399_0%,#15803d_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(6,78,59,0.34)] dark:hover:bg-[linear-gradient(180deg,#6ee7b7_0%,#16a34a_100%)]"
                      onClick={() => setApproveConfirmDialog({ open: true, blueprintId: bp._id, component: 'costing' })}
                      disabled={approveMutation.isPending || !hasPayableQuotation(bp) || !isQuotationSentToCustomer(bp)}
                    >
                      {approvingComponent === 'costing' && approveMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...</>
                      ) : (
                        <><CheckCircle className="mr-2 h-4 w-4" /> Approve Billing</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </div>

          {/* Technical Blueprint — staff/engineer/admin only, hidden from customers */}
          {isBlueprintMode && !canReviewBlueprint && (
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
          {isCostingMode && canReviewBlueprint && bp.blueprintApproved && bp.costingApproved &&
           ['uploaded', 'revision_uploaded', 'approved'].includes(bp.status) && (
            <Card className="rounded-none border-x-0 border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50 shadow-sm sm:rounded-xl sm:border-x dark:border-emerald-500/35 dark:from-emerald-500/12 dark:to-slate-900 dark:bg-none">
              <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-5 px-4 sm:px-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <CreditCard className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                </div>
                {project && hasActiveItemPaymentPlan ? (
                  <>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Payment Plan Ready</p>
                      <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">Head to Payments to view the schedule or pay the active stage.</p>
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 w-full sm:w-auto flex-shrink-0 dark:bg-none dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                      onClick={() => navigate('/payments')}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Go to Payments
                    </Button>
                  </>
                ) : (
                  /* No plan yet — show payment-plan CTA */
                  <>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                        {hasPayableQuotation(bp) ? 'Blueprint Approved' : 'Quotation Needed'}
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                        {hasPayableQuotation(bp)
                          ? 'Choose your payment plan to continue directly to payment.'
                          : 'Engineering needs to upload billing with a valid total before a payment plan can be created.'}
                      </p>
                    </div>
                    <Button
                      className="w-full flex-shrink-0 rounded-xl border border-emerald-500/70 bg-[linear-gradient(180deg,#22c55e_0%,#15803d_100%)] px-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_32px_rgba(8,68,39,0.28)] hover:bg-[linear-gradient(180deg,#34d399_0%,#16a34a_100%)] hover:text-white sm:w-auto dark:border-emerald-400/55 dark:bg-[linear-gradient(180deg,#34d399_0%,#15803d_100%)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_rgba(6,78,59,0.36)] dark:hover:bg-[linear-gradient(180deg,#6ee7b7_0%,#16a34a_100%)]"
                      onClick={() => {
                        setBlockedAction(null);
                        setAcceptDialog({ open: true, blueprint: bp });
                      }}
                      disabled={!hasPayableQuotation(bp) || !isQuotationSentToCustomer(bp)}
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

          {isCostingMode && !canReviewBlueprint && quotationHistory && quotationHistory.length > 0 && (
            <Card className={`${isDark ? 'metal-panel-strong dark:bg-slate-950/85' : 'metal-panel'} rounded-none border-x-0 border-[color:var(--color-border)]/60 sm:rounded-xl sm:border-x dark:border-slate-700`}>
              <CardHeader className="px-4 pb-2 sm:px-6">
                <CardTitle className={`text-sm ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>Quotation History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4 sm:px-6">
                {quotationHistory.map((event) => {
                  const actorName = event.actorId?.firstName
                    ? `${event.actorId.firstName} ${event.actorId.lastName || ''}`.trim()
                    : 'System';
                  const label = String(event.action || '').replace(/_/g, ' ');
                  const total = typeof event.details?.total === 'number' ? event.details.total : undefined;
                  return (
                    <div key={event._id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${isDark ? 'border-slate-800 bg-slate-900/55' : 'border-[#e8e8ed] bg-[#f5f5f7]'}`}>
                      <div>
                        <p className={`text-sm font-semibold capitalize ${isDark ? 'text-slate-100' : 'text-[#1d1d1f]'}`}>{label}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-[#6e6e73]'}`}>{actorName} • {format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                      {total !== undefined && <span className={`text-sm font-semibold ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>{formatCurrency(total)}</span>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Action buttons for customer review */}
          {canReviewBlueprint && ['uploaded', 'revision_uploaded'].includes(bp.status) && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                className="rounded-xl"
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
              Approve {approveConfirmDialog.component === 'blueprint' ? 'Design' : canReviewBlueprint ? 'Billing Summary' : 'Costing Sheet'}?
            </DialogTitle>
            <DialogDescription className="pt-1 text-gray-500 dark:text-slate-400">
              Please make sure you have carefully reviewed the{' '}
              <span className="font-medium text-gray-700 dark:text-slate-200">
                {approveConfirmDialog.component === 'blueprint' ? 'design' : canReviewBlueprint ? 'billing summary' : 'costing sheet'}
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
              Once you approve <span className="font-semibold">both</span> the design and {canReviewBlueprint ? 'billing summary' : 'costing sheet'}, you will{' '}
              <span className="font-semibold">no longer be able to request a revision</span>. This action is final.
            </p>
          </div>
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              className="rounded-lg border border-rose-500/70 bg-[linear-gradient(180deg,#f87171_0%,#dc2626_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_24px_rgba(127,29,29,0.28)] hover:bg-[linear-gradient(180deg,#fb7185_0%,#ef4444_100%)] hover:text-white dark:border-rose-400/55 dark:bg-[linear-gradient(180deg,#fb7185_0%,#dc2626_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(127,29,29,0.34)] dark:hover:bg-[linear-gradient(180deg,#fda4af_0%,#ef4444_100%)]"
              onClick={() => setApproveConfirmDialog({ open: false, blueprintId: '', component: null })}
            >
              Go Back
            </Button>
            <Button
              className="rounded-lg border border-emerald-500/70 bg-[linear-gradient(180deg,#22c55e_0%,#15803d_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_24px_rgba(6,95,70,0.3)] hover:bg-[linear-gradient(180deg,#34d399_0%,#16a34a_100%)] hover:text-white dark:border-emerald-400/55 dark:bg-[linear-gradient(180deg,#34d399_0%,#15803d_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(6,78,59,0.34)] dark:hover:bg-[linear-gradient(180deg,#6ee7b7_0%,#16a34a_100%)]"
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
              Select how you want to pay. This creates your payment schedule.
            </DialogDescription>
          </DialogHeader>

          {acceptDialog.blueprint?.quotation && (
            <div className="space-y-5 mt-2">
              {/* Quotation Summary */}
              <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-slate-800/70">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Billing Summary</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold text-gray-700 dark:text-slate-200">Total Billing</span>
                  <span className="text-right font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(getPayableQuotationTotal(acceptDialog.blueprint))}
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
                      {formatCurrency(getPayableQuotationTotal(acceptDialog.blueprint))}
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
                        getPayableQuotationTotal(acceptDialog.blueprint) *
                          (1 + surchargePercent / 100),
                      )}{' '}
                      <span className="text-xs font-normal text-gray-400 dark:text-slate-500">
                        (+{surchargePercent}%)
                      </span>
                    </p>
                    {/* Milestone breakdown */}
                    {paymentType === 'installment' && (() => {
                      const milestones = acceptDialog.blueprint?.quotation?.paymentMilestones;
                      const installTotal = getPayableQuotationTotal(acceptDialog.blueprint) * (1 + surchargePercent / 100);
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

          {blockedAction && (
            <BlockedActionPrompt
              title={blockedAction.title}
              reason={blockedAction.reason}
              actionLabel={blockedAction.actionLabel}
              actionPath={blockedAction.actionPath}
              className="mt-3"
            />
          )}

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAcceptDialog({ open: false, blueprint: null });
                setPaymentType('full');
                setBlockedAction(null);
              }}
              className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChoosePaymentPlan}
              disabled={selectPaymentPlanMutation.isPending || !hasPayableQuotation(acceptDialog.blueprint) || !isQuotationSentToCustomer(acceptDialog.blueprint)}
              className="rounded-lg border border-emerald-500/70 bg-[linear-gradient(180deg,#22c55e_0%,#15803d_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_32px_rgba(8,68,39,0.28)] hover:bg-[linear-gradient(180deg,#34d399_0%,#16a34a_100%)] hover:text-white dark:border-emerald-400/55 dark:bg-[linear-gradient(180deg,#34d399_0%,#15803d_100%)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_rgba(6,78,59,0.36)] dark:hover:bg-[linear-gradient(180deg,#6ee7b7_0%,#16a34a_100%)]"
            >
              {selectPaymentPlanMutation.isPending ? 'Creating Plan...' : 'Create Payment Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </div>
      {previewDialog}
    </>
  );
}
