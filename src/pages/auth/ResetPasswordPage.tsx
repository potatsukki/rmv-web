import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/AuthFields';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const schema = z.object({
  newPassword: z.string().min(8, 'Use at least 8 characters').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[a-z]/, 'Include a lowercase letter').regex(/\d/, 'Include a number').regex(/[^A-Za-z0-9]/, 'Include a special character'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type ResetPasswordForm = z.infer<typeof schema>;

const rules = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'Uppercase', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Lowercase', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Number', test: (value: string) => /\d/.test(value) },
  { label: 'Special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function ResetPasswordPage() {
  useAuthPageScrollbar();
  const location = useLocation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const state = location.state as { email?: string; otp?: string } | null;
  const email = state?.email || '';
  const otp = state?.otp || '';
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({ resolver: zodResolver(schema) });
  const password = watch('newPassword', '');

  useEffect(() => {
    if (!email || !otp) navigate('/forgot-password', { replace: true });
  }, [email, otp, navigate]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setServerError(null);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword: data.newPassword });
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(error.response?.data?.error?.message || 'Password reset failed. Please request a new code and try again.');
    }
  };

  if (!email || !otp) return null;

  return (
    <AuthLayout variant="login">
      <Link to="/login" className="auth-back-link"><ArrowLeft aria-hidden="true" />Back to Sign In</Link>
      <p className="auth-form-eyebrow">Account Recovery</p>
      <h1 className="auth-form-title">Reset your password</h1>
      <p className="auth-form-copy">Choose a new password for your account.</p>
      {serverError ? <div className="auth-server-alert" role="alert"><AlertCircle aria-hidden="true" />{serverError}</div> : null}
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PasswordField id="newPassword" label="New Password" placeholder="Create a new password" autoComplete="new-password" error={errors.newPassword?.message} registration={register('newPassword')} />
        {password ? <div className="auth-password-strength" aria-live="polite"><div className="auth-password-strength__top"><span>Password requirements</span><strong>{rules.filter((rule) => rule.test(password)).length}/5</strong></div><div className="auth-password-strength__rules">{rules.map((rule) => <span key={rule.label}>{rule.test(password) ? <Check aria-hidden="true" /> : null}{rule.label}</span>)}</div></div> : null}
        <PasswordField id="confirmPassword" label="Confirm Password" placeholder="Confirm your new password" autoComplete="new-password" error={errors.confirmPassword?.message} registration={register('confirmPassword')} />
        <Button type="submit" className="auth-primary-button" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{isSubmitting ? 'Resetting Password…' : 'Reset Password'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
      </form>
    </AuthLayout>
  );
}
