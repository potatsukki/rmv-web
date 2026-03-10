import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  UserCog,
  MoreVertical,
  Edit2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage, extractItems } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
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
  { value: Role.APPOINTMENT_AGENT, label: 'Appointment Agent' },
  { value: Role.SALES_STAFF, label: 'Sales Staff' },
  { value: Role.ENGINEER, label: 'Engineer' },
  { value: Role.FABRICATION_STAFF, label: 'Fabricator' },
  { value: Role.CASHIER, label: 'Cashier' },
  { value: Role.ADMIN, label: 'Administrator' },
];

function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((b) => chars[b % chars.length])
    .join('');
}

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().refine(
    (v) => !v || /^\+639\d{9}$/.test(v),
    { message: 'Enter a valid 10-digit mobile number (9XXXXXXXXX)' }
  ).optional().or(z.literal('')),
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
  const [showPassword, setShowPassword] = useState(false);

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
      role: Role.APPOINTMENT_AGENT,
      password: '',
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    setShowPassword(false);
    form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: Role.APPOINTMENT_AGENT,
      password: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setShowPassword(false);
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
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update user status'));
    }
  };

  const formatRole = (r: string) =>
    r
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const userList = extractItems<User>(users);

  if (error) return <PageError message="Failed to load users" onRetry={refetch} />;

  const inputClasses =
    'h-11 bg-gray-50/50 border-gray-200 focus:border-[#6e6e73] focus:ring-[#6e6e73]/20';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">User Management</h1>
          <p className="text-[#6e6e73] text-sm mt-1">
            Manage system access and employee roles.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white shadow-sm h-10"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Toolbar */}
      <CollectionToolbar
        title="Find the right account fast"
        description="Search staff records and narrow by role before making access changes."
        searchPlaceholder="Search users"
        searchValue={search}
        onSearchChange={setSearch}
        filters={[{ value: 'all', label: 'All' }, ...ROLES]}
        activeFilter={roleFilter}
        onFilterChange={setRoleFilter}
        action={
          <Button
            onClick={openCreate}
            className="h-11 bg-[#1d1d1f] px-4 text-white shadow-sm hover:bg-[#2d2d2f]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        }
      />

      {/* Users */}
      {isLoading ? (
        <>
          {/* Mobile skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#c8c8cd]/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden md:block bg-white rounded-xl border border-[#c8c8cd]/50 shadow-sm overflow-hidden">
            <div className="p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : userList.length === 0 ? (
        <EmptyState
          icon={<UserCog className="h-6 w-6" />}
          title="No users found"
          description="Try adjusting the search terms or role filter to find the staff account you need."
        />
      ) : (
        <>
          {/* ── Mobile list (< md) ── */}
          <div className="md:hidden space-y-2">
            {userList.map((u) => (
              <div
                key={u._id}
                className={`bg-white rounded-xl border border-[#c8c8cd]/50 px-4 py-3.5 transition-colors ${
                  !u.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      !u.isActive
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-gradient-to-br from-[#f0f0f5] to-[#e8e8ed] text-[#3a3a3e]'
                    }`}
                  >
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1d1d1f] text-sm truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-[11px] text-[#86868b] truncate">{u.email}</p>
                  </div>
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-[#86868b] hover:text-[#3a3a3e] rounded-lg flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl bg-white shadow-lg border border-[#e8e8ed]">
                      <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEdit(u)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDisableDialog({ open: true, user: u })}
                        className={u.isActive ? 'text-red-600' : 'text-emerald-600'}
                      >
                        {u.isActive ? (
                          <><XCircle className="mr-2 h-4 w-4" /> Disable User</>
                        ) : (
                          <><CheckCircle2 className="mr-2 h-4 w-4" /> Enable User</>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* Roles + Status row */}
                <div className="flex items-center gap-2 mt-2 ml-[52px] flex-wrap">
                  {u.roles.map((r) => (
                    <Badge
                      key={r}
                      variant="outline"
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-5 ${
                        roleBadgeStyles[r] || 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {formatRole(r)}
                    </Badge>
                  ))}
                  {!u.isActive && (
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-5 border-red-200 bg-red-50 text-red-600">
                      Disabled
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <div className="px-1 pt-1">
              <p className="text-[11px] text-[#86868b]">
                {userList.length} user{userList.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="hidden md:block bg-white rounded-xl border border-[#c8c8cd]/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e8e8ed] hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] pl-5">User</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">Email</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">Role</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] w-10 pr-5"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userList.map((u) => (
                  <TableRow
                    key={u._id}
                    className={`border-b border-[#f0f0f5] transition-colors hover:bg-[#f9f9fb] group ${
                      !u.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    {/* User */}
                    <TableCell className="pl-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            !u.isActive
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-gradient-to-br from-[#f0f0f5] to-[#e8e8ed] text-[#3a3a3e]'
                          }`}
                        >
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <p className="font-medium text-[#1d1d1f] text-sm truncate">
                          {u.firstName} {u.lastName}
                        </p>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="py-4">
                      <span className="text-sm text-[#6e6e73]">{u.email}</span>
                    </TableCell>

                    {/* Phone — hidden below lg */}
                    <TableCell className="py-4 hidden lg:table-cell">
                      <span className="text-sm text-[#6e6e73]">{u.phone || '—'}</span>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge
                            key={r}
                            variant="outline"
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              roleBadgeStyles[r] || 'border-gray-200 text-gray-600'
                            }`}
                          >
                            {formatRole(r)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          u.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-600'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-4 pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-[#c8c8cd] hover:text-[#6e6e73] group-hover:text-[#86868b] rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl bg-white shadow-lg border border-[#e8e8ed]">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDisableDialog({ open: true, user: u })}
                            className={u.isActive ? 'text-red-600' : 'text-emerald-600'}
                          >
                            {u.isActive ? (
                              <><XCircle className="mr-2 h-4 w-4" /> Disable User</>
                            ) : (
                              <><CheckCircle2 className="mr-2 h-4 w-4" /> Enable User</>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-5 py-3 border-t border-[#f0f0f5] bg-[#fafafa]">
              <p className="text-xs text-[#86868b]">
                {userList.length} user{userList.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
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
                : 'Create a new account for a team member.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
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
              <div className="flex h-11 rounded-lg overflow-hidden border border-gray-200 bg-gray-50/50 focus-within:border-[#6e6e73] focus-within:ring-2 focus-within:ring-[#6e6e73]/20 transition-all">
                <span className="flex items-center px-3 text-sm font-medium text-[#3a3a3e] bg-gray-100/80 border-r border-gray-200 select-none shrink-0">+63</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9XXXXXXXXX"
                  value={(form.watch('phone') || '').replace(/^\+63/, '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
                    form.setValue('phone', raw ? `+63${raw}` : '', { shouldValidate: true });
                  }}
                  className="flex-1 bg-transparent px-3 text-sm text-[#1d1d1f] outline-none placeholder:text-gray-400 min-w-0"
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-xs text-red-500">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-gray-700 text-[13px] font-medium">
                Assigned Role
              </Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v as Role)}
              >
                <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-[#6e6e73]/20">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white shadow-lg border border-[#e8e8ed]">
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-sm rounded-lg">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 text-[13px] font-medium">
                  {editingUser ? 'New Password (Optional)' : 'Password'}
                </Label>
                {!editingUser && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                    onClick={() => {
                      const pw = generatePassword();
                      form.setValue('password', pw);
                      setShowPassword(true);
                    }}
                  >
                    <Wand2 className="h-3 w-3" /> Auto-generate
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Min. 8 characters'}
                  className={`${inputClasses} pr-10`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#3a3a3e] transition-colors"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
