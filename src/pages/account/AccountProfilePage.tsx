import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Navigation, PenTool } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect, useCallback, Suspense, lazy } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateProfile, useSignature, useSaveSignature, useDeleteSignature } from '@/hooks/useUsers';
import { Role } from '@/lib/constants';
import type { MapPoint } from '@/lib/maps';

const LocationPicker = lazy(() =>
  import('@/components/maps/LocationPicker').then((module) => ({ default: module.LocationPicker })),
);

function MapPanelFallback() {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 text-center">
      <p className="text-sm text-[var(--text-metal-muted-color)]">Loading map tools...</p>
    </div>
  );
}

// ── Role-aware phone description ──
const PHONE_DESCRIPTIONS: Partial<Record<Role, string>> = {
  [Role.APPOINTMENT_AGENT]: 'Used for contact and schedule-related notifications.',
  [Role.SALES_STAFF]: 'Used for appointment and payment notifications.',
  [Role.ENGINEER]: 'Used for blueprint and fabrication notifications.',
  [Role.CASHIER]: 'Used for payment processing notifications.',
  [Role.FABRICATION_STAFF]: 'Used for workshop update notifications.',
  [Role.ADMIN]: 'Used for system-wide notifications.',
};
const DEFAULT_PHONE_DESC = 'Used for SMS notifications about project updates.';

