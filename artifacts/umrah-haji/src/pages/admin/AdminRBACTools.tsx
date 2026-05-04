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
import { Loader2, RefreshCw, ShieldAlert, History, UserCheck, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const ROLES = ['owner','branch_manager','finance','sales','marketing','operational','equipment','agent','customer'] as const;

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  reset_defaults:   { label: 'Reset Default',     className: 'bg-amber-500 text-white' },
  resync_all:       { label: 'Resync Semua',      className: 'bg-purple-600 text-white' },
  grant:            { label: 'Grant',             className: 'bg-emerald-600 text-white' },
  revoke:           { label: 'Revoke',            className: 'bg-rose-600 text-white' },
  toggle:           { label: 'Toggle',            className: 'bg-sky-600 text-white' },
  override_set:     { label: 'Override Set',      className: 'bg-blue-600 text-white' },
  override_change:  { label: 'Override Ubah',     className: 'bg-indigo-600 text-white' },
  override_remove:  { label: 'Override Hapus',    className: 'bg-slate-600 text-white' },
};

function actionBadge(action: string) {
  const cfg = ACTION_LABELS[action] || { label: action, className: 'bg-muted text-foreground' };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

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
  const [action, setAction] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['rbac-audit-log', scope, action, dateFrom, dateTo],
    queryFn: async () => {
      let q: any = (supabase as any).from('rbac_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (scope !== 'all') q = q.eq('scope', scope);
      if (action !== 'all') q = q.eq('action', action);
      if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23,59,59,999);
        q = q.lte('created_at', end.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return (data as any[]).filter((r: any) =>
      (r.actor_email || '').toLowerCase().includes(q) ||
      (r.target_role || '').toLowerCase().includes(q) ||
      (r.permission_key || '').toLowerCase().includes(q) ||
      (r.target_user_id || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const exportCSV = () => {
    const rows = [
      ['waktu','aktor','scope','aksi','target','permission','old','new','metadata'],
      ...filtered.map((r: any) => [
        new Date(r.created_at).toISOString(),
        r.actor_email || r.actor_id || '',
        r.scope || '',
        r.action || '',
        r.target_role || r.target_user_id || '',
        r.permission_key || '',
        r.old_value ? JSON.stringify(r.old_value) : '',
        r.new_value ? JSON.stringify(r.new_value) : '',
        r.metadata ? JSON.stringify(r.metadata) : '',
      ]),
    ];
    const csv = rows.map(r => r.map((c: unknown) => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rbac-audit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <CardDescription>
          200 event terakhir: reset role, resync semua, grant/revoke/toggle, dan perubahan override per user.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua scope</SelectItem>
              <SelectItem value="role">Role</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua aksi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua aksi</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-muted-foreground block">Dari</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block">Sampai</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
          </div>
          <Input
            placeholder="Cari aktor / role / permission..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[260px]"
          />
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} / {data.length} event
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32px]"></TableHead>
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
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>}
              {filtered.map((row: any) => {
                const isOpen = !!expanded[row.id];
                const hasMeta = !!row.metadata && Object.keys(row.metadata || {}).length > 0;
                return (
                  <>
                    <TableRow key={row.id} className={row.scope === 'system' ? 'bg-purple-500/5' : ''}>
                      <TableCell>
                        {hasMeta ? (
                          <button onClick={() => setExpanded(s => ({ ...s, [row.id]: !s[row.id] }))} className="text-muted-foreground hover:text-foreground">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(row.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</TableCell>
                      <TableCell className="text-xs">{row.actor_email || row.actor_id?.slice(0,8) || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{row.scope}</Badge></TableCell>
                      <TableCell>{actionBadge(row.action)}</TableCell>
                      <TableCell className="text-xs">{row.target_role || row.target_user_id?.slice(0,8) || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{row.permission_key || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {row.old_value ? JSON.stringify(row.old_value) : '∅'} → {row.new_value ? JSON.stringify(row.new_value) : '∅'}
                      </TableCell>
                    </TableRow>
                    {isOpen && hasMeta && (
                      <TableRow key={row.id + '-meta'}>
                        <TableCell></TableCell>
                        <TableCell colSpan={7} className="bg-muted/40">
                          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(row.metadata, null, 2)}</pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Belum ada catatan</TableCell></TableRow>
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