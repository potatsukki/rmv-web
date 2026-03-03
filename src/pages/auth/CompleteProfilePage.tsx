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
  const { fetchMe, setCsrfToken, setAccessToken } = useAuthStore();
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
      if (responseData.accessToken) setAccessToken(responseData.accessToken);

      await fetchMe();
      toast.success('Account created successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(error.response?.data?.error?.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    'h-10 bg-white/80 border-[#c8c8cd] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 text-sm rounded-xl';

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-28 bg-gradient-to-br from-[#eaeaef] via-[#e0e0e6] to-[#d8d8de] z-10 w-full lg:w-[48%]">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
        <div className="relative mx-auto w-full max-w-[420px]">
          {/* Back link */}
          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Register
          </button>

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <BrandLogo className="h-9 w-9 ring-2 ring-[#b8b8bd]/50 shadow-lg shadow-black/10" />
            <span className="font-bold text-[#1d1d1f] tracking-tight">RMV Stainless</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            Complete your profile
          </h2>
          <p className="mt-1 text-sm text-[#6e6e73]">
            Just a few more details to set up your account.
          </p>

          {/* Google account info */}
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/50 p-4 border border-[#c8c8cd]/50 backdrop-blur-sm">
            {state.googlePhoto ? (
              <img
                src={state.googlePhoto}
                alt="Google avatar"
                className="h-10 w-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#1d1d1f] flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {defaultFirstName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#1d1d1f]">{state.googleName}</p>
              <p className="text-xs text-[#6e6e73]">{state.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[#3a3a3e] text-[13px] font-medium">
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
                <Label htmlFor="lastName" className="text-[#3a3a3e] text-[13px] font-medium">
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
              <Label htmlFor="phone" className="text-[#3a3a3e] text-[13px] font-medium">
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
                  className="mt-0.5 h-4 w-4 rounded border-[#c8c8cd] accent-[#1d1d1f] cursor-pointer flex-shrink-0"
                  {...register('agreeToTerms')}
                />
                <label htmlFor="agreeToTerms" className="text-sm text-[#6e6e73] leading-snug cursor-pointer">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="font-semibold text-[#1d1d1f] hover:text-[#6e6e73] underline underline-offset-4">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" className="font-semibold text-[#1d1d1f] hover:text-[#6e6e73] underline underline-offset-4">
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
              className="w-full bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white font-semibold h-11 transition-all active:scale-[0.98] shadow-lg shadow-black/20 rounded-xl mt-2"
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1c] via-[#111113] to-[#0d0d0f]" />
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?ixlib=rb-4.0.3&auto=format&fit=crop&w=1997&q=80"
          alt="Stainless steel fabrication"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0f] via-transparent to-[#0d0d0f]/60" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          }}
        />

        {/* Silver light leak */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ background: 'radial-gradient(ellipse at 30% 50%, #c8c8cd, transparent 70%)' }} />

        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 mb-6">
            <UserPlus className="h-6 w-6 text-[#d2d2d7]" />
          </div>
          <blockquote>
            <p className="text-lg font-medium text-[#d2d2d7] leading-relaxed max-w-md">
              &ldquo;Almost there! Complete your profile to start managing your fabrication projects.&rdquo;
            </p>
            <footer className="mt-4 text-xs font-bold text-[#6e6e73] uppercase tracking-[0.2em]">
              RMV Stainless Steel
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
