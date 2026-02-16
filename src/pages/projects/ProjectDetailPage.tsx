import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, FileText, CreditCard, Hammer, Image } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { useProject } from '@/hooks/useProjects';
import { useLatestBlueprint } from '@/hooks/useBlueprints';
import { usePaymentPlan, usePaymentsByProject } from '@/hooks/usePayments';
import { useFabricationUpdates } from '@/hooks/useFabrication';
import { cn } from '@/lib/utils';

type TabKey = 'details' | 'blueprint' | 'payments' | 'fabrication';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'details', label: 'Details', icon: FileText },
  { key: 'blueprint', label: 'Blueprint', icon: Image },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'fabrication', label: 'Fabrication', icon: Hammer },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const { data: project, isLoading, isError, refetch } = useProject(id!);
  const { data: blueprint } = useLatestBlueprint(id!);
  const { data: paymentPlan } = usePaymentPlan(id!);
  const { data: payments } = usePaymentsByProject(id!);
  const { data: fabUpdates } = useFabricationUpdates(id!);

  if (isLoading) return <PageLoader />;
  if (isError || !project) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 truncate">
            {project.title}
          </h1>
          <p className="text-sm text-gray-500">
            Created{' '}
            {format(new Date(project.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-900',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{project.description}</p>
                </div>
              )}
              {project.customerName && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{project.customerName}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={project.status} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engineers
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {project.engineerIds.length > 0
                    ? `${project.engineerIds.length} assigned`
                    : 'Not assigned yet'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fabrication Lead
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {project.fabricationLeadId || 'Not assigned yet'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fabrication Assistants
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {project.fabricationAssistantIds.length > 0
                    ? `${project.fabricationAssistantIds.length} assigned`
                    : 'Not assigned yet'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Blueprint Tab */}
      {activeTab === 'blueprint' && (
        <Card className="rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Latest Blueprint</CardTitle>
          </CardHeader>
          <CardContent>
            {blueprint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    Version {blueprint.version}
                  </p>
                  <StatusBadge status={blueprint.status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Blueprint
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {blueprint.blueprintApproved ? '✅ Approved' : '⏳ Pending'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costing
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {blueprint.costingApproved ? '✅ Approved' : '⏳ Pending'}
                    </p>
                  </div>
                </div>
                {blueprint.revisionNotes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revision Notes
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{blueprint.revisionNotes}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Uploaded {format(new Date(blueprint.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">No blueprint uploaded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {paymentPlan && (
            <Card className="rounded-xl border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Payment Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentPlan.stages.map(
                    (stage) => (
                      <div
                        key={String(stage.stageId)}
                        className="flex items-center justify-between rounded-xl border border-gray-100 p-4 bg-gray-50/30 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {String(stage.label)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {String(stage.percentage)}% —{' '}
                            {formatCurrency(Number(stage.amount))}
                          </p>
                        </div>
                        <StatusBadge status={String(stage.status)} />
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={String(p._id)}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(p.amountPaid))}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {String(p.method || '').replace('_', ' ')}
                          {p.receiptNumber && ` · ${String(p.receiptNumber)}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.createdAt
                            ? format(new Date(String(p.createdAt)), 'MMM d, yyyy')
                            : ''}
                        </p>
                      </div>
                      <StatusBadge status={String(p.status)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4">No payments yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fabrication Tab */}
      {activeTab === 'fabrication' && (
        <Card className="rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Fabrication Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {fabUpdates && fabUpdates.length > 0 ? (
              <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                {fabUpdates.map((update) => (
                  <div key={String(update._id)} className="relative flex gap-4 pl-10">
                    <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-orange-500 bg-white" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={String(update.status)} />
                        <span className="text-xs text-gray-400">
                          {update.createdAt
                            ? format(
                                new Date(String(update.createdAt)),
                                'MMM d, yyyy h:mm a',
                              )
                            : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{String(update.notes || '')}</p>
                      {update.createdByName ? (
                        <p className="text-xs text-gray-400">
                          By {String(update.createdByName)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">No fabrication updates yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
