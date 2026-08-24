import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRedirectResult, signInWithPopup, signInWithRedirect, type UserCredential } from 'firebase/auth';

import { AuthField, GoogleAuthButton, PasswordField } from '@/components/auth/AuthFields';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { auth, googleProvider } from '@/lib/firebase';
import {
  clearStoredAuthContinuationPath,
  consumeAuthRedirectReason,
  getStoredAuthContinuationPath,
  normalizeAuthContinuationPath,
  setStoredAuthContinuationPath,
} from '@/lib/auth-session';
import { resolvePostLoginPath } from '@/lib/auth-routing';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface AuthErrorNotice {
  title: string;
  message: string;
}

function getGoogleErrorNotice(err: unknown): AuthErrorNotice {
  const error = err as {
    code?: string;
    message?: string;
    response?: { data?: { error?: { code?: string; message?: string } } };
  };

  const serverError = error.response?.data?.error;
  if (serverError?.code === 'TOKEN_EXPIRED') {
    return { title: 'Google session expired', message: 'Select Continue with Google again to start a fresh sign-in.' };
  }
  if (serverError?.code === 'TOKEN_INVALID' || serverError?.message === 'Invalid Google token') {
    return { title: 'Google sign-in could not be verified', message: 'Please try again. If it continues, refresh this page or use your email and password.' };
  }
  if (error.code === 'auth/unauthorized-domain') {
    return { title: 'Google sign-in is unavailable here', message: 'This website address is not authorized for Google sign-in. Please contact RMV support.' };
  }
  if (error.code === 'auth/web-storage-unsupported') {
    return { title: 'Browser storage is disabled', message: 'Enable cookies and browser storage, then try Continue with Google again.' };
  }
  if (error.code === 'auth/network-request-failed') {
    return { title: 'Connection interrupted', message: 'Check your internet connection and try Continue with Google again.' };
  }
  if (error.code === 'auth/popup-closed-by-user') {
    return { title: 'Google sign-in was cancelled', message: 'No changes were made. Select Continue with Google whenever you are ready.' };
  }
  return {
    title: 'Google sign-in was unsuccessful',
    message: serverError?.message || 'Please try again. You can also sign in with your email and password.',
  };
}

