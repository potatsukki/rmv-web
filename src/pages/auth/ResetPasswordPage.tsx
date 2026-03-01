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
  'h-11 bg-white/80 border-[#c8c8cd] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-xl';

export function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#e0e0e6] via-[#d6d6dc] to-[#cbcbd0] px-4">
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BrandLogo className="h-10 w-10 ring-2 ring-[#b8b8bd]/50 shadow-lg shadow-black/10" />
        </div>

        <div className="rounded-2xl border border-[#c8c8cd]/50 bg-white/70 backdrop-blur-xl p-8 shadow-xl shadow-black/5">
          <div className="text-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1d1d1f] mx-auto mb-4">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#1d1d1f]">Reset password</h1>
            <p className="mt-2 text-sm text-[#6e6e73]">Choose a new password for your account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-[#3a3a3e] text-[13px] font-medium">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f]"
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
                <div className="rounded-xl bg-[#f0f0f5] p-3 mt-2">
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(passwordValue);
                      return (
                        <div
                          key={rule.label}
                          className={`flex items-center gap-1.5 text-xs ${
                            passed ? 'text-emerald-600' : 'text-[#86868b]'
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
              <Label htmlFor="confirmPassword" className="text-[#3a3a3e] text-[13px] font-medium">
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
              className="w-full bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white h-11 font-semibold shadow-lg shadow-black/20 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-[#86868b]">
          <Link to="/login" className="hover:text-[#1d1d1f] transition-colors underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
