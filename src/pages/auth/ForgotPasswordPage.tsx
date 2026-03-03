import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();

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
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1c] via-[#111113] to-[#0d0d0f]" />
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Industrial fabrication"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0d0d0f] via-[#0d0d0f]/50 to-transparent" />

        {/* Brushed metal noise texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />

        {/* Silver light leak */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(180,180,190,0.06)_0%,transparent_60%)] pointer-events-none" />

        {/* Centered logo + tagline */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
          <BrandLogo className="h-28 w-28 ring-4 ring-white/15 shadow-2xl shadow-black/30" />
          <p className="mt-8 text-center text-lg font-medium text-[#d2d2d7] leading-relaxed max-w-sm">
            Track your projects, manage blueprints, and schedule appointments — all from one secure dashboard.
          </p>
          <p className="mt-4 text-xs font-bold text-[#6e6e73] uppercase tracking-[0.2em]">
            RMV Management System
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-28 bg-gradient-to-br from-[#eaeaef] via-[#e0e0e6] to-[#d8d8de] z-10 w-full lg:w-[48%]">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
        <div className="relative mx-auto w-full max-w-[380px]">
          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 mb-10 text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Sign In
          </Link>

          {/* Brand + heading */}
          <div className="flex items-center gap-2.5 mb-8">
            <BrandLogo className="h-9 w-9 ring-2 ring-[#b8b8bd]/50 shadow-lg shadow-black/10" />
            <span className="font-bold text-[#1d1d1f] tracking-tight">RMV Stainless</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            Forgot password?
          </h2>
          <p className="mt-1.5 text-sm text-[#6e6e73]">
            Enter your email and we&apos;ll send you a reset code.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#3a3a3e] text-[13px] font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                className="h-11 bg-white/80 border-[#c8c8cd] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-xl"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white font-semibold h-11 transition-all active:scale-[0.98] shadow-lg shadow-black/20 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Code
            </Button>

            <p className="text-center text-sm text-[#6e6e73]">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#1d1d1f] hover:text-[#6e6e73] underline underline-offset-4"
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
