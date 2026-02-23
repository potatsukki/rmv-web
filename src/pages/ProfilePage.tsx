import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Phone, Mail, Check, Bell, LogOut, KeyRound, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoutConfirmModal } from '@/components/shared/LogoutConfirmModal';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { Role } from '@/lib/constants';

// ── Which notification toggles each role should see ──
const ALL_NOTIF_PREFS = [
  { key: 'appointment' as const, label: 'Appointments', description: 'Booking confirmations, reschedules, and cancellations', roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN] },
  { key: 'payment' as const, label: 'Payments', description: 'Payment verifications, receipts, and reminders', roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.CASHIER, Role.ADMIN] },
  { key: 'blueprint' as const, label: 'Blueprints', description: 'Blueprint uploads, approvals, and revision requests', roles: [Role.CUSTOMER, Role.ENGINEER, Role.ADMIN] },
  { key: 'fabrication' as const, label: 'Fabrication', description: 'Workshop progress updates and status changes', roles: [Role.CUSTOMER, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN] },
];

// ── Role-aware phone description ──
const PHONE_DESCRIPTIONS: Partial<Record<Role, string>> = {
  [Role.APPOINTMENT_AGENT]: 'Used for contact and schedule-related notifications.',
  [Role.SALES_STAFF]: 'Used for appointment and payment notifications.',
  [Role.ENGINEER]: 'Used for blueprint and fabrication notifications.',
  [Role.CASHIER]: 'Used for payment processing notifications.',
  [Role.FABRICATION_STAFF]: 'Used for workshop update notifications.',
  [Role.ADMIN]: 'Used for system-wide notifications.',
};
const DEFAULT_PHONE_DESC = 'Used for SMS notifications about project updates.';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, fetchMe, logout } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const payload: Record<string, string> = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      if (data.phone) payload.phone = data.phone;

      await api.patch('/users/profile', payload);
      await fetchMe();
      reset({ ...data });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  // Filter notification preferences to only show toggles relevant to the user's roles
  const visiblePrefs = useMemo(
    () => ALL_NOTIF_PREFS.filter((p) => user?.roles.some((r) => p.roles.includes(r))),
    [user?.roles],
  );

  // Pick the first non-ADMIN role for phone description
  const primaryRole = user?.roles.find((r) => r !== Role.ADMIN) ?? user?.roles[0];
  const phoneDescription = primaryRole ? (PHONE_DESCRIPTIONS[primaryRole] ?? DEFAULT_PHONE_DESC) : DEFAULT_PHONE_DESC;

  const handleCopyId = () => {
    if (!user?._id) return;
    navigator.clipboard.writeText(user._id);
    toast.success('User ID copied to clipboard');
  };

  const inputClasses =
    'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: User Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-gray-100 shadow-sm overflow-hidden rounded-2xl">
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
                <p className="text-sm text-gray-500 font-medium">{user?.email}</p>

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
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-3 text-sm text-gray-600 hover:text-orange-600 transition-colors group w-full text-left"
                  title="Click to copy full ID"
                >
                  <Shield className="h-4 w-4 text-gray-400 shrink-0 group-hover:text-orange-500" />
                  <span className="truncate">
                    ID:{' '}
                    <span className="font-mono text-xs text-gray-400 group-hover:text-orange-500">
                      #{user?._id?.substring(0, 8)}
                    </span>
                  </span>
                  <Copy className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                </button>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-gray-100 p-4">
              <Button
                variant="destructive"
                className="w-full justify-start pl-4 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm rounded-xl"
                onClick={() => setShowLogoutModal(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>

              <LogoutConfirmModal
                open={showLogoutModal}
                onOpenChange={setShowLogoutModal}
                onConfirm={handleLogout}
              />
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-gray-100 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Personal Information
              </CardTitle>
              <CardDescription className="text-gray-500">
                Update your contact details and public profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="firstName"
                      className="text-gray-700 text-[13px] font-medium"
                    >
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      className={inputClasses}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-500">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lastName"
                      className="text-gray-700 text-[13px] font-medium"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      className={inputClasses}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-500">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-gray-700 text-[13px] font-medium">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      placeholder="+63 9XX XXX XXXX"
                      {...register('phone')}
                      className={`pl-10 ${inputClasses}`}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {phoneDescription}
                  </p>
                  {errors.phone && (
                    <p className="text-xs text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 mt-6">
                  {isDirty && (
                    <p className="text-sm text-gray-500 mr-auto">You have unsaved changes</p>
                  )}
                  <Button
                    type="submit"
                    className="bg-gray-900 hover:bg-gray-800 text-white min-w-[140px] h-11 font-semibold"
                    disabled={isSubmitting || !isDirty}
                  >
                    {isSubmitting ? (
                      'Saving...'
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gray-100 rounded-xl">
                  <KeyRound className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Change Password</p>
                  <p className="text-xs text-gray-500 mt-0.5">Update your account password for security.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-700 hover:text-orange-600 hover:border-orange-200 rounded-lg"
                onClick={() => navigate('/change-password')}
              >
                Update
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preferences — filtered by role */}
          {visiblePrefs.length > 0 && (
            <Card className="border-gray-100 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Choose which notifications you'd like to receive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {visiblePrefs.map((pref) => {
                  const prefs = user?.notificationPreferences;
                  const checked = prefs ? prefs[pref.key] : true;

                  return (
                    <div
                      key={pref.key}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-white"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{pref.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{pref.description}</p>
                      </div>
                      <Switch
                        checked={checked}
                        onCheckedChange={async (val) => {
                          try {
                            const updated = {
                              ...(prefs ?? { appointment: true, payment: true, blueprint: true, fabrication: true }),
                              [pref.key]: val,
                            };
                            await api.patch('/users/profile', { notificationPreferences: updated });
                            await fetchMe();
                            toast.success(`${pref.label} notifications ${val ? 'enabled' : 'disabled'}`);
                          } catch {
                            toast.error('Failed to update preference');
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
