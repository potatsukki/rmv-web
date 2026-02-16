import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, X, Wrench, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
            <Wrench className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/50">
          <div className="text-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 mx-auto mb-4">
              <ShieldCheck className="h-6 w-6 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Reset password</h1>
            <p className="mt-2 text-sm text-gray-500">Choose a new password for your account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-gray-700 text-[13px] font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={inputClasses}
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                <div className="rounded-lg bg-gray-50 p-3 mt-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(passwordValue);
                      return (
                        <div
                          key={rule.label}
                          className={`flex items-center gap-1.5 text-xs ${
                            passed ? 'text-emerald-600' : 'text-gray-400'
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
              <Label htmlFor="confirmPassword" className="text-gray-700 text-[13px] font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
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
              className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-400">
          <Link to="/login" className="hover:text-gray-600 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
