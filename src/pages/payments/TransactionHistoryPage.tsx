import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Receipt, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageError } from '@/components/shared/PageError';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { downloadTransactionsCsv, useTransactions } from '@/hooks/useTransactions';
import { api } from '@/lib/api';
import { TRANSACTION_METHOD_LABELS, TRANSACTION_TYPE_LABELS, formatTransactionMethod } from '@/lib/transactions';
import type { Transaction, TransactionFilters, TransactionStatus, TransactionType } from '@/lib/types';
import { cn, extractErrorMessage } from '@/lib/utils';

const PAGE_SIZE = 25;
const ALL = 'all';
const STATUS_LABELS: Record<TransactionStatus, string> = { verified: 'Verified', pending: 'Pending', rejected: 'Rejected' };
const METHOD_OPTIONS = ['cash', 'gcash', 'qrph', 'paymongo', 'bank_transfer'];

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
function formatWhen(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'MMM d, yyyy · h:mm a');
}

function RecordLink({ row }: { row: Transaction }) {
  if (row.projectId) {
    return <Link to={`/projects/${row.projectId}`} className="font-mono text-xs underline underline-offset-4">{row.projectNumber || 'Project'}</Link>;
  }
  if (row.appointmentId) {
    return <Link to={`/appointments/${row.appointmentId}`} className="font-mono text-xs underline underline-offset-4">{row.appointmentNumber || 'Appointment'}</Link>;
  }
  return <span className="text-xs text-slate-500">—</span>;
}

async function openReceipt(paymentId: string) {
  try {
    const { data } = await api.get(`/payments/${paymentId}/receipt-url`);
    window.open(data.data.url, '_blank', 'noopener');
  } catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to get receipt'));
  }
}

function ReceiptButton({ row }: { row: Transaction }) {
  if (!row.hasReceipt) return <span className="text-xs text-slate-500">—</span>;
  return (
    <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => openReceipt(row._id)}>
      <FileText className="mr-1 h-3.5 w-3.5" /> Receipt
    </Button>
  );
}

/** Admin/Cashier: every payment transaction with filters, totals and CSV export. */
export function TransactionHistoryPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [type, setType] = useState<TransactionType | typeof ALL>(ALL);
  const [method, setMethod] = useState(ALL);
  const [status, setStatus] = useState<TransactionStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Wait for the user to stop typing before searching.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo<TransactionFilters>(() => ({
    search, dateFrom, dateTo, type, method, status, page, limit: PAGE_SIZE,
  }), [search, dateFrom, dateTo, type, method, status, page]);

  const { data, isLoading, isError, refetch, isFetching } = useTransactions(filters);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const summary = data?.summary;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const hasFilters = Boolean(searchInput || dateFrom || dateTo) || type !== ALL || method !== ALL || status !== ALL;

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadTransactionsCsv(filters);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to export transactions'));
    } finally {
      setExporting(false);
    }
  };

  if (isError) return <PageError message="Failed to load transactions" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#171b21] dark:text-slate-100">
            <Receipt className="h-6 w-6" /> Transaction History
          </h1>
          <p className="mt-1 text-sm text-[#616a74] dark:text-slate-400">
            Every customer payment: project stages, design and revision fees, and ocular fees.
          </p>
        </div>
        <Button variant="outline" className="rounded-lg" onClick={handleExport} disabled={exporting || total === 0}>
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Verified', value: summary ? money(summary.verifiedTotal) : '—', tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Pending Verification', value: summary ? money(summary.pendingTotal) : '—', tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Rejected', value: summary ? String(summary.rejectedCount) : '—', tone: 'text-red-600 dark:text-red-400' },
        ].map((card) => (
          <Card key={card.label} className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className={cn('mt-1 text-xl font-bold', card.tone)}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {summary && summary.byMethod.length > 0 && (
        <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">
          Verified by method: {summary.byMethod.map((entry) => `${formatTransactionMethod(entry.method)} ${money(entry.amount)}`).join(' · ')}
        </p>
      )}

      <Card className="rounded-2xl">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="transaction-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="transaction-search" className="pl-9" placeholder="Customer, PRJ/APT, receipt or reference no."
                value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => changeFilter(() => setType(value as TransactionType | typeof ALL))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(value) => changeFilter(() => setMethod(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All methods</SelectItem>
                {METHOD_OPTIONS.map((value) => <SelectItem key={value} value={value}>{TRANSACTION_METHOD_LABELS[value]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => changeFilter(() => setStatus(value as TransactionStatus | typeof ALL))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1 lg:grid-cols-1">
            <div className="space-y-1.5">
              <Label htmlFor="transaction-date-from">From</Label>
              <Input id="transaction-date-from" type="date" value={dateFrom} max={dateTo || undefined}
                onChange={(event) => changeFilter(() => setDateFrom(event.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transaction-date-to">To</Label>
              <Input id="transaction-date-to" type="date" value={dateTo} min={dateFrom || undefined}
                onChange={(event) => changeFilter(() => setDateTo(event.target.value))} />
            </div>
          </div>
          {hasFilters && (
            <div className="sm:col-span-2 lg:col-span-6">
              <Button variant="ghost" size="sm" onClick={() => changeFilter(() => {
                setSearchInput(''); setSearch(''); setDateFrom(''); setDateTo(''); setType(ALL); setMethod(ALL); setStatus(ALL);
              })}>
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-10 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No transactions match these filters.</p>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className={cn('divide-y divide-[color:var(--color-border)] md:hidden', isFetching && 'opacity-60')}>
                {items.map((row) => (
                  <div key={row._id} className="space-y-1.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.customerName}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.description}</p>
                      </div>
                      <StatusBadge status={row.status} label={STATUS_LABELS[row.status]} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="text-sm font-bold text-[var(--color-card-foreground)]">{money(row.amount)}</span>
                      <span>{formatTransactionMethod(row.method)}</span>
                      <span>{formatWhen(row.date)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <RecordLink row={row} />
                      {row.receiptNumber && <span className="font-mono text-xs">{row.receiptNumber}</span>}
                      <ReceiptButton row={row} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project / Appointment</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Handled By</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={cn(isFetching && 'opacity-60')}>
                    {items.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{formatWhen(row.date)}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{row.receiptNumber || '—'}</TableCell>
                        <TableCell className="text-sm">{row.customerName}</TableCell>
                        <TableCell><RecordLink row={row} /></TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="text-sm font-medium">{TRANSACTION_TYPE_LABELS[row.type]}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={row.description}>{row.description}</p>
                          {row.referenceNumber && <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Ref: {row.referenceNumber}</p>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatTransactionMethod(row.method)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm font-semibold">{money(row.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} label={STATUS_LABELS[row.status]} />
                          {row.status === 'rejected' && row.rejectionReason && (
                            <p className="mt-1 max-w-[180px] text-[11px] text-red-600 dark:text-red-400">{row.rejectionReason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.handledBy ? (
                            <>
                              <p className="text-sm">{row.handledBy}</p>
                              <p className="text-slate-500 dark:text-slate-400">{formatWhen(row.handledAt)}</p>
                            </>
                          ) : '—'}
                        </TableCell>
                        <TableCell><ReceiptButton row={row} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span>{total} {total === 1 ? 'transaction' : 'transactions'}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>Page {page} of {lastPage}</span>
          <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
