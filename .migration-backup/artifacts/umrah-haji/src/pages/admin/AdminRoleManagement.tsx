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
import { toast } from "sonner";
import { Search, ShieldCheck, CheckCircle2, XCircle, RotateCcw, Crown, Info, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ROLE_DEFAULT_PERMISSIONS, RECOMMENDED_MENUS } from "@/lib/admin-menu-registry";

type AppRole =
  | 'owner' | 'branch_manager' | 'finance' | 'operational'
  | 'sales' | 'marketing' | 'equipment' | 'agent';

const MANAGEABLE_ROLES: { key: AppRole; label: string; description: string }[] = [
  { key: 'owner', label: 'Owner', description: 'Pemilik / direksi — akses sangat luas' },
  { key: 'branch_manager', label: 'Branch Manager', description: 'Manajer cabang' },
  { key: 'finance', label: 'Finance', description: 'Bagian keuangan' },
  { key: 'operational', label: 'Operational', description: 'Tim operasional keberangkatan' },
  { key: 'equipment', label: 'Equipment', description: 'Tim perlengkapan' },
  { key: 'sales', label: 'Sales', description: 'Tim penjualan & CRM' },
  { key: 'marketing', label: 'Marketing', description: 'Tim pemasaran' },
  { key: 'agent', label: 'Agent', description: 'Mitra agen' },
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

  const isSuperAdmin = hasRole('super_admin');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['role-permissions', activeRole],
    queryFn: async () => {
      const [{ data: list, error: listErr }, { data: rolePerms, error: rpErr }] = await Promise.all([
        supabase.from('permissions_list').select('*').order('group_name').order('label'),
        (supabase.from('role_permissions' as any) as any)
          .select('permission_key,is_enabled')
          .eq('role', activeRole),
      ]);
      if (listErr) throw listErr;
      if (rpErr) throw rpErr;
      const map = new Map<string, boolean>(
        (rolePerms || []).map((r: any) => [r.permission_key, r.is_enabled])
      );
      return (list || []).map((p: any): PermissionRow => ({
        key: p.key,
        label: p.label,
        group_name: p.group_name || 'Lainnya',
        description: p.description,
        is_enabled: map.get(p.key) ?? false,
      }));
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enable }: { key: string; enable: boolean }) => {
      if (enable) {
        const { error } = await (supabase.from('role_permissions' as any) as any).upsert(
          { role: activeRole, permission_key: key, is_enabled: true },
          { onConflict: 'role,permission_key' }
        );
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete()
          .eq('role', activeRole)
          .eq('permission_key', key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success('Izin role diperbarui');
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  const seedDefaultMutation = useMutation({
    mutationFn: async () => {
      const defaultKeys = ROLE_DEFAULT_PERMISSIONS[activeRole] || [];
      const allKeys = RECOMMENDED_MENUS.map(m => m.required_permission);
      const enablePayload = defaultKeys.map(k => ({ role: activeRole, permission_key: k, is_enabled: true }));
      const disablePayload = allKeys
        .filter(k => !defaultKeys.includes(k))
        .map(k => ({ role: activeRole, permission_key: k, is_enabled: false }));
      const allPayload = [...enablePayload, ...disablePayload];
      const { error } = await (supabase.from('role_permissions' as any) as any)
        .upsert(allPayload, { onConflict: 'role,permission_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success(`Izin default untuk role ${activeRole} berhasil diterapkan`);
    },
    onError: (e: any) => toast.error('Gagal menerapkan default: ' + (e?.message || '')),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ keys, enable }: { keys: string[]; enable: boolean }) => {
      if (enable) {
        const payload = keys.map(k => ({ role: activeRole, permission_key: k, is_enabled: true }));
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .upsert(payload, { onConflict: 'role,permission_key' });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete()
          .eq('role', activeRole)
          .in('permission_key', keys);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success('Izin role diperbarui');
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  const grouped = useMemo(() => {
    const filtered = search
      ? rows.filter(r =>
          r.label.toLowerCase().includes(search.toLowerCase()) ||
          r.group_name.toLowerCase().includes(search.toLowerCase()) ||
          r.key.toLowerCase().includes(search.toLowerCase())
        )
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Manajemen Role
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur izin default untuk setiap role. Izin ini berlaku untuk semua user dalam role tersebut,
          kecuali ditimpa secara khusus di Manajemen User.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>Cara kerja:</strong> Izin di sini menjadi <em>default</em> untuk semua user dengan role tersebut.
              Untuk pengecualian per individu (misal: manager operasional dapat akses tambahan), gunakan{' '}
              <strong>Manajemen User → Izin Akses</strong>. Super Admin selalu memiliki akses penuh.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as AppRole)}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            {MANAGEABLE_ROLES.map(r => (
              <TabsTrigger key={r.key} value={r.key} className="text-xs">
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {MANAGEABLE_ROLES.map(r => (
          <TabsContent key={r.key} value={r.key} className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-lg">{activeRoleMeta.label}</CardTitle>
                    <CardDescription>{activeRoleMeta.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {stats.enabled}/{stats.total} aktif
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => seedDefaultMutation.mutate()}
                      disabled={seedDefaultMutation.isPending}
                      className="text-blue-700 border-blue-200 hover:bg-blue-50"
                      title={`Terapkan izin default untuk role ${activeRole}`}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5 mr-1", seedDefaultMutation.isPending && "animate-spin")} />
                      Terapkan Default
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari permission..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => bulkMutation.mutate({ keys: rows.map(r => r.key), enable: true })}
                    disabled={bulkMutation.isPending}
                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aktifkan Semua
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => bulkMutation.mutate({ keys: rows.map(r => r.key), enable: false })}
                    disabled={bulkMutation.isPending}
                    className="text-red-700 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Matikan Semua
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(grouped).length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-12">
                        Tidak ada permission yang cocok.
                      </p>
                    )}
                    {Object.entries(grouped).map(([group, items]) => {
                      const groupAllOn = items.every(i => i.is_enabled);
                      const groupSomeOn = items.some(i => i.is_enabled);
                      return (
                        <div key={group} className="rounded-lg border bg-card">
                          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{group}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {items.filter(i => i.is_enabled).length}/{items.length}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => bulkMutation.mutate({ keys: items.map(i => i.key), enable: !groupAllOn })}
                                className="h-7 text-xs"
                              >
                                {groupAllOn ? 'Matikan grup' : 'Aktifkan grup'}
                              </Button>
                            </div>
                          </div>
                          <div className="divide-y">
                            {items.map(item => (
                              <div key={item.key} className={cn(
                                "flex items-center justify-between px-4 py-3 hover:bg-muted/20",
                                item.is_enabled ? "" : "opacity-60"
                              )}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {item.key}
                                    </code>
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
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
    </div>
  );
}