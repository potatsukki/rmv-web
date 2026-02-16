import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ClipboardList,
  Filter,
  ArrowUpRight,
  Calendar,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageError } from '@/components/shared/PageError';
import { useVisitReports } from '@/hooks/useVisitReports';
import { useAuthStore } from '@/stores/auth.store';
import { VisitReportStatus, Role } from '@/lib/constants';

const STATUS_FILTERS = [
  { label: 'All Reports', value: '' },
  { label: 'Draft', value: VisitReportStatus.DRAFT },
  { label: 'Submitted', value: VisitReportStatus.SUBMITTED },
  { label: 'Returned', value: VisitReportStatus.RETURNED },
  { label: 'Completed', value: VisitReportStatus.COMPLETED },
];

const STATUS_COLORS: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'border-gray-200 text-gray-600 bg-gray-50',
  [VisitReportStatus.SUBMITTED]: 'border-blue-200 text-blue-700 bg-blue-50',
  [VisitReportStatus.RETURNED]: 'border-orange-200 text-orange-700 bg-orange-50',
  [VisitReportStatus.COMPLETED]: 'border-emerald-200 text-emerald-700 bg-emerald-50',
};

const BAR_COLORS: Record<string, string> = {
  [VisitReportStatus.DRAFT]: 'bg-gray-300',
  [VisitReportStatus.SUBMITTED]: 'bg-blue-500',
  [VisitReportStatus.RETURNED]: 'bg-orange-500',
  [VisitReportStatus.COMPLETED]: 'bg-emerald-500',
};

export function VisitReportsListPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch } = useVisitReports(params);

  if (isError) return <PageError onRetry={refetch} />;

  const reports = data?.items || [];

  const isEngineer = user?.roles.includes(Role.ENGINEER);
  const pageTitle = isEngineer ? 'Visit Report Queue' : 'Visit Reports';
  const pageDescription = isEngineer
    ? 'Review submitted visit reports and create projects.'
    : 'Manage your visit reports and site inspection records.';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {pageTitle}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{pageDescription}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by customer name or report ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <Filter className="h-4 w-4 text-gray-400 hidden md:block mr-1" />
          {STATUS_FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === f.value
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-gray-100 overflow-hidden rounded-xl">
              <div className="h-1.5 bg-gray-100 w-full" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !reports.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="bg-white p-4 rounded-2xl mb-4 shadow-sm">
            <ClipboardList className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            No visit reports found
          </h3>
          <p className="text-gray-500 max-w-sm mt-1 text-sm">
            {search || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Visit reports will appear here after appointments are confirmed.'}
          </p>
          {(search || statusFilter) && (
            <Button
              variant="outline"
              className="mt-4 border-gray-200 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Link
              key={String(report._id)}
              to={`/visit-reports/${report._id}`}
              className="group block h-full"
            >
              <Card className="h-full border-gray-100 transition-all duration-200 hover:border-orange-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden flex flex-col rounded-xl">
                <div
                  className={`h-1.5 w-full ${BAR_COLORS[report.status] || 'bg-gray-200'}`}
                />
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 text-orange-600 bg-orange-50 rounded-xl flex items-center justify-center">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`uppercase text-[10px] font-bold tracking-wider rounded-md ${
                        STATUS_COLORS[report.status] || 'border-gray-200 text-gray-600 bg-gray-50'
                      }`}
                    >
                      {String(report.status || '').replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="mb-4 flex-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {report.visitType === 'ocular' ? 'Ocular Visit' : 'Consultation'} Report
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {report.customerRequirements || report.notes || 'No details yet.'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    {report.actualVisitDateTime && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span>
                          {format(new Date(report.actualVisitDateTime), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="mr-2 h-3.5 w-3.5 text-gray-400" />
                      <span className="line-clamp-1">
                        {report.customerName
                          ? report.customerName
                          : `Customer ${String(report.customerId).slice(-6)}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center text-sm font-medium text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {report.status === VisitReportStatus.DRAFT
                      ? 'Continue Editing'
                      : 'View Details'}{' '}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
