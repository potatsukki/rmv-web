import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { Role } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Calendar,
  FolderKanban,
  CreditCard,
  Wrench,
  BarChart3,
  Settings,
  Users,
  Bell,
  LogOut,
  Home,
  DollarSign,
  FileText,
  ChevronRight,
  Hammer,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    ],
  },
  {
    title: 'Financials',
    items: [
      {
        label: 'Payments',
        path: '/payments',
        icon: CreditCard,
        roles: [Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN],
      },
      {
        label: 'Cash Flow',
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
      { label: 'Settings', path: '/settings', icon: Settings, roles: [Role.ADMIN] },
    ],
  },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col md:flex">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800/50" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Logo Header */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-600/20">
            <Wrench className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-white">
              RMV Stainless
            </span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em]">
              Management System
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.some((role) => user.roles.includes(role)),
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path || 
                      (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'group relative flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-white/[0.08] text-white'
                            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200',
                        )}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-orange-500" />
                        )}

                        <div className="flex items-center gap-3">
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] transition-colors',
                              isActive
                                ? 'text-orange-400'
                                : 'text-gray-500 group-hover:text-gray-400',
                            )}
                          />
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.label === 'Notifications' && unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight className="h-3 w-3 text-gray-500" />
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
        <div className="border-t border-white/[0.06] p-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 text-[12px] font-bold text-orange-400 ring-1 ring-white/[0.08]">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium text-white leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[10px] text-gray-500 uppercase font-semibold tracking-wide mt-0.5">
                {user.roles[0]?.replace(/_/g, ' ')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogout();
              }}
              className="h-8 w-8 text-gray-500 hover:bg-white/[0.08] hover:text-red-400"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
