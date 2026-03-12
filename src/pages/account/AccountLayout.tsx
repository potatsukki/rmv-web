import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, Shield, Bell, Info, Mail, Phone, LogOut, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { LogoutConfirmModal } from '@/components/shared/LogoutConfirmModal';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Profile', path: '/account/profile', icon: UserIcon },
  { label: 'Appearance', path: '/account/appearance', icon: Moon },
  { label: 'Security', path: '/account/security', icon: Shield },
  { label: 'Notifications', path: '/account/notifications', icon: Bell },
  { label: 'Account', path: '/account/info', icon: Info },
];

export function AccountLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

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
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-metal-muted-color)]">
          Manage your personal information and preferences.
        </p>
      </div>

      {/* Mobile tab bar (visible < lg) */}
      <div className="lg:hidden -mx-4 sm:-mx-8 px-4 sm:px-8">
        <nav className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors shrink-0',
                  isActive
                    ? 'bg-[color:var(--color-card)] text-[var(--color-card-foreground)] shadow-sm'
                    : 'text-[var(--text-metal-muted-color)] hover:bg-[color:var(--color-card)]/70 hover:text-[var(--color-card-foreground)]',
                )
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          ))}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors shrink-0 text-red-500 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </nav>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
        {/* Left Column: User Profile Card (desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <Card className="sticky top-24 overflow-hidden rounded-2xl border-[color:var(--color-border)]/50 shadow-sm bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)]">
            <div className="h-28 bg-gradient-to-r from-[#1a1a1c] via-[#111113] to-[#1a1a1c]" />
            <div className="px-6 relative">
              <div className="absolute -top-12 left-6">
                <Avatar className="h-24 w-24 border-4 border-[color:var(--color-card)] shadow-lg bg-[color:var(--color-card)]">
                  <AvatarFallback className="bg-[color:var(--color-card)] text-[var(--color-card-foreground)] text-2xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <CardContent className="pt-16 pb-6 px-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[var(--color-card-foreground)]">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="truncate text-sm font-medium text-[var(--text-metal-muted-color)]">{user?.email}</p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {user?.roles?.map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(245,247,250,0.96)_0%,rgba(223,229,236,0.92)_100%)] dark:text-[#596775] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                    >
                      {role.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-[var(--text-metal-muted-color)]">
                  <Mail className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-3 text-sm text-[var(--text-metal-muted-color)]">
                    <Phone className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              {/* Tab Nav (vertical) */}
              <Separator className="my-4" />
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[color:var(--color-card)] text-[var(--color-card-foreground)]'
                          : 'text-[var(--text-metal-muted-color)] hover:bg-[color:var(--color-card)]/65 hover:text-[var(--color-card-foreground)]',
                      )
                    }
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </NavLink>
                ))}
              </nav>

              {/* Sign Out – always visible below tabs */}
              <Separator className="my-4" />
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-2.5 h-auto rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 text-sm font-medium"
                onClick={() => setShowLogoutModal(true)}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tab Content */}
        <div className="lg:col-span-2 min-w-0">
          <Outlet />
        </div>
      </div>

      <LogoutConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={handleLogout}
      />
    </div>
  );
}
