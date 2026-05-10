/**
 * AdminRoleManagementEnhanced — v2
 * Halaman Manajemen Role & Akses dengan:
 * - Breadcrumb navigasi
 * - Matriks Visual (tab default) dengan filter/compare/export/inherited
 * - Izin per Role dengan copy-from-role, jumlah user, confirmation dialog
 * - Ringkasan dengan bar chart & user count
 * - Tabs yang compact dan responsif
 */

import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  ShieldCheck, Menu, BarChart3, AlertCircle, KeyRound,
  RefreshCw, Grid3X3, Users, Home, Settings, History, UserCog,
} from 'lucide-react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RoleMenuMapper } from '@/components/admin/RoleMenuMapper';
import { RolePermissionMatrix, MATRIX_ROLES } from '@/components/admin/RolePermissionMatrix';
import { PermissionAuditLog } from '@/components/admin/PermissionAuditLog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

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

const ROLE_COLORS_MAP: Record<string, string> = {
  owner:          '#a855f7',
  branch_manager: '#3b82f6',
  finance:        '#22c55e',
  operational:    '#f97316',
  equipment:      '#f59e0b',
  sales:          '#06b6d4',
  marketing:      '#ec4899',
  agent:          '#6366f1',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', branch_manager: 'Branch Manager', finance: 'Finance',
  operational: 'Operational', equipment: 'Equipment', sales: 'Sales',
  marketing: 'Marketing', agent: 'Agent',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  owner:          'bg-purple-100 text-purple-800 border-purple-200',
  branch_manager: 'bg-blue-100 text-blue-800 border-blue-200',
  finance:        'bg-green-100 text-green-800 border-green-200',
  operational:    'bg-orange-100 text-orange-800 border-orange-200',
  equipment:      'bg-amber-100 text-amber-800 border-amber-200',
  sales:          'bg-cyan-100 text-cyan-800 border-cyan-200',
  marketing:      'bg-pink-100 text-pink-800 border-pink-200',
  agent:          'bg-indigo-100 text-indigo-800 border-indigo-200',
};

