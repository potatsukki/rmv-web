import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';

import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateProfile } from '@/hooks/useUsers';
import { Role } from '@/lib/constants';

// ── Which notification toggles each role should see ──
const ALL_NOTIF_PREFS = [
  {
    key: 'appointment' as const,
    label: 'Appointments',
    description: 'Booking confirmations, reschedules, and cancellations',
    roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN],
  },
  {
    key: 'payment' as const,
    label: 'Payments',
    description: 'Payment verifications, receipts, and reminders',
    roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.CASHIER, Role.ADMIN],
  },
  {
    key: 'project' as const,
    label: 'Projects',
    description: 'New projects from visit reports, engineer assignments, and status updates',
    roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
  },
  {
    key: 'blueprint' as const,
    label: 'Blueprints',
    description: 'Blueprint uploads, approvals, and revision requests',
    roles: [Role.CUSTOMER, Role.ENGINEER, Role.ADMIN],
  },
  {
    key: 'fabrication' as const,
    label: 'Fabrication',
    description: 'Workshop progress updates and status changes',
    roles: [Role.CUSTOMER, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN],
  },
];

export function AccountNotificationsPage() {
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();

  const visiblePrefs = useMemo(
    () => ALL_NOTIF_PREFS.filter((p) => user?.roles.some((r) => p.roles.includes(r))),
    [user?.roles],
  );

  const handleToggle = async (key: string, val: boolean) => {
    try {
      const prefs = user?.notificationPreferences ?? {
        appointment: true,
        payment: true,
        blueprint: true,
        fabrication: true,
        project: true,
      };
      const updated = { ...prefs, [key]: val };
      await updateProfile.mutateAsync({ notificationPreferences: updated });
      // fetchMe is called by the hook automatically
      toast.success(
        `${ALL_NOTIF_PREFS.find((p) => p.key === key)?.label ?? key} notifications ${val ? 'enabled' : 'disabled'}`,
      );
    } catch {
      // Error handled by hook
    }
  };

  if (visiblePrefs.length === 0) {
    return (
      <Card className="border-[#d2d2d7]/50 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f0f5] mb-3">
            <Bell className="h-5 w-5 text-[#c8c8cd]" />
          </div>
          <p className="text-sm font-medium text-[#86868b]">No notification settings available</p>
          <p className="text-xs text-[#c8c8cd] mt-1">
            Your role doesn't have configurable notification preferences.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#d2d2d7]/50 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#1d1d1f] flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#6e6e73]" />
          Notification Preferences
        </CardTitle>
        <CardDescription className="text-[#86868b]">
          Choose which notifications you'd like to receive. This controls push and email
          notifications — your notification inbox is not affected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {visiblePrefs.map((pref) => {
          const prefs = user?.notificationPreferences;
          const checked = prefs ? prefs[pref.key] : true;

          return (
            <div
              key={pref.key}
              className="flex items-center justify-between p-4 border border-[#d2d2d7]/50 rounded-xl bg-white/60"
            >
              <div>
                <p className="font-medium text-[#1d1d1f] text-sm">{pref.label}</p>
                <p className="text-xs text-[#86868b] mt-0.5">{pref.description}</p>
              </div>
              <Switch
                checked={checked}
                onCheckedChange={(val) => handleToggle(pref.key, val)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
