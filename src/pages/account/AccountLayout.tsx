import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { User as UserIcon, Shield, Bell, Info, Mail, Phone, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { LogoutConfirmModal } from '@/components/shared/LogoutConfirmModal';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Profile', path: '/account/profile', icon: UserIcon },
  { label: 'Security', path: '/account/security', icon: Shield },
  { label: 'Notifications', path: '/account/notifications', icon: Bell },
  { label: 'Account', path: '/account/info', icon: Info },
];

export function AccountLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
          Account Settings
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
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
                    ? 'bg-orange-50 text-orange-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
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
          <Card className="border-gray-100 shadow-sm overflow-hidden rounded-2xl sticky top-24">
            <div className="h-28 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />
            <div className="px-6 relative">
              <div className="absolute -top-12 left-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg bg-white">
                  <AvatarFallback className="bg-orange-50 text-orange-600 text-2xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <CardContent className="pt-16 pb-6 px-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-sm text-gray-500 font-medium truncate">{user?.email}</p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {user?.roles?.map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 uppercase text-[10px] tracking-wider font-semibold rounded-md"
                    >
                      {role.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
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
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
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
