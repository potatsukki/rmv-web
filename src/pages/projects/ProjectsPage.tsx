import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, FolderOpen, Filter, ArrowUpRight, Calendar, User, Wrench } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageError } from '@/components/shared/PageError';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { ProjectStatus, Role } from '@/lib/constants';

const STATUS_FILTERS = [
  { label: 'All Projects', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Blueprint', value: ProjectStatus.BLUEPRINT },
  { label: 'Pending Payment', value: ProjectStatus.PAYMENT_PENDING },
  { label: 'In Fabrication', value: ProjectStatus.FABRICATION },
  { label: 'Completed', value: ProjectStatus.COMPLETED },
];

export function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  const isCustomer = user?.roles?.some((r: string) => r === Role.CUSTOMER);
  const isStaff = !isCustomer;

  const params: Record<string, string> = { status: statusFilter };
  if (search) params.search = search;

  const { data, isLoading, isError, refetch } = useProjects(params);

  if (isError) return <PageError onRetry={refetch} />;

  const projects = data?.items || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Projects</h1>
          <p className="text-[#6e6e73] mt-1 text-sm">
            Track fabrication progress and project milestones.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white p-4 rounded-xl border border-[#c8c8cd]/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
          <Input
            placeholder="Search by project name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-[#d2d2d7] focus:border-[#b8b8bd] focus:ring-[#6e6e73]"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <Filter className="h-4 w-4 text-[#86868b] hidden md:block mr-1" />
          {STATUS_FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === f.value
                  ? 'bg-[#1d1d1f] text-white shadow-md'
                  : 'bg-[#f0f0f5] text-[#6e6e73] hover:bg-gray-200 hover:text-[#1d1d1f]'
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
            <Card key={i} className="border-[#c8c8cd]/50 overflow-hidden rounded-xl">
              <div className="h-1.5 bg-[#f0f0f5] w-full" />
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
              className="mt-4 border-[#d2d2d7] text-[#1d1d1f] hover:text-[#3a3a3e] hover:bg-[#f5f5f7] rounded-lg"
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
          {projects.map((project) => (
            <Link
              key={String(project._id)}
              to={`/projects/${project._id}`}
              className="group block h-full"
            >
              <Card className="h-full border-[#c8c8cd]/50 transition-all duration-200 hover:border-[#b8b8bd] hover:shadow-md hover:-translate-y-0.5 overflow-hidden flex flex-col rounded-xl">
                <div
                  className={`h-1.5 w-full ${
                    project.status === ProjectStatus.COMPLETED
                      ? 'bg-emerald-500'
                      : project.status === ProjectStatus.FABRICATION
                        ? 'bg-violet-500'
                        : project.status === ProjectStatus.PAYMENT_PENDING
                          ? 'bg-amber-500'
                          : project.status === ProjectStatus.BLUEPRINT
                            ? 'bg-blue-500'
                            : project.status === ProjectStatus.APPROVED
                              ? 'bg-cyan-500'
                              : project.status === ProjectStatus.SUBMITTED
                                ? 'bg-orange-500'
                                : project.status === ProjectStatus.CANCELLED
                                  ? 'bg-red-500'
                                  : 'bg-gray-200'
                  }`}
                />
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 text-[#1d1d1f] bg-[#f0f0f5] rounded-xl flex items-center justify-center">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold tracking-wider rounded-md ${
                        project.status === ProjectStatus.COMPLETED
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                          : project.status === ProjectStatus.FABRICATION
                            ? 'border-violet-200 text-violet-700 bg-violet-50'
                            : project.status === ProjectStatus.PAYMENT_PENDING
                              ? 'border-amber-200 text-amber-700 bg-amber-50'
                              : project.status === ProjectStatus.BLUEPRINT
                                ? 'border-blue-200 text-blue-700 bg-blue-50'
                                : project.status === ProjectStatus.APPROVED
                                  ? 'border-cyan-200 text-cyan-700 bg-cyan-50'
                                  : project.status === ProjectStatus.SUBMITTED
                                    ? 'border-orange-200 text-orange-700 bg-orange-50'
                                    : project.status === ProjectStatus.CANCELLED
                                      ? 'border-red-200 text-red-700 bg-red-50'
                                      : 'border-gray-200 text-gray-600 bg-gray-50'
                      }`}
                    >
                      {String(project.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  </div>

                  <div className="mb-3 flex-1">
                    <h3 className="font-bold text-[#1d1d1f] group-hover:text-[#6e6e73] transition-colors line-clamp-1">
                      {String(project.title || '')}
                    </h3>
                    {project.serviceType && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-[#6e6e73] bg-[#f0f0f5] px-2 py-0.5 rounded-md">
                        {String(project.serviceType)}
                      </span>
                    )}
                    <p className="text-sm text-[#6e6e73] mt-1.5 line-clamp-2">
                      {String(project.description || 'No description provided.')}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-[#c8c8cd]/50">
                    {/* Customer (staff-only) */}
                    {isStaff && project.customerId && typeof project.customerId === 'object' && (
                      <div className="flex items-center text-sm text-[#6e6e73]">
                        <User className="mr-2 h-3.5 w-3.5 text-[#86868b] shrink-0" />
                        <span className="truncate">
                          {project.customerId.firstName} {project.customerId.lastName}
                        </span>
                      </div>
                    )}

                    {/* Engineers (staff-only) */}
                    {isStaff && project.engineerIds?.length > 0 && typeof project.engineerIds[0] === 'object' ? (
                      <div className="flex items-center text-sm text-[#6e6e73]">
                        <Wrench className="mr-2 h-3.5 w-3.5 text-[#86868b] shrink-0" />
                        <span className="truncate">
                          {(project.engineerIds as { firstName: string; lastName: string }[])
                            .map((e) => `${e.firstName} ${e.lastName}`)
                            .join(', ')}
                        </span>
                      </div>
                    ) : isStaff && project.engineerIds?.length === 0 && (
                      <div className="flex items-center text-sm text-[#86868b] italic">
                        <Wrench className="mr-2 h-3.5 w-3.5 shrink-0" />
                        <span>No engineer assigned</span>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center text-sm text-[#6e6e73]">
                      <Calendar className="mr-2 h-3.5 w-3.5 text-[#86868b] shrink-0" />
                      <span>
                        {project.createdAt
                          ? format(new Date(String(project.createdAt)), 'MMM d, yyyy')
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center text-sm font-medium text-[#1d1d1f] opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
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
