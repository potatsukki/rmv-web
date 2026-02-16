import { Outlet, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Bell, Search, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useNotifications } from '@/hooks/useNotifications';

const pageMeta: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard', description: 'Your project overview at a glance' },
  appointments: { title: 'Appointments', description: 'Manage visits and schedules' },
  projects: { title: 'Projects', description: 'Track all fabrication projects' },
  blueprints: { title: 'Blueprints', description: 'Technical drawings & costings' },
  fabrication: { title: 'Fabrication', description: 'Workshop progress & updates' },
  payments: { title: 'Payments', description: 'Invoices and payment tracking' },
  cash: { title: 'Cash Flow', description: 'Cash collection management' },
  reports: { title: 'Reports', description: 'Analytics and insights' },
  users: { title: 'Team', description: 'User management' },
  settings: { title: 'Settings', description: 'System configuration' },
  notifications: { title: 'Notifications', description: 'Updates and alerts' },
  profile: { title: 'Profile', description: 'Your account details' },
  'change-password': { title: 'Change Password', description: 'Update your credentials' },
  'cashier-queue': { title: 'Cashier Queue', description: 'Process pending payments' },
};

export function AppLayout() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { unreadCount, setNotifications } = useNotificationStore();
  const { data: notificationsData } = useNotifications({ limit: '50' });

  useEffect(() => {
    if (notificationsData?.items) {
      setNotifications(notificationsData.items);
    }
  }, [notificationsData, setNotifications]);

  const segments = location.pathname.split('/').filter(Boolean);
  const pageKey = segments[0] || 'dashboard';
  const meta = pageMeta[pageKey] || {
    title: pageKey.charAt(0).toUpperCase() + pageKey.slice(1).replace(/-/g, ' '),
    description: '',
  };

  // Build breadcrumbs
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      {/* Main content area */}
      <main className="md:pl-64 transition-all duration-300">
        {/* Desktop Header */}
        <header className="hidden md:block sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border">
          <div className="flex h-16 items-center justify-between px-8">
            {/* Left: Breadcrumbs + Title */}
            <div className="flex flex-col justify-center">
              {breadcrumbs.length > 1 && (
                <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={crumb.path} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3" />}
                      {crumb.isLast ? (
                        <span className="font-medium text-foreground">{crumb.label}</span>
                      ) : (
                        <Link to={crumb.path} className="hover:text-foreground transition-colors">
                          {crumb.label}
                        </Link>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              <h1 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
                {meta.title}
              </h1>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Search placeholder */}
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Search (coming soon)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Search...</span>
                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-white px-1.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User avatar */}
              {user && (
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-white px-2.5 py-1.5 hover:bg-muted transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-foreground leading-none">{user.firstName}</p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                      {user.roles[0]?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 pt-[4.5rem] md:p-8 md:pt-8 pb-24 md:pb-8 animate-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
