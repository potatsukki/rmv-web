import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import {
  Bell,
  Search,
  ChevronRight,
  Briefcase,
  CalendarDays,
  Users2,
  Clock,
  Loader2,
  LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useNotifications } from '@/hooks/useNotifications';
import { Role } from '@/lib/constants';
import { api } from '@/lib/api';
import type { Project, Appointment, User } from '@/lib/types';

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

// ── Search helpers ─────────────────────────────────────────────────────────

interface RecentItem {
  type: 'page' | 'project' | 'appointment' | 'user';
  label: string;
  sub?: string;
  path: string;
}

interface FlatResult {
  id: string;
  type: 'page' | 'project' | 'appointment' | 'user' | 'recent';
  title: string;
  subtitle?: string;
  badge?: string;
  path: string;
}

const RECENT_KEY = 'rmv_recent';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  blueprint: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  payment_pending: 'bg-yellow-100 text-yellow-700',
  fabrication: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  requested: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-teal-100 text-teal-700',
  no_show: 'bg-red-100 text-red-600',
  reschedule_requested: 'bg-amber-100 text-amber-700',
};

const CATEGORY_META: Record<FlatResult['type'], { label: string; icon: React.ElementType }> = {
  page: { label: 'Pages', icon: LayoutDashboard },
  project: { label: 'Projects', icon: Briefcase },
  appointment: { label: 'Appointments', icon: CalendarDays },
  user: { label: 'People', icon: Users2 },
  recent: { label: 'Recently Visited', icon: Clock },
};

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadCount, setNotifications } = useNotificationStore();
  const { data: notificationsData } = useNotifications({ limit: '50' });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce the search query 300 ms before hitting the APIs
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;

  // ── Live search queries ────────────────────────────────────────────────
  const { data: liveProjects, isFetching: projectsFetching } = useQuery({
    queryKey: ['omnibox', 'projects', debouncedQuery],
    queryFn: () =>
      api
        .get<{ success: boolean; data: { items: Project[] } }>('/projects', {
          params: { search: debouncedQuery, limit: '5' },
        })
        .then((r) => r.data.data.items),
    enabled: !!debouncedQuery,
    staleTime: 30_000,
  });

  const { data: liveAppointments, isFetching: appointmentsFetching } = useQuery({
    queryKey: ['omnibox', 'appointments', debouncedQuery],
    queryFn: () =>
      api
        .get<{ success: boolean; data: { items: Appointment[] } }>('/appointments', {
          params: { search: debouncedQuery, limit: '5' },
        })
        .then((r) => r.data.data.items),
    enabled: !!debouncedQuery,
    staleTime: 30_000,
  });

  const { data: liveUsers, isFetching: usersFetching } = useQuery({
    queryKey: ['omnibox', 'users', debouncedQuery],
    queryFn: () =>
      api
        .get<{ success: boolean; data: User[] }>('/users/admin/users', {
          params: { search: debouncedQuery, limit: '5' },
        })
        .then((r) => r.data.data),
    enabled: !!debouncedQuery && isAdmin,
    staleTime: 30_000,
  });

  const isLiveLoading = projectsFetching || appointmentsFetching || (isAdmin && usersFetching);

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

  // Unified flat results used for both display and keyboard navigation
  const displayResults = useMemo((): FlatResult[] => {
    if (!searchQuery.trim()) {
      return recentItems.map((r, i) => ({
        id: `recent-${i}`,
        type: 'recent' as const,
        title: r.label,
        subtitle: r.sub,
        path: r.path,
      }));
    }

    const q = searchQuery.trim().toLowerCase();

    const pages = searchableItems
      .map((item) => {
        const title = item.title.toLowerCase();
        const description = item.description.toLowerCase();
        const keywordMatch = item.keywords.some((kw) => kw.toLowerCase().includes(q));
        let score = Number.POSITIVE_INFINITY;
        if (title.startsWith(q)) score = 0;
        else if (title.includes(q)) score = 1;
        else if (description.includes(q)) score = 2;
        else if (keywordMatch) score = 3;
        return { item, score };
      })
      .filter((e) => Number.isFinite(e.score))
      .sort((a, b) => a.score - b.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 4)
      .map((e): FlatResult => ({
        id: `page-${e.item.path}`,
        type: 'page',
        title: e.item.title,
        subtitle: e.item.description,
        path: e.item.path,
      }));

    const projects = (liveProjects ?? []).map((p): FlatResult => ({
      id: `project-${p._id}`,
      type: 'project',
      title: p.title,
      subtitle: [p.serviceType, p.customerName].filter(Boolean).join(' · '),
      badge: p.status,
      path: `/projects/${p._id}`,
    }));

    const appointments = (liveAppointments ?? []).map((a): FlatResult => ({
      id: `appointment-${a._id}`,
      type: 'appointment',
      title: a.customerName ?? 'Appointment',
      subtitle: [a.purpose, a.date].filter(Boolean).join(' · '),
      badge: a.status,
      path: `/appointments/${a._id}`,
    }));

    const users = (liveUsers ?? []).map((u): FlatResult => ({
      id: `user-${u._id}`,
      type: 'user',
      title: `${u.firstName} ${u.lastName}`,
      subtitle: u.email,
      path: '/users',
    }));

    return [...pages, ...projects, ...appointments, ...users];
  }, [searchQuery, searchableItems, liveProjects, liveAppointments, liveUsers, recentItems]);

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

  const openResult = (result: FlatResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (result.type !== 'recent') {
      const newItem: RecentItem = {
        type: result.type as RecentItem['type'],
        label: result.title,
        sub: result.subtitle,
        path: result.path,
      };
      const updated = [newItem, ...recentItems.filter((r) => r.path !== result.path)].slice(0, 5);
      setRecentItems(updated);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch {}
    }
    navigate(result.path);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (displayResults.length === 0) return;
      setIsSearchOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % displayResults.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (displayResults.length === 0) return;
      setIsSearchOpen(true);
      setHighlightedIndex((prev) => (prev - 1 + displayResults.length) % displayResults.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (displayResults.length > 0) {
        const target = displayResults[Math.min(highlightedIndex, displayResults.length - 1)];
        if (target) openResult(target);
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
                    placeholder="Search anything..."
                    aria-label="Search"
                    className="h-9 w-[210px] lg:w-[280px] rounded-lg border border-border bg-muted/50 pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Ctrl+K
                  </kbd>
                </div>

                {isSearchOpen && (
                  <div className="absolute right-0 z-40 mt-2 w-[400px] overflow-hidden rounded-xl border border-border bg-white shadow-xl">
                    {!searchQuery.trim() ? (
                      /* Empty state: recently visited */
                      recentItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                          <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                          <p className="text-sm font-medium text-foreground">Search anything</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pages, projects, appointments, and people
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Recently Visited
                            </span>
                          </div>
                          <ul className="pb-2">
                            {displayResults.map((result, index) => (
                              <li key={result.id}>
                                <button
                                  type="button"
                                  onMouseEnter={() => setHighlightedIndex(index)}
                                  onClick={() => openResult(result)}
                                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                                    highlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/70'
                                  }`}
                                >
                                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                  <div className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-foreground">
                                      {result.title}
                                    </span>
                                    {result.subtitle && (
                                      <span className="block truncate text-xs text-muted-foreground">
                                        {result.subtitle}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )
                    ) : (
                      /* Active search results */
                      <>
                        {isLiveLoading && debouncedQuery !== searchQuery.trim() && (
                          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Searching…
                          </div>
                        )}
                        {displayResults.length === 0 && !isLiveLoading ? (
                          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No results for &ldquo;{searchQuery}&rdquo;
                          </p>
                        ) : (
                          <ul className="max-h-[420px] overflow-y-auto py-1">
                            {displayResults.map((result, index) => {
                              const prevType = displayResults[index - 1]?.type ?? null;
                              const showHeader = result.type !== prevType;
                              const meta = CATEGORY_META[result.type];
                              const Icon = meta.icon;

                              return (
                                <li key={result.id}>
                                  {showHeader && (
                                    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {meta.label}
                                      </span>
                                      {result.type === 'project' && projectsFetching && (
                                        <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
                                      )}
                                      {result.type === 'appointment' && appointmentsFetching && (
                                        <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
                                      )}
                                      {result.type === 'user' && usersFetching && (
                                        <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
                                      )}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    onClick={() => openResult(result)}
                                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                                      highlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/70'
                                    }`}
                                  >
                                    <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium text-foreground">
                                        {result.title}
                                      </span>
                                      {result.subtitle && (
                                        <span className="block truncate text-xs text-muted-foreground">
                                          {result.subtitle}
                                        </span>
                                      )}
                                    </div>
                                    {result.badge && (
                                      <span
                                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                          STATUS_COLORS[result.badge] ?? 'bg-gray-100 text-gray-600'
                                        }`}
                                      >
                                        {result.badge.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                    <div className="border-t border-border px-3 py-1.5 text-center text-[10px] text-muted-foreground">
                      <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>{' '}
                      navigate &nbsp;·&nbsp;{' '}
                      <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">↵</kbd>{' '}
                      open &nbsp;·&nbsp;{' '}
                      <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">Esc</kbd>{' '}
                      close
                    </div>
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
