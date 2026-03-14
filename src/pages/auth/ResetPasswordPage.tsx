import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api } from '@/lib/api';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const schema = z
  .object({
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

type ResetPasswordForm = z.infer<typeof schema>;

const passwordRules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'Uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'A digit', test: (v: string) => /\d/.test(v) },
  { label: 'Special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const inputClasses =
  'auth-input h-11 rounded-xl border-white/10 bg-white/[0.05] text-[#f5f7fa] placeholder:text-[#7f8895] shadow-none focus-visible:ring-[#d6b36a]/35';

export function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  useAuthPageScrollbar();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { email?: string; otp?: string } | null;
  const email = state?.email || '';
  const otp = state?.otp || '';

  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, otp, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch('newPassword', '');

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword: data.newPassword,
      });
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Password reset failed');
    }
  };

  if (!email || !otp) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070a] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,144,171,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_right,rgba(177,137,73,0.15)_0%,transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
      <div className="pointer-events-none absolute left-10 top-20 hidden h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(118,144,171,0.18)_0%,transparent_68%)] blur-2xl lg:block" />
      <div className="pointer-events-none absolute right-10 bottom-20 hidden h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(214,179,106,0.14)_0%,transparent_72%)] blur-2xl lg:block" />
      <div className="pointer-events-none absolute left-[10%] top-1/2 hidden w-[15rem] -translate-y-1/2 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md xl:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c97a5]">Reset Flow</p>
        <h3 className="mt-3 text-lg font-bold text-[#f5f7fa]">Choose a stronger replacement password.</h3>
        <div className="mt-4 space-y-3 text-sm text-[#a6b0bd]">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">Use a password you have not used before.</div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">Mix letters, numbers, and symbols for better security.</div>
        </div>
      </div>
      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandLogo className="h-10 w-10 ring-2 ring-white/12 shadow-lg shadow-black/30" />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,30,0.94)_0%,rgba(7,10,14,0.98)_100%)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#d6b36a]/30 bg-[linear-gradient(180deg,rgba(214,179,106,0.18)_0%,rgba(214,179,106,0.06)_100%)]">
              <ShieldCheck className="h-6 w-6 text-[#e2c98f]" />
            </div>
            <h1 className="text-xl font-bold text-[#f5f7fa]">Reset password</h1>
            <p className="mt-2 text-sm text-[#98a3b2]">Choose a new password for your account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-[13px] font-medium text-[#d8dee6]">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className={inputClasses}
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8993a1] transition-colors hover:text-[#f5f7fa]"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword.message}</p>
              )}

              {passwordValue.length > 0 && (
                <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.04] p-3">
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(passwordValue);
                      return (
                        <div
                          key={rule.label}
                          className={`flex items-center gap-1.5 text-xs ${
                            passed ? 'text-emerald-400' : 'text-[#8c97a6]'
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

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-[#d8dee6]">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className={inputClasses}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#e2c98f_0%,#c69b4e_45%,#8f6a2f_100%)] font-semibold text-[#14181d] shadow-[0_20px_40px_rgba(148,112,47,0.28)] hover:bg-[linear-gradient(135deg,#ead39d_0%,#d2ab60_45%,#9f7739_100%)]"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#98a3b2]">
          <Link to="/login" className="text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]">
            Back to sign in
          </Link>
        </p>
      </div>
      <div className="pointer-events-none absolute right-[9%] top-1/2 hidden w-[14rem] -translate-y-1/2 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md xl:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c97a5]">Security Check</p>
        <div className="mt-4 rounded-2xl border border-[#d6b36a]/18 bg-[#d6b36a]/8 p-3">
          <p className="text-sm font-semibold text-[#f2d9a1]">Step 3 of 3</p>
          <p className="mt-1 text-xs leading-5 text-[#c2cbd6]">Once saved, your new password becomes the only valid credential for future sign-ins.</p>
        </div>
      </div>
    </div>
  );
}
