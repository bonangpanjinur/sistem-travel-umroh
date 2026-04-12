import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import {
  Search, Users, Shield, UserPlus, Trash2, Edit2, Link2, Key
} from "lucide-react";
import { AppRole } from "@/types/database";

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  branch_manager: "Branch Manager",
  finance: "Finance",
  operational: "Operational",
  sales: "Sales",
  marketing: "Marketing",
  equipment: "Equipment",
  agent: "Agent",
  customer: "Customer",
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-red-100 text-red-800",
  owner: "bg-purple-100 text-purple-800",
  branch_manager: "bg-blue-100 text-blue-800",
  finance: "bg-green-100 text-green-800",
  operational: "bg-amber-100 text-amber-800",
  sales: "bg-cyan-100 text-cyan-800",
  marketing: "bg-pink-100 text-pink-800",
  equipment: "bg-gray-100 text-gray-800",
  agent: "bg-indigo-100 text-indigo-800",
  customer: "bg-slate-100 text-slate-800",
};

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: { id: string; role: AppRole; branch_id: string | null }[];
  hasEmployeeRecord?: boolean;
  employeeCode?: string;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");
  const [roleToDelete, setRoleToDelete] = useState<{ userId: string; roleId: string; role: AppRole } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserWithRoles | null>(null);
  const [resetPasswordMethod, setResetPasswordMethod] = useState<'email' | 'direct'>('email');
  const [newPassword, setNewPassword] = useState('');
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin') || hasRole('owner');

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, branch_id');

      if (rolesError) throw rolesError;

      // Then get all employees to check linkage
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('user_id, employee_code');

      if (employeesError) throw employeesError;

      // Create a map of user_id -> employee_code for quick lookup
      const employeeMap = new Map((employees || []).map(e => [e.user_id, e.employee_code]));

      // Combine the data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || []).filter(r => r.user_id === profile.user_id).map(r => ({
          id: r.id,
          role: r.role as AppRole,
          branch_id: r.branch_id,
        })),
        hasEmployeeRecord: employeeMap.has(profile.user_id),
        employeeCode: employeeMap.get(profile.user_id),
      }));

      return usersWithRoles;
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Role berhasil ditambahkan");
      setShowAddRoleDialog(false);
      setSelectedUser(null);
      setNewRole("");
    },
    onError: (error) => {
      toast.error("Gagal menambahkan role: " + error.message);
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Role berhasil dihapus");
      setRoleToDelete(null);
    },
    onError: (error) => {
      toast.error("Gagal menghapus role: " + error.message);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_user_by_admin', {
        target_user_id: userId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("User berhasil dihapus");
      setUserToDelete(null);
    },
    onError: (error) => {
      toast.error("Gagal menghapus user: " + error.message);
    },
  });

  // Reset password via email mutation
  const resetPasswordEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('reset_user_password_by_admin', {
        target_user_id: userId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Email reset password telah dikirim ke user");
      setUserToResetPassword(null);
      setResetPasswordMethod('email');
    },
    onError: (error) => {
      toast.error("Gagal mengirim email reset: " + error.message);
    },
  });

  // Set password directly mutation
  const setPasswordDirectMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!newPassword || newPassword.length < 8) {
        throw new Error('Password harus minimal 8 karakter');
      }
      const { error } = await supabase.rpc('set_user_password_by_admin', {
        target_user_id: userId,
        new_password: newPassword
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Password user berhasil diperbarui");
      setUserToResetPassword(null);
      setNewPassword('');
      setResetPasswordMethod('email');
    },
    onError: (error) => {
      toast.error("Gagal memperbarui password: " + error.message);
    },
  });

  const filteredUsers = users?.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.phone?.includes(search) ||
      user.roles.some(r => ROLE_LABELS[r.role].toLowerCase().includes(search))
    );
  });

  const stats = {
    total: users?.length || 0,
    admins: users?.filter(u => u.roles.some(r => ['super_admin', 'owner', 'branch_manager'].includes(r.role))).length || 0,
    staff: users?.filter(u => u.roles.some(r => ['finance', 'operational', 'sales', 'marketing', 'equipment'].includes(r.role))).length || 0,
    agents: users?.filter(u => u.roles.some(r => r.role === 'agent')).length || 0,
  };

  const handleAddRole = () => {
    if (!selectedUser || !newRole) return;
    addRoleMutation.mutate({ userId: selectedUser.user_id, role: newRole });
  };

  const getAvailableRoles = (user: UserWithRoles): AppRole[] => {
    const existingRoles = user.roles.map(r => r.role);
    const allRoles: AppRole[] = [
      'super_admin', 'owner', 'branch_manager', 'finance',
      'operational', 'sales', 'marketing', 'equipment', 'agent', 'customer'
    ];
    return allRoles.filter(r => !existingRoles.includes(r));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-muted-foreground">Kelola role dan akses pengguna</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, role..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total User</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admin</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff</p>
                <p className="text-2xl font-bold">{stats.staff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <UserPlus className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent</p>
                <p className="text-2xl font-bold">{stats.agents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Tidak ada user yang cocok.' : 'Belum ada data user.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{user.full_name || 'N/A'}</span>
                          {user.hasEmployeeRecord ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Link2 className="h-3 w-3 mr-1" />
                              {user.employeeCode}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              No Employee
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-muted-foreground">No roles</span>
                          ) : (
                            user.roles.map((r) => (
                              <Badge
                                key={r.id}
                                className={`${ROLE_COLORS[r.role]} cursor-pointer group relative`}
                              >
                                {ROLE_LABELS[r.role]}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRoleToDelete({ userId: user.user_id, roleId: r.id, role: r.role });
                                  }}
                                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'd MMM yyyy', { locale: id })}
                      </TableCell>
	                      <TableCell className="text-right">
	                        <div className="flex justify-end gap-2">
	                          <Button
	                            variant="outline"
	                            size="sm"
	                            onClick={() => {
	                              setSelectedUser(user);
	                              setShowAddRoleDialog(true);
	                            }}
	                          >
	                            <UserPlus className="h-4 w-4 mr-1" />
	                            Tambah Role
	                          </Button>
	                          
	                          {isSuperAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setUserToResetPassword(user);
                                  setResetPasswordMethod("email");
                                }}
                              >
                                <Key className="h-4 w-4 mr-1" />
                                Reset Password
                              </Button>
	                            <Button
	                              variant="outline"
	                              size="sm"
	                              className="text-destructive hover:bg-destructive/10"
	                              onClick={() => setUserToDelete(user)}
	                            >
	                              <Trash2 className="h-4 w-4 mr-1" />
	                              Hapus User
	                            </Button>
	                            </>
	                          )}
	                        </div>
	                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Role</DialogTitle>
            <DialogDescription>
              Tambahkan role baru untuk {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedUser && getAvailableRoles(selectedUser).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={!newRole || addRoleMutation.isPending}
            >
              {addRoleMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus role{' '}
              <strong>{roleToDelete ? ROLE_LABELS[roleToDelete.role] : ''}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && deleteRoleMutation.mutate(roleToDelete.roleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRoleMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User Permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user <strong>{userToDelete?.full_name}</strong> secara permanen?
              Semua data terkait user ini akan dihapus dan user tidak akan bisa login lagi.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Menghapus..." : "Hapus User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!userToResetPassword} onOpenChange={() => {
        setUserToResetPassword(null);
        setNewPassword('');
        setResetPasswordMethod('email');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password User</DialogTitle>
            <DialogDescription>
              Pilih metode untuk reset password {userToResetPassword?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Metode Reset</label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="email-method"
                    checked={resetPasswordMethod === 'email'}
                    onChange={() => setResetPasswordMethod('email')}
                    className="w-4 h-4"
                  />
                  <label htmlFor="email-method" className="text-sm cursor-pointer">
                    Kirim Email Reset
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="direct-method"
                    checked={resetPasswordMethod === 'direct'}
                    onChange={() => setResetPasswordMethod('direct')}
                    className="w-4 h-4"
                  />
                  <label htmlFor="direct-method" className="text-sm cursor-pointer">
                    Set Password Langsung
                  </label>
                </div>
              </div>
            </div>

            {resetPasswordMethod === 'direct' && (
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">Password Baru</label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {newPassword && newPassword.length < 8 && (
                  <p className="text-xs text-destructive">Password harus minimal 8 karakter</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUserToResetPassword(null);
                setNewPassword('');
                setResetPasswordMethod('email');
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (userToResetPassword) {
                  if (resetPasswordMethod === 'email') {
                    resetPasswordEmailMutation.mutate(userToResetPassword.user_id);
                  } else {
                    setPasswordDirectMutation.mutate(userToResetPassword.user_id);
                  }
                }
              }}
              disabled={resetPasswordMethod === 'direct' && newPassword.length < 8}
            >
              {resetPasswordEmailMutation.isPending || setPasswordDirectMutation.isPending
                ? 'Memproses...'
                : resetPasswordMethod === 'email'
                ? 'Kirim Email'
                : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
