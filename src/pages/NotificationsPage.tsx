import { Bell, Check, CheckCheck, Clock, CheckCircle2, ExternalLink } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationStore } from '@/stores/notification.store';
import type { Notification } from '@/lib/types';
import { extractItems } from '@/lib/utils';

const CATEGORY_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Appointments', value: 'appointment' },
  { label: 'Projects', value: 'project' },
  { label: 'Payments', value: 'payment' },
  { label: 'Blueprints', value: 'blueprint' },
  { label: 'Fabrication', value: 'fabrication' },
  { label: 'System', value: 'system' },
] as const;

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
          activeFilter === 'all' || notification.category === activeFilter;

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
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="metal-panel flex flex-col gap-4 rounded-[1.75rem] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171b21]">Notifications</h1>
          <p className="mt-1 text-sm text-[#616a74]">
            Stay updated with project changes and alerts.
          </p>
        </div>
        <div className="text-sm text-[#6e6e73]">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'Everything is read'}
        </div>
      </div>

      <CollectionToolbar
        title="Find the right update fast"
        description="Search message copy, then narrow the stream by notification category."
        searchPlaceholder="Search notifications"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={CATEGORY_TABS.map((tab) => ({ label: tab.label, value: tab.value }))}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        action={
          (unreadCount > 0 || notifications.length > 0) ? (
            <Button
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending || unreadCount === 0}
              className="h-11 rounded-xl text-[#616a74] hover:text-[#171b21]"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          ) : null
        }
      />

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
                  ? 'metal-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_18px_30px_rgba(18,22,27,0.08)]'
                  : 'metal-panel opacity-85 hover:opacity-100'
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
                        !n.isRead ? 'text-[#171b21]' : 'text-[#616a74]'
                      }`}
                    >
                      {String(n.title || '')}
                    </p>
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs text-[#8a939d]">
                      <Clock className="h-3 w-3" />
                      {n.createdAt
                        ? String(formatDistanceToNow(new Date(String(n.createdAt)), {
                            addSuffix: true,
                          }))
                        : null}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#616a74]">
                    {String(n.message || '')}
                  </p>
                  {n.link && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-[#1d1d1f] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3" />
                      View details
                    </span>
                  )}
                </div>

                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="metal-pill h-8 w-8 rounded-lg text-[#7a838d] hover:text-[#171b21]"
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
