import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
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
});

type CompleteProfileForm = z.infer<typeof completeProfileSchema>;

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchMe, setCsrfToken } = useAuthStore();
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
    'h-10 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200 text-sm';

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-28 bg-white z-10 w-full lg:w-[48%]">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Back link */}
          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Register
          </button>

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <BrandLogo className="h-9 w-9 ring-2 ring-orange-500/25 shadow-lg shadow-orange-500/20" />
            <span className="font-bold text-gray-900 tracking-tight">RMV Stainless</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Complete your profile
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Just a few more details to set up your account.
          </p>

          {/* Google account info */}
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-gray-50 p-4 border border-gray-100">
            {state.googlePhoto ? (
              <img
                src={state.googlePhoto}
                alt="Google avatar"
                className="h-10 w-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">
                  {defaultFirstName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{state.googleName}</p>
              <p className="text-xs text-gray-500">{state.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-gray-700 text-[13px] font-medium">
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
                <Label htmlFor="lastName" className="text-gray-700 text-[13px] font-medium">
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
              <Label htmlFor="phone" className="text-gray-700 text-[13px] font-medium">
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

            <Button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold h-11 transition-all active:scale-[0.98] shadow-sm mt-2"
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
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950" />
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?ixlib=rb-4.0.3&auto=format&fit=crop&w=1997&q=80"
          alt="Stainless steel fabrication"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/60" />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 backdrop-blur-sm border border-orange-500/20 mb-6">
            <UserPlus className="h-6 w-6 text-orange-400" />
          </div>
          <blockquote>
            <p className="text-lg font-medium text-gray-200 leading-relaxed max-w-md">
              &ldquo;Almost there! Complete your profile to start managing your fabrication projects.&rdquo;
            </p>
            <footer className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
              RMV Stainless Steel
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
