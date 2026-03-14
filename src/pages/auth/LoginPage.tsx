import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { auth, googleProvider } from '@/lib/firebase';
import { consumeAuthRedirectReason } from '@/lib/auth-session';
import { resolvePostLoginPath } from '@/lib/auth-routing';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  useAuthPageScrollbar();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchMe, setCsrfToken, setAccessToken, setRefreshToken } = useAuthStore();
  const locationState = (location.state as {
    from?: { pathname: string };
    registeredEmail?: string;
    registrationComplete?: boolean;
  } | null) ?? null;

  const from = locationState?.from?.pathname || '/dashboard';

  useEffect(() => {
    const redirectReason = consumeAuthRedirectReason();
    if (redirectReason) {
      toast.error(redirectReason);
    }

    if (locationState?.registrationComplete) {
      toast.success('Registration successful. Sign in when you are ready. If your email is still unverified, we will send you to OTP verification next.');
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: locationState?.registeredEmail ?? '',
      password: '',
    },
  });

  const inputClasses =
    'auth-input h-11 rounded-xl border-white/10 bg-white/[0.05] text-[#f5f7fa] placeholder:text-[#7f8895] shadow-none focus-visible:ring-[#d6b36a]/35';

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

      // 2FA required — redirect to verification page
      if (responseData.requires2FA) {
        navigate('/verify-2fa', {
          state: {
            tempToken: responseData.tempToken,
            email: responseData.user.email,
            firstName: responseData.user.firstName,
            from,
          },
          replace: true,
        });
        return;
      }

      // Existing user — logged in
      const newCsrfToken = responseData.csrfToken;
      setCsrfToken(newCsrfToken);
      if (responseData.accessToken) setAccessToken(responseData.accessToken);
      if (responseData.refreshToken) setRefreshToken(responseData.refreshToken);
      await fetchMe();
      toast.success('Welcome back!');

      const destination = resolvePostLoginPath(from, responseData.user.roles);
      if (destination.redirectReason) {
        toast(destination.redirectReason, { icon: 'ℹ️' });
      }

      navigate(destination.path, { replace: true });
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
            from,
          },
          replace: true,
        });
        return;
      }

      const newCsrfToken = responseData.csrfToken;
      setCsrfToken(newCsrfToken);
      if (responseData.accessToken) setAccessToken(responseData.accessToken);
      if (responseData.refreshToken) setRefreshToken(responseData.refreshToken);
      
      await fetchMe();
      toast.success('Welcome back!');

      // Check if user must change password first
      const loginUser = responseData.user;
      if (loginUser?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      const destination = resolvePostLoginPath(from, responseData.user.roles);
      if (destination.redirectReason) {
        toast(destination.redirectReason, { icon: 'ℹ️' });
      }

      navigate(destination.path, { replace: true });
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
    <div className="relative flex min-h-screen overflow-hidden bg-[#05070a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,144,171,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_right,rgba(177,137,73,0.15)_0%,transparent_30%)]" />
      {/* Left Side - Form */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center px-6 py-12 lg:w-[48%] lg:flex-none lg:px-20 xl:px-28 bg-[radial-gradient(circle_at_top_left,#1a2430_0%,#0d1218_50%,#05070a_100%)]">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.18)_0%,transparent_70%)]" />
        <div className="relative mx-auto w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,30,0.94)_0%,rgba(7,10,14,0.98)_100%)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-10">
          {/* Back link */}
          <Link
            to="/"
            className="group mb-10 inline-flex items-center gap-2 text-sm font-medium text-[#9ca7b5] transition-colors hover:text-[#f2f5f7]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-[#f5f7fa]">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-[#98a3b2]">
            Sign in to manage your fabrication projects.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-[#d8dee6]">
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-medium text-[#d8dee6]">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]"
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
                  className={`${inputClasses} pr-10`}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-[#8993a1] transition-colors hover:text-[#f5f7fa]"
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
              className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#e2c98f_0%,#c69b4e_45%,#8f6a2f_100%)] font-semibold text-[#14181d] shadow-[0_20px_40px_rgba(148,112,47,0.28)] transition-all hover:bg-[linear-gradient(135deg,#ead39d_0%,#d2ab60_45%,#9f7739_100%)] active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0d1218] px-2 text-[#748090]">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-[#d6dde6]/80 bg-white font-medium text-[#14181d] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_12px_24px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-[#b8c4d1] hover:bg-white hover:text-[#14181d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_16px_28px_rgba(0,0,0,0.16)] active:scale-[0.98] disabled:border-[#d6dde6]/60 disabled:bg-[#eef2f6] disabled:text-[#7d8794]"
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

            <p className="text-center text-sm text-[#98a3b2]">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]"
              >
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>

      <AuthBrandPanel />
    </div>
  );
}
