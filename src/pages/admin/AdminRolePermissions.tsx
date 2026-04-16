import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Shield, Search, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { SuperAdminGuard } from "@/components/admin/SuperAdminGuard";

interface RolePermission {
  id: string;
  role: string;
  permission: string;
  description?: string;
}

export default function AdminRolePermissions() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Fetch role permissions
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true });

      if (error) throw error;
      return data as RolePermission[];
    }
  });

  const filteredPermissions = permissions?.filter(p => 
    p.role.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.permission.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SuperAdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manajemen Role & Izin</h1>
            <p className="text-muted-foreground">
              Kelola pemetaan antara role pengguna dan izin akses sistem.
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full md:w-auto">
            <Shield className="mr-2 h-4 w-4" />
            Tambah Izin Baru
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Izin Role</CardTitle>
            <CardDescription>
              Semua konfigurasi izin yang terdaftar dalam sistem.
            </CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan role atau izin..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Izin (Permission Key)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissions && filteredPermissions.length > 0 ? (
                      filteredPermissions.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="capitalize">
                              {item.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                              {item.permission}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-green-600">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              <span className="text-sm">Aktif</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          Tidak ada data ditemukan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fitur Segera Hadir</DialogTitle>
              <DialogDescription>
                Modifikasi izin secara langsung melalui antarmuka ini sedang dalam pengembangan. 
                Saat ini, perubahan izin harus dilakukan melalui migrasi database atau SQL Editor di Supabase.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
              <AlertCircle className="h-5 w-5 mr-3" />
              <p className="text-sm">
                Harap hubungi tim pengembang untuk penyesuaian izin sistem yang kritis.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsAddDialogOpen(false)}>Mengerti</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminGuard>
  );
}
