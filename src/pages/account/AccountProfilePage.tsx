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
          country: data.country || 'Philippines',
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
    'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

  return (
    <div className="space-y-6">
    <Card className="border-gray-100 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Personal Information
        </CardTitle>
        <CardDescription className="text-gray-500">
          Update your contact details and public profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-gray-700 text-[13px] font-medium">
                First Name
              </Label>
              <Input id="firstName" {...register('firstName')} className={inputClasses} />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-gray-700 text-[13px] font-medium">
                Last Name
              </Label>
              <Input id="lastName" {...register('lastName')} className={inputClasses} />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-gray-700 text-[13px] font-medium">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                placeholder="+63 9XX XXX XXXX"
                {...register('phone')}
                className={`pl-10 ${inputClasses}`}
              />
            </div>
            <p className="text-xs text-gray-400">{phoneDescription}</p>
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-gray-700 text-[13px] font-medium">
              Address
            </Label>

            {/* ── Pinned Location Map ── */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
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
                <Label htmlFor="street" className="text-gray-700 text-[13px] font-medium">
                  Street Address <span className="text-gray-400 text-[11px]">(House No., Street Name, Subdivision)</span>
                </Label>
                <Input
                  id="street"
                  placeholder="e.g. 123 Dahlia St., BIR Village"
                  {...register('street')}
                  className={inputClasses}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="barangay" className="text-gray-700 text-[13px] font-medium">
                    Barangay
                  </Label>
                  <Input
                    id="barangay"
                    placeholder="e.g. Barangay Gulod"
                    {...register('barangay')}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-gray-700 text-[13px] font-medium">
                    City / Municipality
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g. Quezon City"
                    {...register('city')}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="province" className="text-gray-700 text-[13px] font-medium">
                    Province
                  </Label>
                  <Input
                    id="province"
                    placeholder="Auto-fills for NCR"
                    {...register('province')}
                    className={inputClasses}
                  />
                  <p className="text-[10px] text-gray-400">Auto-fills &quot;Metro Manila&quot; for NCR cities</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip" className="text-gray-700 text-[13px] font-medium">
                    Postal Code
                  </Label>
                  <Input
                    id="zip"
                    placeholder="e.g. 1118"
                    {...register('zip')}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-gray-700 text-[13px] font-medium">
                    Country
                  </Label>
                  <Input
                    id="country"
                    placeholder="Philippines"
                    {...register('country')}
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Your pinned location and address are saved for ocular appointments.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 mt-6">
            {isDirty && (
              <p className="text-sm text-gray-500 mr-auto">You have unsaved changes</p>
            )}
            <Button
              type="submit"
              className="bg-gray-900 hover:bg-gray-800 text-white min-w-[140px] h-11 font-semibold"
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
    <Card className="border-gray-100 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <PenTool className="h-5 w-5 text-orange-500" />
          E-Signature
        </CardTitle>
        <CardDescription className="text-gray-500">
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
