import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search, ShieldCheck, CheckCircle2, XCircle, Info, RefreshCw, Copy, Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ROLE_DEFAULT_PERMISSIONS, RECOMMENDED_MENUS } from "@/lib/admin-menu-registry";

type AppRole = 'owner' | 'branch_manager' | 'finance' | 'operational' | 'sales' | 'marketing' | 'equipment' | 'agent';

const MANAGEABLE_ROLES: { key: AppRole; label: string; description: string; color: string }[] = [
  { key: 'owner',          label: 'Owner',         description: 'Pemilik / direksi — akses sangat luas',       color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'branch_manager', label: 'Branch Manager', description: 'Manajer cabang',                              color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'finance',        label: 'Finance',        description: 'Bagian keuangan',                             color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'operational',    label: 'Operational',    description: 'Tim operasional keberangkatan',                color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'equipment',      label: 'Equipment',      description: 'Tim perlengkapan',                            color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { key: 'sales',          label: 'Sales',          description: 'Tim penjualan & CRM',                         color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { key: 'marketing',      label: 'Marketing',      description: 'Tim pemasaran',                               color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { key: 'agent',          label: 'Agent',          description: 'Mitra agen',                                  color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
];

interface PermissionRow {
  key: string;
  label: string;
  group_name: string;
  description: string | null;
  is_enabled: boolean;
}

export default function AdminRoleManagement() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<AppRole>('operational');
  const [search, setSearch] = useState('');
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceRole, setCopySourceRole] = useState<AppRole | ''>('');
  const [bulkConfirm, setBulkConfirm] = useState<{ action: 'enable-all' | 'disable-all' } | null>(null);

  const isSuperAdmin = hasRole('super_admin');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['role-permissions', activeRole],
    queryFn: async () => {
      const [{ data: list, error: listErr }, { data: rolePerms, error: rpErr }] = await Promise.all([
        supabase.from('permissions_list').select('*').order('group_name').order('label'),
        (supabase.from('role_permissions' as any) as any)
          .select('permission_key,is_enabled').eq('role', activeRole),
      ]);
      if (listErr) throw listErr;
      if (rpErr) throw rpErr;
      const map = new Map<string, boolean>((rolePerms || []).map((r: any) => [r.permission_key, r.is_enabled]));
      return (list || []).map((p: any): PermissionRow => ({
        key: p.key, label: p.label,
        group_name: p.group_name || 'Lainnya',
        description: p.description,
        is_enabled: map.get(p.key) ?? false,
      }));
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const { data: userCounts = {} } = useQuery({
    queryKey: ['role-user-counts'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('profiles' as any) as any)
        .select('role').not('role', 'is', null);
      if (error) return {};
      const counts: Record<string, number> = {};
      for (const { role } of (data || [])) {
        counts[role] = (counts[role] || 0) + 1;
      }
      return counts;
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enable }: { key: string; enable: boolean }) => {
      if (enable) {
        const { error } = await (supabase.from('role_permissions' as any) as any).upsert(
          { role: activeRole, permission_key: key, is_enabled: true }, { onConflict: 'role,permission_key' }
        );
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete().eq('role', activeRole).eq('permission_key', key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  const seedDefaultMutation = useMutation({
    mutationFn: async () => {
      const defaultKeys = ROLE_DEFAULT_PERMISSIONS[activeRole] || [];
      const allKeys = RECOMMENDED_MENUS.map(m => m.required_permission);
      const payload = [
        ...defaultKeys.map(k => ({ role: activeRole, permission_key: k, is_enabled: true })),
        ...allKeys.filter(k => !defaultKeys.includes(k)).map(k => ({ role: activeRole, permission_key: k, is_enabled: false })),
      ];
      const { error } = await (supabase.from('role_permissions' as any) as any)
        .upsert(payload, { onConflict: 'role,permission_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success(`Izin default untuk "${activeRole}" diterapkan`);
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ keys, enable }: { keys: string[]; enable: boolean }) => {
      if (enable) {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .upsert(keys.map(k => ({ role: activeRole, permission_key: k, is_enabled: true })), { onConflict: 'role,permission_key' });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete().eq('role', activeRole).in('permission_key', keys);
        if (error) throw error;
      }
    },
    onSuccess: (_d: any, { enable }: any) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success(enable ? 'Semua izin diaktifkan' : 'Semua izin dinonaktifkan');
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  const copyFromRoleMutation = useMutation({
    mutationFn: async (sourceRole: AppRole) => {
      const { data: sourcePerms, error } = await (supabase.from('role_permissions' as any) as any)
        .select('permission_key,is_enabled').eq('role', sourceRole);
      if (error) throw error;
      const payload = (sourcePerms || []).map((p: any) => ({
        role: activeRole, permission_key: p.permission_key, is_enabled: p.is_enabled,
      }));
      if (payload.length > 0) {
        const { error: upsertError } = await (supabase.from('role_permissions' as any) as any)
          .upsert(payload, { onConflict: 'role,permission_key' });
        if (upsertError) throw upsertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      const srcLabel = MANAGEABLE_ROLES.find(r => r.key === copySourceRole)?.label;
      toast.success(`Permission disalin dari ${srcLabel}`);
      setCopyDialogOpen(false);
      setCopySourceRole('');
    },
    onError: (e: any) => toast.error('Gagal menyalin: ' + (e?.message || '')),
  });

  const grouped = useMemo(() => {
    const filtered = search
      ? rows.filter(r => r.label.toLowerCase().includes(search.toLowerCase()) || r.group_name.toLowerCase().includes(search.toLowerCase()) || r.key.toLowerCase().includes(search.toLowerCase()))
      : rows;
    return filtered.reduce<Record<string, PermissionRow[]>>((acc, r) => {
      if (!acc[r.group_name]) acc[r.group_name] = [];
      acc[r.group_name].push(r);
      return acc;
    }, {});
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    enabled: rows.filter(r => r.is_enabled).length,
  }), [rows]);

  if (authLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (!isSuperAdmin) return <Navigate to="/access-denied" replace />;

  const activeRoleMeta = MANAGEABLE_ROLES.find(r => r.key === activeRole)!;

  return (
    <div className="space-y-5">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>Cara kerja:</strong> Izin di sini menjadi <em>default</em> untuk semua user dengan role tersebut.
              Override per individu dapat diatur di <strong>Manajemen User → Izin Akses</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeRole} onValueChange={(v) => { setActiveRole(v as AppRole); setSearch(''); }}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max gap-0.5 h-auto p-1 flex-wrap">
            {MANAGEABLE_ROLES.map(r => (
              <TabsTrigger key={r.key} value={r.key} className="h-8 text-xs flex items-center gap-1.5 px-3">
                <span>{r.label}</span>
                {userCounts[r.key] !== undefined && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">
                    <Users className="h-2.5 w-2.5 mr-0.5" />{userCounts[r.key]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {MANAGEABLE_ROLES.map(r => (
          <TabsContent key={r.key} value={r.key} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Badge className={cn('text-sm font-semibold border px-3 py-1', activeRoleMeta.color)}>
                      {activeRoleMeta.label}
                    </Badge>
                    <div>
                      <p className="text-sm text-muted-foreground">{activeRoleMeta.description}</p>
                      {userCounts[activeRole] !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {userCounts[activeRole]} user aktif dengan role ini
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">
                      {stats.enabled}/{stats.total} aktif
                    </Badge>
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: stats.total ? `${(stats.enabled / stats.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari permission..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => setBulkConfirm({ action: 'enable-all' })}
                    disabled={bulkMutation.isPending}
                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-9">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aktifkan Semua
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setBulkConfirm({ action: 'disable-all' })}
                    disabled={bulkMutation.isPending}
                    className="text-red-700 border-red-200 hover:bg-red-50 h-9">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Matikan Semua
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => seedDefaultMutation.mutate()}
                    disabled={seedDefaultMutation.isPending}
                    className="text-blue-700 border-blue-200 hover:bg-blue-50 h-9">
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1", seedDefaultMutation.isPending && "animate-spin")} />
                    Terapkan Default
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setCopyDialogOpen(true)}
                    className="text-violet-700 border-violet-200 hover:bg-violet-50 h-9">
                    <Copy className="h-3.5 w-3.5 mr-1" /> Salin dari Role Lain
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: stats.total ? `${(stats.enabled / stats.total) * 100}%` : '0%' }}
                  />
                </div>

                {/* Permission list */}
                {isLoading ? (
                  <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(grouped).length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-12">Tidak ada permission yang cocok.</p>
                    )}
                    {Object.entries(grouped).map(([group, items]) => {
                      const groupAllOn = items.every(i => i.is_enabled);
                      const enabledCount = items.filter(i => i.is_enabled).length;
                      return (
                        <div key={group} className="rounded-xl border bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{group}</span>
                              <Badge variant="outline" className={cn('text-[10px]', enabledCount === items.length ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : enabledCount > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : '')}>
                                {enabledCount}/{items.length}
                              </Badge>
                            </div>
                            <Button size="sm" variant="ghost"
                              onClick={() => bulkMutation.mutate({ keys: items.map(i => i.key), enable: !groupAllOn })}
                              className="h-7 text-xs">
                              {groupAllOn ? 'Matikan grup' : 'Aktifkan grup'}
                            </Button>
                          </div>
                          <div className="divide-y">
                            {items.map(item => (
                              <div key={item.key} className={cn(
                                "flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/10",
                                !item.is_enabled && "opacity-55"
                              )}>
                                <div className="flex-1 min-w-0 mr-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{item.key}</code>
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                                  )}
                                </div>
                                <Switch
                                  checked={item.is_enabled}
                                  disabled={toggleMutation.isPending}
                                  onCheckedChange={(v) => toggleMutation.mutate({ key: item.key, enable: v })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Copy from role dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={open => { setCopyDialogOpen(open); if (!open) setCopySourceRole(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-violet-600" />
              Salin Permission dari Role Lain
            </DialogTitle>
            <DialogDescription>
              Permission dari role yang dipilih akan disalin ke role <strong>{activeRoleMeta.label}</strong>.
              Permission yang sudah ada akan di-overwrite sesuai sumber.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Pilih role sumber:</label>
              <Select value={copySourceRole} onValueChange={v => setCopySourceRole(v as AppRole)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  {MANAGEABLE_ROLES.filter(r => r.key !== activeRole).map(r => (
                    <SelectItem key={r.key} value={r.key}>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[10px] border', r.color)}>{r.label}</Badge>
                        <span className="text-xs text-muted-foreground">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {copySourceRole && (
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-800">
                <p>Permission dari <strong>{MANAGEABLE_ROLES.find(r => r.key === copySourceRole)?.label}</strong> akan disalin ke <strong>{activeRoleMeta.label}</strong>.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Batal</Button>
            <Button
              onClick={() => copySourceRole && copyFromRoleMutation.mutate(copySourceRole as AppRole)}
              disabled={!copySourceRole || copyFromRoleMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {copyFromRoleMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Salin Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk confirmation dialog */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={open => !open && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm?.action === 'enable-all' ? 'Aktifkan Semua Permission?' : 'Nonaktifkan Semua Permission?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm?.action === 'enable-all'
                ? `Semua ${rows.length} permission akan diaktifkan untuk role ${activeRoleMeta.label}.`
                : `Semua permission akan dinonaktifkan untuk role ${activeRoleMeta.label}. User dengan role ini tidak bisa mengakses fitur apapun.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className={bulkConfirm?.action === 'disable-all' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={() => {
                if (bulkConfirm) {
                  bulkMutation.mutate({ keys: rows.map(r => r.key), enable: bulkConfirm.action === 'enable-all' });
                  setBulkConfirm(null);
                }
              }}
            >
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
