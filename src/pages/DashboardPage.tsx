import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  FolderOpen,
  CreditCard,
  DollarSign,
  TrendingUp,
  Hammer,
  ArrowRight,
  FileText,
  Activity,
  AlertCircle,
  CalendarCheck,
  Package,
  Users,
  ArrowUpRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageError } from '@/components/shared/PageError';
import { useDashboardSummary } from '@/hooks/useReports';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/lib/constants';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

interface KpiItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

interface QuickAction {
  label: string;
  path: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

function getRoleGreeting(role: Role): string {
  const greetings: Partial<Record<Role, string>> = {
    [Role.CUSTOMER]: 'Start a new project or track your orders.',
    [Role.APPOINTMENT_AGENT]: 'Manage schedules and ocular visits.',
    [Role.SALES_STAFF]: 'Track leads and project conversions.',
    [Role.ENGINEER]: 'Review blueprints and technical specs.',
    [Role.CASHIER]: 'Process payments and manage cash flow.',
    [Role.FABRICATION_STAFF]: 'Monitor fabrication stages and output.',
    [Role.ADMIN]: 'System overview and performance metrics.',
  };
  return greetings[role] || 'Welcome to your dashboard.';
}

function getRoleKpis(role: Role, data: Record<string, unknown> | undefined): KpiItem[] {
  const d = data as Record<string, number> | undefined;

  const activeProjects: KpiItem = {
    label: 'Active Projects',
    value: d?.activeProjects ?? 0,
    icon: FolderOpen,
    description: 'In progress',
    color: 'text-blue-600 bg-blue-50',
  };

  switch (role) {
    case Role.CUSTOMER:
      return [
        { label: 'Pending Visits', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Awaiting confirmation', color: 'text-amber-600 bg-amber-50' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Invoices due', color: 'text-rose-600 bg-rose-50' },
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Being built', color: 'text-orange-600 bg-orange-50' },
      ];
    case Role.APPOINTMENT_AGENT:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, description: 'Scheduled for today', color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Pending Requests', value: d?.pendingAppointments ?? 0, icon: Clock, description: 'Need action', color: 'text-amber-600 bg-amber-50' },
        activeProjects,
      ];
    case Role.SALES_STAFF:
      return [
        { label: "Today's Schedule", value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, color: 'text-indigo-600 bg-indigo-50' },
        activeProjects,
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, trend: 'up', color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Conversion', value: `${((d?.conversionRate ?? 0) * 100).toFixed(1)}%`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
      ];
    case Role.ENGINEER:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'In workshop', color: 'text-orange-600 bg-orange-50' },
        { label: 'Pending Review', value: 0, icon: FileText, description: 'Blueprints', color: 'text-sky-600 bg-sky-50' },
      ];
    case Role.CASHIER:
      return [
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: CreditCard, description: 'Unpaid', color: 'text-rose-600 bg-rose-50' },
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, trend: 'up', color: 'text-emerald-600 bg-emerald-50' },
        activeProjects,
      ];
    case Role.FABRICATION_STAFF:
      return [
        activeProjects,
        { label: 'In Fabrication', value: d?.fabricationInProgress ?? 0, icon: Hammer, description: 'Active jobs', color: 'text-orange-600 bg-orange-50' },
        { label: 'Completed Today', value: 0, icon: Activity, description: 'Finished', color: 'text-emerald-600 bg-emerald-50' },
      ];
    case Role.ADMIN:
      return [
        { label: 'Today\'s Schedule', value: d?.totalAppointmentsToday ?? 0, icon: CalendarDays, color: 'text-indigo-600 bg-indigo-50' },
        activeProjects,
        { label: 'Pending Payments', value: d?.pendingPayments ?? 0, icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
        { label: 'Monthly Revenue', value: formatCurrency(d?.revenueThisMonth ?? 0), icon: DollarSign, trend: 'up', color: 'text-emerald-600 bg-emerald-50' },
      ];
    default:
      return [activeProjects];
  }
}

