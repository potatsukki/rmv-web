import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, ShieldAlert, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const STORAGE_KEY = 'rmv_register_attempts';

function getAttemptData(): { count: number; lockedUntil: number | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function setAttemptData(count: number, lockedUntil: number | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, lockedUntil }));
}

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(/^(09|\+639)\d{9}$/, 'Must be a valid PH mobile (09XXXXXXXXX)'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeToTerms: z.literal(true, {
      message: 'You must agree to the Terms of Service and Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const passwordRules = [
  { label: '8+ characters', test: (v: string) => v.length >= 8 },
  { label: 'Uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Lowercase', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Number', test: (v: string) => /\d/.test(v) },
  { label: 'Special char', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = passwordRules.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (passed <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (passed <= 3) return { score: 3, label: 'Good', color: 'bg-amber-500' };
  if (passed <= 4) return { score: 4, label: 'Strong', color: 'bg-blue-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-emerald-500' };
}

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState('');
  useAuthPageScrollbar();
  const navigate = useNavigate();

  useEffect(() => {
    const data = getAttemptData();
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      setLockedUntil(data.lockedUntil);
      setAttempts(data.count);
    } else if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      setAttemptData(0, null);
      setAttempts(0);
    } else {
      setAttempts(data.count);
    }
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setAttemptData(0, null);
        setLockCountdown('');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setLockCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: '' },
  });

  const passwordValue = watch('password', '');
  const strength = passwordValue.length > 0 ? getStrength(passwordValue) : null;

  const recordFailedAttempt = useCallback(() => {
    const newCount = attempts + 1;
    setAttempts(newCount);
    if (newCount >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_DURATION_MS;
      setLockedUntil(until);
      setAttemptData(newCount, until);
      toast.error('Too many failed attempts. Try again in 15 minutes.');
    } else {
      setAttemptData(newCount, null);
      const remaining = MAX_ATTEMPTS - newCount;
      toast.error(
        `Registration failed. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      );
    }
  }, [attempts]);

  const { setCsrfToken, setAccessToken, setRefreshToken } = useAuthStore();

  const [googleLoading, setGoogleLoading] = useState(false);
  const { fetchMe } = useAuthStore();

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);

      const response = await api.post('/auth/google', { idToken });
      const responseData = response.data.data;

      if (responseData.needsProfile) {
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
          },
          replace: true,
        });
        return;
      }

      // User already exists — logged in
      const newCsrfToken = responseData.csrfToken;
      setCsrfToken(newCsrfToken);
      if (responseData.accessToken) setAccessToken(responseData.accessToken);
      if (responseData.refreshToken) setRefreshToken(responseData.refreshToken);
      await fetchMe();
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const error = err as { code?: string; response?: { data?: { error?: { message?: string } } } };
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error(error.response?.data?.error?.message || 'Google sign-up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    if (isLocked) return;

    try {
      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);
      await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone.startsWith('09') ? '+63' + data.phone.slice(1) : data.phone,
        password: data.password,
      });
      setAttemptData(0, null);
      setAttempts(0);
      navigate('/login', {
        replace: true,
        state: {
          registeredEmail: data.email,
          registrationComplete: true,
        },
      });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const msg = error.response?.data?.error?.message || 'Registration failed';
      recordFailedAttempt();
      if (attempts + 1 < MAX_ATTEMPTS) {
        toast.error(msg);
      }
    }
  };

  const inputClasses =
    'auth-input h-10 rounded-xl border-white/10 bg-white/[0.05] text-sm text-[#f5f7fa] placeholder:text-[#7f8895] shadow-none focus-visible:ring-[#d6b36a]/35';

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#05070a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,144,171,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_right,rgba(177,137,73,0.15)_0%,transparent_30%)]" />
      {/* Left Side - Form */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center bg-[radial-gradient(circle_at_top_left,#1a2430_0%,#0d1218_50%,#05070a_100%)] px-6 py-8 lg:w-[54%] lg:flex-none lg:px-14 lg:py-6 xl:px-20 xl:py-8">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.18)_0%,transparent_70%)]" />
        <div className="relative mx-auto w-full max-w-[520px] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,30,0.94)_0%,rgba(7,10,14,0.98)_100%)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-8 lg:max-w-[540px]">
          {/* Back link */}
          <Link
            to="/"
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#9ca7b5] transition-colors hover:text-[#f2f5f7]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-[#f5f7fa]">
            Create account
          </h2>
          <p className="mt-1 text-sm text-[#98a3b2]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]">
              Sign in
            </Link>
          </p>

          {/* Lockout Banner */}
          {isLocked && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#8b4b49]/70 bg-[linear-gradient(180deg,rgba(71,24,24,0.88)_0%,rgba(42,15,15,0.96)_100%)] p-3.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#f0aaa3]" />
              <div>
                <p className="text-sm font-semibold text-[#f3c2bc]">Account Locked</p>
                <p className="mt-0.5 text-sm text-[#d4a09a]">
                  Too many failed attempts. Try again in {lockCountdown}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3.5 lg:space-y-3">
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[13px] font-medium text-[#d8dee6]">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  className={inputClasses}
                  disabled={isLocked}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-[13px] font-medium text-[#d8dee6]">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  className={inputClasses}
                  disabled={isLocked}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-[#d8dee6]">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className={inputClasses}
                disabled={isLocked}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[13px] font-medium text-[#d8dee6]">
                Mobile Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your mobile number"
                className={inputClasses}
                disabled={isLocked}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium text-[#d8dee6]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`${inputClasses} pr-10`}
                  disabled={isLocked}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-[#8993a1] transition-colors hover:text-[#f5f7fa]"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength Meter */}
              {passwordValue.length > 0 && strength && (
                <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.04] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#97a2b0]">Strength</span>
                    <span
                      className={`text-[11px] font-bold ${
                        strength.score <= 1
                          ? 'text-red-500'
                          : strength.score <= 3
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex h-1 gap-0.5 overflow-hidden rounded-full bg-white/10">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 transition-all duration-300 ${
                          i <= strength.score ? strength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 min-[400px]:grid-cols-3">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(passwordValue);
                      return (
                        <div
                          key={rule.label}
                          className={`flex items-center text-[10px] gap-1 ${
                            passed ? 'text-emerald-400' : 'text-[#8c97a6]'
                          }`}
                        >
                          {passed ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border border-white/15" />
                          )}
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-[#d8dee6]">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  className={`${inputClasses} pr-10`}
                  disabled={isLocked}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-[#8993a1] transition-colors hover:text-[#f5f7fa]"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms & Privacy agreement */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register('agreeToTerms')}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-white/15 bg-white/5 text-[#d6b36a] accent-[#d6b36a] focus:ring-[#d6b36a]"
                />
                <span className="text-xs leading-relaxed text-[#98a3b2]">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="font-medium text-[#d6b36a] underline underline-offset-2 transition-colors hover:text-[#f0d28f]">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" target="_blank" className="font-medium text-[#d6b36a] underline underline-offset-2 transition-colors hover:text-[#f0d28f]">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="mt-1 ml-6.5 text-xs text-red-500">{errors.agreeToTerms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(135deg,#e2c98f_0%,#c69b4e_45%,#8f6a2f_100%)] font-semibold text-[#14181d] shadow-[0_20px_40px_rgba(148,112,47,0.28)] transition-all hover:bg-[linear-gradient(135deg,#ead39d_0%,#d2ab60_45%,#9f7739_100%)] active:scale-[0.98]"
              disabled={isSubmitting || isLocked}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
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
              onClick={handleGoogleSignUp}
              disabled={googleLoading || isSubmitting || isLocked}
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
              Sign up with Google
            </Button>

            {!isLocked && attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-[#a8b3c0]">
                <AlertCircle className="h-3.5 w-3.5" />
                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'}{' '}
                remaining
              </div>
            )}
          </form>
        </div>
      </div>

      <AuthBrandPanel />
    </div>
  );
}
