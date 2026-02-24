import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Check, MapPin, PenTool } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateProfile, useSignature, useSaveSignature } from '@/hooks/useUsers';
import { Role } from '@/lib/constants';

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

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function AccountProfilePage() {
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const { data: signatureData } = useSignature();
  const saveSignature = useSaveSignature();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      address: user?.address || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const payload: Record<string, string> = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      if (data.phone) payload.phone = data.phone;
      if (data.address) payload.address = data.address;

      await updateProfile.mutateAsync(payload);
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
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="address"
                placeholder="Enter your address"
                {...register('address')}
                rows={3}
                className="pl-10 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200 resize-none"
              />
            </div>
            <p className="text-xs text-gray-400">
              Used for delivery and project site reference.
            </p>
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address.message}</p>
            )}
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
