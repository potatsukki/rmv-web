import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useDashboardSummary } from '@/hooks/useReports';
import { Role } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Calendar,
  FolderKanban,
  CreditCard,
  BarChart3,
  Settings,
  Users,
  Bell,
  LogOut,
  Home,
  Banknote,
  ChevronRight,
  ClipboardList,
  CalendarOff,
  CalendarPlus,
  RotateCcw,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { LogoutConfirmModal } from '@/components/shared/LogoutConfirmModal';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/dashboard') return pathname === '/dashboard';

  if (itemPath === '/appointments') {
    return (
      pathname === '/appointments' ||
      (pathname.startsWith('/appointments/') && pathname !== '/appointments/create-for-customer')
    );
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: Home, roles: Object.values(Role) },
      { label: 'Notifications', path: '/notifications', icon: Bell, roles: Object.values(Role) },
    ],
  },
  {
    title: 'Project Management',
    items: [
      {
        label: 'Appointments',
        path: '/appointments',
        icon: Calendar,
        roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN],
      },
      {
        label: 'Create Appointment',
        path: '/appointments/create-for-customer',
        icon: CalendarPlus,
        roles: [Role.APPOINTMENT_AGENT],
      },
      {
        label: 'Visit Reports',
        path: '/visit-reports',
        icon: ClipboardList,
        roles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
      },
      {
        label: 'Projects',
        path: '/projects',
        icon: FolderKanban,
        roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN],
      },

    ],
  },
  {
    title: 'Financials',
    items: [
      {
        label: 'Payments',
        path: '/payments',
        icon: CreditCard,
        roles: [Role.CUSTOMER, Role.CASHIER, Role.ADMIN],
      },

      {
        label: 'Cash Flow',
        path: '/cash',
        icon: Banknote,
        roles: [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN],
      },
      {
        label: 'Cashier Queue',
        path: '/cashier-queue',
        icon: CreditCard,
        roles: [Role.CASHIER, Role.ADMIN],
      },
      {
        label: 'Ocular Fee Queue',
        path: '/ocular-fee-queue',
        icon: CreditCard,
        roles: [Role.CASHIER, Role.ADMIN],
      },
      {
        label: 'Refund Requests',
        path: '/refund-requests',
        icon: RotateCcw,
        roles: [Role.CASHIER, Role.ADMIN],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Reports',
        path: '/reports',
        icon: BarChart3,
        roles: [Role.ADMIN, Role.CASHIER],
      },
      { label: 'Team', path: '/users', icon: Users, roles: [Role.ADMIN] },
      { label: 'Slot Management', path: '/slot-management', icon: CalendarOff, roles: [Role.ADMIN, Role.APPOINTMENT_AGENT] },
      { label: 'Settings', path: '/settings', icon: Settings, roles: [Role.ADMIN] },
    ],
  },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { data: dashboardSummary } = useDashboardSummary();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Track "last seen" counts so badges only show for NEW items since last visit
  const seenAppointments = useRef<number>(
    Number(sessionStorage.getItem('seen_pendingAppointments') || '0'),
  );
  const seenPayments = useRef<number>(
    Number(sessionStorage.getItem('seen_pendingPayments') || '0'),
  );

  const onAppointments = location.pathname === '/appointments' || location.pathname.startsWith('/appointments/');
  const onPayments = location.pathname === '/payments' || location.pathname.startsWith('/payments/');
  const onCashierQueue = location.pathname === '/cashier-queue' || location.pathname.startsWith('/cashier-queue/');

  useEffect(() => {
    const pending = dashboardSummary?.pendingAppointments ?? 0;
    if (onAppointments && pending > 0) {
      seenAppointments.current = pending;
      sessionStorage.setItem('seen_pendingAppointments', String(pending));
    }
  }, [onAppointments, dashboardSummary?.pendingAppointments]);

  useEffect(() => {
    const pending = dashboardSummary?.pendingPayments ?? 0;
    if ((onPayments || onCashierQueue) && pending > 0) {
      seenPayments.current = pending;
      sessionStorage.setItem('seen_pendingPayments', String(pending));
    }
  }, [onPayments, onCashierQueue, dashboardSummary?.pendingPayments]);

  const newAppointments = Math.max(0, (dashboardSummary?.pendingAppointments ?? 0) - seenAppointments.current);
  const newPayments = Math.max(0, (dashboardSummary?.pendingPayments ?? 0) - seenPayments.current);

  if (!user) return null;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    const result = await logout();
    queryClient.clear();
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
    sessionStorage.removeItem('seen_pendingAppointments');
    sessionStorage.removeItem('seen_pendingPayments');
    navigate('/login', { replace: true, state: { from: location } });

    if (result.success) {
      toast.success('Logged out successfully');
      return;
    }

    toast.error(result.message || 'You were signed out locally, but the server session could not be closed.');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col md:flex">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1c] via-[#111113] to-[#0d0d0f] border-r border-white/[0.06]" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Logo Header */}
        <Link to="/" className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
          <BrandLogo className="h-9 w-9 ring-2 ring-[#b8b8bd]/40 shadow-lg shadow-black/20" />
          <div className="flex flex-col">
            <span className="text-[13px] font-bold tracking-tight text-white leading-tight">
              RMV Stainless Steel<br/>Fabrication
            </span>
            <span className="text-[10px] font-semibold text-[#6e6e73] uppercase tracking-[0.15em]">
              Management System
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.some((role) => user.roles.includes(role)),
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = isNavItemActive(location.pathname, item.path);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'group relative flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-white/[0.08] text-white'
                            : 'text-[#86868b] hover:bg-white/[0.04] hover:text-[#d2d2d7]',
                        )}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-white" />
                        )}

                        <div className="flex items-center gap-3">
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] transition-colors',
                              isActive
                                ? 'text-white'
                                : 'text-[#6e6e73] group-hover:text-[#86868b]',
                            )}
                          />
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.label === 'Notifications' && !isActive && unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          {item.label === 'Appointments' && !isActive && newAppointments > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {newAppointments > 9 ? '9+' : newAppointments}
                            </span>
                          )}
                          {item.label === 'Payments' && !isActive && newPayments > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {newPayments > 9 ? '9+' : newPayments}
                            </span>
                          )}
                          {item.label === 'Cashier Queue' && !isActive && newPayments > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {newPayments > 9 ? '9+' : newPayments}
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight className="h-3 w-3 text-[#6e6e73]" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="border-t border-white/[0.06] p-3 space-y-2">
          <Link
            to="/account/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#2a2a2e] to-[#1a1a1c] text-[12px] font-bold text-[#d2d2d7] ring-1 ring-white/[0.08]">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium text-white leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[10px] text-[#6e6e73] uppercase font-semibold tracking-wide mt-0.5">
                {user.roles[0]?.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#6e6e73]" />
          </Link>

          <Button
            variant="ghost"
            onClick={() => setShowLogoutModal(true)}
            className="w-full justify-start gap-3 px-3 h-10 rounded-lg text-[#86868b] hover:bg-white/[0.06] hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[13px] font-medium">Sign Out</span>
          </Button>
        </div>
      </div>

      <LogoutConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={handleLogout}
      />
    </aside>
  );
}
