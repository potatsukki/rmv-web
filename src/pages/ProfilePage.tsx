import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Phone, Mail, FileKey, Check, CreditCard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, fetchMe, logout } = useAuthStore();

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
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const payload: Record<string, string> = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      if (data.phone) payload.phone = data.phone;

      await api.patch('/users/profile', payload);
      await fetchMe();
      reset({ ...data });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  const inputClasses =
    'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: User Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-gray-100 shadow-sm overflow-hidden rounded-2xl">
            <div className="h-28 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />
            <div className="px-6 relative">
              <div className="absolute -top-12 left-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg bg-white">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-orange-50 text-orange-600 text-2xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <CardContent className="pt-16 pb-6 px-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-sm text-gray-500 font-medium">{user?.email}</p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {user?.roles?.map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 uppercase text-[10px] tracking-wider font-semibold rounded-md"
                    >
                      {role.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="truncate">
                    ID:{' '}
                    <span className="font-mono text-xs text-gray-400">
                      #{user?._id?.substring(0, 8)}
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-gray-100 p-4">
              <Button
                variant="destructive"
                className="w-full justify-start pl-4 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="lg:col-span-2 space-y-6">
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
                    <Label
                      htmlFor="firstName"
                      className="text-gray-700 text-[13px] font-medium"
                    >
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      className={inputClasses}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-500">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lastName"
                      className="text-gray-700 text-[13px] font-medium"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      className={inputClasses}
                    />
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
                  <p className="text-xs text-gray-400">
                    Used for SMS notifications about project updates.
                  </p>
                  {errors.phone && (
                    <p className="text-xs text-red-500">{errors.phone.message}</p>
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

          <Card className="border-gray-100 shadow-sm opacity-80 cursor-not-allowed select-none relative overflow-hidden group rounded-2xl">
            <div className="absolute inset-0 bg-gray-50/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
              <Badge
                variant="outline"
                className="bg-white px-3 py-1 shadow-sm border-gray-200 text-gray-500 rounded-lg"
              >
                Feature Coming Soon
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Security & Billing
              </CardTitle>
              <CardDescription className="text-gray-500">
                Manage password and payment methods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <FileKey className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Password</p>
                    <p className="text-xs text-gray-500">Last changed 3 months ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" disabled>
                  Update
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Payment Methods</p>
                    <p className="text-xs text-gray-500">No cards saved</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" disabled>
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