export function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<AuthErrorNotice | null>(null);
  useAuthPageScrollbar();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchMe, setCsrfToken, setAccessToken, setRefreshToken } = useAuthStore();
  const locationState = (location.state as {
    from?: unknown;
    registeredEmail?: string;
    registrationComplete?: boolean;
  } | null) ?? null;
  const locationFrom = normalizeAuthContinuationPath(locationState?.from);
  const from = locationFrom || getStoredAuthContinuationPath() || '/dashboard';

  useEffect(() => {
    if (locationFrom) setStoredAuthContinuationPath(locationFrom);
  }, [locationFrom]);

  const finishGoogleSignIn = useCallback(async (result: UserCredential) => {
    const idToken = await result.user.getIdToken();
    const csrfToken = await fetchCsrfToken();
    setCsrfToken(csrfToken);

    const response = await api.post('/auth/google', { idToken });
    const responseData = response.data.data;

    if (responseData.needsProfile) {
      navigate('/complete-profile', {
        state: { email: responseData.email, googleName: responseData.googleName, googlePhoto: responseData.googlePhoto, idToken, from },
        replace: true,
      });
      return;
    }

    if (responseData.requires2FA) {
      navigate('/verify-2fa', {
        state: { tempToken: responseData.tempToken, email: responseData.user.email, firstName: responseData.user.firstName, from },
        replace: true,
      });
      return;
    }

    setCsrfToken(responseData.csrfToken);
    if (responseData.accessToken) setAccessToken(responseData.accessToken);
    if (responseData.refreshToken) setRefreshToken(responseData.refreshToken);
    await fetchMe();
    toast.success('Welcome back!');

    const destination = resolvePostLoginPath(from, responseData.user.roles);
    if (destination.redirectReason) toast(destination.redirectReason, { icon: 'ℹ️' });
    clearStoredAuthContinuationPath();
    navigate(destination.path, { replace: true });
  }, [fetchMe, from, navigate, setAccessToken, setCsrfToken, setRefreshToken]);

  useEffect(() => {
    const redirectReason = consumeAuthRedirectReason();
    if (redirectReason) toast.error(redirectReason);
    if (locationState?.registrationComplete) {
      toast.success('Registration successful. Sign in when you are ready. If your email is still unverified, we will send you to OTP verification next.');
    }
  }, [locationState?.registrationComplete]);

  useEffect(() => {
    let cancelled = false;

    const completeRedirectSignIn = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result || cancelled) return;
        setGoogleLoading(true);
        await finishGoogleSignIn(result);
      } catch (err: unknown) {
        if (!cancelled) setServerError(getGoogleErrorNotice(err));
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    };

    void completeRedirectSignIn();
    return () => { cancelled = true; };
  }, [finishGoogleSignIn]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: locationState?.registeredEmail ?? '', password: '' },
  });

  const handleGoogleSignIn = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await finishGoogleSignIn(result);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const canFallbackToRedirect = code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/operation-not-supported-in-this-environment';
      if (canFallbackToRedirect) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setServerError(getGoogleErrorNotice(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);
      const response = await api.post('/auth/login', data);
      const responseData = response.data.data;

      if (responseData.requires2FA) {
        navigate('/verify-2fa', {
          state: { tempToken: responseData.tempToken, email: responseData.user.email, firstName: responseData.user.firstName, from },
          replace: true,
        });
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
      const error = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      const code = error.response?.data?.error?.code;

      if (code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email first.');
        navigate('/verify-otp', { state: { email: data.email, purpose: 'email_verification', from } });
        return;
      }

      const messages: Record<string, string> = {
        ACCOUNT_DISABLED: 'Your account has been disabled. Contact support for help.',
        INVALID_CREDENTIALS: 'The email or password you entered is incorrect. Please check and try again.',
        ACCOUNT_EXPIRED: 'Your account has expired. Please contact your administrator.',
      };
      setServerError({
        title: 'Sign-in unsuccessful',
        message: messages[code ?? ''] || error.response?.data?.error?.message || 'Something went wrong. Please try again later.',
      });
    }
  };

  return (
    <AuthLayout variant="login">
      <Link to="/" className="auth-back-link"><ArrowLeft aria-hidden="true" />Back to Home</Link>
      <p className="auth-form-eyebrow">Welcome Back</p>
      <h1 className="auth-form-title">Sign in to your account</h1>
      <p className="auth-form-copy">Access your projects, manage quotes, and track progress.</p>
      {serverError ? (
        <div className="auth-server-alert" role="alert">
          <AlertCircle aria-hidden="true" />
          <div className="auth-server-alert__content">
            <strong>{serverError.title}</strong>
            <p>{serverError.message}</p>
          </div>
          <button type="button" className="auth-server-alert__close" onClick={() => setServerError(null)} aria-label="Dismiss sign-in message">
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField id="email" label="Email Address" type="email" placeholder="Enter your email address" autoComplete="email" icon={Mail} error={errors.email?.message} registration={register('email')} />
        <PasswordField
          id="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          registration={register('password')}
          labelAction={<Link to="/forgot-password">Forgot password?</Link>}
        />
        <Button type="submit" className="auth-primary-button" disabled={isSubmitting || googleLoading}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? 'Signing In…' : 'Sign In'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="auth-divider" aria-hidden="true">or</div>
        <GoogleAuthButton label="Continue with Google" loading={googleLoading} disabled={isSubmitting} onClick={handleGoogleSignIn} />
        <p className="auth-form-switch">Don&apos;t have an account? <Link to="/register" state={{ from }}>Create account</Link></p>
      </form>
    </AuthLayout>
  );
}
