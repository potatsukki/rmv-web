import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, Mail, Phone, ShieldAlert, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';

import { AuthField, GoogleAuthButton, PasswordField } from '@/components/auth/AuthFields';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { auth, googleProvider } from '@/lib/firebase';
import { resolvePostLoginPath } from '@/lib/auth-routing';
import {
  clearStoredAuthContinuationPath,
  getStoredAuthContinuationPath,
  normalizeAuthContinuationPath,
  setStoredAuthContinuationPath,
} from '@/lib/auth-session';
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

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50).regex(/^[a-zA-Z\s'-]+$/, 'Special characters are not allowed'),
  lastName: z.string().min(1, 'Last name is required').max(50).regex(/^[a-zA-Z\s'-]+$/, 'Special characters are not allowed'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().regex(/^(09|\+639)\d{9}$/, 'Use a valid Philippine mobile number (09XXXXXXXXX)'),
  password: z.string().min(8, 'Use at least 8 characters').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[a-z]/, 'Include a lowercase letter').regex(/\d/, 'Include a number').regex(/[^A-Za-z0-9]/, 'Include a special character'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
  agreeToTerms: z.literal(true, { message: 'You must agree to the Terms of Service and Privacy Policy' }),
}).refine((data) => data.password === data.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type RegisterForm = z.infer<typeof registerSchema>;

const passwordRules = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'Uppercase', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Lowercase', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Number', test: (value: string) => /\d/.test(value) },
  { label: 'Special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function getStrength(password: string) {
  const score = passwordRules.filter((rule) => rule.test(password)).length;
  if (score <= 1) return { score, label: 'Weak', color: '#e45858' };
  if (score <= 2) return { score, label: 'Fair', color: '#e08a3a' };
  if (score <= 3) return { score, label: 'Good', color: '#f5b400' };
  return { score, label: score === 5 ? 'Very strong' : 'Strong', color: '#43a66b' };
}

export function RegisterPage() {
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  useAuthPageScrollbar();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCsrfToken, setAccessToken, setRefreshToken, fetchMe } = useAuthStore();
  const locationState = location.state as { from?: unknown } | null;
  const locationFrom = normalizeAuthContinuationPath(locationState?.from);
  const from = locationFrom || getStoredAuthContinuationPath() || '/dashboard';

  useEffect(() => {
    if (locationFrom) setStoredAuthContinuationPath(locationFrom);
  }, [locationFrom]);

  useEffect(() => {
    const data = getAttemptData();
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      setLockedUntil(data.lockedUntil);
      setAttempts(data.count);
    } else if (data.lockedUntil) {
      setAttemptData(0, null);
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
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setLockCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: '' },
  });
  const passwordValue = watch('password', '');
  const strength = passwordValue ? getStrength(passwordValue) : null;

  const recordFailedAttempt = useCallback((message: string) => {
    const newCount = attempts + 1;
    setAttempts(newCount);
    if (newCount >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_DURATION_MS;
      setLockedUntil(until);
      setAttemptData(newCount, until);
      setServerError('Too many failed attempts. Try again in 15 minutes.');
      return;
    }
    setAttemptData(newCount, null);
    setServerError(message);
  }, [attempts]);

  const handleGoogleSignUp = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);
      const response = await api.post('/auth/google', { idToken });
      const responseData = response.data.data;

      if (responseData.needsProfile) {
        navigate('/complete-profile', { state: { email: responseData.email, googleName: responseData.googleName, googlePhoto: responseData.googlePhoto, idToken, from }, replace: true });
        return;
      }
      if (responseData.requires2FA) {
        navigate('/verify-2fa', { state: { tempToken: responseData.tempToken, email: responseData.user.email, firstName: responseData.user.firstName, from }, replace: true });
        return;
      }

      setCsrfToken(responseData.csrfToken);
      if (responseData.accessToken) setAccessToken(responseData.accessToken);
      if (responseData.refreshToken) setRefreshToken(responseData.refreshToken);
      await fetchMe();
      toast.success('Welcome back!');
      if (responseData.user?.mustChangePassword) {
        navigate('/change-password', { replace: true, state: { from } });
        return;
      }
      const destination = resolvePostLoginPath(from, responseData.user.roles);
      if (destination.redirectReason) toast(destination.redirectReason, { icon: 'ℹ️' });
      clearStoredAuthContinuationPath();
      navigate(destination.path, { replace: true });
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string; response?: { data?: { error?: { message?: string } } } };
      if (error.code !== 'auth/popup-closed-by-user') {
        setServerError(error.response?.data?.error?.message || error.message || 'Google sign-up failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    if (isLocked) return;
    setServerError(null);
    try {
      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);
      await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone.startsWith('09') ? `+63${data.phone.slice(1)}` : data.phone,
        password: data.password,
      });
      setAttemptData(0, null);
      setAttempts(0);
      navigate('/login', { replace: true, state: { registeredEmail: data.email, registrationComplete: true, from } });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      recordFailedAttempt(error.response?.data?.error?.message || 'Registration failed. Please review your details and try again.');
    }
  };

  return (
    <AuthLayout variant="register">
      <Link to="/" className="auth-back-link"><ArrowLeft aria-hidden="true" />Back to Home</Link>
      <h1 className="auth-form-title">Create <em>Account</em></h1>
      <p className="auth-form-switch">Already have an account? <Link to="/login" state={{ from }}>Sign in</Link></p>
      {isLocked ? (
        <div className="auth-lockout" role="alert"><ShieldAlert aria-hidden="true" /><p><strong>Account locked</strong>Too many failed attempts. Try again in {lockCountdown}.</p></div>
      ) : null}
      {serverError ? <div className="auth-server-alert" role="alert"><AlertCircle aria-hidden="true" />{serverError}</div> : null}

      <form className="auth-form auth-form--register" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth-name-grid">
          <AuthField id="firstName" label="First Name" placeholder="Enter your first name" autoComplete="given-name" icon={UserRound} error={errors.firstName?.message} disabled={isLocked} registration={register('firstName')} />
          <AuthField id="lastName" label="Last Name" placeholder="Enter your last name" autoComplete="family-name" icon={UserRound} error={errors.lastName?.message} disabled={isLocked} registration={register('lastName')} />
        </div>
        <AuthField id="email" label="Email Address" type="email" placeholder="Enter your email address" autoComplete="email" icon={Mail} error={errors.email?.message} disabled={isLocked} registration={register('email')} />
        <AuthField id="phone" label="Mobile Number" type="tel" inputMode="tel" placeholder="09XXXXXXXXX" autoComplete="tel" icon={Phone} error={errors.phone?.message} disabled={isLocked} registration={register('phone')} />
        <PasswordField id="password" label="Password" placeholder="Create a secure password" autoComplete="new-password" error={errors.password?.message} disabled={isLocked} registration={register('password')} />
        {strength ? (
          <div className="auth-password-strength" aria-live="polite">
            <div className="auth-password-strength__top"><span>Password strength</span><strong style={{ color: strength.color }}>{strength.label}</strong></div>
            <div className="auth-password-strength__bars" aria-hidden="true">{[1, 2, 3, 4, 5].map((item) => <span key={item} style={item <= strength.score ? { background: strength.color } : undefined} />)}</div>
            <div className="auth-password-strength__rules">
              {passwordRules.map((rule) => <span key={rule.label}>{rule.test(passwordValue) ? <Check aria-hidden="true" /> : null}{rule.label}</span>)}
            </div>
          </div>
        ) : null}
        <PasswordField id="confirmPassword" label="Confirm Password" placeholder="Confirm your password" autoComplete="new-password" error={errors.confirmPassword?.message} disabled={isLocked} registration={register('confirmPassword')} />
        <div>
          <label className="auth-terms">
            <input type="checkbox" aria-invalid={Boolean(errors.agreeToTerms)} aria-describedby={errors.agreeToTerms ? 'terms-error' : undefined} disabled={isLocked} {...register('agreeToTerms')} />
            <span>I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>.</span>
          </label>
          {errors.agreeToTerms ? <p id="terms-error" className="auth-terms-error">{errors.agreeToTerms.message}</p> : null}
        </div>
        <Button type="submit" className="auth-primary-button" disabled={isSubmitting || googleLoading || isLocked}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? 'Creating Account…' : 'Create Account'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="auth-divider" aria-hidden="true">or</div>
        <GoogleAuthButton label="Sign up with Google" loading={googleLoading} disabled={isSubmitting || isLocked} onClick={handleGoogleSignUp} />
        {!isLocked && attempts > 0 && attempts < MAX_ATTEMPTS ? <p className="auth-attempts"><AlertCircle aria-hidden="true" />{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining</p> : null}
      </form>
    </AuthLayout>
  );
}
