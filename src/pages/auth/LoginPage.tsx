import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Wrench, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchMe, setCsrfToken } = useAuthStore();

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);

      const response = await api.post('/auth/login', data);
      const newCsrfToken = response.data.data.csrfToken;
      setCsrfToken(newCsrfToken);
      
      await fetchMe();
      toast.success('Welcome back!');

      // Check if user must change password first
      const loginUser = response.data.data.user;
      if (loginUser?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string; code?: string } } };
      };
      const code = error.response?.data?.error?.code;

      if (code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email first.');
        navigate('/verify-otp', {
          state: { email: data.email, purpose: 'email_verification' },
        });
        return;
      }

      if (code === 'ACCOUNT_DISABLED') {
        toast.error('Your account has been disabled. Contact support.');
        return;
      }

      if (code === 'INVALID_CREDENTIALS') {
        toast.error('The email or password you entered is incorrect. Please check and try again.');
        return;
      }

      if (code === 'ACCOUNT_EXPIRED') {
        toast.error('Your account has expired. Please contact your administrator.');
        return;
      }

      toast.error(error.response?.data?.error?.message || 'Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-28 bg-white z-10 w-full lg:w-[48%]">
        <div className="mx-auto w-full max-w-[380px]">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-10 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          {/* Brand + Welcome */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">RMV Stainless</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Sign in to manage your fabrication projects.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 text-[13px] font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 text-[13px] font-medium">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-orange-600 hover:text-orange-500"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold h-11 transition-all active:scale-[0.98] shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-orange-600 hover:text-orange-500"
              >
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950" />
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Industrial fabrication"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-950 via-gray-950/50 to-transparent" />

        {/* Decorative dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 backdrop-blur-sm border border-orange-500/20 mb-6">
            <Wrench className="h-6 w-6 text-orange-400" />
          </div>
          <blockquote>
            <p className="text-lg font-medium text-gray-200 leading-relaxed max-w-md">
              &ldquo;Track your projects, manage blueprints, and schedule appointments
              — all from one secure dashboard.&rdquo;
            </p>
            <footer className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
              RMV Management System
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
