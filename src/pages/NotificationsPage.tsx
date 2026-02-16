import { Bell, Check, CheckCheck, Clock, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageError } from '@/components/shared/PageError';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationStore } from '@/stores/notification.store';
import type { Notification } from '@/lib/types';

export function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const setNotifications = useNotificationStore((state) => state.setNotifications);

  const notifications: Notification[] =
    (data as unknown as { items?: Notification[] })?.items ??
    (Array.isArray(data) ? data : []);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    setNotifications(notifications);
  }, [notifications, setNotifications]);

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Stay updated with project changes and alerts.
          </p>
        </div>
        {(unreadCount > 0 || notifications.length > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || unreadCount === 0}
            className="self-start sm:self-auto border-gray-200 text-gray-600 hover:text-orange-600 hover:border-orange-200 rounded-lg"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-gray-100 shadow-none rounded-xl">
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
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
          <div className="bg-gray-100 p-4 rounded-2xl mb-4">
            <Bell className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 max-w-sm mt-1 text-sm">
            You have no new notifications at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <Card
              key={String(n._id)}
              className={`transition-all duration-200 group hover:shadow-md rounded-xl ${
                !n.isRead
                  ? 'border-orange-200 bg-orange-50/30 shadow-sm'
                  : 'border-gray-100 bg-white opacity-80 hover:opacity-100'
              }`}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div
                  className={`mt-0.5 rounded-xl p-2 flex-shrink-0 ${
                    !n.isRead
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-400'
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
                        !n.isRead ? 'text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {String(n.title || '')}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {n.createdAt
                        ? String(formatDistanceToNow(new Date(String(n.createdAt)), {
                            addSuffix: true,
                          }))
                        : null}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                    {String(n.message || '')}
                  </p>
                </div>

                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg"
                    onClick={() => markAsRead.mutate(String(n._id))}
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
