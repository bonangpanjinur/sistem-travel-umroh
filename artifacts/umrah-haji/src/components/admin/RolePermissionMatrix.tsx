/**
 * RolePermissionMatrix
 * Matriks visual real-time: baris = permission (dikelompokkan), kolom = role.
 * Setiap sel dapat di-klik untuk assign/revoke permission per role langsung dari UI.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Minus, Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const MATRIX_ROLES = [
  { key: 'owner',          label: 'Owner',        color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'branch_manager', label: 'Br. Manager',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'finance',        label: 'Finance',      color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'operational',    label: 'Operational',  color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'equipment',      label: 'Equipment',    color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { key: 'sales',          label: 'Sales',        color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { key: 'marketing',      label: 'Marketing',    color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { key: 'agent',          label: 'Agent',        color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
] as const;

type RoleKey = typeof MATRIX_ROLES[number]['key'];

interface PermissionRow {
  key: string;
  label: string;
  group_name: string;
  description: string | null;
}

type PermissionMatrix = Record<string, Record<string, boolean>>;

async function fetchMatrix(): Promise<{ permissions: PermissionRow[]; matrix: PermissionMatrix }> {
  const [{ data: perms, error: permsErr }, { data: rolePerms, error: rpErr }] = await Promise.all([
    supabase.from('permissions_list').select('*').order('group_name').order('label'),
    (supabase.from('role_permissions' as any) as any)
      .select('role,permission_key,is_enabled')
      .in('role', MATRIX_ROLES.map(r => r.key)),
  ]);
  if (permsErr) throw permsErr;
  if (rpErr) throw rpErr;

  const matrix: PermissionMatrix = {};
  for (const rp of (rolePerms || [])) {
    if (!matrix[rp.permission_key]) matrix[rp.permission_key] = {};
    matrix[rp.permission_key][rp.role] = rp.is_enabled;
  }

  return { permissions: (perms || []) as PermissionRow[], matrix };
}

export function RolePermissionMatrix() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['role-permission-matrix'],
    queryFn: fetchMatrix,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ permKey, role, enable }: { permKey: string; role: RoleKey; enable: boolean }) => {
      if (enable) {
        const { error } = await (supabase.from('role_permissions' as any) as any).upsert(
          { role, permission_key: permKey, is_enabled: true },
          { onConflict: 'role,permission_key' }
        );
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete()
          .eq('role', role)
          .eq('permission_key', permKey);
        if (error) throw error;
      }
    },
    onMutate: async ({ permKey, role, enable }) => {
      setPendingCell(`${permKey}|${role}`);
      await queryClient.cancelQueries({ queryKey: ['role-permission-matrix'] });
      const previous = queryClient.getQueryData(['role-permission-matrix']);
      queryClient.setQueryData(['role-permission-matrix'], (old: any) => {
        if (!old) return old;
        const newMatrix = { ...old.matrix };
        newMatrix[permKey] = { ...(newMatrix[permKey] || {}), [role]: enable };
        return { ...old, matrix: newMatrix };
      });
      return { previous };
    },
    onError: (_err: any, _vars: any, ctx: any) => {
      if (ctx?.previous) queryClient.setQueryData(['role-permission-matrix'], ctx.previous);
      toast.error('Gagal memperbarui izin');
    },
    onSuccess: (_data: any, { role }: { permKey: string; role: RoleKey; enable: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', role] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success('Izin diperbarui');
    },
    onSettled: () => setPendingCell(null),
  });

  const bulkRoleMutation = useMutation({
    mutationFn: async ({ role, enable }: { role: RoleKey; enable: boolean }) => {
      const keys = (data?.permissions || []).map(p => p.key);
      if (enable) {
        const payload = keys.map(k => ({ role, permission_key: k, is_enabled: true }));
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .upsert(payload, { onConflict: 'role,permission_key' });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete()
          .eq('role', role)
          .in('permission_key', keys);
        if (error) throw error;
      }
    },
    onSuccess: (_data: any, { role }: { role: RoleKey; enable: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions', role] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success('Semua izin role diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui izin role'),
  });

  const bulkGroupMutation = useMutation({
    mutationFn: async ({ role, permKeys, enable }: { role: RoleKey; permKeys: string[]; enable: boolean }) => {
      if (enable) {
        const payload = permKeys.map(k => ({ role, permission_key: k, is_enabled: true }));
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .upsert(payload, { onConflict: 'role,permission_key' });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete()
          .eq('role', role)
          .in('permission_key', permKeys);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success('Izin grup diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui izin grup'),
  });

  const filteredPermissions = useMemo(() => {
    if (!data?.permissions) return [];
    if (!search.trim()) return data.permissions;
    const q = search.toLowerCase();
    return data.permissions.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      p.group_name.toLowerCase().includes(q)
    );
  }, [data?.permissions, search]);

  const grouped = useMemo(() => {
    return filteredPermissions.reduce<Record<string, PermissionRow[]>>((acc, p) => {
      const g = p.group_name || 'Lainnya';
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
      return acc;
    }, {});
  }, [filteredPermissions]);

  const columnStats = useMemo(() => {
    if (!data) return {} as Record<string, { enabled: number; total: number }>;
    const total = data.permissions.length;
    return MATRIX_ROLES.reduce<Record<string, { enabled: number; total: number }>>((acc, r) => {
      const enabled = data.permissions.filter(p => data.matrix[p.key]?.[r.key] === true).length;
      acc[r.key] = { enabled, total };
      return acc;
    }, {});
  }, [data]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const expandAll = () => setCollapsedGroups(new Set());
  const collapseAll = () => setCollapsedGroups(new Set(Object.keys(grouped)));

  const getCellState = (permKey: string, roleKey: string): boolean =>
    data?.matrix[permKey]?.[roleKey] === true;

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari permission..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={expandAll} className="h-8 text-xs">
              Buka Semua
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll} className="h-8 text-xs">
              Tutup Semua
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isRefetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
              Aktif
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border-2 border-slate-200 flex items-center justify-center">
                <Minus className="h-3 w-3 text-slate-300" />
              </span>
              Tidak aktif
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="rounded-xl border overflow-auto shadow-sm max-h-[70vh]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-muted/80 backdrop-blur border-b">
                <th className="sticky left-0 z-40 bg-muted/80 backdrop-blur text-left px-4 py-3 font-semibold min-w-[220px] w-[260px] border-r">
                  Permission
                </th>
                {MATRIX_ROLES.map(role => (
                  <th key={role.key} className="text-center px-2 py-2 min-w-[96px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <Badge className={cn('text-[10px] font-semibold border px-2 py-0.5 whitespace-nowrap', role.color)}>
                        {role.label}
                      </Badge>
                      {columnStats[role.key] && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {columnStats[role.key].enabled}/{columnStats[role.key].total}
                        </span>
                      )}
                      <div className="flex gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => bulkRoleMutation.mutate({ role: role.key as RoleKey, enable: true })}
                              disabled={bulkRoleMutation.isPending}
                              className="rounded px-1.5 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors disabled:opacity-50"
                            >
                              ✓ Semua
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Aktifkan semua permission untuk {role.label}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => bulkRoleMutation.mutate({ role: role.key as RoleKey, enable: false })}
                              disabled={bulkRoleMutation.isPending}
                              className="rounded px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 border border-red-200 transition-colors disabled:opacity-50"
                            >
                              ✗ Reset
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Reset semua permission {role.label}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Object.entries(grouped).map(([group, perms]) => {
                const isCollapsed = collapsedGroups.has(group);
                return (
                  <>
                    {/* Group header */}
                    <tr
                      key={`grp-${group}`}
                      className="bg-slate-100/80 dark:bg-slate-800/50 border-y cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/40 transition-colors"
                      onClick={() => toggleGroup(group)}
                    >
                      <td className="sticky left-0 z-20 bg-slate-100/90 dark:bg-slate-800/70 px-4 py-2 border-r">
                        <div className="flex items-center gap-2">
                          {isCollapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          }
                          <span className="font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            {group}
                          </span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {perms.length}
                          </Badge>
                        </div>
                      </td>
                      {MATRIX_ROLES.map(role => {
                        const enabledCount = perms.filter(p => getCellState(p.key, role.key)).length;
                        const allOn = enabledCount === perms.length;
                        const someOn = enabledCount > 0;
                        return (
                          <td key={role.key} className="text-center px-1 py-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    bulkGroupMutation.mutate({
                                      role: role.key as RoleKey,
                                      permKeys: perms.map(p => p.key),
                                      enable: !allOn,
                                    });
                                  }}
                                  disabled={bulkGroupMutation.isPending}
                                  className={cn(
                                    'text-[10px] font-medium px-2 py-0.5 rounded border transition-colors',
                                    allOn
                                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                      : someOn
                                        ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                        : 'text-slate-500 bg-white border-slate-200 hover:bg-slate-50',
                                    'disabled:opacity-50'
                                  )}
                                >
                                  {enabledCount}/{perms.length}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {allOn ? 'Klik untuk nonaktifkan grup' : 'Klik untuk aktifkan semua di grup ini'}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Permission rows */}
                    {!isCollapsed && perms.map((perm, idx) => (
                      <tr
                        key={perm.key}
                        className={cn(
                          'border-b hover:bg-primary/5 transition-colors',
                          idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/60 dark:bg-slate-900/20'
                        )}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-r">
                          <div>
                            <p className="font-medium text-sm leading-tight">{perm.label}</p>
                            <code className="text-[10px] text-muted-foreground font-mono">{perm.key}</code>
                          </div>
                        </td>

                        {MATRIX_ROLES.map(role => {
                          const cellId = `${perm.key}|${role.key}`;
                          const enabled = getCellState(perm.key, role.key);
                          const isPending = pendingCell === cellId;

                          return (
                            <td key={role.key} className="text-center px-2 py-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() =>
                                      toggleMutation.mutate({
                                        permKey: perm.key,
                                        role: role.key as RoleKey,
                                        enable: !enabled,
                                      })
                                    }
                                    disabled={isPending || toggleMutation.isPending}
                                    className={cn(
                                      'w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all border-2',
                                      'focus:outline-none focus:ring-2 focus:ring-offset-1',
                                      isPending && 'opacity-60 cursor-wait',
                                      enabled
                                        ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 focus:ring-emerald-400 shadow-sm'
                                        : 'bg-white dark:bg-transparent border-slate-200 dark:border-slate-700 text-slate-300 hover:border-slate-400 hover:text-slate-500 focus:ring-slate-300 dark:hover:border-slate-500'
                                    )}
                                    aria-label={`${enabled ? 'Cabut' : 'Berikan'} "${perm.label}" dari role ${role.label}`}
                                    aria-pressed={enabled}
                                  >
                                    {isPending ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : enabled ? (
                                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                    ) : (
                                      <Minus className="h-3 w-3" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                  <p className="font-semibold">{perm.label}</p>
                                  <p className="text-muted-foreground">Role: {role.label}</p>
                                  <p className={enabled ? 'text-red-400' : 'text-emerald-400'}>
                                    {enabled ? 'Klik untuk mencabut akses' : 'Klik untuk memberikan akses'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })}

              {Object.keys(grouped).length === 0 && (
                <tr>
                  <td colSpan={MATRIX_ROLES.length + 1} className="text-center py-16 text-muted-foreground text-sm">
                    Tidak ada permission yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          * Super Admin selalu memiliki semua akses penuh, terlepas dari pengaturan di atas. &nbsp;|&nbsp;
          Klik sel untuk assign/revoke secara real-time. Klik angka pada header grup untuk toggle seluruh grup.
        </p>
      </div>
    </TooltipProvider>
  );
}
