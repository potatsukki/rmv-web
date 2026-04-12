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

  const inputClasses = 'label-font h-12 rounded-none border-white/10 bg-white/[0.03] text-sm tracking-widest text-white placeholder:text-[#5a5a60] focus-visible:border-[#FFD700]/30 focus-visible:ring-0 transition-all focus:bg-white/[0.05]';

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);

    // Firebase is slow to detect a closed popup (5-10s polling).
    // When the user closes the popup and this window regains focus,
    // we give Firebase a short grace period and then clear the spinner.
    let settled = false;
    const onFocus = () => {
      setTimeout(() => {
        if (!settled) {
          settled = true;
          setGoogleLoading(false);
        }
      }, 1500);
    };
    window.addEventListener('focus', onFocus);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      settled = true; // success — don't let the focus handler interfere

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
      window.removeEventListener('focus', onFocus);
      settled = true;
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
    <div className="landing-atelier dark relative flex min-h-screen overflow-hidden bg-black text-white/90">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,144,171,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_right,rgba(177,137,73,0.15)_0%,transparent_30%)]" />
      {/* Left Side - Form */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center px-6 py-12 lg:w-[48%] lg:flex-none lg:px-20 xl:px-28 bg-black">
        
        <div className="blueprint-grid absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative mx-auto w-full max-w-[420px] border border-white/5 bg-[#0a0a0b]/60 p-7 sm:p-10 backdrop-blur-3xl">
          {/* Back link */}
          <Link
            to="/"
            className="group mb-10 inline-flex items-center gap-2 text-sm font-medium text-[#9ca7b5] transition-colors hover:text-[#f2f5f7]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          <h2 className="headline-font text-[clamp(1.5rem,8vw,2rem)] font-bold tracking-tight text-white leading-tight">
            Welcome back
          </h2>
          <p className="label-font mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#919097] leading-relaxed">
            Sign in to manage your projects.
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

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-y-2">
                <Label htmlFor="password" className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] gold-glow">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="label-font text-[10px] font-bold uppercase tracking-widest text-[#FFD700] hover:text-[#FFD700]/80 transition-colors"
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
              className="label-font brass-gradient h-12 w-full rounded-none border-none text-[11px] font-black uppercase tracking-[0.3em] text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
              className="google-btn-atelier label-font h-12 w-full rounded-none border border-white/10 bg-white/[0.03] px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-white/[0.08] hover:text-white"
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
                className="label-font font-black tracking-widest text-[#FFD700] hover:text-[#FFD700]/80 transition-all"
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
