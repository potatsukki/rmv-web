import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Loader2, Wrench, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function VerifyOTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchMe, setCsrfToken } = useAuthStore();

  const state = location.state as { email?: string; purpose?: string } | null;
  const email = state?.email || '';
  const purpose = state?.purpose || 'email_verification';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted.length) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i] ?? '';
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('Please enter the complete OTP');
      return;
    }
    setIsSubmitting(true);
    try {
      if (purpose === 'email_verification') {
        await api.post('/auth/verify-email', { email, otp: code });
        const csrf = await fetchCsrfToken();
        setCsrfToken(csrf);
        await fetchMe();
        toast.success('Email verified successfully!');
        navigate('/dashboard', { replace: true });
      } else if (purpose === 'password_reset') {
        navigate('/reset-password', { state: { email, otp: code } });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Verification failed');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, email, purpose, navigate, fetchMe, setCsrfToken]);

  useEffect(() => {
    if (otp.every((d) => d !== '')) handleSubmit();
  }, [otp, handleSubmit]);

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email, purpose });
      toast.success('New OTP sent to your email');
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to resend OTP');
    }
  };

  if (!email) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
            <Wrench className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/50">
          <div className="text-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 mx-auto mb-4">
              <Mail className="h-6 w-6 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Verify your email</h1>
            <p className="mt-2 text-sm text-gray-500">
              We sent a 6-digit code to <strong className="text-gray-700">{email}</strong>
            </p>
          </div>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-14 w-12 text-center text-xl font-bold border-gray-200 focus:border-orange-400 focus:ring-orange-200 rounded-xl"
                disabled={isSubmitting}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 font-semibold"
            disabled={isSubmitting || otp.some((d) => d === '')}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>

          <div className="text-center mt-5">
            <p className="text-sm text-gray-400">
              Didn&apos;t receive the code?{' '}
              {cooldown > 0 ? (
                <span className="text-gray-500 font-medium">Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-orange-600 hover:text-orange-500 font-semibold"
                >
                  Resend OTP
                </button>
              )}
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-gray-400">
          <Link to="/login" className="hover:text-gray-600 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
