import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/AuthFields';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { resolvePostLoginPath } from '@/lib/auth-routing';
import {
  clearStoredAuthContinuationPath,
  getStoredAuthContinuationPath,
  normalizeAuthContinuationPath,
} from '@/lib/auth-session';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';
import { useAuthStore } from '@/stores/auth.store';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof schema>;

const passwordRules = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'Uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'A digit', test: (value: string) => /\d/.test(value) },
  { label: 'Special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fetchMe } = useAuthStore();
  const locationState = location.state as { from?: unknown } | null;
  const from = normalizeAuthContinuationPath(locationState?.from) || getStoredAuthContinuationPath() || '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);
  useAuthPageScrollbar();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(schema) });

  const passwordValue = watch('newPassword', '');

  const onSubmit = async (data: ChangePasswordForm) => {
    setServerError(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully.');
      await fetchMe();
      const roles = useAuthStore.getState().user?.roles ?? user?.roles ?? [];
      const destination = resolvePostLoginPath(from, roles);
      clearStoredAuthContinuationPath();
      navigate(destination.path, { replace: true });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        ?? 'We could not change your password. Please check your current password and try again.';
      setServerError(message);
    }
  };

  return (
    <AuthLayout variant="login">
      {!user?.mustChangePassword ? (
        <button type="button" className="auth-back-link" onClick={() => navigate('/profile')}>
          <ArrowLeft aria-hidden="true" /> Back to Profile
        </button>
      ) : null}

      <p className="auth-form-eyebrow">Account security</p>
      <h1 className="auth-form-title">Change your password</h1>
      <p className="auth-form-copy">Use a strong, unique password to keep your RMV account protected.</p>

      {user?.mustChangePassword ? (
        <div className="auth-server-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>Your administrator requires a password change before you continue. Use the temporary password as your current password.</span>
        </div>
      ) : null}
      {serverError ? (
        <div className="auth-server-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PasswordField
          id="currentPassword"
          label="Current password"
          registration={register('currentPassword')}
          error={errors.currentPassword?.message}
          placeholder="Enter your current password"
          autoComplete="current-password"
        />
        <PasswordField
          id="newPassword"
          label="New password"
          registration={register('newPassword')}
          error={errors.newPassword?.message}
          placeholder="Create a new password"
          autoComplete="new-password"
        />
        {passwordValue ? (
          <div className="auth-password-rules" aria-live="polite">
            {passwordRules.map((rule) => {
              const passed = rule.test(passwordValue);
              return (
                <span key={rule.label} className={passed ? 'is-valid' : ''}>
                  {passed ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                  {rule.label}
                </span>
              );
            })}
          </div>
        ) : null}
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          registration={register('confirmPassword')}
          error={errors.confirmPassword?.message}
          placeholder="Confirm your new password"
          autoComplete="new-password"
        />

        <Button type="submit" className="auth-primary-button" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? 'UPDATING PASSWORD…' : 'UPDATE PASSWORD'}
          {!isSubmitting ? <ArrowRight aria-hidden="true" /> : null}
        </Button>
      </form>

      {!user?.mustChangePassword ? (
        <p className="auth-form-footer-copy">
          <Link to="/account/security">Return to account security</Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}
