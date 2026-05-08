/**
 * RoleMenuMapper Component
 * UI untuk mengelola pemetaan menu per role secara visual
 * Fitur: Pilih role, lihat semua menu, toggle akses per menu, bulk actions, reset
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, Menu, CheckCircle2, XCircle, RotateCcw, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppRole = 'owner' | 'branch_manager' | 'finance' | 'operational' | 'sales' | 'marketing' | 'equipment' | 'agent';

const MANAGEABLE_ROLES: { key: AppRole; label: string; description: string }[] = [
  { key: 'owner', label: 'Owner', description: 'Pemilik / direksi' },
  { key: 'branch_manager', label: 'Branch Manager', description: 'Manajer cabang' },
  { key: 'finance', label: 'Finance', description: 'Bagian keuangan' },
  { key: 'operational', label: 'Operational', description: 'Tim operasional' },
  { key: 'equipment', label: 'Equipment', description: 'Tim perlengkapan' },
  { key: 'sales', label: 'Sales', description: 'Tim penjualan' },
  { key: 'marketing', label: 'Marketing', description: 'Tim pemasaran' },
  { key: 'agent', label: 'Agent', description: 'Mitra agen' },
];

interface MenuItem {
  menu_id: string;
  key: string;
  label: string;
  path: string;
  icon?: string;
  group_name: string;
  sort_order: number;
  required_permission: string;
  is_mapped: boolean;
}

interface MenuGroup {
  name: string;
  items: MenuItem[];
}

export function RoleMenuMapper() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<AppRole>('operational');
  const [search, setSearch] = useState('');

  const isSuperAdmin = hasRole('super_admin');

  // Fetch menus for active role
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['role-menus', activeRole],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_role_menus', {
        _role: activeRole,
      });
      if (error) throw error;
      return (data || []) as MenuItem[];
    },
    enabled: isSuperAdmin && !authLoading,
  });

  // Toggle menu access mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ menuId, enable }: { menuId: string; enable: boolean }) => {
      const { data, error } = await (supabase.rpc as any)('toggle_role_menu_access', {
        _role: activeRole,
        _menu_item_id: menuId,
        _enable: enable,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-menus', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
      toast.success('Akses menu diperbarui');
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  // Bulk toggle mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ menuIds, enable }: { menuIds: string[]; enable: boolean }) => {
      const { data, error } = await (supabase.rpc as any)('bulk_toggle_role_menu_access', {
        _role: activeRole,
        _menu_item_ids: menuIds,
        _enable: enable,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-menus', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
      toast.success('Akses menu diperbarui');
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  // Reset menu access mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)('reset_role_menu_access', {
        _role: activeRole,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-menus', activeRole] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
      toast.success('Akses menu direset');
    },
    onError: (e: any) => toast.error('Gagal: ' + (e?.message || '')),
  });

  // Group and filter menus
  const grouped = useMemo(() => {
    const filtered = search
      ? menus.filter(m =>
          m.label.toLowerCase().includes(search.toLowerCase()) ||
          m.group_name.toLowerCase().includes(search.toLowerCase()) ||
          m.key.toLowerCase().includes(search.toLowerCase())
        )
      : menus;

    return filtered.reduce<Record<string, MenuItem[]>>((acc, m) => {
      if (!acc[m.group_name]) acc[m.group_name] = [];
      acc[m.group_name].push(m);
      return acc;
    }, {});
  }, [menus, search]);

  // Stats
  const stats = useMemo(() => ({
    total: menus.length,
    mapped: menus.filter(m => m.is_mapped).length,
  }), [menus]);

  if (authLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (!isSuperAdmin) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-900">
            <AlertCircle className="h-5 w-5" />
            <p>Hanya Super Admin yang dapat mengakses fitur ini.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeRoleMeta = MANAGEABLE_ROLES.find(r => r.key === activeRole)!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Menu className="h-6 w-6 text-primary" />
          Pemetaan Menu per Role
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Atur menu mana saja yang dapat diakses oleh setiap role. Perubahan langsung berlaku untuk semua user dengan role tersebut.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 text-sm text-blue-900">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>Cara kerja:</strong> Pilih role, lalu toggle menu yang ingin diakses. Menu yang diaktifkan akan muncul di sidebar untuk semua user dengan role tersebut. Super Admin selalu melihat semua menu.
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {stats.mapped}/{stats.total} aktif
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Search and bulk actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari menu..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkMutation.mutate({ menuIds: menus.map(m => m.menu_id), enable: true })}
                    disabled={bulkMutation.isPending}
                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aktifkan Semua
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkMutation.mutate({ menuIds: menus.map(m => m.menu_id), enable: false })}
                    disabled={bulkMutation.isPending}
                    className="text-red-700 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Matikan Semua
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Reset akses menu untuk role "${activeRoleMeta.label}"?`)) {
                        resetMutation.mutate();
                      }
                    }}
                    disabled={resetMutation.isPending}
                    className="text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                </div>

                {/* Menu list */}
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(grouped).length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-12">
                        Tidak ada menu yang cocok.
                      </p>
                    )}
                    {Object.entries(grouped).map(([group, items]) => {
                      const groupAllOn = items.every(i => i.is_mapped);
                      return (
                        <div key={group} className="rounded-lg border bg-card">
                          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{group}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {items.filter(i => i.is_mapped).length}/{items.length}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => bulkMutation.mutate({
                                menuIds: items.map(i => i.menu_id),
                                enable: !groupAllOn,
                              })}
                              className="h-7 text-xs"
                              disabled={bulkMutation.isPending}
                            >
                              {groupAllOn ? 'Matikan grup' : 'Aktifkan grup'}
                            </Button>
                          </div>
                          <div className="divide-y">
                            {items.map(item => (
                              <div
                                key={item.menu_id}
                                className={cn(
                                  'flex items-center justify-between px-4 py-3 hover:bg-muted/20',
                                  item.is_mapped ? '' : 'opacity-60'
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {item.key}
                                    </code>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.path}
                                  </p>
                                </div>
                                <Switch
                                  checked={item.is_mapped}
                                  disabled={toggleMutation.isPending}
                                  onCheckedChange={(v) =>
                                    toggleMutation.mutate({ menuId: item.menu_id, enable: v })
                                  }
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
