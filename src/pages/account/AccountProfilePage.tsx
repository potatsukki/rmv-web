import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Check, PenTool, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';

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
import { LocationPicker } from '@/components/maps/LocationPicker';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateProfile, useSignature, useSaveSignature } from '@/hooks/useUsers';
import { Role } from '@/lib/constants';
import type { MapPoint } from '@/lib/maps';

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
  phone: z.string().optional().or(z.literal('')),
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
    'h-11 bg-white/80 border-[#c8c8cd] focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 rounded-xl transition-colors';

  return (
    <div className="space-y-6">
    <Card className="border-[#d2d2d7]/50 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#1d1d1f]">
          Personal Information
        </CardTitle>
        <CardDescription className="text-[#86868b]">
          Update your contact details and public profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-[#3a3a3e] text-[13px] font-medium">
                First Name
              </Label>
              <Input id="firstName" {...register('firstName')} className={inputClasses} />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-[#3a3a3e] text-[13px] font-medium">
                Last Name
              </Label>
              <Input id="lastName" {...register('lastName')} className={inputClasses} />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-[#3a3a3e] text-[13px] font-medium">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-[#86868b]" />
              <Input
                id="phone"
                placeholder="+63 9XX XXX XXXX"
                {...register('phone')}
                className={`pl-10 ${inputClasses}`}
              />
            </div>
            <p className="text-xs text-[#86868b]">{phoneDescription}</p>
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-[#3a3a3e] text-[13px] font-medium">
              Address
            </Label>

            {/* ── Pinned Location Map ── */}
            <div className="rounded-xl border border-[#d2d2d7]">
              <LocationPicker value={pinnedLocation} onChange={handleLocationPick} />
            </div>
            {pinnedLocation && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                <Navigation className="h-3.5 w-3.5" />
                <span className="font-medium">Pinned Location</span>
                <span className="text-green-500">
                  {pinnedLocation.lat.toFixed(5)}, {pinnedLocation.lng.toFixed(5)}
                </span>
              </div>
            )}
            {formattedAddress && (
              <p className="text-xs text-gray-500 px-1">{formattedAddress}</p>
            )}

            {/* ── Structured Address Fields ── */}
            <div className="pt-3 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-[#3a3a3e] text-[13px] font-medium">
                  Street Address <span className="text-[#86868b] text-[11px]">(House No., Street Name, Subdivision)</span>
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
                  <Label htmlFor="barangay" className="text-[#3a3a3e] text-[13px] font-medium">
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
                  <Label htmlFor="city" className="text-[#3a3a3e] text-[13px] font-medium">
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
                  <Label htmlFor="province" className="text-[#3a3a3e] text-[13px] font-medium">
                    Province
                  </Label>
                  <Input
                    id="province"
                    placeholder="Enter your province"
                    {...register('province')}
                    className={inputClasses}
                  />
                  <p className="text-[10px] text-[#86868b]">Auto-fills &quot;Metro Manila&quot; for NCR cities</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip" className="text-[#3a3a3e] text-[13px] font-medium">
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
                  <Label htmlFor="country" className="text-[#3a3a3e] text-[13px] font-medium">
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

            <p className="text-xs text-[#86868b]">
              Your pinned location and address are saved for ocular appointments.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-[#d2d2d7]/50 mt-6">
            {isDirty && (
              <p className="text-sm text-[#86868b] mr-auto">You have unsaved changes</p>
            )}
            <Button
              type="submit"
              className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white min-w-[140px] h-11 font-semibold rounded-xl shadow-sm transition-all duration-200"
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
    <Card className="border-[#d2d2d7]/50 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#1d1d1f]">
          <PenTool className="h-5 w-5 text-[#6e6e73]" />
          E-Signature
        </CardTitle>
        <CardDescription className="text-[#86868b]">
          Draw your signature for use in contracts and official documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignaturePad
          existingKey={signatureData?.signatureKey}
          onSave={(key) => saveSignature.mutate(key)}
          isSaving={saveSignature.isPending}
        />
      </CardContent>
    </Card>
    </div>
  );
}
