import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, KeyRound } from 'lucide-react';
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
              <KeyRound className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#1d1d1f]">Forgot password?</h1>
            <p className="mt-2 text-sm text-[#6e6e73]">
              Enter your email and we&apos;ll send you a reset code.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#3a3a3e] text-[13px] font-medium">
                Email
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
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white h-11 font-semibold shadow-lg shadow-black/20 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Code
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-[#86868b]">
          Remember your password?{' '}
          <Link to="/login" className="text-[#1d1d1f] hover:text-[#6e6e73] font-semibold underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
