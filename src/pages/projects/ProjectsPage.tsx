import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, ChevronRight, Calendar, User, Wrench } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
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
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { EmptyState } from '@/components/shared/EmptyState';
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
      return { badge: 'border-[#93ad9d] text-[#4e6c5a] bg-[linear-gradient(180deg,#eef6f1_0%,#dceade_100%)] dark:border-emerald-700/50 dark:text-emerald-200 dark:bg-emerald-900/40', bar: 'bg-[#6c8f7d]' };
    case ProjectStatus.FABRICATION:
      return { badge: 'border-[#afa7c5] text-[#665d82] bg-[linear-gradient(180deg,#f2f1f8_0%,#e0dced_100%)] dark:border-purple-700/50 dark:text-purple-200 dark:bg-purple-900/40', bar: 'bg-[#8277a3]' };
    case ProjectStatus.PAYMENT_PENDING:
      return { badge: 'border-[#c7aa7a] text-[#7e6239] bg-[linear-gradient(180deg,#f8f0e5_0%,#ebdcc6_100%)] dark:border-amber-700/50 dark:text-amber-200 dark:bg-amber-900/40', bar: 'bg-[#a97d49]' };
    case ProjectStatus.BLUEPRINT:
      return { badge: 'border-[#8da4b8] text-[#4f6679] bg-[linear-gradient(180deg,#eef4f9_0%,#d8e4ee_100%)] dark:border-blue-700/50 dark:text-blue-200 dark:bg-blue-900/40', bar: 'bg-[#708ca6]' };
    case ProjectStatus.APPROVED:
      return { badge: 'border-[#8eafbb] text-[#4f6d78] bg-[linear-gradient(180deg,#eef7f8_0%,#d8eaee_100%)] dark:border-cyan-700/50 dark:text-cyan-200 dark:bg-cyan-900/40', bar: 'bg-[#6f919d]' };
    case ProjectStatus.SUBMITTED:
      return { badge: 'border-[#c4a07d] text-[#7b5d3f] bg-[linear-gradient(180deg,#f8f1e9_0%,#ecdcc8_100%)] dark:border-orange-700/50 dark:text-orange-200 dark:bg-orange-900/40', bar: 'bg-[#aa7f53]' };
    case ProjectStatus.CANCELLED:
      return { badge: 'border-[#cb8b86] text-[#87544f] bg-[linear-gradient(180deg,#fbefed_0%,#efd7d4_100%)] dark:border-red-700/50 dark:text-red-200 dark:bg-red-900/40', bar: 'bg-[#b96c66]' };
    default:
      return { badge: 'border-[#c6ccd3] text-[#5b6470] bg-[linear-gradient(180deg,#eef2f5_0%,#dde3e8_100%)] dark:border-slate-600 dark:text-slate-200 dark:bg-slate-700/60', bar: 'bg-[#9ca6b1]' };
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
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-card-foreground)]">Projects</h1>
        <p className="mt-1 text-sm text-[var(--text-metal-color)]">Track fabrication progress and project milestones.</p>
      </div>

      {/* Controls */}
      <CollectionToolbar
        title="Find a project faster"
        description="Search by project name or ID, then narrow the list by stage."
        searchPlaceholder="Search by project name or ID"
        searchValue={search}
        onSearchChange={setSearch}
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="metal-panel overflow-hidden rounded-[1.5rem]">
          <div className="divide-y divide-[color:var(--color-border)]">
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
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="No projects found"
          description={search || statusFilter
            ? 'Try adjusting your search terms or status filter.'
            : 'New projects will appear here once appointments turn into active work.'}
          action={(search || statusFilter) ? (
            <Button
              variant="outline"
              className="text-[var(--color-card-foreground)]"
              onClick={() => { setSearch(''); setStatusFilter(''); }}
            >
              Clear Filters
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* â”€â”€ Desktop table (md+) â”€â”€ */}
          <div className="metal-panel hidden overflow-hidden rounded-[1.5rem] md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-metal-color)]">Project</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-metal-color)]">Status</TableHead>
                  {isStaff && (
                    <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-[var(--text-metal-color)] lg:table-cell">Customer</TableHead>
                  )}
                  {isStaff && (
                    <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-[var(--text-metal-color)] xl:table-cell">Engineer</TableHead>
                  )}
                  <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-[var(--text-metal-color)] lg:table-cell">Created</TableHead>
                  <TableHead className="w-10 pr-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-metal-color)]"><span className="sr-only">View</span></TableHead>
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
                      className="group cursor-pointer border-b border-[color:var(--color-border)] transition-colors hover:bg-[color:var(--color-muted)]/70"
                      onClick={() => navigate(`/projects/${project._id}`)}
                    >
                      {/* Project info */}
                      <TableCell className="pl-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.bar}`} />
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate text-sm font-medium text-[var(--color-card-foreground)] transition-colors group-hover:text-[var(--text-metal-color)]">
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
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-metal-color)]">
                              <User className="h-3 w-3 shrink-0 text-[var(--text-metal-muted-color)]" />
                              <span className="truncate max-w-[140px]">
                                {customer.firstName} {customer.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-metal-muted-color)]">—</span>
                          )}
                        </TableCell>
                      )}

                      {/* Engineer â€” xl+ staff only */}
                      {isStaff && (
                        <TableCell className="py-4 hidden xl:table-cell">
                          {engineers.length > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-metal-color)]">
                              <Wrench className="h-3 w-3 shrink-0 text-[var(--text-metal-muted-color)]" />
                              <span className="truncate max-w-[140px]">
                                {engineers.map((e) => `${e.firstName} ${e.lastName}`).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs italic text-[var(--text-metal-muted-color)]">No engineer</span>
                          )}
                        </TableCell>
                      )}

                      {/* Date */}
                      <TableCell className="py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-metal-color)]">
                          <Calendar className="h-3 w-3 shrink-0 text-[var(--text-metal-muted-color)]" />
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
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-metal-muted-color)] transition-colors hover:bg-[color:var(--color-muted)]/85 hover:text-[var(--text-metal-color)]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t border-[color:var(--color-border)] px-6 py-2.5">
              <p className="text-[11px] text-[var(--text-metal-color)]">
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
                  className="metal-panel block rounded-[1.35rem] px-4 py-3.5 transition-shadow hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_18px_32px_rgba(18,22,27,0.1)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.bar}`} />
                      <p className="truncate text-sm font-semibold text-[var(--color-card-foreground)]">
                        {String(project.title || '')}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${cfg.badge}`}>
                      {displayLabel}
                    </Badge>
                  </div>

                  {project.serviceType && (
                    <span className="metal-pill mt-1 ml-4 inline-block rounded-full px-1.5 py-0.5 text-[11px] text-[var(--text-metal-color)]">
                      {String(project.serviceType)}
                    </span>
                  )}

                  <div className="ml-4 mt-2 space-y-1">
                    {isStaff && customer && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-metal-color)]">
                        <User className="h-3 w-3 shrink-0" />
                        <span>{customer.firstName} {customer.lastName}</span>
                      </div>
                    )}
                    {project.createdAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-metal-color)]">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{format(new Date(String(project.createdAt)), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
            <p className="px-1 pt-1 text-[11px] text-[var(--text-metal-color)]">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

