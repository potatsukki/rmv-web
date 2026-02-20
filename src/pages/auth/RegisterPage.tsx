import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, ShieldAlert, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

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

  const { setCsrfToken } = useAuthStore();

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
      toast.success('Registration successful! Check your email for the OTP.');
      navigate('/verify-otp', {
        state: { email: data.email, purpose: 'email_verification' },
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
    'h-10 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200 text-sm';

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-28 bg-white z-10 w-full lg:w-[48%]">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <BrandLogo className="h-9 w-9 ring-2 ring-orange-500/25 shadow-lg shadow-orange-500/20" />
            <span className="font-bold text-gray-900 tracking-tight">RMV Stainless</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Create account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-500">
              Sign in
            </Link>
          </p>

          {/* Lockout Banner */}
          {isLocked && (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-100">
              <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Account Locked</p>
                <p className="text-sm text-red-600 mt-0.5">
                  Too many failed attempts. Try again in {lockCountdown}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-gray-700 text-[13px] font-medium">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  className={inputClasses}
                  disabled={isLocked}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-gray-700 text-[13px] font-medium">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
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
              <Label htmlFor="email" className="text-gray-700 text-[13px] font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                className={inputClasses}
                disabled={isLocked}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-gray-700 text-[13px] font-medium">
                Mobile Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09XXXXXXXXX"
                className={inputClasses}
                disabled={isLocked}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 text-[13px] font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClasses} pr-10`}
                  disabled={isLocked}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength Meter */}
              {passwordValue.length > 0 && strength && (
                <div className="mt-2 rounded-lg bg-gray-50 p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-gray-400">Strength</span>
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
                  <div className="flex h-1 gap-0.5 rounded-full overflow-hidden bg-gray-200">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 transition-all duration-300 ${
                          i <= strength.score ? strength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1 mt-2">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(passwordValue);
                      return (
                        <div
                          key={rule.label}
                          className={`flex items-center text-[10px] gap-1 ${
                            passed ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        >
                          {passed ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-gray-300" />
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
              <Label htmlFor="confirmPassword" className="text-gray-700 text-[13px] font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`${inputClasses} pr-10`}
                  disabled={isLocked}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 transition-colors"
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

            <Button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold h-11 transition-all active:scale-[0.98] shadow-sm mt-2"
              disabled={isSubmitting || isLocked}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            {!isLocked && attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="flex items-center justify-center gap-2 text-xs text-orange-600 bg-orange-50 p-2.5 rounded-lg border border-orange-100">
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
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950" />
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?ixlib=rb-4.0.3&auto=format&fit=crop&w=1997&q=80"
          alt="Stainless steel fabrication"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/60" />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 backdrop-blur-sm border border-orange-500/20 mb-6">
            <Check className="h-6 w-6 text-orange-400" />
          </div>
          <blockquote>
            <p className="text-lg font-medium text-gray-200 leading-relaxed max-w-md">
              &ldquo;Quality is never an accident. It is always the result of intelligent
              effort.&rdquo;
            </p>
            <footer className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
              RMV Stainless Steel
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
