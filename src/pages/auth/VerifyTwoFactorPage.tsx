import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { resolvePostLoginPath } from '@/lib/auth-routing';
import {
  clearStoredAuthContinuationPath,
  getStoredAuthContinuationPath,
  normalizeAuthContinuationPath,
} from '@/lib/auth-session';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

interface VerifyTwoFactorState { tempToken: string; email: string; firstName?: string; from?: unknown; }

export function VerifyTwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  useAuthPageScrollbar();
  const { fetchMe, setCsrfToken, setAccessToken, setRefreshToken } = useAuthStore();
  const state = location.state as VerifyTwoFactorState | null;
  const tempToken = state?.tempToken || '';
  const email = state?.email || '';
  const from = normalizeAuthContinuationPath(state?.from) || getStoredAuthContinuationPath() || '/dashboard';
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (!tempToken || !email) navigate('/login', { replace: true, state: { from } }); }, [email, from, navigate, tempToken]);
  useEffect(() => { if (cooldown <= 0) return; const timer = window.setInterval(() => setCooldown((value) => value - 1), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);
  const handleChange = (index: number, value: string) => { if (!/^\d*$/.test(value)) return; const next = [...otp]; next[index] = value.slice(-1); setOtp(next); if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus(); };
  const handleKeyDown = (index: number, event: React.KeyboardEvent) => { if (event.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus(); };
  const handlePaste = (event: React.ClipboardEvent) => { event.preventDefault(); const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH); if (!pasted) return; setOtp(Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? '')); inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus(); };

  const handleSubmit = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) { toast.error('Please enter the complete code'); return; }
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/verify-2fa', { tempToken, otp: code });
      const data = response.data.data;
      setCsrfToken(data.csrfToken);
      if (data.accessToken) setAccessToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      await fetchMe();
      toast.success('Welcome back!');
      if (data.user?.mustChangePassword) { navigate('/change-password', { replace: true, state: { from } }); return; }
      const destination = resolvePostLoginPath(from, data.user.roles);
      if (destination.redirectReason) toast(destination.redirectReason, { icon: 'ℹ️' });
      clearStoredAuthContinuationPath();
      navigate(destination.path, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      if (error.response?.data?.error?.code === 'TOKEN_EXPIRED') { toast.error('Verification session expired. Please log in again.'); navigate('/login', { replace: true, state: { from } }); return; }
      toast.error(error.response?.data?.error?.message || 'Verification failed'); setOtp(Array(OTP_LENGTH).fill('')); inputRefs.current[0]?.focus();
    } finally { setIsSubmitting(false); }
  }, [fetchMe, from, navigate, otp, setAccessToken, setCsrfToken, setRefreshToken, tempToken]);
  useEffect(() => { if (otp.every(Boolean)) void handleSubmit(); }, [handleSubmit, otp]);
  const handleResend = async () => { setIsResending(true); try { await api.post('/auth/resend-2fa', { tempToken }); toast.success('New verification code sent to your email'); setCooldown(RESEND_COOLDOWN); setOtp(Array(OTP_LENGTH).fill('')); inputRefs.current[0]?.focus(); } catch (err: unknown) { const error = err as { response?: { data?: { error?: { message?: string; code?: string } } } }; if (error.response?.data?.error?.code === 'TOKEN_EXPIRED') { navigate('/login', { replace: true, state: { from } }); return; } toast.error(error.response?.data?.error?.message || 'Failed to resend code'); } finally { setIsResending(false); } };
  if (!tempToken || !email) return null;

  return (
    <AuthLayout variant="login">
      <Link to="/login" state={{ from }} className="auth-back-link"><ArrowLeft aria-hidden="true" />Back to Sign In</Link>
      <p className="auth-form-eyebrow">Secure Access</p>
      <h1 className="auth-form-title">Verification required</h1>
      <p className="auth-form-copy">{state?.firstName ? `Hi ${state.firstName}, ` : ''}we sent a six-digit code to <strong>{email}</strong>.</p>
      <div className="auth-form">
        <div className="auth-otp-row" onPaste={handlePaste} aria-label="Six digit two-factor verification code">
          {otp.map((digit, index) => <Input key={index} ref={(element) => { inputRefs.current[index] = element; }} className="auth-otp-input" type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(event) => handleChange(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} disabled={isSubmitting} autoComplete="one-time-code" aria-label={`Verification digit ${index + 1}`} />)}
        </div>
        <Button type="button" className="auth-primary-button" onClick={handleSubmit} disabled={isSubmitting || otp.some((digit) => !digit)}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}{isSubmitting ? 'Verifying…' : 'Verify & Sign In'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        <p className="auth-otp-note">Didn’t receive the code? {cooldown > 0 ? <span>Resend in {cooldown}s</span> : <button type="button" className="auth-inline-button" onClick={handleResend} disabled={isResending}>{isResending ? 'Sending…' : 'Resend code'}</button>}</p>
      </div>
    </AuthLayout>
  );
}
