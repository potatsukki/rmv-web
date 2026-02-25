import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Wrench, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { auth, googleProvider } from '@/lib/firebase';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);

      const response = await api.post('/auth/google', { idToken });
      const responseData = response.data.data;

      if (responseData.needsProfile) {
        // New Google user — redirect to complete profile
        navigate('/complete-profile', {
          state: {
            email: responseData.email,
            googleName: responseData.googleName,
            googlePhoto: responseData.googlePhoto,
            idToken,
          },
          replace: true,
        });
        return;
      }

      // Existing user — logged in
      const newCsrfToken = responseData.csrfToken;
      setCsrfToken(newCsrfToken);
      await fetchMe();
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as { code?: string; response?: { data?: { error?: { message?: string } } } };
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error(error.response?.data?.error?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);

      const response = await api.post('/auth/login', data);
      const responseData = response.data.data;

      // 2FA required — redirect to verification page
      if (responseData.requires2FA) {
        navigate('/verify-2fa', {
          state: {
            tempToken: responseData.tempToken,
            email: responseData.user.email,
            firstName: responseData.user.firstName,
          },
          replace: true,
        });
        return;
      }

      const newCsrfToken = responseData.csrfToken;
      setCsrfToken(newCsrfToken);
      
      await fetchMe();
      toast.success('Welcome back!');

      // Check if user must change password first
      const loginUser = responseData.user;
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
            <BrandLogo className="h-9 w-9 ring-2 ring-orange-500/25 shadow-lg shadow-orange-500/20" />
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
                placeholder="Enter your email"
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
                  placeholder="Enter your password"
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

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || isSubmitting}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
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
