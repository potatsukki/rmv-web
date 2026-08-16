import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  CheckCircle2,
  ExternalLink,
  Search,
  LayoutGrid,
  CalendarDays,
  CalendarClock,
  FolderOpen,
  CreditCard,
  FileText,
  Wrench,
  Settings,
  Filter,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { useNotificationStore } from '@/stores/notification.store';
import type { Notification } from '@/lib/types';
import { extractItems, formatApiTimeAgo } from '@/lib/utils';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';

const CATEGORY_TABS = [
  { label: 'All', value: 'all', icon: LayoutGrid },
  { label: 'Appointments', value: 'appointment', icon: CalendarDays },
  { label: 'Reschedule', value: 'reschedule', icon: CalendarClock },
  { label: 'Projects', value: 'project', icon: FolderOpen },
  { label: 'Payments', value: 'payment', icon: CreditCard },
  { label: 'Blueprints', value: 'blueprint', icon: FileText },
  { label: 'Fabrication', value: 'fabrication', icon: Wrench },
  { label: 'System', value: 'system', icon: Settings },
] as const;

function isRescheduleNotification(notification: Notification): boolean {
  const haystack = `${notification.title} ${notification.message}`.toLowerCase();
  return notification.category === 'appointment' && haystack.includes('reschedule');
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = extractItems<Notification>(data);

  const filteredNotifications = useMemo(
    () => {
      const normalizedQuery = searchQuery.trim().toLowerCase();

      return notifications.filter((notification) => {
        const matchesCategory =
          activeFilter === 'all'
          || (activeFilter === 'reschedule' && isRescheduleNotification(notification))
          || notification.category === activeFilter;

        const matchesSearch =
          normalizedQuery.length === 0 ||
          notification.title.toLowerCase().includes(normalizedQuery) ||
          notification.message.toLowerCase().includes(normalizedQuery);

        return matchesCategory && matchesSearch;
      });
    },
    [notifications, activeFilter, searchQuery],
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    setNotifications(notifications);
  }, [notifications, setNotifications]);

  // Auto-mark all as read when visiting the notifications page
  useEffect(() => {
    if (unreadCount > 0 && !markAllAsRead.isPending) {
      markAllAsRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardClick = (n: Notification) => {
    if (!n.isRead) markAsRead.mutate(String(n._id));
    if (n.link) navigate(n.link);
  };

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Notifications"
        title={<>Stay <em>updated</em> on what matters.</>}
        description="View appointment, project, payment, and fabrication updates in one place."
        image="/landing/about-legacy-welder.png"
        actions={(unreadCount > 0 || notifications.length > 0) ? <Button variant="outline" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending || unreadCount === 0} className="min-h-11 rounded-lg border-white/20 bg-black/30 text-white hover:bg-white/10 hover:text-white"><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button> : undefined}
      />
      <div className="workspace-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="workspace-icon h-12 w-12 shrink-0">
                <Filter className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-[#f7f7f5] sm:text-2xl">
                  Find the right update fast
                </h2>
                <p className="max-w-xl text-sm leading-6 text-slate-400 sm:text-[14px]">
                  Search message copy, then narrow the stream by notification category.
                </p>
              </div>
            </div>

            {(unreadCount > 0 || notifications.length > 0) ? (
              <Button
                variant="ghost"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending || unreadCount === 0}
                className="hidden h-10 rounded-full px-3 text-[#4f5b68] hover:bg-slate-900/5 hover:text-[#171b21] dark:text-[#d7dee8] dark:hover:bg-white/10 dark:hover:text-white sm:inline-flex"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            ) : null}
          </div>

          {(unreadCount > 0 || notifications.length > 0) ? (
            <Button
              variant="ghost"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending || unreadCount === 0}
              className="inline-flex h-10 self-end rounded-full px-4 text-[#4f5b68] hover:bg-slate-900/5 hover:text-[#171b21] dark:text-[#d7dee8] dark:hover:bg-white/10 dark:hover:text-white sm:hidden"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications"
              className="h-12 w-full rounded-lg border border-white/12 bg-black/20 pl-12 pr-4 text-sm font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#f5b400]/70 focus:ring-2 focus:ring-[#f5b400]/15"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveFilter(tab.value)}
                  className={`inline-flex h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b400] ${
                    active
                      ? 'border-[#f5b400]/75 bg-[#f5b400]/10 text-[#ffd36b]'
                      : 'border-white/10 bg-white/[.035] text-slate-300 hover:border-white/20 hover:bg-white/[.07] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="rounded-xl shadow-none">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title={activeFilter === 'all' && searchQuery.trim().length === 0 ? 'All caught up' : 'No notifications found'}
          description={
            activeFilter === 'all' && searchQuery.trim().length === 0
              ? 'You have no new notifications at the moment.'
              : 'Try adjusting the category or search terms to find the update you are looking for.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((n) => (
            <Card
              key={String(n._id)}
              onClick={() => handleCardClick(n)}
              className={`transition-all duration-200 group hover:shadow-md rounded-xl ${
                n.link ? 'cursor-pointer' : ''
              } ${
                !n.isRead
                  ? 'metal-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_18px_30px_rgba(18,22,27,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_32px_rgba(0,0,0,0.26)]'
                  : 'metal-panel opacity-95 hover:opacity-100'
              }`}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div
                  className={`mt-0.5 rounded-xl p-2 flex-shrink-0 ${
                    !n.isRead
                        ? 'silver-sheen text-[#171b21]'
                      : 'metal-pill text-[#7a838d]'
                  }`}
                >
                  {!n.isRead ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        !n.isRead ? 'text-[#171b21] dark:text-slate-50' : 'text-[#4f5863] dark:text-slate-200'
                      }`}
                    >
                      {String(n.title || '')}
                    </p>
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs text-[#75808b] dark:text-slate-300">
                      <Clock className="h-3 w-3" />
                      {n.createdAt
                        ? formatApiTimeAgo(String(n.createdAt))
                        : null}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#616a74] dark:text-slate-300">
                    {String(n.message || '')}
                  </p>
                  {n.link && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[#3d4650] dark:text-slate-200 opacity-70 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3" />
                      View details
                    </span>
                  )}
                </div>

                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="metal-pill h-8 w-8 rounded-lg text-[#7a838d] hover:text-[#171b21] dark:text-slate-300 dark:hover:text-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead.mutate(String(n._id));
                    }}
                    disabled={markAsRead.isPending}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
