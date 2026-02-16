import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRevenueReport,
  useProjectPipelineReport,
  usePaymentStageReport,
  useWorkloadReport,
  useConversionReport,
} from '@/hooks/useReports';

const COLORS = [
  '#1e40af',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#6366f1',
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
  }).format(v);

type GroupBy = 'day' | 'week' | 'month';

export function ReportsPage() {
  const [revenueGroupBy, setRevenueGroupBy] = useState<GroupBy>('month');

  const { data: revenue, isLoading: revLoading } = useRevenueReport({
    groupBy: revenueGroupBy,
  });
  const { data: pipeline, isLoading: pipeLoading } = useProjectPipelineReport();
  const { data: paymentStages, isLoading: psLoading } = usePaymentStageReport();
  const { data: workload, isLoading: wlLoading } = useWorkloadReport();
  const { data: conversion } = useConversionReport();

  const formatStatus = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm">Business analytics and insights</p>
      </div>

      {/* Conversion KPI */}
      {conversion && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Total Appointments',
              value: conversion.totalAppointments,
              color: 'text-blue-600 bg-blue-50',
            },
            {
              label: 'Converted to Projects',
              value: conversion.convertedToProjects,
              color: 'text-emerald-600 bg-emerald-50',
            },
            {
              label: 'Conversion Rate',
              value: `${(conversion.rate * 100).toFixed(1)}%`,
              color: 'text-orange-600 bg-orange-50',
            },
          ].map((kpi) => (
            <Card key={kpi.label} className="rounded-xl border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      <Card className="rounded-xl border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-gray-900">Revenue</CardTitle>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as GroupBy[]).map((g) => (
              <Button
                key={g}
                variant={revenueGroupBy === g ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueGroupBy(g)}
                className={`capitalize rounded-lg text-xs ${
                  revenueGroupBy === g
                    ? 'bg-gray-900 hover:bg-gray-800'
                    : 'border-gray-200'
                }`}
              >
                {g}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {revLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : revenue && revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="total" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              No revenue data available.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Pipeline */}
        <Card className="rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Project Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {pipeLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : pipeline && pipeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pipeline.map((p) => ({
                      ...p,
                      name: formatStatus(String(p.status)),
                    }))}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {pipeline.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No pipeline data.</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Stages */}
        <Card className="rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Payment Stages</CardTitle>
          </CardHeader>
          <CardContent>
            {psLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : paymentStages && paymentStages.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={paymentStages.map((p) => ({
                    ...p,
                    name: formatStatus(String(p.status)),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No payment data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workload */}
      <Card className="rounded-xl border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Staff Workload</CardTitle>
        </CardHeader>
        <CardContent>
          {wlLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : workload && workload.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 text-left font-semibold text-gray-900">Staff</th>
                    <th className="py-3 text-right font-semibold text-gray-900">Active</th>
                    <th className="py-3 text-right font-semibold text-gray-900">Completed</th>
                    <th className="py-3 text-right font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map((w) => (
                    <tr
                      key={String(w.userId)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="py-3 text-gray-700">{String(w.userName)}</td>
                      <td className="py-3 text-right text-gray-600">
                        {String(w.activeProjects)}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {String(w.completedProjects)}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-900">
                        {Number(w.activeProjects) + Number(w.completedProjects)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No workload data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
