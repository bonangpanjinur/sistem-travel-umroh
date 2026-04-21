import { useState } from "react";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
  Search, Users, Shield, UserPlus, Trash2, Edit2, Link2, Key, Building2, UserCog, ShieldCheck, Settings
} from "lucide-react";
import { AppRole } from "@/types/database";
import { UserPermissionsManager } from "@/components/admin/UserPermissionsManager";
import DashboardAccessManagerPanel from "@/components/admin/DashboardAccessManagerPanel";
import { sortRoles } from "@/lib/constants";

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
  super_admin: "bg-red-100 text-red-800 border-red-200",
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  branch_manager: "bg-blue-100 text-blue-800 border-blue-200",
  finance: "bg-green-100 text-green-800 border-green-200",
  operational: "bg-amber-100 text-amber-800 border-amber-200",
  sales: "bg-cyan-100 text-cyan-800 border-cyan-200",
  marketing: "bg-pink-100 text-pink-800 border-pink-200",
  equipment: "bg-gray-100 text-gray-800 border-gray-200",
  agent: "bg-indigo-100 text-indigo-800 border-indigo-200",
  customer: "bg-slate-100 text-slate-800 border-slate-200",
};

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  roles: { id: string; role: AppRole; branch_id: string | null; branch_name?: string }[];
  hasEmployeeRecord?: boolean;
  employeeCode?: string;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [editingRole, setEditingRole] = useState<{ id: string; role: AppRole; branch_id: string | null } | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("")
  const [selectedBranchId, setSelectedBranchId] = useState<string | "all">("all");
  const [roleToDelete, setRoleToDelete] = useState<{ userId: string; roleId: string; role: AppRole } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserWithRoles | null>(null);
  const [resetPasswordMethod, setResetPasswordMethod] = useState<'email' | 'direct'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin') || hasRole('owner');

  // Fetch branches for role assignment
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: authUsers, error: authError } = await (supabase.rpc as any)('list_users_with_emails');
      const emailMap = new Map(((authUsers as any[]) || []).map((u: any) => [u.id, u.email]));

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, branch_id');

      if (rolesError) throw rolesError;

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('user_id, employee_code');

      if (employeesError) throw employeesError;

      const employeeMap = new Map((employees || []).map(e => [e.user_id, e.employee_code]));
      const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        email: (emailMap.get(profile.user_id) as string) || null,
        roles: sortRoles((roles || []).filter(r => r.user_id === profile.user_id).map(r => ({
          id: r.id,
          role: r.role as AppRole,
          branch_id: r.branch_id,
          branch_name: r.branch_id ? branchMap.get(r.branch_id) : undefined
        }))),
        hasEmployeeRecord: employeeMap.has(profile.user_id),
        employeeCode: employeeMap.get(profile.user_id),
      }));

      return usersWithRoles;
    },
    enabled: !!branches, // Wait for branches to map names
  });

  // Handle query param for opening permissions dialog (from redirect)
  useEffect(() => {
    const openPermissionsUserId = searchParams.get('open_permissions');
    if (openPermissionsUserId && users && users.length > 0) {
      const userToOpenPermissions = users.find(u => u.user_id === openPermissionsUserId);
      if (userToOpenPermissions) {
        setSelectedUser(userToOpenPermissions);
        setShowPermissionsDialog(true);
        setSearchParams({});
      }
    }
  }, [searchParams, users, setSearchParams]);

  // Add/Update role mutation
  const upsertRoleMutation = useMutation({
    mutationFn: async ({ userId, role, branchId, roleId }: { userId: string; role: AppRole; branchId: string | null; roleId?: string }) => {
      if (roleId) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role, branch_id: branchId })
          .eq('id', roleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role, branch_id: branchId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(editingRole ? "Role berhasil diperbarui" : "Role berhasil ditambahkan");
      setShowRoleDialog(false);
      setSelectedUser(null);
      setEditingRole(null);
      setNewRole("");
      setSelectedBranchId("all");
    },
    onError: (error) => {
      toast.error("Gagal menyimpan role: " + error.message);
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
      const { error } = await (supabase.rpc as any)('delete_user_by_admin', {
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
      const { error } = await (supabase.rpc as any)('reset_user_password_by_admin', {
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
      const { error } = await (supabase.rpc as any)('set_user_password_by_admin', {
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
      user.email?.toLowerCase().includes(search) ||
      user.roles.some(r => ROLE_LABELS[r.role].toLowerCase().includes(search))
    );
  });

  const stats = {
    total: users?.length || 0,
    admins: users?.filter(u => u.roles.some(r => ['super_admin', 'owner', 'branch_manager'].includes(r.role))).length || 0,
    staff: users?.filter(u => u.roles.some(r => ['finance', 'operational', 'sales', 'marketing', 'equipment'].includes(r.role))).length || 0,
    agents: users?.filter(u => u.roles.some(r => r.role === 'agent')).length || 0,
  };

  const handleSaveRole = () => {
    if (!selectedUser || !newRole) return;
    upsertRoleMutation.mutate({ 
      userId: selectedUser.user_id, 
      role: newRole as AppRole, 
      branchId: selectedBranchId === "all" ? null : selectedBranchId,
      roleId: editingRole?.id
    });
  };

  const getAvailableRoles = (user: UserWithRoles, currentRoleId?: string): AppRole[] => {
    const existingRoles = user.roles.filter(r => r.id !== currentRoleId).map(r => r.role);
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
          <h1 className="text-3xl font-bold text-gray-900">Manajemen User</h1>
          <p className="text-muted-foreground mt-1">Kelola akses, role, dan keamanan pengguna sistem</p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Button
              onClick={() => setShowDashboardSettings(true)}
              variant="outline"
              className="border-blue-200 hover:bg-blue-50 text-blue-600"
            >
              <Settings className="h-4 w-4 mr-2" />
              Pengaturan Dashboard
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari nama, email, role..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total User</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admin & Owner</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <UserCog className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff Operasional</p>
                <p className="text-2xl font-bold">{stats.staff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50">
                <UserPlus className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agen Terdaftar</p>
                <p className="text-2xl font-bold">{stats.agents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-4">
          <CardTitle className="text-lg font-semibold text-gray-700">Daftar Pengguna Sistem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto text-gray-200 mb-3" />
              <p className="text-lg font-medium text-gray-900">{searchTerm ? 'Tidak ada user yang cocok.' : 'Belum ada data user.'}</p>
              <p className="text-sm">{searchTerm ? 'Coba gunakan kata kunci pencarian lain.' : 'User akan muncul di sini setelah mendaftar.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Identitas Pengguna</TableHead>
                    <TableHead className="font-semibold text-gray-700">Kontak</TableHead>
                    <TableHead className="font-semibold text-gray-700">Role & Akses</TableHead>
                    <TableHead className="font-semibold text-gray-700">Bergabung</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-gray-900">{user.full_name || 'Tanpa Nama'}</span>
                          <div className="flex items-center gap-2">
                            {user.hasEmployeeRecord ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] py-0 px-1.5">
                                <Link2 className="h-2.5 w-2.5 mr-1" />
                                {user.employeeCode}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 px-1.5">
                                Luar Karyawan
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm text-gray-600">
                          <span className="font-medium">{user.email || '-'}</span>
                          <span className="text-xs text-gray-400">{user.phone || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Belum ada role</span>
                          ) : (
                            user.roles.map((r) => (
                              <div key={r.id} className="group relative">
                                <Badge
                                  className={`${ROLE_COLORS[r.role]} border px-2 py-0.5 flex items-center gap-1`}
                                >
                                  {ROLE_LABELS[r.role]}
                                  {r.branch_name && (
                                    <span className="text-[10px] opacity-70 border-l border-current pl-1 ml-1">
                                      {r.branch_name}
                                    </span>
                                  )}
                                  {isSuperAdmin && (
                                    <div className="flex items-center ml-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setEditingRole({ id: r.id, role: r.role, branch_id: r.branch_id });
                                          setNewRole(r.role);
                                          setSelectedBranchId(r.branch_id || "all");
                                          setShowRoleDialog(true);
                                        }}
                                        className="hover:text-blue-600"
                                      >
                                        <Edit2 className="h-2.5 w-2.5" />
                                      </button>
                                      <button
                                        onClick={() => setRoleToDelete({ userId: user.user_id, roleId: r.id, role: r.role })}
                                        className="hover:text-red-600"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(user.created_at), 'd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditingRole(null);
                              setNewRole("");
                              setSelectedBranchId("all");
                              setShowRoleDialog(true);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Role
                          </Button>
                          
                          {isSuperAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowPermissionsDialog(true);
                                }}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Izin
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-blue-600 border-blue-100 hover:bg-blue-50"
                                onClick={() => {
                                  setUserToResetPassword(user);
                                  setResetPasswordMethod("email");
                                }}
                              >
                                <Key className="h-3.5 w-3.5 mr-1" />
                                Password
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-red-600 border-red-100 hover:bg-red-50"
                                onClick={() => setUserToDelete(user)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Hapus
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

      {/* Add/Edit Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={(open) => {
        setShowRoleDialog(open);
        if (!open) {
          setEditingRole(null);
          setSelectedUser(null);
          setNewRole("");
          setSelectedBranchId("all");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-600" />
              {editingRole ? "Perbarui Role" : "Tambah Role Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan hak akses untuk <strong>{selectedUser?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Jenis Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedUser && getAvailableRoles(selectedUser, editingRole?.id).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Selection (Only for relevant roles) */}
            {newRole && !['super_admin', 'owner', 'customer'].includes(newRole) && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  Kantor Cabang
                </label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Pilih cabang..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cabang (Pusat)</SelectItem>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">
                  * Tentukan di cabang mana user ini bertugas dengan role tersebut.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="bg-gray-50 -mx-6 px-6 py-4 rounded-b-lg border-t mt-2">
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} className="bg-white">
              Batal
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={!newRole || upsertRoleMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
            >
              {upsertRoleMutation.isPending ? "Menyimpan..." : (editingRole ? "Update" : "Simpan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Hapus Akses Role?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Anda akan menghapus role <strong>{roleToDelete ? ROLE_LABELS[roleToDelete.role] : ''}</strong> dari pengguna ini. Pengguna mungkin kehilangan akses ke fitur tertentu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel className="mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && deleteRoleMutation.mutate(roleToDelete.roleId)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteRoleMutation.isPending ? "Menghapus..." : "Ya, Hapus Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-red-600">Hapus Akun Permanen?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Apakah Anda yakin ingin menghapus user <strong>{userToDelete?.full_name}</strong> secara permanen?
              Semua data profil dan akses akan dihapus. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel className="mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.user_id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? "Menghapus..." : "Hapus Akun Sekarang"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Kelola Izin Akses
            </DialogTitle>
            <DialogDescription>
              Atur izin akses per fitur untuk <strong>{selectedUser?.full_name}</strong>
              {selectedUser?.roles?.length ? (
                <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                  {selectedUser.roles.map(r => (
                    <Badge key={r.id} variant="outline" className="text-[10px] h-4 px-1.5">
                      {ROLE_LABELS[r.role]}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserPermissionsManager
              userId={selectedUser.user_id}
              userName={selectedUser.full_name || ""}
              isSuperAdminTarget={selectedUser.roles.some(r => r.role === 'super_admin' || r.role === 'owner')}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!userToResetPassword} onOpenChange={() => {
        setUserToResetPassword(null);
        setNewPassword('');
        setResetPasswordMethod('email');
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              Reset Keamanan Akun
            </DialogTitle>
            <DialogDescription>
              Atur ulang kata sandi untuk <strong>{userToResetPassword?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Metode Reset</label>
              <div className="grid grid-cols-1 gap-2">
                <div 
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${resetPasswordMethod === 'email' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setResetPasswordMethod('email')}
                >
                  <input
                    type="radio"
                    checked={resetPasswordMethod === 'email'}
                    readOnly
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Kirim Email Instruksi</span>
                    <span className="text-xs text-gray-500">User akan menerima link reset di emailnya</span>
                  </div>
                </div>
                <div 
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${resetPasswordMethod === 'direct' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setResetPasswordMethod('direct')}
                >
                  <input
                    type="radio"
                    checked={resetPasswordMethod === 'direct'}
                    readOnly
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Tetapkan Password Baru</span>
                    <span className="text-xs text-gray-500">Anda menentukan password secara langsung</span>
                  </div>
                </div>
              </div>
            </div>

            {resetPasswordMethod === 'direct' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label htmlFor="new-password" className="text-sm font-semibold text-gray-700">Password Baru</label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white"
                />
                {newPassword && newPassword.length < 8 && (
                  <p className="text-[10px] text-red-500 font-medium">Password terlalu pendek (min. 8 karakter)</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="bg-gray-50 -mx-6 px-6 py-4 rounded-b-lg border-t mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setUserToResetPassword(null);
                setNewPassword('');
                setResetPasswordMethod('email');
              }}
              className="bg-white"
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
              disabled={(resetPasswordMethod === 'direct' && newPassword.length < 8) || resetPasswordEmailMutation.isPending || setPasswordDirectMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
            >
              {resetPasswordEmailMutation.isPending || setPasswordDirectMutation.isPending
                ? 'Memproses...'
                : resetPasswordMethod === 'email'
                ? 'Kirim Email'
                : 'Simpan Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dashboard Settings Dialog */}
      <Dialog open={showDashboardSettings} onOpenChange={setShowDashboardSettings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Pengaturan Dashboard Per Role
            </DialogTitle>
            <DialogDescription>
              Atur dashboard mana saja yang dapat diakses oleh setiap role dan tentukan dashboard default untuk setiap role.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <DashboardAccessManagerPanel mode="embedded" onClose={() => setShowDashboardSettings(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