function getRoleActions(role: Role): QuickAction[] {
  const actions: QuickAction[] = [];

  switch (role) {
    case Role.CUSTOMER:
      actions.push(
        { label: 'Book Visit', path: '/appointments/book', icon: CalendarCheck, description: 'Schedule appointment', color: 'from-indigo-500 to-indigo-600' },
        { label: 'My Projects', path: '/projects', icon: FolderOpen, description: 'View project status', color: 'from-blue-500 to-blue-600' },
        { label: 'Payments', path: '/payments', icon: CreditCard, description: 'Payment history', color: 'from-emerald-500 to-emerald-600' },
      );
      break;
    case Role.APPOINTMENT_AGENT:
      actions.push(
        { label: 'Appointments', path: '/appointments', icon: CalendarDays, description: 'Manage schedule', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'View all projects', color: 'from-blue-500 to-blue-600' },
      );
      break;
    case Role.SALES_STAFF:
      actions.push(
        { label: 'Calendar', path: '/appointments', icon: CalendarDays, description: 'View appointments', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Visit Reports', path: '/visit-reports', icon: FileText, description: 'Site inspections', color: 'from-cyan-500 to-cyan-600' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'All projects', color: 'from-blue-500 to-blue-600' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Analytics', color: 'from-violet-500 to-violet-600' },
      );
      break;
    case Role.ENGINEER:
      actions.push(
        { label: 'Report Queue', path: '/visit-reports', icon: FileText, description: 'Review visit reports', color: 'from-cyan-500 to-cyan-600' },
        { label: 'Blueprints', path: '/blueprints', icon: FileText, description: 'Technical drawings', color: 'from-sky-500 to-sky-600' },
        { label: 'Fabrication', path: '/fabrication', icon: Hammer, description: 'Workshop status', color: 'from-orange-500 to-orange-600' },
        { label: 'Materials', path: '/projects', icon: Package, description: 'Check inventory', color: 'from-teal-500 to-teal-600' },
      );
      break;
    case Role.CASHIER:
      actions.push(
        { label: 'Process Payment', path: '/cashier-queue', icon: DollarSign, description: 'Accept payments', color: 'from-emerald-500 to-emerald-600' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Financial reports', color: 'from-violet-500 to-violet-600' },
      );
      break;
    case Role.FABRICATION_STAFF:
      actions.push(
        { label: 'Job Queue', path: '/fabrication', icon: Hammer, description: 'Pending tasks', color: 'from-orange-500 to-orange-600' },
        { label: 'Projects', path: '/projects', icon: FolderOpen, description: 'All projects', color: 'from-blue-500 to-blue-600' },
      );
      break;
    case Role.ADMIN:
      actions.push(
        { label: 'Team', path: '/users', icon: Users, description: 'Manage staff', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Reports', path: '/reports', icon: TrendingUp, description: 'Analytics', color: 'from-violet-500 to-violet-600' },
        { label: 'Settings', path: '/settings', icon: CalendarDays, description: 'System config', color: 'from-gray-600 to-gray-700' },
      );
      break;
  }

  return actions;
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  if (isError) return <PageError onRetry={refetch} />;

  const primaryRole =
    user?.roles.find((r) => r !== Role.ADMIN) ?? user?.roles[0] ?? Role.CUSTOMER;
  const kpis = getRoleKpis(
    primaryRole as Role,
    data as Record<string, unknown> | undefined,
  );
  const actions = getRoleActions(primaryRole as Role);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {greeting()}, {user?.firstName}
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            {getRoleGreeting(primaryRole as Role)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-gray-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </CardContent>
              </Card>
            ))
          : kpis.map((item, i) => {
              const colorParts = item.color.split(' ');
              const textColor = colorParts[0] || '';
              const bgColor = colorParts[1] || '';

              return (
                <Card
                  key={i}
                  className="border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}
                      >
                        <item.icon className={`h-5 w-5 ${textColor}`} />
                      </div>
                      {item.trend === 'up' && (
                        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <ArrowUpRight className="h-3 w-3" />
                          12%
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">
                      {item.value}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                      {item.description && (
                        <span className="text-[10px] text-gray-400">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.path} to={action.path} className="group">
              <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm flex-shrink-0`}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Section */}
      <Card className="border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-50 bg-gray-50/50">
          <CardTitle className="text-base font-semibold text-gray-900">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-44 items-center justify-center">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 mx-auto mb-3">
                <Activity className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">Activity feed coming soon</p>
              <p className="text-xs text-gray-300 mt-1">
                Real-time updates will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
