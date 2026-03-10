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
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { auth, googleProvider } from '@/lib/firebase';

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

  const inputClasses = 'metal-input h-10 text-sm rounded-xl';

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center bg-[radial-gradient(circle_at_top_left,#f4f6f8_0%,#e4e8ed_52%,#d4dae1_100%)] px-6 py-12 lg:w-[48%] lg:flex-none lg:px-20 xl:px-28">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
        <div className="metal-panel relative mx-auto w-full max-w-[440px] rounded-[2rem] p-8 sm:p-10">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <BrandLogo className="h-9 w-9 ring-2 ring-[#b8b8bd]/50 shadow-lg shadow-black/10" />
            <span className="font-bold text-[#1d1d1f] tracking-tight">RMV Stainless</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            Create account
          </h2>
          <p className="mt-1 text-sm text-[#6e6e73]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#1d1d1f] hover:text-[#6e6e73] underline underline-offset-4">
              Sign in
            </Link>
          </p>

          {/* Lockout Banner */}
          {isLocked && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#cb8b86] bg-[linear-gradient(180deg,#fbefed_0%,#efd7d4_100%)] p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#87544f]" />
              <div>
                <p className="text-sm font-semibold text-[#87544f]">Account Locked</p>
                <p className="mt-0.5 text-sm text-[#9a625c]">
                  Too many failed attempts. Try again in {lockCountdown}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[#3a3a3e] text-[13px] font-medium">
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
                <Label htmlFor="lastName" className="text-[#3a3a3e] text-[13px] font-medium">
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
              <Label htmlFor="email" className="text-[#3a3a3e] text-[13px] font-medium">
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
              <Label htmlFor="phone" className="text-[#3a3a3e] text-[13px] font-medium">
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
              <Label htmlFor="password" className="text-[#3a3a3e] text-[13px] font-medium">
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
                  className="absolute right-0 top-0 h-full px-3 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength Meter */}
              {passwordValue.length > 0 && strength && (
                <div className="metal-panel mt-2 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-[#86868b]">Strength</span>
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
                  <div className="flex h-1 gap-0.5 rounded-full overflow-hidden bg-[#d8d8de]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 transition-all duration-300 ${
                          i <= strength.score ? strength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-x-2 gap-y-1 mt-2">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(passwordValue);
                      return (
                        <div
                          key={rule.label}
                          className={`flex items-center text-[10px] gap-1 ${
                            passed ? 'text-emerald-600' : 'text-[#86868b]'
                          }`}
                        >
                          {passed ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-[#c8c8cd]" />
                          )}
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[#3a3a3e] text-[13px] font-medium">
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
                  className="absolute right-0 top-0 h-full px-3 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
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
            <div className="mt-1">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register('agreeToTerms')}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#c8c8cd] text-[#1d1d1f] accent-[#1d1d1f] focus:ring-[#1d1d1f]"
                />
                <span className="text-xs text-[#6e6e73] leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-[#1d1d1f] font-medium underline underline-offset-2 hover:text-[#0071e3] transition-colors">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" target="_blank" className="text-[#1d1d1f] font-medium underline underline-offset-2 hover:text-[#0071e3] transition-colors">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="text-xs text-red-500 mt-1 ml-6.5">{errors.agreeToTerms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 h-11 w-full rounded-xl font-semibold transition-all active:scale-[0.98]"
              disabled={isSubmitting || isLocked}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#c8c8cd]/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[rgba(235,239,244,0.95)] px-2 text-[#86868b]">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-[#cfd6dd] bg-white/40 font-medium text-[#171b21] transition-all active:scale-[0.98] hover:bg-white/65"
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
              <div className="metal-pill flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs text-[#616a74]">
                <AlertCircle className="h-3.5 w-3.5" />
                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'}{' '}
                remaining
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1c] via-[#111113] to-[#0d0d0f]" />
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?ixlib=rb-4.0.3&auto=format&fit=crop&w=1997&q=80"
          alt="Stainless steel fabrication"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0f] via-transparent to-[#0d0d0f]/60" />

        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(180,180,190,0.06)_0%,transparent_60%)] pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 mb-6">
            <Check className="h-6 w-6 text-[#d2d2d7]" />
          </div>
          <blockquote>
            <p className="text-lg font-medium text-[#d2d2d7] leading-relaxed max-w-md">
              &ldquo;Quality is never an accident. It is always the result of intelligent
              effort.&rdquo;
            </p>
            <footer className="mt-4 text-xs font-bold text-[#6e6e73] uppercase tracking-[0.2em]">
              RMV Stainless Steel
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
