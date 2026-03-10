import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { resolvePostLoginPath } from '@/lib/auth-routing';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

interface VerifyTwoFactorState {
  tempToken: string;
  email: string;
  firstName?: string;
  from?: string;
}

export function VerifyTwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  useAuthPageScrollbar();
  const { fetchMe, setCsrfToken, setAccessToken, setRefreshToken } = useAuthStore();

  const state = location.state as VerifyTwoFactorState | null;
  const tempToken = state?.tempToken || '';
  const email = state?.email || '';
  const firstName = state?.firstName;
  const from = state?.from;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpInputClasses =
    'metal-input h-12 w-10 rounded-lg border-white/10 bg-white/[0.05] text-center text-lg font-bold text-[#f5f7fa] shadow-none placeholder:text-[#7f8895] focus-visible:ring-[#d6b36a]/35 min-[360px]:w-11 sm:h-14 sm:w-12 sm:rounded-xl sm:text-xl';

  useEffect(() => {
    if (!tempToken || !email) navigate('/login', { replace: true });
  }, [tempToken, email, navigate]);

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
      toast.error('Please enter the complete code');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/verify-2fa', {
        tempToken,
        otp: code,
      });

      const csrfToken = response.data.data.csrfToken;
      setCsrfToken(csrfToken);
      if (response.data.data.accessToken) setAccessToken(response.data.data.accessToken);
      if (response.data.data.refreshToken) setRefreshToken(response.data.data.refreshToken);

      await fetchMe();
      toast.success('Welcome back!');

      const loginUser = response.data.data.user;
      if (loginUser?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      const destination = resolvePostLoginPath(from, response.data.data.user.roles);
      if (destination.redirectReason) {
        toast(destination.redirectReason, { icon: 'ℹ️' });
      }

      navigate(destination.path, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      const code = error.response?.data?.error?.code;

      if (code === 'TOKEN_EXPIRED') {
        toast.error('Verification session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      toast.error(error.response?.data?.error?.message || 'Verification failed');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, tempToken, navigate, fetchMe, setCsrfToken, setAccessToken]);

  useEffect(() => {
    if (otp.every((d) => d !== '')) handleSubmit();
  }, [otp, handleSubmit]);

  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-2fa', { tempToken });
      toast.success('New verification code sent to your email');
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      if (error.response?.data?.error?.code === 'TOKEN_EXPIRED') {
        toast.error('Session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }
      toast.error(error.response?.data?.error?.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  if (!tempToken || !email) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070a] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,144,171,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_right,rgba(177,137,73,0.15)_0%,transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
      <div className="pointer-events-none absolute left-10 top-20 hidden h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(118,144,171,0.18)_0%,transparent_68%)] blur-2xl lg:block" />
      <div className="pointer-events-none absolute right-10 bottom-20 hidden h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(214,179,106,0.14)_0%,transparent_72%)] blur-2xl lg:block" />
      <div className="pointer-events-none absolute left-[10%] top-1/2 hidden w-[15rem] -translate-y-1/2 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md xl:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c97a5]">Access Control</p>
        <h3 className="mt-3 text-lg font-bold text-[#f5f7fa]">Second-factor confirmation protects live project access.</h3>
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-[#a6b0bd]">The additional code blocks unauthorized sign-ins even if someone knows the password.</div>
      </div>
      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandLogo className="h-10 w-10 ring-2 ring-white/12 shadow-lg shadow-black/30" />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,30,0.94)_0%,rgba(7,10,14,0.98)_100%)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 text-center sm:mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#d6b36a]/30 bg-[linear-gradient(180deg,rgba(214,179,106,0.18)_0%,rgba(214,179,106,0.06)_100%)]">
              <ShieldCheck className="h-6 w-6 text-[#e2c98f]" />
            </div>
            <h1 className="text-lg font-bold text-[#f5f7fa] sm:text-xl">Two-Factor Verification</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#98a3b2]">
              {firstName ? `Hi ${firstName}, w` : 'W'}e sent a 6-digit verification code to{' '}
              <strong className="break-all text-[#f5f7fa]">{email}</strong>
            </p>
          </div>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-1.5 min-[360px]:gap-2 sm:gap-2.5 mb-6" onPaste={handlePaste}>
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
                className={otpInputClasses}
                disabled={isSubmitting}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#e2c98f_0%,#c69b4e_45%,#8f6a2f_100%)] font-semibold text-[#14181d] shadow-[0_20px_40px_rgba(148,112,47,0.28)] hover:bg-[linear-gradient(135deg,#ead39d_0%,#d2ab60_45%,#9f7739_100%)]"
            disabled={isSubmitting || otp.some((d) => d === '')}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & Sign In
          </Button>

          <div className="mt-4 text-center sm:mt-5">
            <p className="text-xs text-[#98a3b2] sm:text-sm">
              Didn&apos;t receive the code?{' '}
              {cooldown > 0 ? (
                <span className="font-medium text-[#7f8b99]">Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f] disabled:opacity-50"
                >
                  {isResending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isResending ? 'Sending…' : 'Resend Code'}
                </button>
              )}
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#98a3b2]">
          <Link to="/login" className="text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]">
            Back to sign in
          </Link>
        </p>
      </div>
      <div className="pointer-events-none absolute right-[9%] top-1/2 hidden w-[14rem] -translate-y-1/2 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md xl:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c97a5]">Account Status</p>
        <div className="mt-4 rounded-2xl border border-[#d6b36a]/18 bg-[#d6b36a]/8 p-3">
          <p className="text-sm font-semibold text-[#f2d9a1]">2FA Challenge</p>
          <p className="mt-1 text-xs leading-5 text-[#c2cbd6]">Finish verification to unlock dashboard, billing, and fabrication tracking tools.</p>
        </div>
      </div>
    </div>
  );
}
