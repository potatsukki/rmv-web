import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageError } from '@/components/shared/PageError';
import { useAuditLogs, type AuditLogFilters } from '@/hooks/useReports';
import { AUDIT_ACTION_MAP, describeAuditDetails, getAuditDisplay, getAuditNavPath } from '@/lib/audit-actions';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
const ALL = 'all';

const RECORD_TYPES: { value: string; label: string }[] = [
  { value: 'appointment', label: 'Appointments' },
  { value: 'visit_report', label: 'Visit reports' },
  { value: 'project', label: 'Projects' },
  { value: 'blueprint', label: 'Blueprints' },
  { value: 'payment', label: 'Payments' },
  { value: 'user', label: 'Users' },
];

const ACTION_OPTIONS = Object.entries(AUDIT_ACTION_MAP)
  .map(([value, display]) => ({ value, label: display.label }))
  .sort((a, b) => a.label.localeCompare(b.label));

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'MMM d, yyyy · h:mm a');
}

/** Admin Activity Log: every recorded user and system action, with filters. */
export function ActivityLogPage() {
  const [action, setAction] = useState(ALL);
  const [targetType, setTargetType] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo<AuditLogFilters>(() => ({
    limit: PAGE_SIZE,
    page,
    ...(action !== ALL ? { action } : {}),
    ...(targetType !== ALL ? { targetType } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }), [action, targetType, dateFrom, dateTo, page]);

  const { data, isLoading, isError, refetch, isFetching } = useAuditLogs(filters);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const hasFilters = action !== ALL || targetType !== ALL || Boolean(dateFrom) || Boolean(dateTo);

  if (isError) return <PageError message="Failed to load the activity log" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#171b21] dark:text-slate-100">
          <History className="h-6 w-6" /> Activity Log
        </h1>
        <p className="mt-1 text-sm text-[#616a74] dark:text-slate-400">
          Every recorded action in the system: what happened, who did it, and when.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Action</Label>
            <Select value={action} onValueChange={(value) => changeFilter(() => setAction(value))}>
              <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Record</Label>
            <Select value={targetType} onValueChange={(value) => changeFilter(() => setTargetType(value))}>
              <SelectTrigger><SelectValue placeholder="All records" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All records</SelectItem>
                {RECORD_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-date-from">From</Label>
            <Input id="activity-date-from" type="date" value={dateFrom} max={dateTo || undefined}
              onChange={(event) => changeFilter(() => setDateFrom(event.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-date-to">To</Label>
            <Input id="activity-date-to" type="date" value={dateTo} min={dateFrom || undefined}
              onChange={(event) => changeFilter(() => setDateTo(event.target.value))} />
          </div>
          {hasFilters && (
            <div className="sm:col-span-2 lg:col-span-5">
              <Button variant="ghost" size="sm" onClick={() => changeFilter(() => {
                setAction(ALL); setTargetType(ALL); setDateFrom(''); setDateTo('');
              })}
              >
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
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No activity matches these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={cn(isFetching && 'opacity-60')}>
                  {items.map((log) => {
                    const display = getAuditDisplay(log.action);
                    const Icon = display.icon;
                    const actorName = log.actorId
                      ? `${log.actorId.firstName ?? ''} ${log.actorId.lastName ?? ''}`.trim() || log.actorId.email
                      : log.actorEmail || 'System';
                    const navPath = getAuditNavPath(log);
                    const recordLabel = RECORD_TYPES.find((type) => type.value === log.targetType)?.label.replace(/s$/, '') || log.targetType || '—';
                    return (
                      <TableRow key={log._id}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{formatWhen(log.createdAt)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 text-sm font-medium">
                            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', display.color)}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            {display.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{actorName}</TableCell>
                        <TableCell className="text-sm">
                          {navPath ? <Link to={navPath} className="underline underline-offset-4">{recordLabel}</Link> : recordLabel}
                        </TableCell>
                        <TableCell className="max-w-[280px] text-xs text-slate-500 dark:text-slate-400">
                          {describeAuditDetails(log.details) || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{total} {total === 1 ? 'entry' : 'entries'}</span>
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
