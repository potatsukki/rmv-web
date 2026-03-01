import { Mail, Shield, Copy, CalendarDays, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';

export function AccountInfoPage() {
  const { user } = useAuthStore();

  const handleCopyId = () => {
    if (!user?._id) return;
    navigator.clipboard.writeText(user._id);
    toast.success('User ID copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card className="border-[#d2d2d7]/50 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1d1d1f] flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-[#6e6e73]" />
            Account Information
          </CardTitle>
          <CardDescription className="text-[#86868b]">
            Your account details and membership information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between gap-3 p-4 border border-[#d2d2d7]/50 rounded-xl bg-white/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-[#f0f0f5] rounded-lg shrink-0">
                <Mail className="h-4 w-4 text-[#6e6e73]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#86868b] font-medium">Email Address</p>
                <p className="text-sm font-medium text-[#1d1d1f] truncate">{user?.email}</p>
              </div>
            </div>
            {user?.isEmailVerified && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0">
                Verified
              </Badge>
            )}
          </div>

          {/* User ID */}
          <div className="flex items-center justify-between gap-3 p-4 border border-[#d2d2d7]/50 rounded-xl bg-white/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-[#f0f0f5] rounded-lg shrink-0">
                <Shield className="h-4 w-4 text-[#6e6e73]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#86868b] font-medium">User ID</p>
                <p className="text-sm font-mono text-[#6e6e73] truncate">
                  #{user?._id?.substring(0, 8)}...
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-[#1d1d1f] shrink-0"
              onClick={handleCopyId}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Member Since */}
          <div className="flex items-center justify-between gap-3 p-4 border border-[#d2d2d7]/50 rounded-xl bg-white/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-[#f0f0f5] rounded-lg shrink-0">
                <CalendarDays className="h-4 w-4 text-[#6e6e73]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#86868b] font-medium">Member Since</p>
                <p className="text-sm font-medium text-[#1d1d1f]">
                  {user?.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="p-4 border border-[#d2d2d7]/50 rounded-xl bg-white/60">
            <p className="text-xs text-[#86868b] font-medium mb-2">Roles</p>
            <div className="flex flex-wrap gap-2">
              {user?.roles?.map((role) => (
                <Badge
                  key={role}
                  variant="secondary"
                  className="px-2.5 py-1 bg-[#f0f0f5] text-[#3a3a3e] border border-[#d2d2d7]/50 uppercase text-[10px] tracking-wider font-semibold rounded-md"
                >
                  {role.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