const NCR_CITIES = [
  'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila', 'Marikina',
  'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig', 'Pateros',
  'Quezon City', 'San Juan', 'Taguig', 'Valenzuela',
];

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().refine(
    (v) => !v || /^\+639\d{9}$/.test(v),
    { message: 'Enter a valid 10-digit mobile number (9XXXXXXXXX)' }
  ).optional().or(z.literal('')),
  street: z.string().max(200).optional().or(z.literal('')),
  barangay: z.string().max(100).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  province: z.string().max(100).optional().or(z.literal('')),
  zip: z.string().max(10).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function AccountProfilePage() {
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const { data: signatureData } = useSignature();
  const saveSignature = useSaveSignature();
  const deleteSignature = useDeleteSignature();

  const ad = user?.addressData;

  const [pinnedLocation, setPinnedLocation] = useState<MapPoint | null>(
    ad?.lat && ad?.lng ? { lat: ad.lat, lng: ad.lng } : null,
  );
  const [formattedAddress, setFormattedAddress] = useState(ad?.formattedAddress || '');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      street: ad?.street || '',
      barangay: ad?.barangay || '',
      city: ad?.city || '',
      province: ad?.province || '',
      zip: ad?.zip || '',
      country: ad?.country || 'Philippines',
    },
  });

  const watchCity = watch('city');

  // Auto-fill province for NCR cities
  useEffect(() => {
    if (watchCity && NCR_CITIES.some((c) => c.toLowerCase() === watchCity.toLowerCase())) {
      setValue('province', 'Metro Manila', { shouldDirty: true });
    }
  }, [watchCity, setValue]);

  const handleLocationPick = useCallback(
    (location: MapPoint, address?: string) => {
      setPinnedLocation(location);
      if (address) setFormattedAddress(address);
    },
    [],
  );

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Build legacy flat address string for backwards compat
      const parts = [data.street, data.barangay, data.city, data.province, data.zip].filter(Boolean);
      const flatAddress = parts.join(', ');

      await updateProfile.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        address: flatAddress || undefined,
        addressData: {
          street: data.street || '',
          barangay: data.barangay || '',
          city: data.city || '',
          province: data.province || '',
          zip: data.zip || '',
          country: 'Philippines',
          lat: pinnedLocation?.lat,
          lng: pinnedLocation?.lng,
          formattedAddress: formattedAddress || '',
        },
      });
      reset({ ...data });
      toast.success('Profile updated successfully');
    } catch {
      // Error handled by hook
    }
  };

  const primaryRole = user?.roles.find((r) => r !== Role.ADMIN) ?? user?.roles[0];
  const phoneDescription = primaryRole
    ? (PHONE_DESCRIPTIONS[primaryRole] ?? DEFAULT_PHONE_DESC)
    : DEFAULT_PHONE_DESC;

  const inputClasses =
    'h-11 rounded-xl border-[color:var(--color-border)] bg-[color:var(--color-card)]/85 text-[var(--color-card-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-accent)] focus:ring-[color:var(--color-accent)]/20 transition-colors';

  const hasPinnedLocation = Boolean(pinnedLocation);
  const hasSavedSignature = Boolean(signatureData?.signatureKey);

  return (
    <div className="space-y-6">
    <Card className="rounded-2xl border-[color:var(--color-border)]/60 shadow-sm bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)]">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <div className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/85 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Profile</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-card-foreground)]">Contact details ready</p>
          <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">Keep your name and phone current so appointment and payment updates reach you.</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/85 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Site location</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-card-foreground)]">{hasPinnedLocation ? 'Pinned location saved' : 'Location still missing'}</p>
          <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">Pinned map coordinates help the team validate ocular visits faster and reduce address ambiguity.</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/85 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">E-signature</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-card-foreground)]">{hasSavedSignature ? 'Signature on file' : 'Signature not saved yet'}</p>
          <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">Saving your signature now keeps contract signing quicker later in the project flow.</p>
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-2xl border-[color:var(--color-border)]/60 shadow-sm bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[var(--color-card-foreground)]">
          Personal Information
        </CardTitle>
        <CardDescription className="text-[var(--text-metal-muted-color)]">
          Update your contact details and public profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-2xl border border-[color:var(--color-border)]/55 bg-[color:var(--color-card)]/65 p-4 sm:p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-[var(--color-card-foreground)]">Contact details</p>
              <p className="text-xs text-[var(--text-metal-muted-color)]">These details appear across appointment coordination and account recovery flows.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                  First Name
                </Label>
                <Input id="firstName" {...register('firstName')} className={inputClasses} />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                  Last Name
                </Label>
                <Input id="lastName" {...register('lastName')} className={inputClasses} />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-1.5">
              <Label htmlFor="phone" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                Phone Number
              </Label>
              <div className="flex h-11 rounded-xl overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-card)]/85 focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[color:var(--color-accent)]/20 transition-all">
                <span className="flex items-center border-r border-[color:var(--color-border)] bg-[color:var(--color-muted)]/80 px-3 text-sm font-medium text-[var(--color-card-foreground)] select-none shrink-0">+63</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9XXXXXXXXX"
                  value={(watch('phone') || '').replace(/^\+63/, '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
                    setValue('phone', raw ? `+63${raw}` : '', { shouldValidate: true, shouldDirty: true });
                  }}
                  className="flex-1 bg-transparent px-3 text-sm text-[var(--color-card-foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] min-w-0"
                />
              </div>
              <p className="text-xs text-[var(--text-metal-muted-color)]">{phoneDescription}</p>
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5 rounded-2xl border border-[color:var(--color-border)]/55 bg-[color:var(--color-card)]/65 p-4 sm:p-5">
            <div>
              <Label htmlFor="address" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                Site Location & Address
              </Label>
              <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">
                Save both the pinned map point and the structured address so ocular visits and quotations line up with the same site.
              </p>
            </div>

            {/* ── Pinned Location Map ── */}
            <div className="rounded-xl border border-[color:var(--color-border)]">
              <Suspense fallback={<MapPanelFallback />}>
                <LocationPicker value={pinnedLocation} onChange={handleLocationPick} />
              </Suspense>
            </div>
            {pinnedLocation && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100">
                <Navigation className="h-3.5 w-3.5" />
                <span className="font-medium">Pinned Location</span>
                <span className="text-emerald-600 dark:text-emerald-200/90">
                  {pinnedLocation.lat.toFixed(5)}, {pinnedLocation.lng.toFixed(5)}
                </span>
              </div>
            )}
            {formattedAddress && (
              <p className="px-1 text-xs text-[var(--text-metal-muted-color)]">{formattedAddress}</p>
            )}

            {/* ── Structured Address Fields ── */}
            <div className="pt-3 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                  Street Address <span className="text-[var(--text-metal-muted-color)] text-[11px]">(House No., Street Name, Subdivision)</span>
                </Label>
                <Input
                  id="street"
                  placeholder="Enter your street address"
                  {...register('street')}
                  className={inputClasses}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="barangay" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                    Barangay
                  </Label>
                  <Input
                    id="barangay"
                    placeholder="Enter your barangay"
                    {...register('barangay')}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                    City / Municipality
                  </Label>
                  <Input
                    id="city"
                    placeholder="Enter your city"
                    {...register('city')}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="province" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                    Province
                  </Label>
                  <Input
                    id="province"
                    placeholder="Enter your province"
                    {...register('province')}
                    className={inputClasses}
                  />
                  <p className="text-[10px] text-[var(--text-metal-muted-color)]">Auto-fills &quot;Metro Manila&quot; for NCR cities</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                    Postal Code
                  </Label>
                  <Input
                    id="zip"
                    placeholder="Enter your postal code"
                    {...register('zip')}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value="Philippines"
                    readOnly
                    disabled
                    className={inputClasses + ' cursor-not-allowed opacity-70'}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--text-metal-muted-color)]">
              Your pinned location and address are saved for ocular appointments.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-4 border-t border-[color:var(--color-border)]/50 pt-4">
            {isDirty && (
              <p className="mr-auto text-sm text-[var(--text-metal-muted-color)]">You have unsaved changes</p>
            )}
            <Button
              type="submit"
              className="min-w-[140px] h-11 rounded-xl bg-[var(--color-primary)] font-semibold text-[var(--color-primary-foreground)] shadow-sm transition-all duration-200 hover:opacity-90"
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    {/* E-Signature Section */}
    <Card className="rounded-2xl border-[color:var(--color-border)]/60 shadow-sm bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--color-card-foreground)]">
          <PenTool className="h-5 w-5 text-[var(--text-metal-muted-color)]" />
          E-Signature
        </CardTitle>
        <CardDescription className="text-[var(--text-metal-muted-color)]">
          Draw your signature for use in contracts and official documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignaturePad
          existingKey={signatureData?.signatureKey}
          onSave={(key) => saveSignature.mutate(key)}
          isSaving={saveSignature.isPending}
          onDelete={() => deleteSignature.mutate(undefined, { onSuccess: () => toast.success('Signature removed') })}
          isDeleting={deleteSignature.isPending}
        />
      </CardContent>
    </Card>
    </div>
  );
}