function SummaryTab() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  const { data: accessSummary = [], isLoading: summaryLoading } = useQuery({
    queryKey: ['menu-access-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_menu_access_summary');
      if (error) throw error;
      return (data || []) as AccessSummaryRow[];
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const { data: userCounts = {} } = useQuery({
    queryKey: ['role-user-counts'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('profiles' as any) as any)
        .select('role').not('role', 'is', null);
      if (error) return {} as Record<string, number>;
      const counts: Record<string, number> = {};
      for (const { role } of (data || [])) {
        if (role) counts[role] = (counts[role] || 0) + 1;
      }
      return counts;
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const { data: matrixData } = useQuery({
    queryKey: ['role-permission-matrix'],
    queryFn: async () => {
      const [{ data: perms }, { data: rolePerms }] = await Promise.all([
        supabase.from('permissions_list').select('key'),
        (supabase.from('role_permissions' as any) as any)
          .select('role,permission_key,is_enabled')
          .in('role', MATRIX_ROLES.map(r => r.key)),
      ]);
      const total = (perms || []).length;
      const counts: Record<string, number> = {};
      for (const rp of (rolePerms || [])) {
        if (rp.is_enabled) counts[rp.role] = (counts[rp.role] || 0) + 1;
      }
      return { total, counts };
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const chartData = MATRIX_ROLES.map(r => ({
    role: r.label,
    key: r.key,
    enabled: matrixData?.counts[r.key] ?? 0,
    total: matrixData?.total ?? 0,
    pct: matrixData?.total ? Math.round(((matrixData.counts[r.key] ?? 0) / matrixData.total) * 100) : 0,
    users: userCounts[r.key] ?? 0,
  }));

  const totalUsers = Object.values(userCounts).reduce((a, b) => a + b, 0);

  if (summaryLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Role</p>
            <p className="text-3xl font-bold mt-1">{MATRIX_ROLES.length}</p>
            <p className="text-xs text-muted-foreground mt-1">role yang dapat dikonfigurasi</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total User</p>
            <p className="text-3xl font-bold mt-1 text-emerald-700">{totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">user terdaftar di sistem</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Permission</p>
            <p className="text-3xl font-bold mt-1 text-blue-700">{matrixData?.total ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">permission yang tersedia</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-violet-500/10 to-violet-500/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cakupan Rata-rata</p>
            <p className="text-3xl font-bold mt-1 text-violet-700">
              {chartData.length ? Math.round(chartData.reduce((a, d) => a + d.pct, 0) / chartData.length) : '—'}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">rata-rata permission aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cakupan Permission per Role</CardTitle>
          <CardDescription>Persentase permission yang aktif dari total permission tersedia</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="role" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={38} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs">
                      <p className="font-semibold mb-1">{d.role}</p>
                      <p className="text-muted-foreground">{d.enabled}/{d.total} permission aktif</p>
                      <p className="text-muted-foreground">{d.users} user</p>
                      <p className="font-medium text-primary mt-1">{d.pct}% cakupan</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={52}>
                {chartData.map(d => (
                  <Cell key={d.key} fill={ROLE_COLORS_MAP[d.key] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {chartData.map(d => (
          <Card key={d.key} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: ROLE_COLORS_MAP[d.key] }} />
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge className={cn('text-[11px] font-semibold border', ROLE_BADGE_COLORS[d.key])}>
                  {ROLE_LABELS[d.key]}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />{d.users}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{d.enabled}/{d.total} permission</span>
                  <span className="font-semibold" style={{ color: ROLE_COLORS_MAP[d.key] }}>{d.pct}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${d.pct}%`, backgroundColor: ROLE_COLORS_MAP[d.key] }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Menu access summary table (dari RPC) */}
      {accessSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Akses Menu per Role</CardTitle>
            <CardDescription>Data dari database — menu yang tampil di sidebar setiap role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accessSummary.map(row => (
                <div key={row.role} className="flex items-center gap-3">
                  <Badge className={cn('text-[10px] border w-28 justify-center shrink-0', ROLE_BADGE_COLORS[row.role] || 'bg-slate-100 text-slate-800')}>
                    {ROLE_LABELS[row.role] || row.role}
                  </Badge>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${row.access_percentage}%`, backgroundColor: ROLE_COLORS_MAP[row.role] || '#94a3b8' }}
                    />
                  </div>
                  <span className="text-xs font-medium w-20 text-right text-muted-foreground">
                    {row.accessible_menus}/{row.total_menus} ({row.access_percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminRoleManagementEnhanced() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  if (authLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (!isSuperAdmin) return <Navigate to="/access-denied" replace />;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin" className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" /> Dashboard
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin/settings" className="flex items-center gap-1">
                <Settings className="h-3.5 w-3.5" /> Pengaturan
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Manajemen Role
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            Manajemen Role & Akses
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-12">
            Kelola permission dan akses menu untuk setiap role secara real-time, tanpa perlu SQL.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-7 px-3 text-xs font-medium">
          Super Admin Only
        </Badge>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="border-b">
          <TabsList className="h-auto bg-transparent p-0 flex flex-wrap gap-0">
            {[
              { value: 'matrix',       icon: Grid3X3,    label: 'Matriks Visual',  desc: 'Semua role × permission' },
              { value: 'permissions',  icon: KeyRound,   label: 'Izin per Role',   desc: 'Edit role individual' },
              { value: 'menu-mapping', icon: Menu,       label: 'Pemetaan Menu',   desc: 'Tampilan sidebar' },
              { value: 'menu-sync',    icon: RefreshCw,  label: 'Sinkron Menu',    desc: 'Sync ke database' },
              { value: 'user-overrides', icon: UserCog,  label: 'Override User',   desc: 'Permission per user' },
              { value: 'audit',        icon: History,    label: 'Audit Log',       desc: 'Riwayat perubahan' },
              { value: 'summary',      icon: BarChart3,  label: 'Ringkasan',       desc: 'Statistik & grafik' },
              { value: 'info',         icon: AlertCircle,label: 'Panduan',         desc: 'Cara penggunaan' },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent',
                    'text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all',
                    'data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-primary/5',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:block">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* ── Matriks Visual ──────────────────────────────────────────── */}
        <TabsContent value="matrix" className="mt-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Tampilan satu halaman untuk semua permission × role. Klik sel untuk assign/revoke secara langsung.
              Gunakan tombol <strong>Bandingkan</strong> untuk analisis diff antar 2 role.
            </p>
          </div>
          <RolePermissionMatrix />
        </TabsContent>

        {/* ── Izin per Role ────────────────────────────────────────────── */}
        <TabsContent value="permissions" className="mt-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <RolePermissionEditor />
          </Suspense>
        </TabsContent>

        {/* ── Pemetaan Menu ────────────────────────────────────────────── */}
        <TabsContent value="menu-mapping" className="mt-6">
          <RoleMenuMapper />
        </TabsContent>

        {/* ── Sinkron Menu ─────────────────────────────────────────────── */}
        <TabsContent value="menu-sync" className="mt-6">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <MenuSyncManager />
          </Suspense>
        </TabsContent>

        {/* ── Audit Log ─────────────────────────────────────────────────── */}
        <TabsContent value="audit" className="mt-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Riwayat lengkap perubahan permission & role secara real-time. Diperbarui otomatis setiap 30 detik.
              Klik baris untuk melihat detail metadata.
            </p>
          </div>
          <PermissionAuditLog />
        </TabsContent>

        {/* ── Ringkasan ─────────────────────────────────────────────────── */}
        <TabsContent value="summary" className="mt-6">
          <SummaryTab />
        </TabsContent>

        {/* ── Panduan ───────────────────────────────────────────────────── */}
        <TabsContent value="info" className="mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-primary" /> Matriks Visual
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Tampilan satu tabel berisi semua permission (baris) × semua role (kolom).</p>
                <ul className="space-y-1 list-inside list-disc">
                  <li><strong>Sel hijau</strong> = permission aktif langsung</li>
                  <li><strong>Sel teal</strong> = inherited dari role turunan dalam hierarki</li>
                  <li><strong>Filter Grup</strong> = tampilkan hanya satu kategori permission</li>
                  <li><strong>Bandingkan</strong> = pilih 2 role dan lihat perbedaannya</li>
                  <li><strong>Export Excel</strong> = unduh matriks lengkap sebagai .xlsx</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" /> Izin per Role
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Editor per role dengan kontrol yang lebih granular.</p>
                <ul className="space-y-1 list-inside list-disc">
                  <li><strong>Salin dari Role Lain</strong> = kopi seluruh konfigurasi dari role sumber</li>
                  <li><strong>Terapkan Default</strong> = kembalikan ke konfigurasi bawaan</li>
                  <li><strong>Jumlah user</strong> = badge menampilkan berapa user per role</li>
                  <li><strong>Konfirmasi bulk</strong> = dialog perlindungan sebelum reset massal</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Menu className="h-4 w-4 text-primary" /> Pemetaan Menu
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Kontrol menu mana yang muncul di sidebar untuk setiap role.</p>
                <ul className="space-y-1 list-inside list-disc">
                  <li>Permission mengatur akses data, pemetaan menu mengatur visibilitas UI</li>
                  <li>Super Admin selalu melihat semua menu</li>
                  <li>Perubahan langsung berlaku untuk semua user di role tersebut</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Hierarki Role
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Role yang lebih tinggi mewarisi permission dari role di bawahnya:</p>
                <div className="font-mono text-xs bg-muted/60 rounded-lg p-3 space-y-0.5">
                  <p>super_admin → owner</p>
                  <p className="ml-4">owner → branch_manager, finance</p>
                  <p className="ml-8">branch_manager → operational, sales, marketing</p>
                  <p className="ml-12">operational → equipment</p>
                  <p className="ml-8">sub_agent → agent</p>
                </div>
                <p className="text-xs">Permission inherited ditampilkan dengan warna <span className="text-teal-600 font-semibold">teal</span> di matriks.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
