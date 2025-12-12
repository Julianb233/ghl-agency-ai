import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  MoreVertical,
  UserPlus,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Shield,
  Users as UsersIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const getRoleBadge = (role: 'user' | 'admin') => {
  const styles = {
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    user: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const icons = {
    admin: Shield,
    user: UsersIcon,
  };

  const Icon = icons[role];

  return (
    <Badge className={styles[role]}>
      <Icon className="mr-1 h-3 w-3" />
      {role.toUpperCase()}
    </Badge>
  );
};

const getOnboardingBadge = (completed: boolean) => {
  if (completed) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
      <XCircle className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  );
};

export const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showUnsuspendDialog, setShowUnsuspendDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [suspendReason, setSuspendReason] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Build query parameters
  const queryParams = {
    limit: pageSize,
    offset: page * pageSize,
    search: searchQuery || undefined,
    role: roleFilter !== 'all' ? (roleFilter as 'user' | 'admin') : undefined,
    onboardingCompleted: onboardingFilter === 'completed' ? true : onboardingFilter === 'pending' ? false : undefined,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  };

  // Query users list
  const { data: usersData, isLoading, error, refetch } = trpc.admin.users.list.useQuery(queryParams);

  // Query user stats
  const { data: statsData } = trpc.admin.users.getStats.useQuery();

  // Mutations
  const suspendMutation = trpc.admin.users.suspend.useMutation({
    onSuccess: () => {
      toast.success('User suspended successfully');
      refetch();
      setShowSuspendDialog(false);
      setSelectedUserId(null);
      setSuspendReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to suspend user');
    },
  });

  const unsuspendMutation = trpc.admin.users.unsuspend.useMutation({
    onSuccess: () => {
      toast.success('User unsuspended successfully');
      refetch();
      setShowUnsuspendDialog(false);
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to unsuspend user');
    },
  });

  const updateRoleMutation = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success('User role updated successfully');
      refetch();
      setShowRoleDialog(false);
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update user role');
    },
  });

  const handleSuspendUser = (userId: number) => {
    setSelectedUserId(userId);
    setShowSuspendDialog(true);
  };

  const handleUnsuspendUser = (userId: number) => {
    setSelectedUserId(userId);
    setShowUnsuspendDialog(true);
  };

  const handleChangeRole = (userId: number, currentRole: 'user' | 'admin') => {
    setSelectedUserId(userId);
    setNewRole(currentRole === 'admin' ? 'user' : 'admin');
    setShowRoleDialog(true);
  };

  const confirmSuspend = () => {
    if (selectedUserId) {
      suspendMutation.mutate({
        userId: selectedUserId,
        reason: suspendReason || undefined,
      });
    }
  };

  const confirmUnsuspend = () => {
    if (selectedUserId) {
      unsuspendMutation.mutate({
        userId: selectedUserId,
      });
    }
  };

  const confirmRoleChange = () => {
    if (selectedUserId) {
      updateRoleMutation.mutate({
        userId: selectedUserId,
        role: newRole,
      });
    }
  };

  const users = usersData?.users || [];
  const pagination = usersData?.pagination;
  const selectedUser = users.find(u => u.id === selectedUserId);

  const totalPages = pagination ? Math.ceil(pagination.total / pageSize) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">User Management</h2>
            <p className="text-slate-400 mt-1">Manage user accounts and permissions</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Stats Cards */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="text-3xl text-white">{statsData.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription>Admins</CardDescription>
                <CardTitle className="text-3xl text-purple-400">{statsData.byRole.admin}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription>Regular Users</CardDescription>
                <CardTitle className="text-3xl text-blue-400">{statsData.byRole.user}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription>New This Month</CardDescription>
                <CardTitle className="text-3xl text-green-400">{statsData.newThisMonth}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0); // Reset to first page on search
                  }}
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full md:w-[180px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={onboardingFilter}
                onValueChange={(value) => {
                  setOnboardingFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full md:w-[180px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* User Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              Users {pagination && `(${pagination.total})`}
            </CardTitle>
            <CardDescription>
              A list of all users including their name, email, role and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-4">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load users: {error.message}</span>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Email</TableHead>
                      <TableHead className="text-slate-400">Role</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Last Login</TableHead>
                      <TableHead className="text-slate-400">Created</TableHead>
                      <TableHead className="text-slate-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-slate-400 py-8"
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} className="border-slate-800">
                          <TableCell className="font-medium text-white">
                            {user.name}
                          </TableCell>
                          <TableCell className="text-slate-300">{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getOnboardingBadge(user.onboardingCompleted)}</TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {user.lastSignedIn
                              ? new Date(user.lastSignedIn).toLocaleString()
                              : 'Never'}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="bg-slate-900 border-slate-800"
                                >
                                  <DropdownMenuLabel className="text-white">
                                    Actions
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-slate-800" />
                                  <DropdownMenuItem
                                    className="text-slate-300 hover:bg-slate-800 hover:text-white"
                                    onClick={() => handleChangeRole(user.id, user.role)}
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-slate-300 hover:bg-slate-800 hover:text-white"
                                    onClick={() => handleSuspendUser(user.id)}
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Suspend User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-slate-300 hover:bg-slate-800 hover:text-white"
                                    onClick={() => handleUnsuspendUser(user.id)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Unsuspend User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.total > pageSize && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                    <div className="text-sm text-slate-400">
                      Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, pagination.total)} of {pagination.total} users
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={!pagination.hasMore}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend User Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend {selectedUser?.name}? All their active sessions will be terminated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm text-slate-400 mb-2 block">
              Reason (optional)
            </label>
            <Input
              placeholder="Enter reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-slate-700"
              onClick={() => setSuspendReason('')}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSuspend}
              disabled={suspendMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {suspendMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsuspend User Dialog */}
      <AlertDialog open={showUnsuspendDialog} onOpenChange={setShowUnsuspendDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsuspend User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unsuspend {selectedUser?.name}? They will be able to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnsuspend}
              disabled={unsuspendMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {unsuspendMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Unsuspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {selectedUser?.name}'s role to {newRole.toUpperCase()}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={updateRoleMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Change Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};
