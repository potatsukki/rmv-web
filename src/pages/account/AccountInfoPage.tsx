import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, Copy, CalendarDays, UserCircle, AlertTriangle } from 'lucide-react';
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
import { api } from '@/lib/api';

export function AccountInfoPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isGoogleUser = user?.provider === 'google';
  const canDelete =
    confirmation === 'DELETE' && (isGoogleUser || password.trim().length > 0);

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await api.delete('/users/account', {
        data: { confirmation, ...(isGoogleUser ? {} : { password }) },
      });
      toast.success('Your account has been deleted.');
      logout();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to delete account.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

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

      {/* Danger Zone */}
      <Card className="border-red-200 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-[#86868b]">
            Irreversible actions that permanently affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-red-100 rounded-xl bg-red-50/60 space-y-3">
            <div>
              <p className="text-sm font-medium text-[#1d1d1f]">Delete Account</p>
              <p className="text-xs text-[#86868b] mt-0.5">
                Permanently deactivates your account and removes your sessions, notifications, and
                tokens. This action cannot be undone.
              </p>
            </div>

            {!showDeleteForm ? (
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-xl text-xs"
                onClick={() => setShowDeleteForm(true)}
              >
                Delete my account
              </Button>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Google info banner */}
                {isGoogleUser && (
                  <div className="flex items-start gap-2 p-3 bg-[#f0f0f5] border border-[#d2d2d7]/60 rounded-xl">
                    <Shield className="h-4 w-4 text-[#6e6e73] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#6e6e73]">
                      Your account is managed by Google — no password needed to confirm.
                    </p>
                  </div>
                )}

                {/* Password (local users only) */}
                {!isGoogleUser && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#3a3a3e]">
                      Confirm your password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2 text-sm border border-[#d2d2d7] rounded-xl bg-white placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10"
                    />
                  </div>
                )}

                {/* Confirmation text */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#3a3a3e]">
                    Type{' '}
                    <span className="font-mono font-semibold text-red-600">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-3 py-2 text-sm border border-[#d2d2d7] rounded-xl bg-white placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-red-500/20 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={!canDelete || deleting}
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs disabled:opacity-40"
                  >
                    {deleting ? 'Deleting…' : 'Permanently delete account'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDeleteForm(false);
                      setConfirmation('');
                      setPassword('');
                    }}
                    className="text-[#6e6e73] hover:text-[#1d1d1f] rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
