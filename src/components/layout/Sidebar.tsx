import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useDashboardSummary } from '@/hooks/useReports';
import { cn } from '@/lib/utils';
import { sidebarNavGroups } from './navigation';
import {
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { LogoutConfirmModal } from '@/components/shared/LogoutConfirmModal';

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
      <div className="absolute inset-0 border-r border-white/[0.06] bg-[linear-gradient(180deg,rgba(15,20,27,0.98)_0%,rgba(8,11,16,0.985)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(235,240,245,0.14)_0%,rgba(255,255,255,0)_34%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_22%)]" />
      <div className="absolute inset-0 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.04)]" />

      <div className="relative flex flex-col h-full">
        <Link to="/" className="flex h-16 items-center gap-3 border-b border-white/[0.08] px-5 transition-colors hover:bg-white/[0.035]">
          <BrandLogo className="h-9 w-9 ring-2 ring-[#d8e0e8]/28 shadow-[0_10px_24px_rgba(0,0,0,0.12)]" />
          <div className="flex flex-col">
            <span className="text-[13px] font-bold leading-tight tracking-tight text-[#f5f7fa]">
              RMV Stainless Steel<br/>Fabrication
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8f9aa6]">
              Management System
            </span>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {sidebarNavGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.some((role) => user.roles.includes(role)),
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <h3 className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#89939e]">
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
                          'group relative flex items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-[linear-gradient(180deg,rgba(247,249,251,0.17)_0%,rgba(198,206,215,0.09)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.18)]'
                            : 'text-[#9aa4af] hover:bg-white/[0.05] hover:text-[#eef2f6]',
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[linear-gradient(180deg,#f8fbff_0%,#a9b4bf_100%)]" />
                        )}

                        <div className="flex items-center gap-3">
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] transition-colors',
                              isActive
                                ? 'text-[#f6f8fb]'
                                : 'text-[#75808c] group-hover:text-[#cfd6dd]',
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
                            <ChevronRight className="h-3 w-3 text-[#9aa4af]" />
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

        <div className="space-y-2 border-t border-white/[0.08] bg-black/12 p-3">
          <Link
            to="/account/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
          >
            <div className="silver-sheen flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold text-[#2b3138] ring-1 ring-white/[0.12]">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium leading-tight text-white">
                {user.firstName} {user.lastName}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-[#919ca7]">
                {user.roles[0]?.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#919ca7]" />
          </Link>

          <Button
            variant="ghost"
            onClick={() => setShowLogoutModal(true)}
            className="h-10 w-full justify-start gap-3 rounded-xl px-3 text-[#a3adb8] hover:bg-white/[0.06] hover:text-[#ef9a92]"
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
