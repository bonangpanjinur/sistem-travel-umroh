/**
 * AdminRBACTools — super admin only
 * Tabs: Reset & Sync · Audit Trail · Effective Permissions
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, ShieldAlert, History, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const ROLES = ['owner','branch_manager','finance','sales','marketing','operational','equipment','agent','customer'] as const;

export default function AdminRBACTools() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Akses Ditolak</CardTitle>
            <CardDescription>Halaman ini hanya untuk Super Admin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">RBAC Tools</h1>
        <p className="text-sm text-muted-foreground">Reset/sync role permissions, audit trail, dan verifikasi effective permissions.</p>
      </div>
      <Tabs defaultValue="reset">
        <TabsList>
          <TabsTrigger value="reset"><RefreshCw className="h-4 w-4 mr-1" /> Reset & Sync</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-1" /> Audit Trail</TabsTrigger>
          <TabsTrigger value="effective"><UserCheck className="h-4 w-4 mr-1" /> Effective Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="reset"><ResetSyncPanel /></TabsContent>
        <TabsContent value="audit"><AuditTrailPanel /></TabsContent>
        <TabsContent value="effective"><EffectivePermissionsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

/* -------- Reset & Sync -------- */
function ResetSyncPanel() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('operational');

  const { data: roleCounts = [] } = useQuery({
    queryKey: ['rbac-role-user-counts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('v_role_user_counts').select('*');
      if (error) throw error;
      return data as Array<{ role: string; user_count: number }>;
    },
  });

  const resetOne = useMutation({
    mutationFn: async (role: string) => {
      const { data, error } = await (supabase.rpc as any)('reset_role_permissions', { _role: role });
      if (error) throw error;
      return data;
    },
    onSuccess: (count, role) => {
      toast.success(`Role "${role}" direset ke default (${count} permission)`);
      qc.invalidateQueries({ queryKey: ['rbac-audit-log'] });
      qc.invalidateQueries({ queryKey: ['user-effective-permissions'] });
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
      toast.success('Resync selesai');
      console.log('resync result', data);
      qc.invalidateQueries({ queryKey: ['rbac-audit-log'] });
    },
    onError: (e: any) => toast.error(e.message || 'Gagal resync'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset & Sinkronisasi</CardTitle>
        <CardDescription>Kembalikan permission role ke template default. Aman dijalankan berulang.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium">Pilih role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => resetOne.mutate(selectedRole)} disabled={resetOne.isPending}>
            {resetOne.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reset role ini ke default
          </Button>
          <Button variant="destructive" onClick={() => {
            if (confirm('Reset SEMUA role ke default? User overrides tetap aktif.')) resyncAll.mutate();
          }} disabled={resyncAll.isPending}>
            {resyncAll.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Resync semua role
          </Button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">User per role</h3>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Role</TableHead><TableHead className="text-right">Jumlah user</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {roleCounts.map(r => (
                <TableRow key={r.role}>
                  <TableCell><Badge variant="outline">{r.role}</Badge></TableCell>
                  <TableCell className="text-right">{r.user_count}</TableCell>
                </TableRow>
              ))}
              {roleCounts.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------- Audit Trail -------- */
function AuditTrailPanel() {
  const [scope, setScope] = useState<string>('all');
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['rbac-audit-log', scope],
    queryFn: async () => {
      let q: any = (supabase as any).from('rbac_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (scope !== 'all') q = q.eq('scope', scope);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <CardDescription>200 perubahan terakhir pada role / user permissions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua scope</SelectItem>
              <SelectItem value="role">Role</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aktor</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Perubahan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>}
              {data.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(row.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</TableCell>
                  <TableCell className="text-xs">{row.actor_email || row.actor_id?.slice(0,8) || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{row.scope}</Badge></TableCell>
                  <TableCell><Badge>{row.action}</Badge></TableCell>
                  <TableCell className="text-xs">{row.target_role || row.target_user_id?.slice(0,8) || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{row.permission_key || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {row.old_value ? JSON.stringify(row.old_value) : '∅'} → {row.new_value ? JSON.stringify(row.new_value) : '∅'}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada catatan</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------- Effective Permissions Viewer -------- */
function EffectivePermissionsPanel() {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: users = [] } = useQuery({
    queryKey: ['rbac-users-list'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('list_users_with_emails');
      if (error) throw error;
      return (data || []) as Array<{ id: string; email: string }>;
    },
  });

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => !q || u.email?.toLowerCase().includes(q) || u.id.includes(q)).slice(0, 50);
  }, [users, search]);

  const { data: effective = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['effective-permissions', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await (supabase.rpc as any)('get_user_effective_permissions', { _user_id: selectedUserId });
      if (error) throw error;
      return ((data || []) as Array<{ permission_key: string }>).map(r => r.permission_key);
    },
    enabled: !!selectedUserId,
  });

  const { data: roleRows = [] } = useQuery({
    queryKey: ['user-rows', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await (supabase as any).from('user_roles').select('role').eq('user_id', selectedUserId);
      if (error) throw error;
      return (data || []) as Array<{ role: string }>;
    },
    enabled: !!selectedUserId,
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['user-overrides', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await (supabase as any).from('user_permissions').select('permission_key,is_enabled').eq('user_id', selectedUserId);
      if (error) throw error;
      return (data || []) as Array<{ permission_key: string; is_enabled: boolean }>;
    },
    enabled: !!selectedUserId,
  });

  const overrideMap = useMemo(() => {
    const m = new Map<string, boolean>();
    overrides.forEach(o => m.set(o.permission_key, o.is_enabled));
    return m;
  }, [overrides]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Pilih user</CardTitle>
          <CardDescription>Cari berdasarkan email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Cari email..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="max-h-[400px] overflow-y-auto border rounded">
            {filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${selectedUserId === u.id ? 'bg-muted' : ''}`}
              >
                {u.email || u.id}
              </button>
            ))}
            {filteredUsers.length === 0 && <div className="p-3 text-sm text-muted-foreground">Tidak ada user</div>}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Effective permissions</CardTitle>
          <CardDescription>
            {selectedUserId
              ? <>Roles: {roleRows.map(r => <Badge key={r.role} variant="outline" className="mr-1">{r.role}</Badge>)} · Overrides: {overrides.length}</>
              : 'Pilih user untuk melihat hasil resolusi role + override.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPerms && <Loader2 className="h-4 w-4 animate-spin" />}
          {!loadingPerms && selectedUserId && (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {effective.length === 0 && <p className="text-sm text-muted-foreground">User ini tidak punya permission aktif.</p>}
              {effective.map(key => {
                const ov = overrideMap.get(key);
                let badge: React.ReactNode = <Badge variant="outline">role default</Badge>;
                if (ov === true) badge = <Badge className="bg-blue-500">override grant</Badge>;
                return (
                  <div key={key} className="flex justify-between items-center px-3 py-2 border rounded">
                    <code className="text-xs">{key}</code>
                    {badge}
                  </div>
                );
              })}
              {Array.from(overrideMap.entries()).filter(([, v]) => v === false).map(([key]) => (
                <div key={key} className="flex justify-between items-center px-3 py-2 border rounded bg-destructive/5">
                  <code className="text-xs line-through">{key}</code>
                  <Badge variant="destructive">override revoke</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}