import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthField } from '@/components/auth/AuthFields';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type ForgotPasswordForm = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  useAuthPageScrollbar();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setServerError(null);
    try {
      await api.post('/auth/forgot-password', data);
      toast.success('OTP sent to your email');
      navigate('/verify-otp', { state: { email: data.email, purpose: 'password_reset' } });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(error.response?.data?.error?.message || 'Failed to send a reset code. Please try again.');
    }
  };

  return (
    <AuthLayout variant="login">
      <Link to="/login" className="auth-back-link"><ArrowLeft aria-hidden="true" />Back to Sign In</Link>
      <p className="auth-form-eyebrow">Account Recovery</p>
      <h1 className="auth-form-title">Forgot your password?</h1>
      <p className="auth-form-copy">Enter your email and we’ll send a reset code.</p>
      <p className="auth-form-copy" style={{ fontSize: '0.83rem' }}>Google-only accounts should use Continue with Google on the sign-in page.</p>
      {serverError ? <div className="auth-server-alert" role="alert"><AlertCircle aria-hidden="true" />{serverError}</div> : null}
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField id="email" label="Email Address" type="email" placeholder="Enter your email address" autoComplete="email" icon={Mail} error={errors.email?.message} registration={register('email')} />
        <Button type="submit" className="auth-primary-button" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? 'Sending Code…' : 'Send Reset Code'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <p className="auth-form-switch">Remember your password? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
