import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { api, fetchCsrfToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPageScrollbar } from '@/pages/auth/useAuthPageScrollbar';

const completeProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().regex(/^(09|\+639)\d{9}$/, 'Must be a valid PH mobile (09XXXXXXXXX)'),
  agreeToTerms: z.literal(true, {
    message: 'You must agree to the Terms of Service and Privacy Policy',
  }),
});

type CompleteProfileForm = z.infer<typeof completeProfileSchema>;

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  useAuthPageScrollbar();
  const { setCsrfToken } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const state = location.state as {
    email?: string;
    googleName?: string;
    googlePhoto?: string;
    idToken?: string;
  } | null;

  // If no state, redirect to register
  if (!state?.idToken) {
    return <Navigate to="/register" replace />;
  }

  const nameParts = (state.googleName || '').split(' ');
  const defaultFirstName = nameParts[0] || '';
  const defaultLastName = nameParts.slice(1).join(' ') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileForm>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: defaultFirstName,
      lastName: defaultLastName,
      phone: '',
    },
  });

  const onSubmit = async (data: CompleteProfileForm) => {
    setSubmitting(true);
    try {
      const csrfToken = await fetchCsrfToken();
      setCsrfToken(csrfToken);

      const response = await api.post('/auth/google/complete', {
        idToken: state.idToken,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone.startsWith('09') ? '+63' + data.phone.slice(1) : data.phone,
      });

      const responseData = response.data.data;
      const newCsrfToken = responseData.csrfToken;
      setCsrfToken(newCsrfToken);

      toast.success('Account created! Please sign in to continue.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(error.response?.data?.error?.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = 'label-font h-12 rounded-none border-white/10 bg-white/[0.03] text-sm tracking-widest text-white placeholder:text-[#5a5a60] focus-visible:border-[#FFD700]/30 focus-visible:ring-0 transition-all focus:bg-white/[0.05]';

  return (
    <div className="landing-atelier dark relative flex min-h-screen overflow-hidden bg-black text-white/90">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,144,171,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_right,rgba(177,137,73,0.15)_0%,transparent_30%)]" />
      {/* Left Side - Form */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center bg-black px-6 py-12 lg:w-[48%] lg:flex-none lg:px-20 xl:px-28">
        <div className="blueprint-grid absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative mx-auto w-full max-w-[440px] border border-white/5 bg-[#0a0a0b]/60 p-7 sm:p-10 backdrop-blur-3xl">
          {/* Back link */}
          <button
            onClick={() => navigate('/register')}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#9ca7b5] transition-colors hover:text-[#f2f5f7]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Register
          </button>

          {/* Brand */}
          <div className="mb-6 flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9 ring-2 ring-white/12 shadow-lg shadow-black/30" />
            <span className="font-bold tracking-tight text-[#f5f7fa]">RMV Stainless</span>
          </div>

          <h2 className="headline-font text-[clamp(1.5rem,8vw,2rem)] font-bold tracking-tight text-white leading-tight">
            Complete Profile
          </h2>
          <p className="label-font mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#919097] leading-relaxed">
            Finalize your RMV identity details.
          </p>

          {/* Google account info */}
          <div className="mt-6 flex items-center gap-3 border border-white/5 bg-white/[0.03] p-4">
            {state.googlePhoto ? (
              <img
                src={state.googlePhoto}
                alt="Google avatar"
                className="h-10 w-10 border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center border border-[#d6b36a]/25 bg-black">
                <span className="text-sm font-bold text-[#f5f7fa]">
                  {defaultFirstName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="label-font text-[11px] font-bold uppercase tracking-widest text-[#f5f7fa]">{state.googleName}</p>
              <p className="label-font text-[10px] text-[#919097] uppercase tracking-wider">{state.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] gold-glow">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  className={inputClasses}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] gold-glow">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  className={inputClasses}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] gold-glow">
                Mobile Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09XXXXXXXXX"
                className={inputClasses}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-white/15 bg-white/5 accent-[#d6b36a] flex-shrink-0"
                  {...register('agreeToTerms')}
                />
                <label htmlFor="agreeToTerms" className="cursor-pointer text-sm leading-snug text-[#98a3b2]">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="font-semibold text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" className="font-semibold text-[#d6b36a] underline underline-offset-4 transition-colors hover:text-[#f0d28f]">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-xs text-red-500">{errors.agreeToTerms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="label-font brass-gradient mt-2 h-12 w-full rounded-none border-none text-[11px] font-black uppercase tracking-[0.3em] text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Registration
            </Button>
          </form>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(38,61,84,0.58)_0%,transparent_32%),radial-gradient(circle_at_bottom_right,rgba(176,133,68,0.18)_0%,transparent_24%),linear-gradient(160deg,#080b10_0%,#0c1016_44%,#121821_100%)]" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
        <div className="absolute inset-y-0 left-0 w-px bg-white/6" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,12,0.04)_0%,rgba(5,8,12,0.26)_100%)]" />

        <div className="absolute inset-0 flex items-center justify-center px-12 py-16 lg:px-16">
          <div className="w-full max-w-[30rem] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,25,33,0.84)_0%,rgba(10,13,18,0.92)_100%)] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d6b36a]/25 bg-[linear-gradient(180deg,rgba(214,179,106,0.16)_0%,rgba(214,179,106,0.05)_100%)]">
                <UserPlus className="h-6 w-6 text-[#e2c98f]" />
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#93a0af]">
                Profile Setup
              </span>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8894a3]">Google Registration</p>
                  <h3 className="mt-1 text-xl font-bold text-[#f5f7fa]">Complete Client Identity</h3>
                </div>
                <div className="rounded-2xl border border-[#d6b36a]/20 bg-[#d6b36a]/10 px-3 py-1.5 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d9bf84]">Stage</p>
                  <p className="text-sm font-bold text-[#f2d9a1]">Final</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b96a3]">Identity</p>
                  <p className="mt-2 text-base font-bold text-[#f5f7fa]">Verified</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b96a3]">Profile</p>
                  <p className="mt-2 text-base font-bold text-[#f5f7fa]">Details</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b96a3]">Portal</p>
                  <p className="mt-2 text-base font-bold text-[#f5f7fa]">Ready</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-[#0a0d12]/70 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#d7dee6]">Activation progress</span>
                  <span className="font-semibold text-[#e2c98f]">90%</span>
                </div>
                <div className="h-2 rounded-full bg-white/8">
                  <div className="h-2 w-[90%] rounded-full bg-[linear-gradient(90deg,#f0d08f_0%,#b9873c_100%)]" />
                </div>
              </div>
            </div>

            <blockquote className="mt-6">
              <p className="max-w-lg text-lg font-medium leading-relaxed text-[#d2d9e1]">
                &ldquo;Almost there. Finish your profile once and start managing approvals, payments, and live project milestones in one place.&rdquo;
              </p>
              <footer className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#6f7b89]">
                RMV Management System
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
