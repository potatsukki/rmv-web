import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  Lock,
  AlertTriangle,
  ShieldCheck,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Trash2,
  History,
  Shield,
  ShieldOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/lib/constants';
import type { Session, LoginActivity } from '@/lib/types';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof schema>;

const passwordRules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'Uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'A digit', test: (v: string) => /\d/.test(v) },
  { label: 'Special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const inputClasses =
  'h-11 rounded-xl border-[#c8c8cd] bg-white/80 transition-colors focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 dark:border-slate-600 dark:bg-slate-900/65 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-slate-300 dark:focus:ring-slate-300/25';

export function AccountSecurityPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const navigate = useNavigate();
  const { user, fetchMe } = useAuthStore();
  const queryClient = useQueryClient();

  const isCustomer = user?.roles.includes(Role.CUSTOMER);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch('newPassword', '');

  const onSubmit = async (data: ChangePasswordForm) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      await fetchMe();
      reset();
      toast.success('Password changed successfully!');

      // If was forced to change, redirect to dashboard
      if (user?.mustChangePassword) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    }
  };

  // ── Sessions & Login History ──
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get('/auth/sessions');
      return data.data;
    },
  });

  const { data: loginHistory = [], isLoading: historyLoading } = useQuery<LoginActivity[]>({
    queryKey: ['login-history'],
    queryFn: async () => {
      const { data } = await api.get('/auth/login-history');
      return data.data;
    },
  });

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [sessions],
  );
  const visibleSessions = showAllSessions ? sortedSessions : sortedSessions.slice(0, 3);

  const sortedLoginHistory = useMemo(
    () => [...loginHistory].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [loginHistory],
  );
  const visibleLoginHistory = showAllHistory ? sortedLoginHistory : sortedLoginHistory.slice(0, 3);

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session removed');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to remove session');
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => api.delete('/auth/sessions'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('All other sessions removed');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to remove sessions');
    },
  });

  // ── 2FA ──
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp2fa, setOtp2fa] = useState<string[]>(Array(6).fill(''));
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleEnable2FA = async () => {
    setEnabling2FA(true);
    try {
      await api.post('/auth/2fa/enable');
      toast.success('Verification code sent to your email');
      setShowOtpInput(true);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to send verification code');
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp2fa];
    newOtp[index] = value.slice(-1);
    setOtp2fa(newOtp);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp2fa[index] && index > 0)
      otpInputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted.length) return;
    const newOtp = [...otp2fa];
    for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i] ?? '';
    setOtp2fa(newOtp);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const confirmEnable2FA = useCallback(async () => {
    const code = otp2fa.join('');
    if (code.length !== 6) return;
    setOtpSubmitting(true);
    try {
      await api.post('/auth/2fa/confirm-enable', { otp: code });
      await fetchMe();
      toast.success('Two-factor authentication enabled!');
      setShowOtpInput(false);
      setOtp2fa(Array(6).fill(''));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Verification failed');
      setOtp2fa(Array(6).fill(''));
      otpInputRefs.current[0]?.focus();
    } finally {
      setOtpSubmitting(false);
    }
  }, [otp2fa, fetchMe]);

  useEffect(() => {
    if (showOtpInput && otp2fa.every((d) => d !== '')) confirmEnable2FA();
  }, [otp2fa, showOtpInput, confirmEnable2FA]);

  const handleDisable2FA = async () => {
    const isGoogleUser = user?.provider === 'google';
    if (!isGoogleUser && !disablePassword) {
      toast.error('Password is required');
      return;
    }
    setDisabling2FA(true);
    try {
      await api.post('/auth/2fa/disable', isGoogleUser ? {} : { password: disablePassword });
      await fetchMe();
      toast.success('Two-factor authentication disabled');
      setShowDisableForm(false);
      setDisablePassword('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to disable 2FA');
    } finally {
      setDisabling2FA(false);
    }
  };

  function getDeviceIcon(device: string) {
    if (device === 'mobile') return <Smartphone className="h-4 w-4" />;
    if (device === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /** Display-friendly location — hides "Unknown" */
  function displayLocation(location?: string) {
    if (!location || location === 'Unknown') return null;
    return location;
  }

  /** Display-friendly IP — shows "localhost" for loopback */
  function displayIp(ip?: string) {
    if (!ip) return null;
    const clean = ip.replace(/^::ffff:/, '');
    if (clean === '::1' || clean === '127.0.0.1') return 'localhost';
    return clean;
  }

  return (
    <div className="space-y-6">
      {user?.mustChangePassword && user?.provider !== 'google' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Password change required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your administrator requires you to change your temporary password before continuing.
              Enter the password given to you by your admin as the &ldquo;Current Password&rdquo;.
            </p>
          </div>
        </div>
      )}

      {/* Password status card */}
      {user?.provider !== 'google' && (
      <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[var(--metal-panel-background)] backdrop-blur-sm shadow-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Password Protection</p>
            <p className="mt-0.5 text-xs text-[#86868b] dark:text-slate-400">
              Your account is protected with a password. Update it regularly for better security.
            </p>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Change Password form */}
      {user?.provider !== 'google' && (
      <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[var(--metal-panel-background)] backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f0f5] dark:bg-slate-800">
              <Lock className="h-5 w-5 text-[#1d1d1f] dark:text-slate-100" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">
                Change Password
              </CardTitle>
              <CardDescription className="text-[#86868b] dark:text-slate-400">
                Update your account password.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  className={inputClasses}
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#3a3a3e] dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="border-t border-[#d2d2d7]/50 pt-5 dark:border-slate-700/70">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className={inputClasses}
                    {...register('newPassword')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#3a3a3e] dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-red-500">{errors.newPassword.message}</p>
                )}

                {passwordValue.length > 0 && (
                  <div className="mt-2 rounded-lg bg-[#f0f0f5]/50 p-3 dark:bg-slate-800/65">
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                      {passwordRules.map((rule) => {
                        const passed = rule.test(passwordValue);
                        return (
                          <div
                            key={rule.label}
                            className={`flex items-center gap-1.5 text-xs ${
                              passed ? 'text-emerald-600 dark:text-emerald-300' : 'text-[#86868b] dark:text-slate-400'
                            }`}
                          >
                            {passed ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            {rule.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className={inputClasses}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#3a3a3e] dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="prominent"
              className="h-11 w-full rounded-xl font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      {/* Google account info */}
      {user?.provider === 'google' && (
      <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[var(--metal-panel-background)] backdrop-blur-sm shadow-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-xl bg-blue-50 p-2.5 dark:bg-blue-500/20">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-slate-100">Google Account</p>
            <p className="mt-0.5 text-xs text-[#86868b] dark:text-slate-400">
              Your account is linked with Google. Password management is handled by Google.
            </p>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Two-Factor Authentication (Customers only) */}
      {isCustomer && (
        <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[var(--metal-panel-background)] backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${user?.twoFactorEnabled ? 'bg-[#1d1d1f]' : 'bg-[#f0f0f5]'}`}>
                {user?.twoFactorEnabled ? (
                  <Shield className="h-5 w-5 text-white" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-[#86868b] dark:text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">
                  Two-Factor Auth
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs text-[#86868b] sm:text-sm dark:text-slate-400">
                  Extra security via email verification.
                </CardDescription>
              </div>
              {!showOtpInput && !showDisableForm && (
                <button
                  role="switch"
                  aria-checked={user?.twoFactorEnabled}
                  onClick={() => {
                    if (user?.twoFactorEnabled) setShowDisableForm(true);
                    else handleEnable2FA();
                  }}
                  disabled={enabling2FA}
                  className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    user?.twoFactorEnabled ? 'bg-[#1d1d1f]' : 'bg-[#d2d2d7]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      user?.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!user?.twoFactorEnabled && !showOtpInput && (
              <div className="space-y-4">
                <p className="text-sm text-[#86868b] dark:text-slate-400">
                  Receive a 6-digit code via email each time you sign in.
                </p>
                <Button
                  onClick={handleEnable2FA}
                  disabled={enabling2FA}
                  variant="prominent"
                  className="w-full sm:w-auto"
                >
                  {enabling2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enable Two-Factor
                </Button>
              </div>
            )}

            {showOtpInput && (
              <div className="space-y-4">
                <p className="text-sm text-[#86868b] dark:text-slate-400">
                  Enter the 6-digit code sent to <strong className="break-all text-[#3a3a3e] dark:text-slate-200">{user?.email}</strong>.
                </p>
                <div className="flex justify-center gap-1.5 min-[360px]:gap-2" onPaste={handleOtpPaste}>
                  {otp2fa.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => { otpInputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="h-11 w-9 min-[360px]:h-12 min-[360px]:w-10 text-center text-lg font-bold border-[#c8c8cd] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-lg sm:rounded-xl transition-colors"
                      disabled={otpSubmitting}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={confirmEnable2FA}
                    disabled={otpSubmitting || otp2fa.some((d) => d === '')}
                    variant="prominent"
                    className="flex-1"
                  >
                    {otpSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowOtpInput(false); setOtp2fa(Array(6).fill('')); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {user?.twoFactorEnabled && !showDisableForm && (
              <div className="flex items-center gap-3 rounded-xl bg-[#f0f0f5] px-3.5 py-3 dark:bg-slate-800/65">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1d1d1f] dark:bg-slate-100">
                  <ShieldCheck className="h-4 w-4 text-white dark:text-slate-900" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-slate-100">Protected</p>
                  <p className="text-xs leading-snug text-[#6e6e73] dark:text-slate-400">Code sent to your email on every sign-in</p>
                </div>
              </div>
            )}

            {showDisableForm && (
              <div className="space-y-4">
                {user?.provider === 'google' ? (
                  <div className="flex items-start gap-3 rounded-xl bg-[#f0f0f5] px-3.5 py-3 dark:bg-slate-800/65">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#6e6e73] dark:text-slate-300" />
                    <p className="text-sm text-[#3a3a3e] dark:text-slate-300">
                      Your account is managed by Google — no password needed to confirm.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#86868b] dark:text-slate-400">Enter your password to disable two-factor authentication.</p>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium text-[#3a3a3e] dark:text-slate-300">Password</Label>
                      <Input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Enter your password"
                        className={inputClasses}
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleDisable2FA}
                    disabled={disabling2FA || (user?.provider !== 'google' && !disablePassword)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3.5 py-2 text-sm font-medium text-white transition-colors active:scale-[0.98] hover:bg-[#2d2d2f] disabled:opacity-50 dark:!bg-slate-100 dark:!text-slate-900 dark:hover:!bg-white"
                  >
                    {disabling2FA && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm Disable
                  </button>
                  <button
                    onClick={() => { setShowDisableForm(false); setDisablePassword(''); }}
                    className="inline-flex items-center rounded-xl border border-[#d2d2d7] bg-white px-3.5 py-2 text-sm font-medium text-[#3a3a3e] transition-colors active:scale-[0.98] hover:bg-[#f0f0f5] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Sessions */}
      <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[var(--metal-panel-background)] backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">Active Sessions</CardTitle>
                <CardDescription className="text-[#86868b] dark:text-slate-400">
                  Devices currently signed in.
                </CardDescription>
              </div>
            </div>
            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 shrink-0 w-full sm:w-auto"
                onClick={() => revokeAllMutation.mutate()}
                disabled={revokeAllMutation.isPending}
              >
                {revokeAllMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                Remove All Other Sessions
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#86868b]" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-[#86868b] dark:text-slate-400 text-center py-4">No active sessions found.</p>
          ) : (
            <div className="space-y-3">
              {visibleSessions.map((session) => (
                <div
                  key={session._id}
                  className={`p-3 rounded-xl border ${session.isCurrent ? 'border-[#1d1d1f]/15 bg-slate-100/70 dark:border-slate-600 dark:bg-slate-800/60' : 'border-[#d2d2d7]/50 bg-white/70 dark:border-slate-700 dark:bg-slate-900/55'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${session.isCurrent ? 'bg-[#1d1d1f] text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-[#f0f0f5] text-[#6e6e73] dark:bg-slate-800 dark:text-slate-300'}`}>
                      {getDeviceIcon(session.device)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#1d1d1f] dark:text-slate-100 truncate">
                          {session.browser} on {session.os}
                        </p>
                        {session.isCurrent && (
                          <span className="shrink-0 text-[10px] font-bold text-white bg-[#1d1d1f] dark:bg-slate-100 dark:text-slate-900 px-1.5 py-0.5 rounded">
                            THIS DEVICE
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-col min-[400px]:flex-row min-[400px]:flex-wrap gap-x-1 text-xs text-[#86868b] dark:text-slate-400">
                        {displayLocation(session.location) && (
                          <>
                            <span>{displayLocation(session.location)}</span>
                            <span className="hidden min-[400px]:inline">&middot;</span>
                          </>
                        )}
                        {displayIp(session.ipAddress) && (
                          <>
                            <span className="text-[#86868b] dark:text-slate-400">{displayIp(session.ipAddress)}</span>
                            <span className="hidden min-[400px]:inline">&middot;</span>
                          </>
                        )}
                        <span>{formatDate(session.createdAt)}</span>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 h-8 w-8 p-0"
                        onClick={() => revokeSessionMutation.mutate(session._id)}
                        disabled={revokeSessionMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {sortedSessions.length > 3 && (
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-[#6e6e73] dark:text-slate-300"
                    onClick={() => setShowAllSessions((current) => !current)}
                  >
                    {showAllSessions ? 'Show latest 3 sessions' : `Show all sessions (${sortedSessions.length})`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[var(--metal-panel-background)] backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <History className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-[#1d1d1f] dark:text-slate-100">Login History</CardTitle>
              <CardDescription className="text-[#86868b] dark:text-slate-400">
                Recent login attempts on your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#86868b]" />
            </div>
          ) : loginHistory.length === 0 ? (
            <p className="text-sm text-[#86868b] dark:text-slate-400 text-center py-4">No login history yet.</p>
          ) : (
            <div className="space-y-2">
              {visibleLoginHistory.map((entry) => (
                <div
                  key={entry._id}
                  className={`p-3 rounded-xl border ${entry.status === 'failed' ? 'border-red-200/70 bg-red-50/45 dark:border-red-400/35 dark:bg-red-500/10' : 'border-[#d2d2d7]/50 bg-white/70 dark:border-slate-700 dark:bg-slate-900/55'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${entry.status === 'failed' ? 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300' : 'bg-[#f0f0f5] text-[#6e6e73] dark:bg-slate-800 dark:text-slate-300'}`}>
                      {getDeviceIcon(entry.device)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#1d1d1f] dark:text-slate-100 truncate">
                          {entry.browser} on {entry.os}
                        </p>
                        <span
                          className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            entry.status === 'success'
                              ? 'text-white bg-[#1d1d1f] dark:bg-slate-100 dark:text-slate-900'
                              : 'text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-500/20'
                          }`}
                        >
                          {entry.status === 'success' ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-col min-[400px]:flex-row min-[400px]:flex-wrap gap-x-1 text-xs text-[#86868b] dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                        {displayLocation(entry.location) && (
                          <>
                            <span className="hidden min-[400px]:inline">&middot;</span>
                            <span>{displayLocation(entry.location)}</span>
                          </>
                        )}
                        {displayIp(entry.ipAddress) && (
                          <>
                            <span className="hidden min-[400px]:inline">&middot;</span>
                            <span className="text-[#86868b] dark:text-slate-400">{displayIp(entry.ipAddress)}</span>
                          </>
                        )}
                      </div>
                      {entry.failReason && (
                        <p className="text-xs text-red-500 dark:text-red-300 mt-1">{entry.failReason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {sortedLoginHistory.length > 3 && (
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-[#6e6e73] dark:text-slate-300"
                    onClick={() => setShowAllHistory((current) => !current)}
                  >
                    {showAllHistory ? 'Show latest 3 logins' : `Show all login attempts (${sortedLoginHistory.length})`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
