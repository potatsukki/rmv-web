import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function VerifyOTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchMe, setAccessToken } = useAuthStore();

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
        const response = await api.post('/auth/verify-email', { email, otp: code });
        if (response.data?.data?.accessToken) setAccessToken(response.data.data.accessToken);
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
  }, [otp, email, purpose, navigate, fetchMe, setAccessToken]);

  useEffect(() => {
    if (otp.every((d) => d !== '')) handleSubmit();
  }, [otp, handleSubmit]);

  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-otp', { email, purpose });
      toast.success('New OTP sent to your email');
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#e0e0e6] via-[#d6d6dc] to-[#cbcbd0] px-4">
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BrandLogo className="h-10 w-10 ring-2 ring-[#b8b8bd]/50 shadow-lg shadow-black/10" />
        </div>

        <div className="rounded-2xl border border-[#c8c8cd]/50 bg-white/70 backdrop-blur-xl p-8 shadow-xl shadow-black/5">
          <div className="text-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1d1d1f] mx-auto mb-4">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#1d1d1f]">Verify your email</h1>
            <p className="mt-2 text-sm text-[#6e6e73]">
              We sent a 6-digit code to <strong className="text-[#3a3a3e]">{email}</strong>
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
                className="h-14 w-12 text-center text-xl font-bold bg-white/80 border-[#c8c8cd] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-xl"
                disabled={isSubmitting}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white h-11 font-semibold shadow-lg shadow-black/20 rounded-xl"
            disabled={isSubmitting || otp.some((d) => d === '')}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>

          <div className="text-center mt-5">
            <p className="text-sm text-[#86868b]">
              Didn&apos;t receive the code?{' '}
              {cooldown > 0 ? (
                <span className="text-[#6e6e73] font-medium">Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-[#1d1d1f] hover:text-[#6e6e73] font-semibold underline underline-offset-4 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isResending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isResending ? 'Sending…' : 'Resend OTP'}
                </button>
              )}
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-[#86868b]">
          <Link to="/login" className="hover:text-[#1d1d1f] transition-colors underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
