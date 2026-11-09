import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Loader2, Phone, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { signOut } from 'firebase/auth';

import { AuthField } from '@/components/auth/AuthFields';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { api, fetchCsrfToken } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { getStoredAuthContinuationPath, normalizeAuthContinuationPath } from '@/lib/auth-session';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';
const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50), lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().regex(/^(09|\+639)\d{9}$/, 'Use a valid Philippine mobile number (09XXXXXXXXX)'),
  agreeToTerms: z.literal(true, { message: 'You must agree to the Terms of Service and Privacy Policy' }),
});
type CompleteProfileForm = z.infer<typeof schema>;

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  useAuthPageScrollbar();
  const { setCsrfToken } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const state = location.state as { email?: string; googleName?: string; googleFirstName?: string; googleLastName?: string; googlePhoto?: string; idToken?: string; from?: unknown } | null;
  const from = normalizeAuthContinuationPath(state?.from) || getStoredAuthContinuationPath() || '/dashboard';
  if (!state?.idToken) return <Navigate to="/register" state={{ from }} replace />;
  // Prefer Google's own given/family names; splitting the display name breaks multi-word first names.
  const names = (state.googleName || '').trim().split(/\s+/);
  const defaultFirstName = state.googleFirstName?.trim() || names[0] || '';
  const defaultLastName = state.googleLastName?.trim() || names.slice(1).join(' ') || '';
  const switchGoogleAccount = async () => {
    await signOut(auth).catch(() => undefined);
    navigate('/register', { replace: true, state: { from } });
  };
  const { register, handleSubmit, formState: { errors } } = useForm<CompleteProfileForm>({ resolver: zodResolver(schema), defaultValues: { firstName: defaultFirstName, lastName: defaultLastName, phone: '' } });

  const onSubmit = async (data: CompleteProfileForm) => {
    setSubmitting(true);
    try {
      const csrfToken = await fetchCsrfToken(); setCsrfToken(csrfToken);
      const response = await api.post('/auth/google/complete', { idToken: state.idToken, firstName: data.firstName, lastName: data.lastName, phone: data.phone.startsWith('09') ? `+63${data.phone.slice(1)}` : data.phone });
      setCsrfToken(response.data.data.csrfToken); toast.success('Account created! Please sign in to continue.'); navigate('/login', { replace: true, state: { from } });
    } catch (err: unknown) { const error = err as { response?: { data?: { error?: { message?: string } } } }; toast.error(error.response?.data?.error?.message || 'Failed to complete registration.'); }
    finally { setSubmitting(false); }
  };

  return (
    <AuthLayout variant="register">
      <button type="button" onClick={() => navigate('/register', { state: { from } })} className="auth-back-link"><ArrowLeft aria-hidden="true" />Back to Register</button>
      <p className="auth-form-eyebrow">Google Registration</p>
      <h1 className="auth-form-title">Complete your profile</h1>
      <p className="auth-form-copy">Confirm your name and mobile number to finish creating your account.</p>
      <div className="auth-profile-identity">
        {state.googlePhoto ? <img src={state.googlePhoto} alt="Google account avatar" referrerPolicy="no-referrer" /> : <div className="auth-profile-identity__fallback">{defaultFirstName.slice(0, 1).toUpperCase()}</div>}
        <div><p>{state.googleName || 'Google account'}</p><small>{state.email}</small></div>
      </div>
      <p className="auth-form-switch">Not you? <button type="button" onClick={switchGoogleAccount} className="font-semibold underline underline-offset-2">Use another Google account</button></p>
      <form className="auth-form auth-form--register" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth-name-grid"><AuthField id="firstName" label="First Name" placeholder="Enter your first name" autoComplete="given-name" icon={UserRound} error={errors.firstName?.message} registration={register('firstName')} /><AuthField id="lastName" label="Last Name" placeholder="Enter your last name" autoComplete="family-name" icon={UserRound} error={errors.lastName?.message} registration={register('lastName')} /></div>
        <AuthField id="phone" label="Mobile Number" requiredMark type="tel" inputMode="tel" placeholder="09XXXXXXXXX" autoComplete="tel" icon={Phone} error={errors.phone?.message} registration={register('phone')} />
        <div><label className="auth-terms"><input id="agreeToTerms" type="checkbox" aria-invalid={Boolean(errors.agreeToTerms)} aria-describedby={errors.agreeToTerms ? 'terms-error' : undefined} {...register('agreeToTerms')} /><span>I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>.</span></label>{errors.agreeToTerms ? <p id="terms-error" className="auth-terms-error">{errors.agreeToTerms.message}</p> : null}</div>
        <Button type="submit" className="auth-primary-button" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{submitting ? 'Completing Registration…' : 'Complete Registration'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
      </form>
    </AuthLayout>
  );
}
