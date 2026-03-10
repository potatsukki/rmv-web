import { useState, useEffect, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { CreditCard, AlertTriangle, MapPin, QrCode, Zap, Banknote, Download, ScrollText, PenTool, Receipt, Search, Calendar, Hash, Tag, AlertCircle, Clock, Lock, ArrowLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { extractErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProjects } from '@/hooks/useProjects';
import {
  usePaymentPlan,
  usePaymentsByProject,
  useStageCheckout,
  useSimulateStagePayment,
  useRecordCashPayment,
  useMyPaymentHistory,
  type PaymentHistoryItem,
} from '@/hooks/usePayments';
import { useAuthStore } from '@/stores/auth.store';
import { Role, PaymentStageStatus } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUnpaidOcularFees } from '@/hooks/useAppointments';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

const historyStatusConfig: Record<string, { label: string; className: string }> = {
  verified: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  proof_submitted: { label: 'Awaiting Verification', className: 'bg-blue-100 text-blue-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
};

export function PaymentsPage() {
  const { user } = useAuthStore();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');


  const { data: projects } = useProjects();
  const { data: plan, isLoading: planLoading } = usePaymentPlan(selectedProjectId);
  const { data: payments } = usePaymentsByProject(selectedProjectId);
  const stageCheckout = useStageCheckout();
  const simulatePayment = useSimulateStagePayment();
  const recordCash = useRecordCashPayment();

  const [searchParams, setSearchParams] = useSearchParams();

  const [cashDialog, setCashDialog] = useState<{ open: boolean; stageId: string; amount: number }>({
    open: false,
    stageId: '',
    amount: 0,
  });
  const [cashAmount, setCashAmount] = useState('');

  const location = useLocation();
  const isCustomer = user?.roles.includes(Role.CUSTOMER);
  const isCashier = user?.roles.some((r: string) => [Role.CASHIER, Role.ADMIN].includes(r as Role));
  const { data: unpaidOcularFees } = useUnpaidOcularFees();
  const actionableOcularFees = useMemo(
    () => (unpaidOcularFees ?? []).filter((appt) => (appt.ocularFee ?? 0) > 0),
    [unpaidOcularFees],
  );

  // Unified cross-project payment history (customer only)
  const { data: allHistory, isLoading: historyLoading } = useMyPaymentHistory();
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryPayment, setSelectedHistoryPayment] = useState<PaymentHistoryItem | null>(null);

  const filteredHistory = useMemo(() => {
    if (!allHistory) return [];
    if (!historySearch.trim()) return allHistory;
    const query = historySearch.toLowerCase();
    return allHistory.filter((item) => {
      const searchStr = `${item.description} ${item.amount} ${item.status} ${item.method || ''} ${item.receiptNumber || ''} ${format(new Date(item.date), 'MMM d, yyyy h:mm a')}`.toLowerCase();
      return searchStr.includes(query);
    });
  }, [allHistory, historySearch]);

  // Auto-select project only from navigation state (e.g. "Go to Payments" button)
  useEffect(() => {
    if (selectedProjectId) return;
    const stateProjectId = (location.state as { projectId?: string })?.projectId;
    if (stateProjectId) {
      setSelectedProjectId(stateProjectId);
    }
  }, [projects, selectedProjectId, location.state]);

  // Detect ?paid=1 redirect from PayMongo checkout
  useEffect(() => {
    if (searchParams.get('paid') === '1') {
      toast.success(
        'Payment received! The cashier will verify it shortly. Your payment status will update automatically.',
        { duration: 6000 },
      );
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('cancelled') === '1') {
      toast('Payment was cancelled. You can try again anytime.', { icon: '↩️', duration: 4000 });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Filtered project list for table view
  const filteredProjects = useMemo(() => {
    if (!projects?.items) return [];
    let items = projects.items;
    if (statusFilter !== 'all') {
      items = items.filter((p) => String(p.status) === statusFilter);
    }
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      items = items.filter((p) =>
        String(p.title).toLowerCase().includes(q) ||
        String(p.serviceType || '').toLowerCase().includes(q) ||
        String(p.siteAddress || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [projects, statusFilter, projectSearch]);

  // Unique statuses for filter dropdown
  const projectStatuses = useMemo(() => {
    if (!projects?.items) return [];
    return [...new Set(projects.items.map((p) => String(p.status)))];
  }, [projects]);

  const selectedProject = projects?.items?.find(
    (p) => String(p._id) === selectedProjectId,
  );
  const contractSigned = !!selectedProject?.contractSignedAt;

  const handleQrCheckout = async (stageId: string) => {
    try {
      const result = await stageCheckout.mutateAsync(stageId);
      window.open(result.checkoutUrl, '_blank');
      toast.success(
        'QR checkout opened in a new tab. Complete payment there — this page will update automatically once verified.',
        { duration: 6000 },
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create checkout session'));
    }
  };

  const handleSimulate = async (stageId: string) => {
    try {
      await simulatePayment.mutateAsync(stageId);
      toast.success('Payment simulated — awaiting cashier verification');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Simulation failed'));
    }
  };

  const handleRecordCash = async () => {
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      const result = await recordCash.mutateAsync({
        stageId: cashDialog.stageId,
        amountPaid: amount,
      });
      toast.success(`Cash recorded! Receipt: ${result.receiptNumber}`);
      setCashDialog({ open: false, stageId: '', amount: 0 });
      setCashAmount('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to record cash payment'));
    }
  };

  return (
    <div className="space-y-5">
      {/* ═══════════════════════════════════════════════════════
          LEVEL 1 — PROJECT LIST VIEW (no project selected)
          ═══════════════════════════════════════════════════════ */}
      {!selectedProjectId ? (
        <>
          <div className="rounded-2xl border border-[#d9d9e0] bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(245,245,248,0.92)_100%)] p-5 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Payments</h1>
            <p className="mt-1 text-sm text-[#6e6e73]">
              {isCustomer ? 'Select a project to manage payments' : 'View payment details by project'}
            </p>
          </div>

          {/* Unpaid Ocular Fees */}
          {isCustomer && actionableOcularFees.length > 0 && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-amber-200 bg-amber-50/50 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Unpaid Ocular Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                <p className="text-xs text-amber-700">
                  Pay before your appointment can be confirmed.
                </p>
                {actionableOcularFees.map((appt) => (
                  <div
                    key={String(appt._id)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1d1d1f] truncate">
                        {format(new Date(appt.date), 'MMM d, yyyy')}
                      </p>
                      {appt.address && (
                        <p className="flex items-center gap-1 text-xs text-[#6e6e73] truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {appt.address}
                        </p>
                      )}
                      <p className="text-base font-bold text-[#1d1d1f] mt-0.5">
                        {formatCurrency(appt.ocularFee ?? 0)}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-lg shrink-0"
                    >
                      <Link to={`/appointments/${appt._id}/pay-ocular-fee`}>
                        Pay Now
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Projects Table ── */}
          <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50 overflow-hidden">
            {/* Search + Filter bar */}
            <div className="px-4 pb-3 pt-4 sm:px-6">
              <CollectionToolbar
                title="Find a payment-ready project"
                description="Search by project details, then narrow the list by project stage before opening the payment view."
                searchPlaceholder="Search projects"
                searchValue={projectSearch}
                onSearchChange={setProjectSearch}
                filters={[
                  { value: 'all', label: 'All Statuses' },
                  ...projectStatuses.map((status) => ({
                    value: status,
                    label: status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
                  })),
                ]}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
                className="border-0 bg-transparent p-0 shadow-none"
                searchWidthClassName="lg:max-w-sm"
              />
            </div>

            {/* Desktop table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_140px_140px_32px] gap-3 px-6 pb-2 text-xs font-medium text-[#86868b] uppercase tracking-wider border-b border-[#e8e8ed]">
              <span>Project</span>
              <span>Service</span>
              <span className="text-center">Status</span>
              <span />
            </div>

            {/* Table body */}
            <div className="divide-y divide-[#e8e8ed]">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p) => (
                  <button
                    key={String(p._id)}
                    type="button"
                    onClick={() => setSelectedProjectId(String(p._id))}
                    className="w-full text-left px-4 sm:px-6 py-3.5 transition-colors hover:bg-[#f5f5f7]/80 group"
                  >
                    {/* Mobile row */}
                    <div className="sm:hidden flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1d1d1f] truncate">{String(p.title)}</p>
                        <p className="text-xs text-[#86868b] capitalize truncate mt-0.5">
                          {String(p.serviceType || '').replace(/_/g, ' ')}
                        </p>
                      </div>
                      <StatusBadge status={String(p.status)} />
                      <ChevronRight className="h-4 w-4 text-[#c8c8cd] shrink-0 group-hover:text-[#86868b] transition-colors" />
                    </div>
                    {/* Desktop row */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_140px_140px_32px] gap-3 items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1d1d1f] truncate group-hover:text-[#3a3a3e]">{String(p.title)}</p>
                        {p.siteAddress && (
                          <p className="text-xs text-[#86868b] truncate mt-0.5">
                            <MapPin className="inline h-3 w-3 mr-1" />
                            {String(p.siteAddress)}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-[#6e6e73] capitalize truncate">
                        {String(p.serviceType || '').replace(/_/g, ' ')}
                      </p>
                      <div className="flex justify-center">
                        <StatusBadge status={String(p.status)} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#c8c8cd] group-hover:text-[#86868b] transition-colors" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4">
                  <EmptyState
                    icon={<CreditCard className="h-6 w-6" />}
                    title={projectSearch || statusFilter !== 'all' ? 'No matching projects' : 'No projects found'}
                    description={projectSearch || statusFilter !== 'all'
                      ? 'Try adjusting the search terms or status filter.'
                      : 'Projects with payment plans will appear here once payment-ready work is created.'}
                    className="border-0 bg-transparent py-10 shadow-none"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* ── Unified Payment History (Customer only, on list view) ── */}
          {isCustomer && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base text-[#1d1d1f]">
                  <Receipt className="h-4 w-4 text-[#6e6e73]" />
                  All Payments
                </CardTitle>
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#86868b]" />
                  <Input
                    placeholder="Search payments..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-8 h-8 bg-[#f5f5f7]/50 border-[#d2d2d7] text-xs rounded-lg"
                  />
                </div>
              </CardHeader>

              {/* Desktop header */}
              {!historyLoading && filteredHistory.length > 0 && (
                <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px] gap-3 px-6 pb-2 text-xs font-medium text-[#86868b] uppercase tracking-wider border-b border-[#e8e8ed]">
                  <span>Description</span>
                  <span className="text-right">Amount</span>
                  <span className="text-center">Status</span>
                </div>
              )}

              <CardContent className="p-0">
                {historyLoading && (
                  <div className="divide-y divide-[#e8e8ed]">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-4 sm:px-6 py-3">
                        <Skeleton className="h-10 w-full rounded-lg" />
                      </div>
                    ))}
                  </div>
                )}

                {!historyLoading && filteredHistory.length === 0 && (
                  <div className="p-4">
                    <EmptyState
                      icon={<Receipt className="h-6 w-6" />}
                      title={historySearch ? 'No results found' : 'No payments yet'}
                      description={historySearch
                        ? 'Try adjusting the keywords used in your payment history search.'
                        : 'Your payment history will appear here after your first verified payment.'}
                      className="border-0 bg-transparent py-10 shadow-none"
                    />
                  </div>
                )}

                {!historyLoading && filteredHistory.length > 0 && (
                  <div className="divide-y divide-[#e8e8ed]">
                    {filteredHistory.map((item) => {
                      const cfg = historyStatusConfig[item.status] ?? {
                        label: item.status,
                        className: 'bg-gray-100 text-gray-700',
                      };
                      const isOcular = item.type === 'ocular_fee';

                      return (
                        <button
                          type="button"
                          key={item._id}
                          onClick={() => setSelectedHistoryPayment(item)}
                          className="w-full text-left px-4 sm:px-6 py-3 transition-colors hover:bg-[#f5f5f7]/80 group"
                        >
                          {/* Mobile */}
                          <div className="sm:hidden flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                isOcular ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              {isOcular ? <MapPin className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#1d1d1f] truncate">{item.description}</p>
                              <p className="text-xs text-[#86868b]">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-sm font-bold text-[#1d1d1f]">{formatCurrency(item.amount)}</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                          {/* Desktop */}
                          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px] gap-3 items-center">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                  isOcular ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                }`}
                              >
                                {isOcular ? <MapPin className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#1d1d1f] truncate">{item.description}</p>
                                <p className="text-xs text-[#86868b]">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-[#1d1d1f] text-right">{formatCurrency(item.amount)}</span>
                            <div className="flex justify-center">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════
           LEVEL 2 — PROJECT DETAIL VIEW (project selected)
           ═══════════════════════════════════════════════════════ */
        <>
          {/* Header with back button */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg shrink-0"
              onClick={() => setSelectedProjectId('')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f] truncate">
                {selectedProject ? String(selectedProject.title) : 'Payments'}
              </h1>
              <p className="text-[#6e6e73] text-xs capitalize">
                {selectedProject?.serviceType
                  ? String(selectedProject.serviceType).replace(/_/g, ' ')
                  : isCustomer ? 'Submit and track your payments' : 'View payment details'}
              </p>
            </div>
            {selectedProject && <StatusBadge status={String(selectedProject.status)} />}
          </div>

          {/* Detail content */}
          {planLoading ? (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
          <CardContent className="p-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : !plan ? (
        <EmptyState
          icon={<CreditCard className="h-16 w-16" />}
          title="No payment plan"
          description="A payment plan hasn't been created for this project yet."
        />
      ) : isCustomer && !contractSigned ? (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50">
          <CardContent className="flex flex-col items-center text-center py-10 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f5f7] mb-4">
              <PenTool className="h-6 w-6 text-[#6e6e73]" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-1">Sign Your Contract First</h3>
            <p className="text-sm text-[#6e6e73] max-w-xs mb-5">
              You must review and e-sign the project contract before making any payments.
            </p>
            <Button
              asChild
              className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white rounded-xl px-6"
            >
              <Link to={`/projects/${selectedProjectId}`}>
                <ScrollText className="mr-1.5 h-4 w-4" />
                Go to Project &amp; Sign Contract
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Payment Status Banner ── */}
          {plan && (() => {
            const awaitingCount = plan.stages.filter(s => s.status === 'proof_submitted').length;
            const verifiedCount = plan.stages.filter(s => s.status === PaymentStageStatus.VERIFIED).length;
            const allVerified = verifiedCount === plan.stages.length;
            if (allVerified) return (
              <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-emerald-200 bg-emerald-50/50">
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  <CreditCard className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">All Payments Complete</p>
                    <p className="text-xs text-emerald-700 mt-0.5">All payment stages have been verified. Your project is fully paid.</p>
                  </div>
                </CardContent>
              </Card>
            );
            if (awaitingCount > 0) return (
              <Card className="rounded-none sm:rounded-xl -mx-3 sm:mx-0 border-x-0 sm:border-x border-blue-200 bg-blue-50/50">
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">Payment Awaiting Verification</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      {isCashier
                        ? `${awaitingCount} payment${awaitingCount > 1 ? 's' : ''} need${awaitingCount === 1 ? 's' : ''} your verification.`
                        : `${awaitingCount} payment${awaitingCount > 1 ? 's' : ''} received and awaiting cashier verification. This page updates automatically.`}
                    </p>
                  </div>
                  {isCashier && (
                    <Button
                      size="sm"
                      asChild
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs shrink-0"
                    >
                      <Link to="/cashier-queue">
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Go to Cashier Queue
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
            return null;
          })()}

          {/* ── Payment Plan (Table-style) ── */}
          <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50 overflow-hidden">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base text-[#1d1d1f]">Payment Plan</CardTitle>
            </CardHeader>

            {/* Desktop table header */}
            <div className="hidden sm:grid sm:grid-cols-[2fr_minmax(100px,1fr)_100px_minmax(140px,auto)] gap-3 px-6 pb-2 text-xs font-medium text-[#86868b] uppercase tracking-wider border-b border-[#e8e8ed]">
              <span>Stage</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Status</span>
              <span className="text-right">Actions</span>
            </div>

            <CardContent className="p-0">
              <div className="divide-y divide-[#e8e8ed]">
                {plan.stages.map((stage) => {
                  const isActivated = !!stage.activatedAt;
                  const isVerified = stage.status === PaymentStageStatus.VERIFIED;
                  const isProofSubmitted = stage.status === 'proof_submitted';
                  const isNotYetDue = !isActivated && !isVerified && !isProofSubmitted;
                  const isHeadsUp = !isActivated && !!stage.headsUpSentAt && !isVerified;
                  const daysSinceActivation = isActivated
                    ? differenceInDays(new Date(), new Date(stage.activatedAt!))
                    : 0;
                  const isOverdue = isActivated && daysSinceActivation >= 3 &&
                    (stage.status === PaymentStageStatus.PENDING || stage.status === PaymentStageStatus.DECLINED);
                  const canPay = !isVerified && !isProofSubmitted;
                  const isEarlyPay = canPay && !isActivated;

                  /* Timing badge */
                  const timingBadge = isOverdue ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      <AlertTriangle className="h-3 w-3" /> Overdue ({daysSinceActivation}d)
                    </span>
                  ) : isActivated && !isVerified && !isProofSubmitted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      <AlertCircle className="h-3 w-3" /> Due Now
                    </span>
                  ) : isHeadsUp ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                      <Clock className="h-3 w-3" /> Coming Soon
                    </span>
                  ) : isNotYetDue ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      <Lock className="h-3 w-3" /> Not Yet Due
                    </span>
                  ) : null;

                  /* Action buttons */
                  const showPayButtons = isCustomer && canPay &&
                    (stage.status === PaymentStageStatus.PENDING || stage.status === PaymentStageStatus.DECLINED);
                  const isDeclined = stage.status === PaymentStageStatus.DECLINED;

                  // Find latest decline reason for this stage
                  const declineReason = isDeclined
                    ? payments?.filter(p => p.stageId === stage.stageId && p.status === 'declined')
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.declineReason
                    : undefined;

                  // Remaining balance for partial payments
                  const hasPartialPayment = !isVerified && (stage.amountPaid ?? 0) > 0 && (stage.remainingBalance ?? 0) > 0;

                  return (
                    <div
                      key={String(stage.stageId)}
                      className={`px-4 sm:px-6 py-3.5 transition-colors ${
                        isOverdue ? 'bg-red-50/40' : 'hover:bg-[#f5f5f7]/60'
                      }`}
                    >
                      {/* ─── Mobile layout ─── */}
                      <div className="sm:hidden space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#1d1d1f]">{String(stage.label)}</p>
                            {(stage as any).description && (
                              <p className="text-xs text-[#86868b] mt-0.5">{(stage as any).description}</p>
                            )}
                          </div>
                          <StatusBadge status={String(stage.status)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#1d1d1f]">{formatCurrency(Number(stage.amount))}</p>
                            <span className="text-xs text-[#86868b]">{String(stage.percentage)}%</span>
                          </div>
                          {timingBadge}
                        </div>
                        {isNotYetDue && (
                          <p className="text-xs text-[#86868b]">
                            {isHeadsUp ? 'Payment will be due when fabrication advances.' : 'Waiting for fabrication milestone.'}
                          </p>
                        )}
                        {isDeclined && declineReason && (
                          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                            <p className="text-xs font-medium text-red-700">Declined: {declineReason}</p>
                            <p className="text-xs text-red-600 mt-0.5">Please pay again via QR.</p>
                          </div>
                        )}
                        {hasPartialPayment && (
                          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                            <p className="text-xs font-medium text-amber-700">
                              {formatCurrency(stage.remainingBalance!)} remaining after partial payment of {formatCurrency(stage.amountPaid!)}
                            </p>
                          </div>
                        )}
                        {showPayButtons && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              className={isEarlyPay
                                ? 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs h-8'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs h-8'}
                              onClick={() => handleQrCheckout(String(stage.stageId))}
                              disabled={stageCheckout.isPending}
                            >
                              <QrCode className="mr-1 h-3.5 w-3.5" />
                              {isEarlyPay ? 'Pay Early via QR' : 'Pay via QR'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[#1d1d1f] hover:text-[#3a3a3e] rounded-lg text-xs h-8"
                              onClick={() => handleSimulate(String(stage.stageId))}
                              disabled={simulatePayment.isPending}
                              title="Simulate payment (testing)"
                            >
                              <Zap className="mr-1 h-3.5 w-3.5" /> Simulate
                            </Button>
                          </div>
                        )}
                        {isCashier && canPay && (stage.status === PaymentStageStatus.PENDING || stage.status === PaymentStageStatus.DECLINED) && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs h-8"
                              onClick={() =>
                                setCashDialog({
                                  open: true,
                                  stageId: String(stage.stageId),
                                  amount: Number(stage.amount),
                                })
                              }
                            >
                              <Banknote className="mr-1 h-3.5 w-3.5" /> Record Cash
                            </Button>
                          </div>
                        )}
                        {isCashier && isProofSubmitted && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              asChild
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-8"
                            >
                              <Link to="/cashier-queue">
                                <CheckCircle className="mr-1 h-3.5 w-3.5" /> Verify in Cashier Queue
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* ─── Desktop layout (table row) ─── */}
                      <div className="hidden sm:grid sm:grid-cols-[2fr_minmax(100px,1fr)_100px_minmax(140px,auto)] gap-3 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#1d1d1f] truncate">{String(stage.label)}</p>
                            {timingBadge}
                          </div>
                          {(stage as any).description && (
                            <p className="text-xs text-[#86868b] mt-0.5 truncate">{(stage as any).description}</p>
                          )}
                          <p className="text-xs text-[#86868b]">{String(stage.percentage)}%</p>
                          {isDeclined && declineReason && (
                            <p className="text-xs text-red-600 mt-1 truncate" title={declineReason}>
                              Declined: {declineReason}
                            </p>
                          )}
                          {hasPartialPayment && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              {formatCurrency(stage.remainingBalance!)} remaining
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#1d1d1f] text-right">{formatCurrency(Number(stage.amount))}</p>
                        <div className="flex justify-center">
                          <StatusBadge status={String(stage.status)} />
                        </div>
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          {showPayButtons && (
                            <>
                              <Button
                                size="sm"
                                className={isEarlyPay
                                  ? 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs h-7 px-2'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs h-7 px-2'}
                                onClick={() => handleQrCheckout(String(stage.stageId))}
                                disabled={stageCheckout.isPending}
                              >
                                <QrCode className="mr-1 h-3 w-3" />
                                {isEarlyPay ? 'Early QR' : 'Pay QR'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[#1d1d1f] hover:text-[#3a3a3e] rounded-lg text-xs h-7 px-2"
                                onClick={() => handleSimulate(String(stage.stageId))}
                                disabled={simulatePayment.isPending}
                                title="Simulate payment (testing)"
                              >
                                <Zap className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {isCashier && canPay && (stage.status === PaymentStageStatus.PENDING || stage.status === PaymentStageStatus.DECLINED) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs h-7 px-2"
                              onClick={() =>
                                setCashDialog({
                                  open: true,
                                  stageId: String(stage.stageId),
                                  amount: Number(stage.amount),
                                })
                              }
                            >
                              <Banknote className="mr-1 h-3 w-3" /> Cash
                            </Button>
                          )}
                          {isCashier && isProofSubmitted && (
                            <Button
                              size="sm"
                              asChild
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-7 px-2"
                            >
                              <Link to="/cashier-queue">
                                <CheckCircle className="mr-1 h-3 w-3" /> Verify
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Per-project Payment History (Table-style) ── */}
          {payments && payments.length > 0 && (
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-[#c8c8cd]/50 overflow-hidden">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base text-[#1d1d1f]">Payment History</CardTitle>
              </CardHeader>

              {/* Desktop header */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_auto] gap-3 px-6 pb-2 text-xs font-medium text-[#86868b] uppercase tracking-wider border-b border-[#e8e8ed]">
                <span>Details</span>
                <span className="text-right">Amount</span>
                <span className="text-center">Status</span>
                <span className="text-right">Actions</span>
              </div>

              <CardContent className="p-0">
                <div className="divide-y divide-[#e8e8ed]">
                  {payments.map((p) => (
                    <div key={String(p._id)} className="px-4 sm:px-6 py-3 hover:bg-[#f5f5f7]/60 transition-colors">
                      {/* Mobile */}
                      <div className="sm:hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#1d1d1f]">{formatCurrency(Number(p.amountPaid))}</p>
                            <p className="text-xs text-[#6e6e73] capitalize mt-0.5">
                              {String(p.method || '').replace('_', ' ')}
                              {p.receiptNumber && ` · ${String(p.receiptNumber)}`}
                            </p>
                            {p.referenceNumber && (
                              <p className="text-xs text-[#86868b] font-mono mt-0.5">Ref: {String(p.referenceNumber)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={String(p.status)} />
                            {p.status === 'verified' && p.receiptKey && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={async () => {
                                  try {
                                    const { data } = await api.get(`/payments/${p._id}/receipt-url`);
                                    window.open(data.data.url, '_blank');
                                  } catch (err) {
                                    toast.error(extractErrorMessage(err, 'Failed to get receipt'));
                                  }
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[#86868b] mt-1">
                          {p.createdAt ? format(new Date(String(p.createdAt)), 'MMM d, yyyy') : ''}
                        </p>
                        {p.declineReason && (
                          <p className="text-xs text-red-500 mt-1">Declined: {String(p.declineReason)}</p>
                        )}
                      </div>
                      {/* Desktop */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_auto] gap-3 items-center">
                        <div className="min-w-0">
                          <p className="text-sm text-[#1d1d1f] capitalize truncate">
                            {String(p.method || '').replace('_', ' ')}
                            {p.receiptNumber && ` · ${String(p.receiptNumber)}`}
                          </p>
                          <p className="text-xs text-[#86868b]">
                            {p.createdAt ? format(new Date(String(p.createdAt)), 'MMM d, yyyy') : ''}
                            {p.referenceNumber && ` · Ref: ${String(p.referenceNumber)}`}
                          </p>
                          {p.declineReason && (
                            <p className="text-xs text-red-500 mt-0.5">Declined: {String(p.declineReason)}</p>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#1d1d1f] text-right">{formatCurrency(Number(p.amountPaid))}</p>
                        <div className="flex justify-center">
                          <StatusBadge status={String(p.status)} />
                        </div>
                        <div className="flex justify-end">
                          {p.status === 'verified' && p.receiptKey && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[#1d1d1f] hover:text-[#3a3a3e] h-7 px-2 text-xs"
                              onClick={async () => {
                                try {
                                  const { data } = await api.get(`/payments/${p._id}/receipt-url`);
                                  window.open(data.data.url, '_blank');
                                } catch (err) {
                                  toast.error(extractErrorMessage(err, 'Failed to get receipt'));
                                }
                              }}
                            >
                              <Download className="mr-1 h-3 w-3" /> Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
        </>
      )}

      {/* Cash Recording Dialog (Cashier) */}
      <Dialog
        open={cashDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCashDialog({ open: false, stageId: '', amount: 0 });
            setCashAmount('');
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Record Cash Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#3a3a3e] text-[13px] font-medium">Amount Due</Label>
              <p className="text-lg font-bold text-emerald-700">
                {formatCurrency(cashDialog.amount)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#3a3a3e] text-[13px] font-medium">Amount Received</Label>
              <Input
                type="number"
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0.00"
                className="h-11 bg-[#f5f5f7]/50 border-[#d2d2d7] focus:border-emerald-300 focus:ring-emerald-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#d2d2d7] rounded-lg"
              onClick={() => {
                setCashDialog({ open: false, stageId: '', amount: 0 });
                setCashAmount('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              onClick={handleRecordCash}
              disabled={recordCash.isPending}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Detail Modal */}
      <Dialog
        open={!!selectedHistoryPayment}
        onOpenChange={(open) => !open && setSelectedHistoryPayment(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1d1d1f]">Payment Details</DialogTitle>
          </DialogHeader>

          {selectedHistoryPayment && (
            <div className="space-y-6 mt-2">
              {/* Amount & Status */}
              <div className="flex flex-col items-center justify-center p-6 bg-[#f5f5f7] rounded-xl border border-[#c8c8cd]/50">
                <span className="text-sm text-[#86868b] font-medium mb-1">Amount</span>
                <span className="text-3xl font-bold text-[#1d1d1f] mb-3">
                  {formatCurrency(selectedHistoryPayment.amount)}
                </span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
                    historyStatusConfig[selectedHistoryPayment.status]?.className || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {historyStatusConfig[selectedHistoryPayment.status]?.label || selectedHistoryPayment.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-4 px-1">
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-[#86868b] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#86868b] font-medium">Description</p>
                    <p className="text-sm font-medium text-[#1d1d1f] mt-0.5">{selectedHistoryPayment.description}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-[#86868b] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#86868b] font-medium">Date & Time</p>
                    <p className="text-sm font-medium text-[#1d1d1f] mt-0.5">
                      {format(new Date(selectedHistoryPayment.date), 'MMMM d, yyyy')} at{' '}
                      {format(new Date(selectedHistoryPayment.date), 'h:mm a')}
                    </p>
                  </div>
                </div>

                {selectedHistoryPayment.method && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-[#86868b] mt-0.5" />
                    <div>
                      <p className="text-xs text-[#86868b] font-medium">Payment Method</p>
                      <p className="text-sm font-medium text-[#1d1d1f] mt-0.5 capitalize">
                        {selectedHistoryPayment.method.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}

                {selectedHistoryPayment.receiptNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 text-[#86868b] mt-0.5" />
                    <div>
                      <p className="text-xs text-[#86868b] font-medium">Receipt Number</p>
                      <p className="text-sm font-medium text-[#1d1d1f] mt-0.5">{selectedHistoryPayment.receiptNumber}</p>
                    </div>
                  </div>
                )}

                {selectedHistoryPayment.status === 'declined' && selectedHistoryPayment.declineReason && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100 mt-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-600 font-semibold">Decline Reason</p>
                      <p className="text-sm font-medium text-red-700 mt-0.5">{selectedHistoryPayment.declineReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
