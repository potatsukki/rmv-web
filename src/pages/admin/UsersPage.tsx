import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Search,
  UserCog,
  MoreVertical,
  Edit2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageError } from '@/components/shared/PageError';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDisableUser,
  useEnableUser,
} from '@/hooks/useUsers';
import { Role } from '@/lib/constants';
import type { User } from '@/lib/types';

const ROLES: { value: Role; label: string }[] = [
  { value: Role.CUSTOMER, label: 'Customer' },
  { value: Role.APPOINTMENT_AGENT, label: 'Appointment Agent' },
  { value: Role.SALES_STAFF, label: 'Sales Staff' },
  { value: Role.ENGINEER, label: 'Engineer' },
  { value: Role.FABRICATION_STAFF, label: 'Fabricator' },
  { value: Role.CASHIER, label: 'Cashier' },
  { value: Role.ADMIN, label: 'Administrator' },
];

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().or(z.literal('')),
  role: z.nativeEnum(Role),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const roleBadgeStyles: Record<string, string> = {
  [Role.CUSTOMER]: 'border-gray-200 bg-gray-50 text-gray-700',
  [Role.APPOINTMENT_AGENT]: 'border-teal-200 bg-teal-50 text-teal-700',
  [Role.SALES_STAFF]: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  [Role.ENGINEER]: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  [Role.FABRICATION_STAFF]: 'border-orange-200 bg-orange-50 text-orange-700',
  [Role.CASHIER]: 'border-amber-200 bg-amber-50 text-amber-700',
  [Role.ADMIN]: 'border-red-200 bg-red-50 text-red-700',
};

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [disableDialog, setDisableDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (roleFilter !== 'all') params.role = roleFilter;
  const { data: users, isLoading, error, refetch } = useUsers(params);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: Role.CUSTOMER,
      password: '',
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: Role.CUSTOMER,
      password: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: (user.roles[0] as Role) || Role.CUSTOMER,
      password: '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser._id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          roles: [data.role],
        });
        toast.success('User updated successfully');
      } else {
        if (!data.password) {
          form.setError('password', {
            message: 'Password is required for new users',
            type: 'manual',
          });
          return;
        }
        await createUser.mutateAsync({
          email: data.email,
          password: data.password!,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          roles: [data.role],
        });
        toast.success('User created successfully');
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string; details?: { errors?: { path: string; message: string }[] } } } } };
      const validationErrors = error?.response?.data?.error?.details?.errors;
      if (validationErrors && validationErrors.length > 0) {
        toast.error(validationErrors.map(e => `${e.path}: ${e.message}`).join(', '));
      } else {
        toast.error(error?.response?.data?.error?.message || 'Operation failed');
      }
    }
  };

  const handleDisable = async () => {
    if (!disableDialog.user) return;
    try {
      if (disableDialog.user.isActive) {
        await disableUser.mutateAsync(disableDialog.user._id);
      } else {
        await enableUser.mutateAsync(disableDialog.user._id);
      }
      toast.success(disableDialog.user.isActive ? 'User disabled' : 'User enabled');
      setDisableDialog({ open: false, user: null });
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const formatRole = (r: string) =>
    r
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

  if (error) return <PageError message="Failed to load users" onRetry={refetch} />;

  const inputClasses =
    'h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage system access and employee roles.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm rounded-xl h-10"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-gray-100 rounded-xl">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !users || users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="bg-white p-4 rounded-2xl mb-4 shadow-sm">
            <UserCog className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No users found</h3>
          <p className="text-gray-500 max-w-sm mt-1 text-sm">
            Try adjusting your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((user: User) => (
            <Card
              key={user._id}
              className={`group relative transition-all duration-200 hover:shadow-md border-gray-100 rounded-xl ${
                !user.isActive ? 'bg-gray-50 opacity-75' : 'bg-white'
              }`}
            >
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 rounded-lg"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openEdit(user)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDisableDialog({ open: true, user })}
                      className={user.isActive ? 'text-red-600' : 'text-emerald-600'}
                    >
                      {user.isActive ? (
                        <>
                          <XCircle className="mr-2 h-4 w-4" /> Disable User
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Enable User
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardContent className="flex flex-col items-center pt-8 pb-6 text-center">
                <div
                  className={`h-20 w-20 rounded-full flex items-center justify-center text-xl font-bold mb-4 border-4 border-white shadow-sm ${
                    !user.isActive
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
                  }`}
                >
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>

                <h3 className="font-bold text-gray-900 truncate w-full px-4">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-gray-500 mb-4 truncate w-full px-4">{user.email}</p>

                <div className="flex flex-wrap justify-center gap-2">
                  {user.roles.map((r) => (
                    <Badge
                      key={r}
                      variant="outline"
                      className={`uppercase text-[10px] tracking-wider font-bold rounded-md ${
                        roleBadgeStyles[r] || 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {formatRole(r)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingUser
                ? 'Modify user details and roles.'
                : 'Create a new account for an employee or customer.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="firstName"
                  className="text-gray-700 text-[13px] font-medium"
                >
                  First Name
                </Label>
                <Input id="firstName" {...form.register('firstName')} className={inputClasses} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lastName"
                  className="text-gray-700 text-[13px] font-medium"
                >
                  Last Name
                </Label>
                <Input id="lastName" {...form.register('lastName')} className={inputClasses} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 text-[13px] font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                className={inputClasses}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-gray-700 text-[13px] font-medium">
                Phone Number (Optional)
              </Label>
              <Input
                id="phone"
                placeholder="+639XXXXXXXXX"
                {...form.register('phone')}
                className={inputClasses}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-gray-700 text-[13px] font-medium">
                Assigned Role
              </Label>
              <select
                id="role"
                {...form.register('role')}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 text-[13px] font-medium">
                {editingUser ? 'New Password (Optional)' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                {...form.register('password')}
                placeholder={editingUser ? 'Leave blank to keep current' : 'Min. 8 characters'}
                className={inputClasses}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-gray-200 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending || updateUser.isPending}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
              >
                {createUser.isPending || updateUser.isPending
                  ? 'Saving...'
                  : editingUser
                    ? 'Update User'
                    : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable / Enable Confirm */}
      <ConfirmDialog
        open={disableDialog.open}
        title={disableDialog.user?.isActive ? 'Disable User Access' : 'Restore User Access'}
        description={`Are you sure you want to ${
          disableDialog.user?.isActive ? 'disable' : 'enable'
        } the account for ${disableDialog.user?.firstName} ${disableDialog.user?.lastName}?`}
        confirmLabel={disableDialog.user?.isActive ? 'Disable Account' : 'Enable Account'}
        destructive={!!disableDialog.user?.isActive}
        loading={disableUser.isPending || enableUser.isPending}
        onConfirm={handleDisable}
        onCancel={() => setDisableDialog({ open: false, user: null })}
      />
    </div>
  );
}
