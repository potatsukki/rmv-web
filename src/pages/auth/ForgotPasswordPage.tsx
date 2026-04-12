import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  useAuthPageScrollbar();

  const inputClasses = 'label-font h-12 rounded-none border-white/10 bg-white/[0.03] text-sm tracking-widest text-white placeholder:text-[#5a5a60] focus-visible:border-[#FFD700]/30 focus-visible:ring-0 transition-all focus:bg-white/[0.05]';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await api.post('/auth/forgot-password', data);
      toast.success('OTP sent to your email');
      navigate('/verify-otp', {
        state: { email: data.email, purpose: 'password_reset' },
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to send reset OTP');
    }
  };

  return (
    <div className="landing-atelier dark relative flex min-h-screen overflow-hidden bg-black text-white/90">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,144,171,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_right,rgba(177,137,73,0.15)_0%,transparent_30%)]" />
      <AuthBrandPanel />

      {/* Right Side - Form */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center bg-black px-6 py-10 lg:w-[48%] lg:flex-none lg:px-20 lg:py-12 xl:px-28">
        
        <div className="blueprint-grid absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative mx-auto w-full max-w-[420px] border border-white/5 bg-[#0a0a0b]/60 p-7 sm:p-10 backdrop-blur-3xl">
          {/* Back link */}
          <Link
            to="/login"
            className="group mb-10 inline-flex items-center gap-2 text-sm font-medium text-[#9ca7b5] transition-colors hover:text-[#f2f5f7]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Sign In
          </Link>

          <h2 className="headline-font text-[clamp(1.5rem,8vw,2.25rem)] font-bold tracking-tight text-white leading-tight">
            Forgot password?
          </h2>
          <p className="label-font mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#919097]">
            Enter your email and we&apos;ll send you a reset code.
          </p>
          <p className="mt-2 text-xs leading-5 text-[#7f8b99]">
            If you signed up with Google only, use the Google button on sign in instead of password reset.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] gold-glow">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                className={inputClasses}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="label-font brass-gradient h-12 w-full rounded-none border-none text-[11px] font-black uppercase tracking-[0.3em] text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Code
            </Button>

            <p className="text-center text-sm text-[#98a3b2]">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
