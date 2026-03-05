import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, FolderOpen, Filter, ChevronRight, Calendar, User, Wrench } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageError } from '@/components/shared/PageError';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { ProjectStatus, BlueprintStatus, Role } from '@/lib/constants';

const STATUS_FILTERS = [
  { label: 'All Projects', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Blueprint', value: ProjectStatus.BLUEPRINT },
  { label: 'Pending Payment', value: ProjectStatus.PAYMENT_PENDING },
  { label: 'In Fabrication', value: ProjectStatus.FABRICATION },
  { label: 'Completed', value: ProjectStatus.COMPLETED },
];

function statusConfig(status: string) {
  switch (status) {
    case ProjectStatus.COMPLETED:
      return { badge: 'border-emerald-200 text-emerald-700 bg-emerald-50', bar: 'bg-emerald-500' };
    case ProjectStatus.FABRICATION:
      return { badge: 'border-violet-200 text-violet-700 bg-violet-50', bar: 'bg-violet-500' };
    case ProjectStatus.PAYMENT_PENDING:
      return { badge: 'border-amber-200 text-amber-700 bg-amber-50', bar: 'bg-amber-500' };
    case ProjectStatus.BLUEPRINT:
      return { badge: 'border-blue-200 text-blue-700 bg-blue-50', bar: 'bg-blue-500' };
    case ProjectStatus.APPROVED:
      return { badge: 'border-cyan-200 text-cyan-700 bg-cyan-50', bar: 'bg-cyan-500' };
    case ProjectStatus.SUBMITTED:
      return { badge: 'border-orange-200 text-orange-700 bg-orange-50', bar: 'bg-orange-500' };
    case ProjectStatus.CANCELLED:
      return { badge: 'border-red-200 text-red-700 bg-red-50', bar: 'bg-red-500' };
    default:
      return { badge: 'border-gray-200 text-gray-600 bg-gray-50', bar: 'bg-gray-200' };
  }
}

function statusLabel(status: string) {
  return String(status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Derive the display status: if project is in blueprint phase and the latest
 *  blueprint has been sent back for revision, show "Revision Requested" instead. */
function deriveDisplayStatus(project: { status?: string; latestBlueprintStatus?: string }) {
  const ps = String(project.status || '');
  const bps = project.latestBlueprintStatus;
  if (
    ps === ProjectStatus.BLUEPRINT &&
    bps === BlueprintStatus.REVISION_REQUESTED
  ) {
    return {
      status: 'revision_requested',
      label: 'Revision Requested',
      cfg: { badge: 'border-orange-200 text-orange-700 bg-orange-50', bar: 'bg-orange-500' },
    };
  }
  const cfg = statusConfig(ps);
  return { status: ps, label: statusLabel(ps), cfg };
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  const isCustomer = user?.roles?.some((r: string) => r === Role.CUSTOMER);
  const isStaff = !isCustomer;

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch } = useProjects(params);

  if (isError) return <PageError onRetry={refetch} />;

  const projects = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Projects</h1>
        <p className="text-[#6e6e73] mt-1 text-sm">Track fabrication progress and project milestones.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-[#c8c8cd]/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
          <Input
            placeholder="Search by project name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-[#d2d2d7] focus:border-[#b8b8bd] focus:ring-[#6e6e73]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <Filter className="h-4 w-4 text-[#86868b] hidden md:block mr-1 flex-shrink-0" />
          {STATUS_FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === f.value
                  ? 'bg-[#1d1d1f] text-white shadow-sm'
                  : 'bg-[#f0f0f5] text-[#6e6e73] hover:bg-[#e8e8ed] hover:text-[#3a3a3e]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="rounded-xl border border-[#c8c8cd]/50 overflow-hidden bg-white">
          <div className="divide-y divide-[#f5f5f7]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
                <Skeleton className="h-4 w-24 hidden lg:block" />
              </div>
            ))}
          </div>
        </div>
      ) : !projects.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#d2d2d7] rounded-2xl bg-[#f5f5f7]/50">
          <div className="bg-white p-4 rounded-2xl mb-4 shadow-sm">
            <FolderOpen className="h-8 w-8 text-[#c8c8cd]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f]">No projects found</h3>
          <p className="text-[#6e6e73] max-w-sm mt-1 text-sm">
            {search || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'New projects will appear here once appointed.'}
          </p>
          {(search || statusFilter) && (
            <Button
              variant="outline"
              className="mt-4 border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg"
              onClick={() => { setSearch(''); setStatusFilter(''); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* â”€â”€ Desktop table (md+) â”€â”€ */}
          <div className="hidden md:block rounded-xl border border-[#c8c8cd]/50 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e8e8ed] hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] pl-5">Project</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">Status</TableHead>
                  {isStaff && (
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] hidden lg:table-cell">Customer</TableHead>
                  )}
                  {isStaff && (
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] hidden xl:table-cell">Engineer</TableHead>
                  )}
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] w-10 pr-5"><span className="sr-only">View</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const { label: displayLabel, cfg } = deriveDisplayStatus(project);
                  const engineers = Array.isArray(project.engineerIds)
                    ? (project.engineerIds as unknown as { firstName: string; lastName: string }[]).filter(
                        (e) => typeof e === 'object',
                      )
                    : [];
                  const customer =
                    project.customerId && typeof project.customerId === 'object'
                      ? (project.customerId as { firstName: string; lastName: string })
                      : null;

                  return (
                    <TableRow
                      key={String(project._id)}
                      className="border-b border-[#f0f0f5] cursor-pointer transition-colors hover:bg-[#f9f9fb] group"
                      onClick={() => navigate(`/projects/${project._id}`)}
                    >
                      {/* Project info */}
                      <TableCell className="pl-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.bar}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-[#1d1d1f] truncate max-w-[220px] group-hover:text-[#0066cc] transition-colors">
                              {String(project.serviceType || project.title || '')}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                          {displayLabel}
                        </Badge>
                      </TableCell>

                      {/* Customer â€” lg+ staff only */}
                      {isStaff && (
                        <TableCell className="py-4 hidden lg:table-cell">
                          {customer ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#6e6e73]">
                              <User className="h-3 w-3 text-[#86868b] shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {customer.firstName} {customer.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#c8c8cd]">â€”</span>
                          )}
                        </TableCell>
                      )}

                      {/* Engineer â€” xl+ staff only */}
                      {isStaff && (
                        <TableCell className="py-4 hidden xl:table-cell">
                          {engineers.length > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#6e6e73]">
                              <Wrench className="h-3 w-3 text-[#86868b] shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {engineers.map((e) => `${e.firstName} ${e.lastName}`).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#c8c8cd] italic">No engineer</span>
                          )}
                        </TableCell>
                      )}

                      {/* Date */}
                      <TableCell className="py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-[#6e6e73]">
                          <Calendar className="h-3 w-3 text-[#86868b] shrink-0" />
                          {project.createdAt
                            ? format(new Date(String(project.createdAt)), 'MMM d, yyyy')
                            : ''}
                        </div>
                      </TableCell>

                      {/* Arrow */}
                      <TableCell className="py-4 pr-5">
                        <Link
                          to={`/projects/${project._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[#e5e5ea] transition-colors text-[#c8c8cd]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-6 py-2.5 border-t border-[#f0f0f5]">
              <p className="text-[11px] text-[#86868b]">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* â”€â”€ Mobile cards (< md) â”€â”€ */}
          <div className="md:hidden space-y-2">
            {projects.map((project) => {
              const { label: displayLabel, cfg } = deriveDisplayStatus(project);
              const customer =
                project.customerId && typeof project.customerId === 'object'
                  ? (project.customerId as { firstName: string; lastName: string })
                  : null;

              return (
                <Link
                  key={String(project._id)}
                  to={`/projects/${project._id}`}
                  className="block bg-white rounded-xl border border-[#c8c8cd]/50 px-4 py-3.5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.bar}`} />
                      <p className="font-semibold text-sm text-[#1d1d1f] truncate">
                        {String(project.title || '')}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${cfg.badge}`}>
                      {displayLabel}
                    </Badge>
                  </div>

                  {project.serviceType && (
                    <span className="ml-4 text-[11px] text-[#6e6e73] bg-[#f0f0f5] px-1.5 py-0.5 rounded mt-1 inline-block">
                      {String(project.serviceType)}
                    </span>
                  )}

                  <div className="ml-4 mt-2 space-y-1">
                    {isStaff && customer && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#86868b]">
                        <User className="h-3 w-3 shrink-0" />
                        <span>{customer.firstName} {customer.lastName}</span>
                      </div>
                    )}
                    {project.createdAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#86868b]">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{format(new Date(String(project.createdAt)), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
            <p className="text-[11px] text-[#86868b] px-1 pt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

