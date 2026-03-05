import { useState, useRef, useMemo } from 'react';
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
  useAcceptBlueprint,
  useUploadBlueprint,
  useUploadRevision,
} from '@/hooks/useBlueprints';
import { useConfigs } from '@/hooks/useConfig';
import { useGetUploadUrl, uploadFileToR2 } from '@/hooks/useUploads';
import { useProject } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { Role } from '@/lib/constants';
import type { Blueprint, VisitReport } from '@/lib/types';

interface BlueprintTabProps {
  projectId: string;
  onNavigateToDetails?: () => void;
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
      <label className="text-xs text-[#6e6e73] block mb-1.5">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        className="hidden"
      />
      {file ? (
        <div className="relative group rounded-xl border border-[#c8c8cd]/50 overflow-hidden bg-[#f5f5f7]/30">
          <button
            type="button"
            onClick={handlePreview}
            className="w-full text-left hover:bg-[#f0f0f5]/50 transition-colors"
          >
            {isImage && previewUrl ? (
              <div className="aspect-[3/2] bg-[#f5f5f7] flex items-center justify-center p-2">
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="aspect-[3/2] bg-[#f5f5f7] flex flex-col items-center justify-center gap-2">
                <FileText className="h-10 w-10 text-[#86868b]" />
                <span className="text-[10px] text-[#86868b] uppercase tracking-wider font-medium">
                  {file.name.split('.').pop()}
                </span>
              </div>
            )}
            <div className="p-3 border-t border-[#c8c8cd]/30">
              <p className="text-xs font-medium text-[#3a3a3e] truncate">{file.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-[#86868b]">{formatSize(file.size)}</p>
                <span className="text-[10px] text-[#0066cc]">Click to preview</span>
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
          className="w-full rounded-xl border-2 border-dashed border-[#c8c8cd] p-6 text-center hover:border-[#86868b] hover:bg-[#f5f5f7]/30 transition-colors cursor-pointer"
        >
          <Upload className="h-6 w-6 text-[#86868b] mx-auto mb-1.5" />
          <p className="text-xs font-medium text-[#3a3a3e]">Choose file</p>
          <p className="text-[10px] text-[#86868b] mt-0.5">
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
  const isImage = fileKey ? /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileKey) : false;

  if (isLoading) {
    return (
      <div className="aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
        <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (url && isImage) {
    return (
      <div className="aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden">
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  // Non-image file or no URL � show icon placeholder
  const isPdf = fileKey ? /\.pdf$/i.test(fileKey) : false;
  const isSpreadsheet = fileKey ? /\.(xlsx?|csv)$/i.test(fileKey) : false;
  return (
    <div className="aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
      <div className="text-center p-6">
        {isPdf ? (
          <FileText className="h-12 w-12 text-red-300 mx-auto mb-3" />
        ) : isSpreadsheet ? (
          <Info className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
        ) : (
          <Image className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        )}
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-xs text-gray-400 mt-1">Click to view full document</p>
      </div>
    </div>
  );
}

export function BlueprintTab({ projectId, onNavigateToDetails }: BlueprintTabProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isEngineer = user?.roles?.some((r: string) => r === 'engineer');
  const isCustomer = user?.roles?.some((r: string) => r === Role.CUSTOMER);
  const isFabricationStaff = user?.roles?.some((r: string) => r === Role.FABRICATION_STAFF);

  const { data: project, refetch: refetchProject } = useProject(projectId);
  const { data: blueprint, refetch: refetchBlueprint } = useLatestBlueprint(projectId);
  const { data: blueprints, isLoading, isError, refetch } = useBlueprintsByProject(projectId);

  // Engineer-specific mutations
  const uploadBlueprint = useUploadBlueprint();
  const uploadRevision = useUploadRevision();
  const getUploadUrl = useGetUploadUrl();

  // Customer-specific mutations
  const approveMutation = useApproveComponent();
  const revisionMutation = useRequestBlueprintRevision();
  const acceptMutation = useAcceptBlueprint();
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

  // ── Derive visit report line items ──
  const visitReport: VisitReport | null = useMemo(() => {
    if (!project?.visitReportId || typeof project.visitReportId === 'string') return null;
    return project.visitReportId as VisitReport;
  }, [project]);

  // Pre-populate quotation line items from visit report (once)
  const vrLineItems = visitReport?.lineItems;
  if (!quotInitialized && vrLineItems && vrLineItems.length > 0 && quotLineItems.length === 0) {
    setQuotLineItems(vrLineItems.map(li => ({ label: li.label, quantity: li.quantity || 1, materials: '', labor: '' })));
    setQuotInitialized(true);
  }

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
  if (!quotInitialized && quotMilestones.length === 0 && cfgSplit.length > 0) {
    setQuotMilestones(cfgSplit.map((_, idx) => ({
      label: cfgLabels[idx] || `Stage ${idx + 1}`,
      description: cfgDescriptions[idx] || '',
    })));
  }

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

  const inputCls = 'w-full h-9 px-3 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]';

  const formatCurrency = (n: number | undefined | null) => {
    const val = Number(n);
    return `₱${(Number.isFinite(val) ? val : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Shared quotation form used in both first-upload and revision-upload
  const quotationFormJSX = (
    <div className="border-t border-[#c8c8cd]/50 pt-3 space-y-4">
      <p className="text-sm font-medium text-[#3a3a3e]">Quotation Details <span className="text-xs text-red-500">*</span></p>

      {/* ── Itemized pricing table ── */}
      {quotLineItems.length > 0 && (
        <div className="space-y-2">
          {/* Table header (hidden on small screens, visible on >=640) */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_60px_100px_100px_90px_32px] gap-2 px-1 text-[10px] uppercase tracking-wider font-medium text-[#86868b]">
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
              <div key={idx} className="rounded-lg border border-[#d2d2d7]/60 bg-white p-3 sm:p-0 sm:border-0 sm:bg-transparent space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_60px_100px_100px_90px_32px] sm:gap-2 sm:items-center">
                {/* Item name */}
                <div>
                  <span className="sm:hidden text-[10px] uppercase tracking-wider font-medium text-[#86868b] block mb-1">Item</span>
                  <input value={li.label} onChange={e => updateLineItem(idx, 'label', e.target.value)} placeholder="Item name" className={inputCls} />
                </div>
                {/* Quantity */}
                <div>
                  <span className="sm:hidden text-[10px] uppercase tracking-wider font-medium text-[#86868b] block mb-1">Qty</span>
                  <input type="number" value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))} min={1} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div>
                    <span className="sm:hidden text-[10px] uppercase tracking-wider font-medium text-[#86868b] block mb-1">Materials (₱)</span>
                    <input type="number" value={li.materials} onChange={e => updateLineItem(idx, 'materials', e.target.value)} min={0} step={0.01} placeholder="0.00" className={inputCls} />
                  </div>
                  <div>
                    <span className="sm:hidden text-[10px] uppercase tracking-wider font-medium text-[#86868b] block mb-1">Labor (₱)</span>
                    <input type="number" value={li.labor} onChange={e => updateLineItem(idx, 'labor', e.target.value)} min={0} step={0.01} placeholder="0.00" className={inputCls} />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end">
                  <span className="sm:hidden text-[10px] uppercase tracking-wider font-medium text-[#86868b]">Total</span>
                  <p className="text-sm font-semibold text-[#1d1d1f] h-9 flex items-center">{formatCurrency(rowTotal)}</p>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600 p-1 rounded transition-colors" title="Remove item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" onClick={addLineItem} className="flex items-center gap-1.5 text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add Item
      </button>

      {/* Other Fees */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#6e6e73] block mb-1">Other Fees (₱)</label>
          <input type="number" value={quotFees} onChange={(e) => setQuotFees(e.target.value)} min={0} step={0.01} placeholder="Delivery, permits, etc." className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-[#6e6e73] block mb-1">Quotation Validity</label>
          <Select value={quotValidityDays} onValueChange={setQuotValidityDays}>
            <SelectTrigger className="h-9 w-full rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-[#d2d2d7] bg-white shadow-lg">
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
        <div className="rounded-lg bg-[#f5f5f7] border border-[#e8e8ed] p-3 space-y-1.5">
          <div className="flex justify-between text-xs text-[#6e6e73]">
            <span>Materials</span>
            <span>{formatCurrency(quotTotalMaterials)}</span>
          </div>
          <div className="flex justify-between text-xs text-[#6e6e73]">
            <span>Labor</span>
            <span>{formatCurrency(quotTotalLabor)}</span>
          </div>
          {quotFeesNum > 0 && (
            <div className="flex justify-between text-xs text-[#6e6e73]">
              <span>Other Fees</span>
              <span>{formatCurrency(quotFeesNum)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-emerald-700 pt-1.5 border-t border-[#d2d2d7]">
            <span>Grand Total</span>
            <span>{formatCurrency(quotGrandTotal)}</span>
          </div>
        </div>
      )}

      {/* Duration + Scope + Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#6e6e73] block mb-1">Estimated Duration</label>
          <input value={quotDuration} onChange={e => setQuotDuration(e.target.value)} placeholder="e.g. 2-3 weeks" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="text-xs text-[#6e6e73] block mb-1">Scope of Work</label>
        <textarea value={quotBreakdown} onChange={e => setQuotBreakdown(e.target.value)} placeholder="Describe what will be fabricated and installed..." rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
      </div>
      <div>
        <label className="text-xs text-[#6e6e73] block mb-1">Engineer Notes</label>
        <textarea value={quotNotes} onChange={e => setQuotNotes(e.target.value)} placeholder="Any additional notes for the customer..." rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]/50 focus:outline-none focus:ring-2 focus:ring-[#6e6e73] focus:border-[#b8b8bd]" />
      </div>

      {/* ── Installment Payment Milestones ── */}
      {quotMilestones.length > 0 && (
        <div className="border-t border-[#c8c8cd]/50 pt-3 space-y-3">
          <div>
            <p className="text-sm font-medium text-[#3a3a3e]">Installment Payment Schedule</p>
            <p className="text-[10px] text-[#86868b] mt-0.5">Describe when each payment stage is due. Only applies if the customer chooses installment.</p>
          </div>
          {quotMilestones.map((ms, idx) => (
            <div key={idx} className="rounded-lg border border-[#d2d2d7]/60 bg-[#f5f5f7]/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[10px] uppercase tracking-wider font-medium text-[#86868b]">Stage {idx + 1}</span>
                <span className="shrink-0 text-xs font-semibold text-[#6e6e73] bg-[#e8e8ed] rounded px-1.5 py-0.5">{cfgSplit[idx]}%</span>
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
          toast.success(`${component === 'blueprint' ? 'Design' : 'Costing'} approved`);
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
          toast.success('Revision requested');
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

  const handleAcceptBlueprint = () => {
    if (!acceptDialog.blueprint) return;
    acceptMutation.mutate(
      { id: acceptDialog.blueprint._id, paymentType },
      {
        onSuccess: () => {
          toast.success('Blueprint accepted! Payment plan created.');
          setAcceptDialog({ open: false, blueprint: null });
          setPaymentType('full');
          refetch();
          refetchBlueprint();
          refetchProject();
        },
        onError: (err) => toast.error(extractErrorMessage(err, 'Failed to accept blueprint')),
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
        getUploadUrl.mutateAsync({
          folder: 'blueprints',
          fileName: blueprintFile.name,
          contentType: blueprintFile.type,
        }),
        getUploadUrl.mutateAsync({
          folder: 'blueprints',
          fileName: designFile.name,
          contentType: designFile.type,
        }),
        getUploadUrl.mutateAsync({
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
        toast.success('Revision uploaded successfully');
      } else {
        await uploadBlueprint.mutateAsync({
          projectId,
          blueprintKey: bpUrl.fileKey,
          designKey: designUrl.fileKey,
          costingKey: costUrl.fileKey,
          quotation,
        });
        toast.success('Blueprint uploaded successfully');
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
      <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-[#c8c8cd]/50">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-lg text-[#1d1d1f]">
            <Image className="h-5 w-5" />
            Blueprint & Design
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {blueprint ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1d1d1f]">Version {blueprint.version}</p>
                <StatusBadge status={blueprint.status} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/50">
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Blueprint</p>
                  <p className="mt-1 text-[10px] text-[#86868b]">Technical (for fabrication)</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 text-[#1d1d1f] hover:text-[#3a3a3e] p-0 h-auto text-xs"
                    onClick={() => handleDownloadFile(blueprint.blueprintKey)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </div>
                <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/50">
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Design</p>
                  <p className="mt-1 text-sm font-medium">
                    {blueprint.blueprintApproved ? 'Approved' : 'Pending Review'}
                  </p>
                  {blueprint.designKey ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 text-[#1d1d1f] hover:text-[#3a3a3e] p-0 h-auto text-xs"
                      onClick={() => handleDownloadFile(blueprint.designKey!)}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                  ) : (
                    <p className="mt-1 text-[10px] text-[#86868b] italic">Not uploaded</p>
                  )}
                </div>
                <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/50">
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Costing</p>
                  <p className="mt-1 text-sm font-medium">
                    {blueprint.costingApproved ? 'Approved' : 'Pending Review'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 text-[#1d1d1f] hover:text-[#3a3a3e] p-0 h-auto text-xs"
                    onClick={() => handleDownloadFile(blueprint.costingKey)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </div>
              </div>
              {(blueprint.revisionNotes || (blueprint.revisionRefKeys && blueprint.revisionRefKeys.length > 0)) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Revision Notes</p>
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
              <p className="text-xs text-[#86868b]">
                Uploaded {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
              </p>

              {/* Revision upload (when revision requested) */}
              {blueprint.status === 'revision_requested' && isAssigned && (
                <div className="rounded-xl border border-dashed border-[#c8c8cd] p-4 space-y-3">
                  <p className="text-sm font-medium text-[#3a3a3e]">Upload Revision</p>
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

                  <Button
                    size="sm"
                    className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white"
                    onClick={handleBlueprintUpload}
                    disabled={uploading || !blueprintFile || !designFile || !costingFile}
                  >
                    {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    Upload Revision
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* First blueprint upload */}
              {isAssigned && project && ['blueprint', 'submitted'].includes(project.status) ? (
                <div className="rounded-xl border border-dashed border-[#c8c8cd] p-4 space-y-3">
                  <p className="text-sm font-medium text-[#3a3a3e]">Upload Blueprint, Design & Costing</p>
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

                  <Button
                    size="sm"
                    className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white"
                    onClick={handleBlueprintUpload}
                    disabled={uploading || !blueprintFile || !designFile || !costingFile}
                  >
                    {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    Upload Blueprint
                  </Button>
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
            <Badge variant="outline" className="border-[#c8c8cd] text-[#3a3a3e] font-medium rounded-lg">
              v{blueprint.version}
            </Badge>
            <span className="text-xs text-[#86868b]">
              {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          <StatusBadge status={blueprint.status} />
        </div>

        {/* Two file cards: Blueprint + Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Technical Blueprint */}
          <Card className="border-gray-100 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50/50 border-b border-gray-100 sm:rounded-t-xl px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#6e6e73]" />
                <h3 className="font-semibold text-gray-900">Technical Blueprint</h3>
              </div>
              <span className="text-[10px] text-[#86868b] bg-[#f0f0f5] px-1.5 py-0.5 rounded">Fabrication reference</span>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 px-4 sm:px-6">
              <p className="text-xs text-[#86868b]">Engineering drawing for fabrication use.</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                  onClick={() => handleViewFile(blueprint.blueprintKey)}
                >
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl border-gray-200"
                  onClick={() => handleDownloadFile(blueprint.blueprintKey)}
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Design */}
          <Card className="border-gray-100 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50/50 border-b border-gray-100 sm:rounded-t-xl px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-[#6e6e73]" />
                <h3 className="font-semibold text-gray-900">Design</h3>
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
              <p className="text-xs text-[#86868b]">Customer-facing design render.</p>
              {blueprint.designKey ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                    onClick={() => handleViewFile(blueprint.designKey!)}
                  >
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-gray-200"
                    onClick={() => handleDownloadFile(blueprint.designKey!)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-[#86868b] italic">Not uploaded yet.</p>
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
              <Badge variant="outline" className="border-[#c8c8cd] text-[#3a3a3e] font-medium rounded-lg">
                v{bp.version}
              </Badge>
              <span className="text-xs text-[#86868b]">
                {format(new Date(bp.createdAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <StatusBadge status={bp.status} />
          </div>

          {/* ── Customer Step Guide ── */}
          {canReviewBlueprint && ['uploaded', 'revision_uploaded', 'approved'].includes(bp.status) && (
            <div className="rounded-none sm:rounded-xl border border-[#e8e8ed] border-x-0 sm:border-x bg-white overflow-hidden">
              <div className="px-4 sm:px-5 py-3 bg-[#f5f5f7]/60 border-b border-[#e8e8ed]">
                <p className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider">Your Review Progress</p>
              </div>
              <div className="px-4 sm:px-5 py-4">
                <div className="flex items-center gap-0">
                  {/* Step 1 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                      bp.blueprintApproved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-[#1d1d1f] text-white'
                    }`}>
                      {bp.blueprintApproved ? <CheckCircle className="h-4 w-4" /> : '1'}
                    </div>
                    <span className={`text-xs font-medium truncate ${bp.blueprintApproved ? 'text-emerald-700' : 'text-[#1d1d1f]'}`}>Design</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#c8c8cd] flex-shrink-0 mx-1" />
                  {/* Step 2 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                      bp.costingApproved
                        ? 'bg-emerald-100 text-emerald-700'
                        : bp.blueprintApproved
                          ? 'bg-[#1d1d1f] text-white'
                          : 'bg-[#e8e8ed] text-[#86868b]'
                    }`}>
                      {bp.costingApproved ? <CheckCircle className="h-4 w-4" /> : '2'}
                    </div>
                    <span className={`text-xs font-medium truncate ${bp.costingApproved ? 'text-emerald-700' : bp.blueprintApproved ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`}>Costing</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#c8c8cd] flex-shrink-0 mx-1" />
                  {/* Step 3 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                      bp.blueprintApproved && bp.costingApproved
                        ? 'bg-[#1d1d1f] text-white animate-pulse'
                        : 'bg-[#e8e8ed] text-[#86868b]'
                    }`}>
                      3
                    </div>
                    <span className={`text-xs font-medium truncate ${bp.blueprintApproved && bp.costingApproved ? 'text-[#1d1d1f] font-semibold' : 'text-[#86868b]'}`}>Payment</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Design + Costing cards (customer sees these) + Blueprint (staff only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Design Card — shown to everyone */}
            <Card className="border-gray-100 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50/50 border-b border-gray-100 sm:rounded-t-xl px-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-[#6e6e73]" />
                  <h3 className="font-semibold text-gray-900">Design</h3>
                </div>
                {bp.blueprintApproved ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100">
                    <CheckCircle className="mr-1 h-3 w-3" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    Pending Review
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4 px-4 sm:px-6">
                <FilePreviewThumb fileKey={bp.designKey || bp.blueprintKey} label="Design Preview" />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
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
            <Card className="border-gray-100 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50/50 border-b border-gray-100 sm:rounded-t-xl px-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-[#6e6e73]" />
                  <h3 className="font-semibold text-gray-900">Costing Sheet</h3>
                </div>
                {bp.costingApproved ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100">
                    <CheckCircle className="mr-1 h-3 w-3" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    Pending Review
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4 px-4 sm:px-6">
                <FilePreviewThumb fileKey={bp.costingKey} label="Costing Sheet" />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl" onClick={() => handleViewFile(bp.costingKey)}>
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
            <div className="rounded-xl border border-[#c8c8cd]/50 p-4 bg-[#f5f5f7]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6e6e73]" />
                  <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">Technical Blueprint</p>
                  <span className="text-[10px] text-[#86868b] bg-[#f0f0f5] px-1.5 py-0.5 rounded">Fabrication only</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#1d1d1f] hover:text-[#3a3a3e] p-0 h-auto text-xs"
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
            <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50 rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-sm">
              <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-5 px-4 sm:px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-emerald-700" />
                </div>
                {project && ['payment_pending', 'in_progress', 'fabrication', 'ready_for_delivery', 'delivered', 'completed'].includes(project.status) ? (
                  /* Payment plan exists — show contract-aware CTA */
                  project.contractSignedAt ? (
                    /* Contract signed — Go to Payments */
                    <>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-semibold text-emerald-900">Contract Signed &amp; Payment Plan Ready!</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Your contract is signed. Head to Payments to view or pay.</p>
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
                        <p className="text-sm font-semibold text-emerald-900">Contract Ready for Signing</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Your contract has been generated. Please read and sign it before proceeding to payments.</p>
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
                    /* Contract not generated yet — waiting for staff */
                    <>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-semibold text-emerald-900">Payment Plan Created!</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Waiting for the contract to be generated by our team. You&apos;ll be able to sign it once ready.</p>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600 px-4">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span className="text-xs font-medium">Pending</span>
                      </div>
                    </>
                  )
                ) : (
                  /* No plan yet — show accept CTA */
                  <>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-sm font-semibold text-emerald-900">Both Design & Costing Approved!</p>
                      <p className="text-xs text-emerald-700 mt-0.5">You&apos;re all set. Accept the blueprint and choose your payment method to proceed.</p>
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 w-full sm:w-auto flex-shrink-0"
                      onClick={() => setAcceptDialog({ open: true, blueprint: bp })}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accept & Choose Payment
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Revision Notes Banner */}
          {(bp.revisionNotes || (bp.revisionRefKeys && bp.revisionRefKeys.length > 0)) && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3 text-sm text-red-800">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Revision Requested</p>
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
                      className="group relative aspect-[4/3] bg-white rounded-lg overflow-hidden border border-red-200 block"
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
            <Card className="border-gray-100 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="pb-3 bg-gray-50/50 border-b border-gray-100 sm:rounded-t-xl px-4 sm:px-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Quotation Summary</h3>
                  {bp.quotation.validityDays && (
                    <div className="flex items-center gap-1.5 text-xs text-[#86868b]">
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
                    <div className={`hidden sm:grid gap-2 px-2 pb-2 text-[10px] uppercase tracking-wider font-medium text-gray-400 border-b border-gray-100 ${!canReviewBlueprint ? 'sm:grid-cols-[1fr_50px_100px_100px_100px]' : 'sm:grid-cols-[1fr_60px_100px]'}`}>
                      <span>Item</span>
                      <span>Qty</span>
                      {!canReviewBlueprint && <span>Materials</span>}
                      {!canReviewBlueprint && <span>Labor</span>}
                      <span className="text-right">{canReviewBlueprint ? 'Amount' : 'Total'}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {bp.quotation.lineItems.map((li: { label: string; quantity: number; materials: number; labor: number; amount: number }, liIdx: number) => (
                        <div key={liIdx} className="py-2.5 px-2">
                          {/* Mobile: stacked */}
                          <div className="sm:hidden space-y-1">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium text-gray-900">{li.label}</p>
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(li.amount)}</p>
                            </div>
                            <div className="flex gap-3 text-xs text-gray-500">
                              <span>Qty: {li.quantity}</span>
                              {!canReviewBlueprint && <span>Mat: {formatCurrency(li.materials * li.quantity)}</span>}
                              {!canReviewBlueprint && <span>Lab: {formatCurrency(li.labor * li.quantity)}</span>}
                            </div>
                          </div>
                          {/* Desktop: grid */}
                          <div className={`hidden sm:grid gap-2 items-center ${!canReviewBlueprint ? 'sm:grid-cols-[1fr_50px_100px_100px_100px]' : 'sm:grid-cols-[1fr_60px_100px]'}`}>
                            <p className="text-sm text-gray-900">{li.label}</p>
                            <p className="text-sm text-gray-600">{li.quantity}</p>
                            {!canReviewBlueprint && <p className="text-sm text-gray-600">{formatCurrency(li.materials * li.quantity)}</p>}
                            {!canReviewBlueprint && <p className="text-sm text-gray-600">{formatCurrency(li.labor * li.quantity)}</p>}
                            <p className="text-sm font-semibold text-gray-900 text-right">{formatCurrency(li.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fee + Totals */}
                <div className="rounded-lg bg-gray-50/80 border border-gray-100 p-3 space-y-1.5">
                  {!canReviewBlueprint && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Materials Subtotal</span>
                        <span>{formatCurrency(bp.quotation.materials)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Labor Subtotal</span>
                        <span>{formatCurrency(bp.quotation.labor)}</span>
                      </div>
                    </>
                  )}
                  {bp.quotation.fees > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Other Fees</span>
                      <span>{formatCurrency(bp.quotation.fees)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-emerald-700 pt-1.5 border-t border-gray-200">
                    <span>Grand Total</span>
                    <span>{formatCurrency(bp.quotation.total)}</span>
                  </div>
                </div>

                {/* Duration + Validity */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                  {bp.quotation.estimatedDuration && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Duration:</span>
                      <span>{bp.quotation.estimatedDuration}</span>
                    </div>
                  )}
                </div>

                {/* Scope + Notes — staff only */}
                {!canReviewBlueprint && (bp.quotation.breakdown || bp.quotation.engineerNotes) && (
                  <div className="space-y-3 border-t border-gray-100 pt-4 mt-3">
                    {bp.quotation.breakdown && (
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-700 mb-1">Scope of Work:</p>
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

                {/* Customer sees scope of work too (if provided) */}
                {canReviewBlueprint && bp.quotation.breakdown && (
                  <div className="text-sm text-gray-600 border-t border-gray-100 pt-3 mt-3">
                    <p className="font-medium text-gray-700 mb-1">Scope of Work:</p>
                    <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
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
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              Approve {approveConfirmDialog.component === 'blueprint' ? 'Design' : 'Costing Sheet'}?
            </DialogTitle>
            <DialogDescription className="text-gray-500 pt-1">
              Please make sure you have carefully reviewed the{' '}
              <span className="font-medium text-gray-700">
                {approveConfirmDialog.component === 'blueprint' ? 'design' : 'costing sheet'}
              </span>{' '}
              before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 my-1">
            <span className="shrink-0 text-amber-500 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <p className="text-sm text-amber-800">
              Once you approve <span className="font-semibold">both</span> the design and costing sheet, you will{' '}
              <span className="font-semibold">no longer be able to request a revision</span>. This action is final.
            </p>
          </div>
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              className="border-gray-200 rounded-lg"
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
        <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Request Revision</DialogTitle>
            <DialogDescription className="text-gray-500">
              Provide detailed feedback for the engineering team regarding required changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-[13px] font-medium text-gray-700">
                Revision Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Describe the changes needed..."
                className="col-span-3 min-h-[100px] bg-gray-50/50 border-gray-200 focus:border-[#6e6e73] focus:ring-[#6e6e73]/20"
                value={revisionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRevisionNotes(e.target.value)}
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
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
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
                        (acceptDialog.blueprint.quotation.total || 0) *
                          (1 + surchargePercent / 100),
                      )}{' '}
                      <span className="text-xs font-normal text-gray-400">
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
                                <span className="shrink-0 text-[10px] font-semibold text-blue-600 bg-blue-100 rounded px-1.5 py-0.5 mt-0.5">{pct}%</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800">{stageLabel} — {formatCurrency(stageAmount)}</p>
                                  {stageDesc && <p className="text-[10px] text-gray-500">{stageDesc}</p>}
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