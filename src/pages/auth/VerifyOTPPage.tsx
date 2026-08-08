import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function VerifyOTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  useAuthPageScrollbar();
  const state = location.state as { email?: string; purpose?: string } | null;
  const email = state?.email || '';
  const purpose = state?.purpose || 'email_verification';
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (!email) navigate('/login', { replace: true }); }, [email, navigate]);
  useEffect(() => { if (cooldown <= 0) return; const timer = window.setInterval(() => setCooldown((value) => value - 1), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp]; next[index] = value.slice(-1); setOtp(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };
  const handleKeyDown = (index: number, event: React.KeyboardEvent) => { if (event.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus(); };
  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault(); const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH); if (!pasted) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? ''); setOtp(next); inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };
  const handleSubmit = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) { toast.error('Please enter the complete code'); return; }
    setIsSubmitting(true);
    try {
      if (purpose === 'email_verification') { await api.post('/auth/verify-email', { email, otp: code }); toast.success('Email verified! Please sign in to continue.'); navigate('/login', { replace: true }); }
      else if (purpose === 'password_reset') navigate('/reset-password', { state: { email, otp: code } });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Verification failed'); setOtp(Array(OTP_LENGTH).fill('')); inputRefs.current[0]?.focus();
    } finally { setIsSubmitting(false); }
  }, [email, navigate, otp, purpose]);
  useEffect(() => { if (otp.every(Boolean)) void handleSubmit(); }, [handleSubmit, otp]);
  const handleResend = async () => {
    setIsResending(true);
    try { await api.post('/auth/resend-otp', { email, purpose }); toast.success('New OTP sent to your email'); setCooldown(RESEND_COOLDOWN); setOtp(Array(OTP_LENGTH).fill('')); inputRefs.current[0]?.focus(); }
    catch (err: unknown) { const error = err as { response?: { data?: { error?: { message?: string } } } }; toast.error(error.response?.data?.error?.message || 'Failed to resend OTP'); }
    finally { setIsResending(false); }
  };
  if (!email) return null;

  return (
    <AuthLayout variant="login">
      <Link to="/login" className="auth-back-link"><ArrowLeft aria-hidden="true" />Back to Sign In</Link>
      <p className="auth-form-eyebrow">Email Verification</p>
      <h1 className="auth-form-title">Confirm your code</h1>
      <p className="auth-form-copy">We sent a six-digit verification code to <strong>{email}</strong>.</p>
      <div className="auth-form">
        <div className="auth-otp-row" onPaste={handlePaste} aria-label="Six digit verification code">
          {otp.map((digit, index) => <Input key={index} ref={(element) => { inputRefs.current[index] = element; }} className="auth-otp-input" type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(event) => handleChange(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} disabled={isSubmitting} autoComplete="one-time-code" aria-label={`Verification digit ${index + 1}`} />)}
        </div>
        <Button type="button" className="auth-primary-button" onClick={handleSubmit} disabled={isSubmitting || otp.some((digit) => !digit)}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}{isSubmitting ? 'Verifying…' : 'Verify Code'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        <p className="auth-otp-note">Didn’t receive the code? {cooldown > 0 ? <span>Resend in {cooldown}s</span> : <button type="button" className="auth-inline-button" onClick={handleResend} disabled={isResending}>{isResending ? 'Sending…' : 'Resend code'}</button>}</p>
      </div>
    </AuthLayout>
  );
}
