import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Search, ShieldCheck, UserCog } from "lucide-react";
import { UserPermissionsManager } from "@/components/admin/UserPermissionsManager";
import { Badge } from "@/components/ui/badge";

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  roles: { role: string }[];
}

export default function AdminUserPermissions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-permissions'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      const { data: authUsers } = await (supabase.rpc as any)('list_users_with_emails');
      const emailMap = new Map(((authUsers as any[]) || []).map((u: any) => [u.id, u.email]));

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      return (profiles || []).map(profile => ({
        ...profile,
        email: (emailMap.get(profile.user_id) as string) || null,
        roles: (roles || []).filter(r => r.user_id === profile.user_id).map(r => ({ role: r.role })),
      }));
    },
  });

  const filteredUsers = users?.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone?.includes(search)
    );
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Permissions</h1>
          <p className="text-muted-foreground">Kelola izin akses spesifik untuk setiap pengguna.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
          <div className="relative w-full md:w-72 mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, atau telepon..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Email / Telepon</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Tidak ada pengguna ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "Tanpa Nama"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span>{user.email}</span>
                          <span className="text-muted-foreground">{user.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] uppercase">
                              {r.role.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPermissionsDialog(true);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Kelola Izin
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Izin Akses</DialogTitle>
            <DialogDescription>
              Mengatur izin akses spesifik untuk <strong>{selectedUser?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserPermissionsManager 
              userId={selectedUser.user_id} 
              userName={selectedUser.full_name || ''} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
