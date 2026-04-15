'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { UserPermissionsManager } from '@/components/admin/UserPermissionsManager';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sortRoles } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface UserWithRole extends User {
  roles: string[];
}

export default function UserPermissionsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users from auth.users via RPC for security
      const { data: authUsers, error: authError } =
        await supabase.rpc('list_users_with_emails');

      if (authError) {
        console.error('Error fetching auth users via RPC:', authError);
        throw authError;
      }

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        throw rolesError;
      }

      // Map users with their roles
      const usersWithRoles = (authUsers || []).map((user) => ({
        ...user,
        roles: sortRoles(userRoles
          ?.filter((ur) => ur.user_id === user.id)
          .map((ur) => ur.role) || []),
      }));

      setUsers(usersWithRoles as any);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengambil daftar pengguna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.user_metadata?.full_name || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Izin Pengguna
          </h1>
          <p className="text-muted-foreground mt-2">
            Atur hak akses granular untuk setiap pengguna secara individual
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
              <CardDescription>
                Pilih pengguna untuk mengelola izinnya
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Users Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4">
                          Memuat...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4">
                          Tidak ada pengguna
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className={`cursor-pointer hover:bg-muted ${
                            selectedUser?.id === user.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell className="text-xs">
                            <div>
                              <p className="font-medium">
                                {user.user_metadata?.full_name || 'N/A'}
                              </p>
                              <p className="text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.map((role) => (
                                <Badge key={role} variant="secondary">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Button
                onClick={fetchUsers}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Refresh
              </Button>
            </CardContent>
          </Card>

          {/* Permissions Manager */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <UserPermissionsManager
                userId={selectedUser.id}
                userName={
                  selectedUser.user_metadata?.full_name || selectedUser.email
                }
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center space-y-3">
                    <Settings className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">
                      Pilih pengguna dari daftar untuk mengelola izinnya
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Panduan Penggunaan</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Izin Berbasis Peran (Role)</h4>
              <p className="text-muted-foreground">
                Izin yang diberikan melalui peran pengguna. Semua pengguna dengan
                peran yang sama akan memiliki izin yang sama.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Izin Tingkat Pengguna (User)</h4>
              <p className="text-muted-foreground">
                Izin yang diberikan secara langsung kepada pengguna individu.
                Ini akan menimpa izin berbasis peran untuk pengguna tersebut.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Contoh Kasus Penggunaan</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>
                  Nida (Manager Operasional): Berikan izin packages.create,
                  packages.edit, packages.delete
                </li>
                <li>
                  Sandi (Staff Operasional): Berikan hanya izin packages.create
                </li>
                <li>
                  Revoke izin tertentu dari pengguna dengan peran tertentu
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
