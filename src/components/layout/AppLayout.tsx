import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Bell, Search, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useNotifications } from '@/hooks/useNotifications';
import { Role } from '@/lib/constants';

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

interface QuickSearchItem {
  title: string;
  path: string;
  description: string;
  keywords: string[];
  roles: Role[];
}

const quickSearchItems: QuickSearchItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    description: 'Overview and key metrics',
    keywords: ['home', 'overview', 'summary'],
    roles: Object.values(Role),
  },
  {
    title: 'Notifications',
    path: '/notifications',
    description: 'Recent alerts and system updates',
    keywords: ['alerts', 'updates', 'messages'],
    roles: Object.values(Role),
  },
  {
    title: 'Appointments',
    path: '/appointments',
    description: 'Manage bookings and schedules',
    keywords: ['bookings', 'schedule', 'visit'],
    roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN],
  },
  {
    title: 'Book Appointment',
    path: '/appointments/book',
    description: 'Create a new appointment',
    keywords: ['new booking', 'ocular', 'office visit'],
    roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN],
  },
  {
    title: 'Visit Reports',
    path: '/visit-reports',
    description: 'Ocular visit reports',
    keywords: ['site visit', 'reports', 'inspection'],
    roles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
  },
  {
    title: 'Projects',
    path: '/projects',
    description: 'Track project progress',
    keywords: ['jobs', 'work orders', 'fabrication'],
    roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN],
  },
  {
    title: 'Blueprints',
    path: '/blueprints',
    description: 'Blueprint submissions and approvals',
    keywords: ['drawings', 'costings', 'plans'],
    roles: [Role.ENGINEER, Role.CUSTOMER, Role.ADMIN],
  },
  {
    title: 'Fabrication',
    path: '/fabrication',
    description: 'Workshop production tracking',
    keywords: ['production', 'shop floor', 'status'],
    roles: [Role.FABRICATION_STAFF, Role.ENGINEER, Role.ADMIN],
  },
  {
    title: 'Payments',
    path: '/payments',
    description: 'Invoices, proofs, and payment statuses',
    keywords: ['billing', 'invoice', 'proof'],
    roles: [Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN],
  },
  {
    title: 'Cash Flow',
    path: '/cash',
    description: 'Cash collection management',
    keywords: ['collections', 'finance', 'cash'],
    roles: [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN],
  },
  {
    title: 'Cashier Queue',
    path: '/cashier-queue',
    description: 'Pending cashier confirmations',
    keywords: ['queue', 'confirmations', 'cashier'],
    roles: [Role.CASHIER, Role.ADMIN],
  },
  {
    title: 'Reports',
    path: '/reports',
    description: 'System analytics and reports',
    keywords: ['analytics', 'charts', 'insights'],
    roles: [Role.ADMIN, Role.CASHIER],
  },
  {
    title: 'Team',
    path: '/users',
    description: 'User and access management',
    keywords: ['users', 'roles', 'staff'],
    roles: [Role.ADMIN],
  },
  {
    title: 'Settings',
    path: '/settings',
    description: 'System configuration options',
    keywords: ['config', 'preferences', 'admin'],
    roles: [Role.ADMIN],
  },
  {
    title: 'Profile',
    path: '/profile',
    description: 'Your account information',
    keywords: ['account', 'user', 'me'],
    roles: Object.values(Role),
  },
  {
    title: 'Change Password',
    path: '/change-password',
    description: 'Update your login credentials',
    keywords: ['security', 'password', 'credentials'],
    roles: Object.values(Role),
  },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadCount, setNotifications } = useNotificationStore();
  const { data: notificationsData } = useNotifications({ limit: '50' });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  const searchableItems = useMemo(() => {
    if (!user) return [];
    return quickSearchItems.filter((item) => item.roles.some((role) => user.roles.includes(role)));
  }, [user]);

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return searchableItems.slice(0, 8);

    return searchableItems
      .map((item) => {
        const title = item.title.toLowerCase();
        const description = item.description.toLowerCase();
        const keywordMatch = item.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery));

        let score = Number.POSITIVE_INFINITY;
        if (title.startsWith(normalizedQuery)) score = 0;
        else if (title.includes(normalizedQuery)) score = 1;
        else if (description.includes(normalizedQuery)) score = 2;
        else if (keywordMatch) score = 3;

        return { item, score };
      })
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score || a.item.title.localeCompare(b.item.title))
      .map((entry) => entry.item)
      .slice(0, 8);
  }, [searchQuery, searchableItems]);

  useEffect(() => {
    setSearchQuery('');
    setIsSearchOpen(false);
    setHighlightedIndex(0);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!searchContainerRef.current?.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      const isOpenSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isOpenSearchShortcut) return;

      event.preventDefault();
      setIsSearchOpen(true);
      searchInputRef.current?.focus();
    };

    window.addEventListener('keydown', handleGlobalSearchShortcut);
    return () => {
      window.removeEventListener('keydown', handleGlobalSearchShortcut);
    };
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const openPath = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (searchResults.length === 0) return;
      setIsSearchOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (searchResults.length === 0) return;
      setIsSearchOpen(true);
      setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchResults.length > 0) {
        const target = searchResults[Math.min(highlightedIndex, searchResults.length - 1)];
        if (target) {
          openPath(target.path);
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="md:pl-64 transition-all duration-300">
        <header className="hidden md:block sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border">
          <div className="flex h-16 items-center justify-between px-8">
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
              <h1 className="text-lg font-semibold tracking-tight text-foreground leading-tight">{meta.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div ref={searchContainerRef} className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Search pages..."
                    aria-label="Search pages"
                    className="h-9 w-[210px] lg:w-[280px] rounded-lg border border-border bg-muted/50 pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Ctrl+K
                  </kbd>
                </div>

                {isSearchOpen && (
                  <div className="absolute right-0 z-40 mt-2 w-[300px] overflow-hidden rounded-lg border border-border bg-white shadow-lg">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-muted-foreground">No matching pages found.</p>
                    ) : (
                      <ul className="max-h-80 overflow-y-auto py-1">
                        {searchResults.map((result, index) => (
                          <li key={result.path}>
                            <button
                              type="button"
                              onMouseEnter={() => setHighlightedIndex(index)}
                              onClick={() => openPath(result.path)}
                              className={`flex w-full flex-col items-start px-3 py-2 text-left transition-colors ${
                                highlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/70'
                              }`}
                            >
                              <span className="text-sm font-medium text-foreground">{result.title}</span>
                              <span className="text-xs text-muted-foreground">{result.description}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

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

              {user && (
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-white px-2.5 py-1.5 hover:bg-muted transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                    {user.firstName[0]}
                    {user.lastName[0]}
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

        <div className="p-4 pt-[4.5rem] md:p-8 md:pt-8 pb-24 md:pb-8 animate-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
