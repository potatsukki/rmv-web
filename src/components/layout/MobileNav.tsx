import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { Role } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Calendar,
  FolderKanban,
  CreditCard,
  Home,
  Bell,
  Menu,
  X,
  LogOut,
  Settings,
  BarChart3,
  Users,
  DollarSign,
  FileText,
  User,
  Shield,
  Hammer,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/shared/BrandLogo';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
}

const bottomTabItems: NavItem[] = [
  { label: 'Home', path: '/dashboard', icon: Home, roles: Object.values(Role) },
  {
    label: 'Visits',
    path: '/appointments',
    icon: Calendar,
    roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN],
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN],
  },
  {
    label: 'Finance',
    path: '/payments',
    icon: CreditCard,
    roles: [Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN],
  },
];

const menuItems: NavItem[] = [
  {
    label: 'Visit Reports',
    path: '/visit-reports',
    icon: ClipboardList,
    roles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
  },
  {
    label: 'Blueprints',
    path: '/blueprints',
    icon: FileText,
    roles: [Role.ENGINEER, Role.CUSTOMER, Role.ADMIN],
  },
  {
    label: 'Fabrication',
    path: '/fabrication',
    icon: Hammer,
    roles: [Role.FABRICATION_STAFF, Role.ENGINEER, Role.ADMIN],
  },
  {
    label: 'Cash Management',
    path: '/cash',
    icon: DollarSign,
    roles: [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN],
  },
  {
    label: 'Cashier Queue',
    path: '/cashier-queue',
    icon: CreditCard,
    roles: [Role.CASHIER, Role.ADMIN],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    roles: [Role.ADMIN, Role.CASHIER],
  },
  { label: 'Team', path: '/users', icon: Users, roles: [Role.ADMIN] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: [Role.ADMIN] },
];

export function MobileNav() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const filteredTabs = bottomTabItems
    .filter((item) => user.roles.some((r) => item.roles.includes(r)))
    .slice(0, 4);

  const filteredMenu = menuItems.filter((item) =>
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/90 backdrop-blur-xl border-b border-border flex items-center px-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <BrandLogo className="h-8 w-8 ring-2 ring-orange-500/20 shadow-sm" />
          <span className="font-bold tracking-tight text-foreground text-[15px]">RMV</span>
        </Link>
        <div className="flex-1" />
        <Link
          to="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors ml-1"
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
            className="absolute right-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right-full duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header - User Info */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 px-6 pt-14 pb-6 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 ring-2 ring-orange-500/50 shadow-lg">
                  <User className="h-6 w-6 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      {user.roles[0]?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              <div className="space-y-0.5">
                {/* Profile link */}
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === '/profile'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <User
                      className={cn(
                        'h-[18px] w-[18px]',
                        location.pathname === '/profile' ? 'text-orange-500' : 'text-gray-400',
                      )}
                    />
                    <span>My Profile</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </Link>

                {/* Separator */}
                <div className="my-2 mx-3 h-px bg-gray-100" />

                {/* Menu items */}
                {filteredMenu.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            'h-[18px] w-[18px]',
                            isActive ? 'text-orange-500' : 'text-gray-400',
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Logout Footer */}
            <div className="p-4 border-t border-gray-100">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 h-11 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-medium"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary mobile navigation"
      >
        <div className="flex">
          {filteredTabs.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-semibold transition-all relative',
                  isActive ? 'text-orange-600' : 'text-gray-400 active:text-gray-600',
                )}
              >
                {isActive && (
                  <div className="absolute top-0 inset-x-4 h-0.5 bg-orange-500 rounded-b-full" />
                )}
                <item.icon
                  className={cn(
                    'h-5 w-5 mb-0.5',
                    isActive && 'drop-shadow-sm',
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
