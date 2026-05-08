/**
 * AdminRoleManagementEnhanced
 * Halaman manajemen role yang diperluas dengan tab untuk:
 * 1. Permission Management (existing)
 * 2. Menu Mapping (baru)
 * 3. Access Summary (baru)
 */

import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Menu, BarChart3, AlertCircle, KeyRound, RefreshCw, Grid3X3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { RoleMenuMapper } from '@/components/admin/RoleMenuMapper';
import { RolePermissionMatrix } from '@/components/admin/RolePermissionMatrix';

// Lazy-load the heavy role permission editor + menu sync manager so the
// consolidated RBAC page stays snappy on first paint.
const RolePermissionEditor = lazy(() => import('@/pages/admin/AdminRoleManagement'));
const MenuSyncManager = lazy(() =>
  import('@/components/admin/MenuSyncManager').then(m => ({ default: m.MenuSyncManager }))
);

interface AccessSummaryRow {
  role: string;
  total_menus: number;
  accessible_menus: number;
  access_percentage: number;
}

export default function AdminRoleManagementEnhanced() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  // Fetch menu access summary
  const { data: accessSummary = [], isLoading: summaryLoading } = useQuery({
    queryKey: ['menu-access-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_menu_access_summary');
      if (error) throw error;
      return (data || []) as AccessSummaryRow[];
    },
    enabled: isSuperAdmin && !authLoading,
  });

  if (authLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (!isSuperAdmin) return <Navigate to="/access-denied" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Manajemen Role & Akses
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola permission dan menu access untuk setiap role tanpa perlu SQL.
        </p>
      </div>

      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Matriks Visual</span>
            <span className="sm:hidden">Matriks</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Izin per Role</span>
            <span className="sm:hidden">Izin</span>
          </TabsTrigger>
          <TabsTrigger value="menu-mapping" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">Pemetaan Menu</span>
            <span className="sm:hidden">Menu</span>
          </TabsTrigger>
          <TabsTrigger value="menu-sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sinkron Menu</span>
            <span className="sm:hidden">Sync</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Ringkasan Akses</span>
            <span className="sm:hidden">Ringkasan</span>
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Informasi</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 0: Visual Permission Matrix */}
        <TabsContent value="matrix" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-primary" />
                Matriks Permission vs Role
              </CardTitle>
              <CardDescription>
                Tampilan visual seluruh permission dan role dalam satu tabel. Klik sel untuk assign atau revoke permission secara langsung.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolePermissionMatrix />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Role Permission Editor (default per role) */}
        <TabsContent value="permissions" className="mt-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <RolePermissionEditor />
          </Suspense>
          <Card className="mt-4 border-dashed bg-muted/30">
            <CardContent className="py-3 text-xs text-muted-foreground">
              Izin di sini menjadi <strong>default</strong> untuk semua user dengan role tersebut.
              Override per individu dapat diatur di <strong>Manajemen User → Kelola Izin Akses</strong>.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Menu Mapping */}
        <TabsContent value="menu-mapping" className="mt-6">
          <RoleMenuMapper />
        </TabsContent>

        {/* Tab 3: Menu Sync */}
        <TabsContent value="menu-sync" className="mt-6">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <MenuSyncManager />
          </Suspense>
        </TabsContent>

        {/* Tab 2: Access Summary */}
        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Akses Menu per Role</CardTitle>
              <CardDescription>
                Persentase menu yang dapat diakses oleh setiap role
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : accessSummary.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Belum ada data akses menu.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Menu Aktif</TableHead>
                      <TableHead className="text-right">Total Menu</TableHead>
                      <TableHead className="text-right">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessSummary.map(row => (
                      <TableRow key={row.role}>
                        <TableCell>
                          <Badge variant="outline">{row.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {row.accessible_menus}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.total_menus}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${row.access_percentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {row.access_percentage.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Information */}
        <TabsContent value="info" className="mt-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tentang Manajemen Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Apa itu Pemetaan Menu?</h4>
                  <p className="text-sm text-muted-foreground">
                    Pemetaan menu adalah proses menentukan menu mana saja yang dapat diakses oleh setiap role.
                    Ketika user login dengan role tertentu, hanya menu yang sudah dipetakan untuk role tersebut
                    yang akan muncul di sidebar.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Bagaimana cara kerjanya?</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Pilih role di tab "Pemetaan Menu"</li>
                    <li>Lihat semua menu yang tersedia</li>
                    <li>Toggle switch untuk mengaktifkan/menonaktifkan menu</li>
                    <li>Perubahan langsung berlaku untuk semua user dengan role tersebut</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Fitur Bulk Actions</h4>
                  <p className="text-sm text-muted-foreground">
                    Gunakan tombol "Aktifkan Semua", "Matikan Semua", atau "Aktifkan Grup" untuk melakukan
                    perubahan massal. Ini sangat berguna ketika setup role baru.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Super Admin</h4>
                  <p className="text-sm text-muted-foreground">
                    Super Admin selalu melihat semua menu, terlepas dari pemetaan. Pemetaan menu hanya berlaku
                    untuk role lain (owner, branch_manager, finance, dll).
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Audit Trail</h4>
                  <p className="text-sm text-muted-foreground">
                    Semua perubahan pemetaan menu dicatat di audit log untuk keperluan compliance dan troubleshooting.
                    Lihat tab "RBAC Tools" untuk melihat history lengkap.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips & Best Practices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">✓ Mulai dari role yang paling terbatas</p>
                  <p className="text-muted-foreground">
                    Setup agent atau staff terlebih dahulu, baru owner. Ini memudahkan untuk memahami struktur menu.
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">✓ Gunakan "Reset" dengan hati-hati</p>
                  <p className="text-muted-foreground">
                    Reset akan menghapus semua pemetaan menu untuk role tersebut. Gunakan hanya jika ingin setup ulang.
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">✓ Kombinasikan dengan Permission Management</p>
                  <p className="text-muted-foreground">
                    Pemetaan menu hanya mengatur visibility. Permission Management mengatur akses data. Gunakan keduanya
                    untuk kontrol akses yang komprehensif.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
