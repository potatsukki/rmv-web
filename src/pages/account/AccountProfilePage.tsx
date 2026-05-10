import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Clock, Loader2, PenTool } from 'lucide-react';
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
import {
  useCloseOwnAvailability,
  useUpdateOwnAvailability,
  useUpdateProfile,
  useSignature,
  useSaveSignature,
  useDeleteSignature,
} from '@/hooks/useUsers';
import { Role } from '@/lib/constants';
import { parsePinnedSiteAddress } from '@/lib/address';
import type { UserAddress } from '@/lib/types';
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
const newAddressId = () => `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const NCR_CITIES = [
  'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila', 'Marikina',
  'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig', 'Pateros',
  'Quezon City', 'San Juan', 'Taguig', 'Valenzuela',
];

const nameRegex = /^[a-zA-Z\s'-]+$/;

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').regex(nameRegex, "Special characters or numbers are not allowed"),
  lastName: z.string().min(1, 'Last name is required').regex(nameRegex, "Special characters or numbers are not allowed"),
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
  addressType: z.literal('business'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function AccountProfilePage() {
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const timeInMutation = useUpdateOwnAvailability();
  const timeOutMutation = useCloseOwnAvailability();
  const { data: signatureData } = useSignature();
  const saveSignature = useSaveSignature();
  const deleteSignature = useDeleteSignature();

  const ad = user?.addressData;

  const [pinnedLocation, setPinnedLocation] = useState<MapPoint | null>(
    ad?.lat && ad?.lng ? { lat: ad.lat, lng: ad.lng } : null,
  );
  const [formattedAddress, setFormattedAddress] = useState(ad?.formattedAddress || '');
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>(
    user?.savedAddresses?.length ? user.savedAddresses : ad ? [{ ...ad, id: ad.id || newAddressId(), label: ad.label || 'Primary address', isDefault: true }] : [],
  );

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
      addressType: 'business',
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
      setFormattedAddress(address || '');
    },
    [],
  );

  const handleUsePinnedAddress = useCallback(() => {
    if (!formattedAddress.trim()) {
      toast.error('Choose a pinned address on the map first');
      return;
    }

    const parsedAddress = parsePinnedSiteAddress(formattedAddress);
    setValue('street', parsedAddress.street, { shouldDirty: true, shouldValidate: true });
    setValue('barangay', parsedAddress.barangay, { shouldDirty: true, shouldValidate: true });
    setValue('city', parsedAddress.city, { shouldDirty: true, shouldValidate: true });
    setValue('province', parsedAddress.province, { shouldDirty: true, shouldValidate: true });
    setValue('zip', parsedAddress.zip, { shouldDirty: true, shouldValidate: true });
    toast.success('Pinned address copied to address fields');
  }, [formattedAddress, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Build legacy flat address string for backwards compat
      const parts = [data.street, data.barangay, data.city, data.province, data.zip].filter(Boolean);
      const flatAddress = parts.join(', ');
      const currentAddress: UserAddress = {
        id: savedAddresses.find((address) => address.isDefault)?.id || user?.addressData?.id || newAddressId(),
        label: savedAddresses.find((address) => address.isDefault)?.label || 'Primary address',
        street: data.street || '',
        barangay: data.barangay || '',
        city: data.city || '',
        province: data.province || '',
        zip: data.zip || '',
        addressType: data.addressType,
        country: 'Philippines',
        lat: pinnedLocation?.lat,
        lng: pinnedLocation?.lng,
        formattedAddress: formattedAddress || flatAddress,
        isDefault: true,
      };
      const nextSavedAddresses = savedAddresses.length
        ? savedAddresses.map((address) => address.isDefault ? currentAddress : { ...address, isDefault: false })
        : [currentAddress];

      await updateProfile.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        address: flatAddress || undefined,
        addressData: {
          ...currentAddress,
        },
        savedAddresses: nextSavedAddresses,
      });
      setSavedAddresses(nextSavedAddresses);
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

  const isCashier = Boolean(user?.roles.includes(Role.CASHIER));
  const isCustomer = user?.roles.includes(Role.CUSTOMER);
  const isInternalAvailabilityUser = Boolean(
    user?.roles.some((role) => [
      Role.APPOINTMENT_AGENT,
      Role.SALES_STAFF,
      Role.ENGINEER,
      Role.CASHIER,
      Role.ADMIN,
      Role.FABRICATION_STAFF,
    ].includes(role)),
  );
  const availabilityLabel = user?.availabilityStatus
    ? user.availabilityStatus.replace(/_/g, ' ')
    : 'Setup required';
  const availabilityShiftLabel = user?.activeShift
    ? user.activeShift.shiftEndAt
      ? `${new Date(user.activeShift.shiftStartAt).toLocaleString()} to ${new Date(user.activeShift.shiftEndAt).toLocaleString()}`
      : `Timed in at ${new Date(user.activeShift.shiftStartAt).toLocaleString()}`
    : user?.expiredShift
      ? user.expiredShift.shiftEndAt
        ? `Previous shift ended ${new Date(user.expiredShift.shiftEndAt).toLocaleString()}`
        : 'Previous time-in session closed'
      : 'No active shift window saved yet.';
  const isTimedIn = Boolean(user?.activeShift);
  const timeClockPending = timeInMutation.isPending || timeOutMutation.isPending;

  const handleTimeClock = async () => {
    if (timeClockPending) return;
    if (isTimedIn) {
      await timeOutMutation.mutateAsync();
      toast.success('Timed out');
      return;
    }
    await timeInMutation.mutateAsync({ availabilityNote: 'Timed in' });
    toast.success('Timed in');
  };

  return (
    <div className="space-y-6">
    {isInternalAvailabilityUser && (
      <Card className="rounded-2xl border-[color:var(--color-border)]/60 shadow-sm bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)]">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Availability Session</CardTitle>
            <CardDescription className="text-[var(--text-metal-muted-color)]">
              Time in and time out for attendance. Admins manage availability and shift schedules.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant={isTimedIn ? 'outline' : 'default'}
            className="rounded-xl"
            disabled={timeClockPending}
            onClick={handleTimeClock}
          >
            {timeClockPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-2 h-4 w-4" />
            )}
            {isTimedIn ? 'Time Out' : 'Time In'}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/85 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Current status</p>
            <p className="mt-1 text-sm font-semibold capitalize text-[var(--color-card-foreground)]">{availabilityLabel}</p>
            <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">
              Availability is managed by an admin.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/85 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Shift window</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-card-foreground)]">{availabilityShiftLabel}</p>
            {user?.availabilityNote && (
              <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">Note: {user.availabilityNote}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )}

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

          {isCustomer && (
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
                <LocationPicker 
                  value={pinnedLocation} 
                  address={formattedAddress}
                  onChange={handleLocationPick} 
                />
              </Suspense>
            </div>
            {formattedAddress && (
              <div className="flex flex-col gap-3 rounded-xl border border-blue-300/40 bg-blue-500/10 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-blue-400/30 dark:bg-blue-500/10">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">Pinned map address</p>
                  <p className="mt-1 break-words text-sm text-[var(--color-card-foreground)]">{formattedAddress}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 rounded-xl border border-blue-300/60 bg-blue-600 px-4 font-semibold text-white hover:bg-blue-500 dark:border-blue-300/40 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
                  onClick={handleUsePinnedAddress}
                >
                  Autofill address fields
                </Button>
              </div>
            )}

            <input type="hidden" value="business" {...register('addressType')} />

            {/* ── Address Type Summary ── */}
            <div className="pt-2 space-y-1.5">
              <Label className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                Address Category
              </Label>
              <div className="rounded-xl border border-[color:var(--color-border)]/50 bg-[color:var(--color-card)]/40 p-3">
                <span className="text-sm font-medium text-[var(--color-card-foreground)]">Business / Site</span>
              </div>
            </div>

            {/* ── Structured Address Fields ── */}
            <div className="pt-3 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-[var(--color-card-foreground)] text-[13px] font-medium">
                  Site Street Address
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

            <div className="space-y-2 rounded-xl border border-[color:var(--color-border)]/50 bg-[color:var(--color-card)]/40 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-card-foreground)]">Saved addresses</p>
                  <p className="text-xs text-[var(--text-metal-muted-color)]">Sales can select one of these when scheduling ocular visits.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-blue-300/70 bg-blue-500/10 text-blue-700 shadow-sm hover:bg-blue-500/15 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25"
                  onClick={() => {
                    const label = `Address ${savedAddresses.length + 1}`;
                    setSavedAddresses((current) => [
                      ...current.map((address) => ({ ...address, isDefault: false })),
                      {
                        id: newAddressId(),
                        label,
                        addressType: 'business',
                        country: 'Philippines',
                        city: watch('city') || '',
                        province: watch('province') || '',
                        street: watch('street') || '',
                        barangay: watch('barangay') || '',
                        zip: watch('zip') || '',
                        lat: pinnedLocation?.lat,
                        lng: pinnedLocation?.lng,
                        formattedAddress: formattedAddress || '',
                        isDefault: true,
                      },
                    ]);
                  }}
                >
                  Add current address
                </Button>
              </div>
              <div className="space-y-2">
                {savedAddresses.map((address) => (
                  <div key={address.id || address.formattedAddress} className="flex flex-col gap-2 rounded-xl border border-[color:var(--color-border)]/50 bg-[color:var(--color-card)]/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-card-foreground)]">
                        {address.label || 'Saved address'} {address.isDefault ? '(Default)' : ''}
                      </p>
                      <p className="mt-0.5 break-words text-xs text-[var(--text-metal-muted-color)]">
                        {address.formattedAddress || [address.street, address.barangay, address.city, address.province].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!address.isDefault && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-emerald-300/70 bg-emerald-500/10 text-emerald-700 shadow-sm hover:bg-emerald-500/15 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25"
                          onClick={() => {
                            setSavedAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === address.id })));
                            setValue('street', address.street || '', { shouldDirty: true });
                            setValue('barangay', address.barangay || '', { shouldDirty: true });
                            setValue('city', address.city || '', { shouldDirty: true });
                            setValue('province', address.province || '', { shouldDirty: true });
                            setValue('zip', address.zip || '', { shouldDirty: true });
                            setPinnedLocation(address.lat != null && address.lng != null ? { lat: address.lat, lng: address.lng } : null);
                            setFormattedAddress(address.formattedAddress || '');
                          }}
                        >
                          Set default
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-red-300/70 bg-red-500/10 text-red-700 shadow-sm hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-45 dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-100 dark:hover:bg-red-500/25"
                        disabled={savedAddresses.length <= 1 && Boolean(user?.roles.includes(Role.CUSTOMER))}
                        onClick={() => setSavedAddresses((current) => current.filter((item) => item.id !== address.id))}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-4 border-t border-[color:var(--color-border)]/50 pt-4">
            {isDirty && (
              <p className="mr-auto text-sm text-[var(--text-metal-muted-color)]">You have unsaved changes</p>
            )}
            <Button
              type="submit"
              className="min-w-[150px] h-11 rounded-xl border border-emerald-400/50 bg-emerald-600 font-semibold text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition-all duration-200 hover:bg-emerald-500 disabled:opacity-60 dark:border-emerald-300/45 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400"
              disabled={isSubmitting}
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

    {isCashier && (
      <Card className="rounded-2xl border-[color:var(--color-border)]/60 shadow-sm bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)] backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--color-card-foreground)]">
            <PenTool className="h-5 w-5 text-[var(--text-metal-muted-color)]" />
            Cashier Signature
          </CardTitle>
          <CardDescription className="text-[var(--text-metal-muted-color)]">
            Draw the signature used for cashier payment verification records.
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
    )}
    </div>
  );
}
