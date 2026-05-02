/**
 * AdminRBACStatus — super admin only
 * Halaman untuk verifikasi & resync isi tabel role_permissions.
 * Menampilkan jumlah permission per role + total permission yang tersedia,
 * progress coverage, dan tombol resync (per role / semua sekaligus).
 */
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, RefreshCw, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, Database,
} from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  'owner', 'branch_manager', 'finance', 'sales', 'marketing',
  'operational', 'equipment', 'agent', 'customer',
] as const;

type RoleKey = typeof ROLES[number];

export default function AdminRBACStatus() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  const qc = useQueryClient();

  // Total permission keys yang terdaftar di permissions_list
  const { data: totalPermissions = 0, isLoading: loadingTotal } = useQuery({
    queryKey: ['rbac-status-total-permissions'],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('permissions_list')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: isSuperAdmin,
  });

  // Hitung permission aktif per role di role_permissions
  const { data: roleCounts = [], isLoading: loadingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['rbac-status-role-counts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('role_permissions')
        .select('role,is_enabled');
      if (error) throw error;
      const map = new Map<string, { enabled: number; total: number }>();
      (data || []).forEach((r: any) => {
        const cur = map.get(r.role) || { enabled: 0, total: 0 };
        cur.total += 1;
        if (r.is_enabled) cur.enabled += 1;
        map.set(r.role, cur);
      });
      return Array.from(map.entries()).map(([role, v]) => ({ role, ...v }));
    },
    enabled: isSuperAdmin,
  });

  // Hitung user per role
  const { data: userCounts = [] } = useQuery({
    queryKey: ['rbac-status-user-counts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('role');
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((r: any) => map.set(r.role, (map.get(r.role) || 0) + 1));
      return Array.from(map.entries()).map(([role, user_count]) => ({ role, user_count }));
    },
    enabled: isSuperAdmin,
  });

  const rows = useMemo(() => {
    const enabledMap = new Map(roleCounts.map(r => [r.role, r.enabled]));
    const totalMap = new Map(roleCounts.map(r => [r.role, r.total]));
    const userMap = new Map(userCounts.map(r => [r.role, r.user_count]));
    return ROLES.map(role => {
      const enabled = enabledMap.get(role) || 0;
      const total = totalMap.get(role) || 0;
      const users = userMap.get(role) || 0;
      const coverage = totalPermissions > 0 ? Math.round((enabled / totalPermissions) * 100) : 0;
      let status: 'empty' | 'partial' | 'ok' = 'ok';
      if (enabled === 0) status = 'empty';
      else if (role !== 'customer' && enabled < 3) status = 'partial';
      return { role, enabled, total, users, coverage, status };
    });
  }, [roleCounts, userCounts, totalPermissions]);

  const summary = useMemo(() => {
    const empty = rows.filter(r => r.status === 'empty' && r.role !== 'customer').length;
    const partial = rows.filter(r => r.status === 'partial').length;
    const totalEnabled = rows.reduce((s, r) => s + r.enabled, 0);
    return { empty, partial, totalEnabled };
  }, [rows]);

  const resetOne = useMutation({
    mutationFn: async (role: string) => {
      const { data, error } = await (supabase.rpc as any)('reset_role_permissions', { _role: role });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count, role) => {
      toast.success(`Role "${role}" diisi ulang (${count} permission)`);
      qc.invalidateQueries({ queryKey: ['rbac-status-role-counts'] });
      qc.invalidateQueries({ queryKey: ['rbac-audit-log'] });
    },
    onError: (e: any) => toast.error(e.message || 'Gagal reset role'),
  });

  const resyncAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)('resync_all_role_permissions');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Resync semua role selesai');
      console.info('[RBAC] resync result', data);
      qc.invalidateQueries({ queryKey: ['rbac-status-role-counts'] });
      qc.invalidateQueries({ queryKey: ['rbac-audit-log'] });
    },
    onError: (e: any) => toast.error(e.message || 'Gagal resync semua role'),
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Akses Ditolak
            </CardTitle>
            <CardDescription>Halaman ini hanya untuk Super Admin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isLoading = loadingTotal || loadingCounts;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Status RBAC
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau pengisian tabel <code className="text-xs">role_permissions</code> dan jalankan resync saat coverage tidak sesuai harapan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchCounts()} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button
            onClick={() => {
              if (confirm('Resync SEMUA role ke template default?\nUser overrides tetap dipertahankan.')) resyncAll.mutate();
            }}
            disabled={resyncAll.isPending}
          >
            {resyncAll.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
            Resync semua role
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Database className="h-4 w-4" />}
          label="Total permission"
          value={isLoading ? '…' : String(totalPermissions)}
          tone="default"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Permission aktif (semua role)"
          value={isLoading ? '…' : String(summary.totalEnabled)}
          tone="success"
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Role kosong"
          value={String(summary.empty)}
          tone={summary.empty > 0 ? 'warning' : 'success'}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Role minim permission"
          value={String(summary.partial)}
          tone={summary.partial > 0 ? 'warning' : 'success'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission per role</CardTitle>
          <CardDescription>
            Jumlah baris aktif di <code className="text-xs">role_permissions</code> dibandingkan total permission yang terdaftar.
            Klik <strong>Resync</strong> jika role memiliki 0 permission atau sangat sedikit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">User</TableHead>
                  <TableHead className="text-right">Permission aktif</TableHead>
                  <TableHead className="w-[220px]">Coverage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin inline" /> Memuat…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && rows.map(r => (
                  <TableRow key={r.role}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{r.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.users}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.enabled} <span className="text-muted-foreground">/ {totalPermissions}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.coverage} className="h-2" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{r.coverage}%</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} role={r.role} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={r.status === 'empty' ? 'default' : 'outline'}
                        disabled={resetOne.isPending && resetOne.variables === r.role}
                        onClick={() => {
                          if (confirm(`Resync role "${r.role}" ke template default?`)) resetOne.mutate(r.role);
                        }}
                      >
                        {resetOne.isPending && resetOne.variables === r.role
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                        Resync
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Catatan: role <code>customer</code> sengaja tidak mendapat permission admin —
            status "kosong" untuk role ini bersifat normal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- helpers ---------- */
function SummaryCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: 'default' | 'success' | 'warning' }) {
  const toneCls = tone === 'success'
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : tone === 'warning'
    ? 'border-amber-500/40 bg-amber-500/5'
    : '';
  return (
    <Card className={toneCls}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon} {label}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, role }: { status: 'empty' | 'partial' | 'ok'; role: RoleKey }) {
  if (role === 'customer') {
    return <Badge variant="outline" className="text-muted-foreground">N/A</Badge>;
  }
  if (status === 'empty') {
    return <Badge className="bg-rose-600 text-white">Kosong — perlu resync</Badge>;
  }
  if (status === 'partial') {
    return <Badge className="bg-amber-500 text-white">Minim</Badge>;
  }
  return <Badge className="bg-emerald-600 text-white">OK</Badge>;
}
