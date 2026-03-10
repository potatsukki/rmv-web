import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useNotifications } from '@/hooks/useNotifications';
import { connectSocket } from '@/lib/socket';
import { Role } from '@/lib/constants';
import { api } from '@/lib/api';
import { canAccessPath } from '@/lib/auth-routing';
import { getVisibleNavigationPaths } from './navigation';
import toast from 'react-hot-toast';
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
  users: { title: 'Manage Accounts', description: 'User and access management' },
  settings: { title: 'Settings', description: 'System configuration' },
  notifications: { title: 'Notifications', description: 'Updates and alerts' },
  account: { title: 'Account Settings', description: 'Manage your account' },
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
    roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.ADMIN],
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
    title: 'Payments',
    path: '/payments',
    description: 'Invoices, proofs, and payment statuses',
    keywords: ['billing', 'invoice', 'proof'],
    roles: [Role.CUSTOMER, Role.CASHIER, Role.ADMIN],
  },
  {
    title: 'Cash Flow',
    path: '/cash',
    description: 'Cash collection management',
    keywords: ['collections', 'finance', 'cash'],
    roles: [Role.CASHIER, Role.ADMIN],
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
    title: 'Manage Accounts',
    path: '/users',
    description: 'User accounts, roles, and access control',
    keywords: ['users', 'roles', 'staff', 'accounts', 'access'],
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
    path: '/account/profile',
    description: 'Your account information',
    keywords: ['account', 'user', 'me'],
    roles: Object.values(Role),
  },
  {
    title: 'Security',
    path: '/account/security',
    description: 'Change your password',
    keywords: ['password', 'credentials', 'security'],
    roles: Object.values(Role),
  },
  {
    title: 'Notification Preferences',
    path: '/account/notifications',
    description: 'Manage notification settings',
    keywords: ['preferences', 'alerts', 'email'],
    roles: Object.values(Role),
  },
  {
    title: 'Account Info',
    path: '/account/info',
    description: 'View account details',
    keywords: ['info', 'details', 'member'],
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

const RECENT_KEY_PREFIX = 'rmv_recent';
const ALWAYS_SEARCHABLE_PATHS = new Set([
  '/account/profile',
  '/account/security',
  '/account/notifications',
  '/account/info',
]);

function getRecentStorageKey(userId?: string) {
  return `${RECENT_KEY_PREFIX}:${userId || 'anonymous'}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'border border-[#c6ccd3] bg-[linear-gradient(180deg,#eef2f5_0%,#dde3e8_100%)] text-[#5b6470]',
  submitted: 'border border-[#8da4b8] bg-[linear-gradient(180deg,#eef4f9_0%,#d8e4ee_100%)] text-[#4f6679]',
  blueprint: 'border border-[#afa7c5] bg-[linear-gradient(180deg,#f2f1f8_0%,#e0dced_100%)] text-[#665d82]',
  approved: 'border border-[#93ad9d] bg-[linear-gradient(180deg,#eef6f1_0%,#dceade_100%)] text-[#4e6c5a]',
  payment_pending: 'border border-[#c7aa7a] bg-[linear-gradient(180deg,#f8f0e5_0%,#ebdcc6_100%)] text-[#7e6239]',
  fabrication: 'border border-[#c4a07d] bg-[linear-gradient(180deg,#f8f1e9_0%,#ecdcc8_100%)] text-[#7b5d3f]',
  completed: 'border border-[#93ad9d] bg-[linear-gradient(180deg,#eef6f1_0%,#dceade_100%)] text-[#4e6c5a]',
  cancelled: 'border border-[#cb8b86] bg-[linear-gradient(180deg,#fbefed_0%,#efd7d4_100%)] text-[#87544f]',
  requested: 'border border-[#8eafbb] bg-[linear-gradient(180deg,#eef7f8_0%,#d8eaee_100%)] text-[#4f6d78]',
  confirmed: 'border border-[#8da4b8] bg-[linear-gradient(180deg,#eef4f9_0%,#d8e4ee_100%)] text-[#4f6679]',
  no_show: 'border border-[#cb8b86] bg-[linear-gradient(180deg,#fbefed_0%,#efd7d4_100%)] text-[#87544f]',
  reschedule_requested: 'border border-[#c4a07d] bg-[linear-gradient(180deg,#f8f1e9_0%,#ecdcc8_100%)] text-[#7b5d3f]',
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
  const { unreadCount, setNotifications, addNotification } = useNotificationStore();
  const { data: notificationsData } = useNotifications({ limit: '50' });
  const queryClient = useQueryClient();

  // ── Real-time socket connection ──────────────────────────────────────
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!user) return;
    const sock = connectSocket();

    const handleNewNotification = (n: import('@/lib/types').Notification) => {
      addNotificationRef.current(n);
      queryClientRef.current.invalidateQueries({ queryKey: ['notifications'] });
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast(n.title + ': ' + n.message);
    };

    sock.on('notification:new', handleNewNotification);

    return () => {
      sock.off('notification:new', handleNewNotification);
    };
  }, [user]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce the search query 300 ms before hitting the APIs
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;

  const visibleNavigationPaths = useMemo(() => {
    if (!user) return new Set<string>();
    return getVisibleNavigationPaths(user.roles);
  }, [user]);

  const allowedPagePaths = useMemo(() => {
    if (!user) return new Set<string>();

    return new Set(
      quickSearchItems
        .filter((item) => item.roles.some((role) => user.roles.includes(role)))
        .filter((item) => canAccessPath(item.path, user.roles))
        .filter((item) => visibleNavigationPaths.has(item.path) || ALWAYS_SEARCHABLE_PATHS.has(item.path))
        .map((item) => item.path),
    );
  }, [user, visibleNavigationPaths]);

  const canSearchProjects = allowedPagePaths.has('/projects');
  const canSearchAppointments = allowedPagePaths.has('/appointments');
  const canSearchUsers = allowedPagePaths.has('/users');

  useEffect(() => {
    if (!user) {
      setRecentItems([]);
      return;
    }

    try {
      const raw = localStorage.getItem(getRecentStorageKey(user._id));
      const parsed = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(parsed)
        ? parsed.filter((item): item is RecentItem => {
            if (!item || typeof item !== 'object') return false;
            if (typeof item.path !== 'string' || typeof item.label !== 'string') return false;
            return canAccessPath(item.path, user.roles)
              && (visibleNavigationPaths.has(item.path) || ALWAYS_SEARCHABLE_PATHS.has(item.path));
          })
        : [];
      setRecentItems(filtered);
    } catch {
      setRecentItems([]);
    }
  }, [user, visibleNavigationPaths]);

  // ── Live search queries ────────────────────────────────────────────────
  const { data: liveProjects, isFetching: projectsFetching } = useQuery({
    queryKey: ['omnibox', 'projects', debouncedQuery],
    queryFn: () =>
      api
        .get<{ success: boolean; data: { items: Project[] } }>('/projects', {
          params: { search: debouncedQuery, limit: '5' },
        })
        .then((r) => r.data.data.items),
    enabled: !!debouncedQuery && canSearchProjects,
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
    enabled: !!debouncedQuery && canSearchAppointments,
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
    enabled: !!debouncedQuery && isAdmin && canSearchUsers,
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
    return quickSearchItems.filter(
      (item) => item.roles.some((role) => user.roles.includes(role)) && canAccessPath(item.path, user.roles),
    );
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

    const projectItems = canSearchProjects ? (liveProjects ?? []) : [];
    const appointmentItems = canSearchAppointments ? (liveAppointments ?? []) : [];
    const userItems = canSearchUsers ? (liveUsers ?? []) : [];

    const projects = projectItems.map((p): FlatResult => ({
      id: `project-${p._id}`,
      type: 'project',
      title: p.title,
      subtitle: [p.serviceType, p.customerName].filter(Boolean).join(' · '),
      badge: p.status,
      path: `/projects/${p._id}`,
    }));

    const appointments = appointmentItems.map((a): FlatResult => ({
      id: `appointment-${a._id}`,
      type: 'appointment',
      title: a.customerName ?? 'Appointment',
      subtitle: [a.purpose, a.date].filter(Boolean).join(' · '),
      badge: a.status,
      path: `/appointments/${a._id}`,
    }));

    const users = userItems.map((u): FlatResult => ({
      id: `user-${u._id}`,
      type: 'user',
      title: `${u.firstName} ${u.lastName}`,
      subtitle: u.email,
      path: '/users',
    }));

    return [...pages, ...projects, ...appointments, ...users];
  }, [searchQuery, searchableItems, liveProjects, liveAppointments, liveUsers, recentItems, canSearchProjects, canSearchAppointments, canSearchUsers]);

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
      if (user?._id) {
        try {
          localStorage.setItem(getRecentStorageKey(user._id), JSON.stringify(updated));
        } catch {}
      }
    }
    navigate(result.path);
  };

  const clearRecentItems = () => {
    setRecentItems([]);
    if (!user?._id) return;

    try {
      localStorage.removeItem(getRecentStorageKey(user._id));
    } catch {}
  };

  const removeRecentItem = (path: string) => {
    const updated = recentItems.filter((item) => item.path !== path);
    setRecentItems(updated);

    if (!user?._id) return;

    try {
      if (updated.length === 0) {
        localStorage.removeItem(getRecentStorageKey(user._id));
      } else {
        localStorage.setItem(getRecentStorageKey(user._id), JSON.stringify(updated));
      }
    } catch {}
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

      <main className="metal-shell transition-all duration-300 md:pl-64">
        <header className="metal-panel sticky top-0 z-30 hidden border-b md:block">
          <div className="flex h-14 items-center justify-between px-6 lg:px-8">
            <div className="flex min-w-0 flex-col justify-center">
              <div className="mb-0.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78818c]">
                <span>Workspace</span>
                {breadcrumbs.length > 0 && <span className="h-1 w-1 rounded-full bg-[#b3bcc6]" />}
                <span className="truncate text-[#4d5560]">{meta.title}</span>
              </div>
              {breadcrumbs.length > 1 ? (
                <nav className="flex items-center gap-1 text-xs text-muted-foreground">
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
              ) : (
                <p className="text-xs text-[#8b8b94]">{meta.description}</p>
              )}
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
                    className="metal-input h-9 w-[200px] rounded-xl pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#c2cad3] lg:w-[250px]"
                  />
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#c7cfd7] bg-white/55 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Ctrl+K
                  </kbd>
                </div>

                {isSearchOpen && (
                  <div className="metal-panel absolute right-0 z-40 mt-2 w-[400px] overflow-hidden rounded-[1.25rem]">
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
                            <button
                              type="button"
                              onClick={clearRecentItems}
                              className="ml-auto rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/55 hover:text-foreground"
                            >
                              Clear recent
                            </button>
                          </div>
                          <ul className="pb-2">
                            {displayResults.map((result, index) => (
                              <li key={result.id}>
                                <div
                                  onMouseEnter={() => setHighlightedIndex(index)}
                                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                                    highlightedIndex === index ? 'bg-white/60' : 'hover:bg-white/45'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => openResult(result)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                                  <button
                                    type="button"
                                    aria-label={`Remove ${result.title} from recent items`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeRecentItem(result.path);
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )
                    ) : (
                      /* Active search results */
                      <>
                        {isLiveLoading && debouncedQuery !== searchQuery.trim() && (
                          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
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
                                      highlightedIndex === index ? 'bg-white/60' : 'hover:bg-white/45'
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
                                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${
                                          STATUS_COLORS[result.badge] ?? 'border border-[#c6ccd3] bg-[linear-gradient(180deg,#eef2f5_0%,#dde3e8_100%)] text-[#5b6470]'
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
                className="metal-pill relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {user && (
                <Link
                  to="/account/profile"
                  className="metal-pill flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:text-[#11151a]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[linear-gradient(180deg,#24282f_0%,#15191f_100%)] text-[11px] font-bold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
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

        <div className="animate-page px-3 pb-28 pt-[4.5rem] py-4 sm:px-4 md:px-8 md:pb-8 md:pt-6 md:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
