import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { cn } from '@/lib/utils';
import { mobileBottomTabItems, mobileMenuItems } from './navigation';
import {
  Bell,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
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

export function MobileNav() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const filteredTabs = mobileBottomTabItems
    .filter((item) => user.roles.some((r) => item.roles.includes(r)))
    .slice(0, 4);

  const filteredMenu = mobileMenuItems.filter((item) =>
    user.roles.some((r) => item.roles.includes(r)),
  );

  useEffect(() => {
    if (!menuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusableElements = () => {
      const drawer = drawerRef.current;
      if (!drawer) return [] as HTMLElement[];
      return Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    };

    const focusableElements = getFocusableElements();
    focusableElements[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

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
    <>
      {/* Top bar */}
      <header className="metal-panel md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b px-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <BrandLogo className="h-8 w-8 ring-2 ring-[#cfd6de]/50 shadow-[0_10px_20px_rgba(20,24,30,0.12)]" />
          <span className="text-[15px] font-bold tracking-tight text-[#171b21]">RMV</span>
        </Link>
        <div className="flex-1" />
        <Link
          to="/notifications"
          className="metal-pill relative flex h-9 w-9 items-center justify-center rounded-xl text-[#5e6671] transition-colors hover:text-[#171b21]"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="metal-pill ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-[#5e6671] transition-colors hover:text-[#171b21]"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Slide-out menu overlay */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-drawer"
            ref={drawerRef}
            tabIndex={-1}
            className="metal-panel absolute bottom-0 right-0 top-0 flex h-full w-[280px] flex-col shadow-2xl animate-in slide-in-from-right-full duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="metal-panel-strong px-6 pb-6 pt-14 text-white">
              <div className="flex items-center gap-4">
                <div className="silver-sheen flex h-12 w-12 items-center justify-center rounded-xl ring-2 ring-white/18 shadow-lg">
                  <User className="h-6 w-6 text-[#2b3138]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="h-3 w-3 text-[#d7dee5]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#95a0ac]">
                      {user.roles[0]?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3">
              <div className="space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    location.pathname === '/profile'
                      ? 'bg-[linear-gradient(180deg,#eef2f6_0%,#dde3e9_100%)] text-[#171b21] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]'
                      : 'text-[#5f6872] hover:bg-white/55',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <User
                      className={cn(
                        'h-[18px] w-[18px]',
                        location.pathname === '/profile' ? 'text-[#171b21]' : 'text-[#77808a]',
                      )}
                    />
                    <span>My Profile</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#9ca6b1]" />
                </Link>

                <div className="my-2 mx-3 h-px bg-[#d2d8df]" />

                {filteredMenu.map((item) => {
                  const isActive = isNavItemActive(location.pathname, item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[linear-gradient(180deg,#eef2f6_0%,#dde3e9_100%)] text-[#171b21] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]'
                          : 'text-[#5f6872] hover:bg-white/55',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            'h-[18px] w-[18px]',
                            isActive ? 'text-[#171b21]' : 'text-[#77808a]',
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#9ca6b1]" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#d2d8df] p-4">
              <Button
                variant="outline"
                className="h-11 w-full justify-center gap-2 font-medium text-[#5f6872] hover:border-[#d49a95] hover:bg-[#fff1ef] hover:text-[#b24f48]"
                onClick={() => { setMenuOpen(false); setShowLogoutModal(true); }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={handleLogout}
      />

      {/* Bottom tab bar */}
      <nav
        className="metal-panel md:hidden fixed bottom-0 left-0 right-0 z-40 border-t pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary mobile navigation"
      >
        <div className="flex">
          {filteredTabs.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-semibold transition-all relative min-w-0',
                  isActive ? 'text-[#171b21]' : 'text-[#77818c] active:text-[#5f6872]',
                )}
              >
                {isActive && (
                  <div className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-[linear-gradient(90deg,#7f8b97_0%,#dce3ea_50%,#7f8b97_100%)]" />
                )}
                <item.icon
                  className={cn(
                    'h-5 w-5 mb-0.5',
                    isActive && 'drop-shadow-sm',
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
