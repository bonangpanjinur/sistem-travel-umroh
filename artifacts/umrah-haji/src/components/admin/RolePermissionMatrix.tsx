/**
 * RolePermissionMatrix — v2
 * Matriks visual real-time: baris = permission, kolom = role.
 *
 * Fitur baru:
 * - Filter per grup (dropdown)
 * - Export ke Excel (xlsx)
 * - Mode perbandingan 2 role (diff highlighting)
 * - Indikator inherited permission dari hierarki role
 * - Confirmation dialog sebelum bulk reset
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Check, Minus, Search, RefreshCw, ChevronDown, ChevronRight,
  Download, GitCompareArrows, Filter, X, ArrowRight, Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ROLE_HIERARCHY } from '@/lib/permissions';

export const MATRIX_ROLES = [
  { key: 'owner',          label: 'Owner',        short: 'OWN', color: 'bg-purple-100 text-purple-800 border-purple-200',  dot: 'bg-purple-500' },
  { key: 'branch_manager', label: 'Br. Manager',  short: 'BM',  color: 'bg-blue-100 text-blue-800 border-blue-200',        dot: 'bg-blue-500' },
  { key: 'finance',        label: 'Finance',      short: 'FIN', color: 'bg-green-100 text-green-800 border-green-200',      dot: 'bg-green-500' },
  { key: 'operational',    label: 'Operational',  short: 'OPS', color: 'bg-orange-100 text-orange-800 border-orange-200',   dot: 'bg-orange-500' },
  { key: 'equipment',      label: 'Equipment',    short: 'EQP', color: 'bg-amber-100 text-amber-800 border-amber-200',      dot: 'bg-amber-500' },
  { key: 'sales',          label: 'Sales',        short: 'SLS', color: 'bg-cyan-100 text-cyan-800 border-cyan-200',         dot: 'bg-cyan-500' },
  { key: 'marketing',      label: 'Marketing',    short: 'MKT', color: 'bg-pink-100 text-pink-800 border-pink-200',         dot: 'bg-pink-500' },
  { key: 'agent',          label: 'Agent',        short: 'AGT', color: 'bg-indigo-100 text-indigo-800 border-indigo-200',   dot: 'bg-indigo-500' },
] as const;

export type RoleKey = typeof MATRIX_ROLES[number]['key'];

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

function getInheritedRolesFlat(role: string): string[] {
  const children = (ROLE_HIERARCHY[role] || []) as string[];
  const result: string[] = [...children];
  for (const c of children) result.push(...getInheritedRolesFlat(c));
  return [...new Set(result)];
}

function exportToExcel(permissions: PermissionRow[], matrix: PermissionMatrix) {
  import('xlsx').then(XLSX => {
    const roleKeys = MATRIX_ROLES.map(r => r.key);
    const header = ['Grup', 'Permission', 'Key', ...MATRIX_ROLES.map(r => r.label)];
    const rows = permissions.map(p => [
      p.group_name,
      p.label,
      p.key,
      ...roleKeys.map(rk => (matrix[p.key]?.[rk] ? '✓' : '-')),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, ...roleKeys.map(() => ({ wch: 14 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Permission Matrix');
    XLSX.writeFile(wb, `permission-matrix-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('File Excel berhasil diunduh');
  });
}

export function RolePermissionMatrix() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareRoles, setCompareRoles] = useState<[RoleKey | null, RoleKey | null]>([null, null]);
  const [bulkResetTarget, setBulkResetTarget] = useState<RoleKey | null>(null);

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
          .delete().eq('role', role).eq('permission_key', permKey);
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
    onError: (_e: any, _v: any, ctx: any) => {
      if (ctx?.previous) queryClient.setQueryData(['role-permission-matrix'], ctx.previous);
      toast.error('Gagal memperbarui izin');
    },
    onSuccess: (_d: any, { role }: any) => {
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
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .upsert(keys.map(k => ({ role, permission_key: k, is_enabled: true })), { onConflict: 'role,permission_key' });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete().eq('role', role).in('permission_key', keys);
        if (error) throw error;
      }
    },
    onSuccess: (_d: any, { role }: any) => {
      queryClient.invalidateQueries({ queryKey: ['role-permission-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions', role] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success('Izin role diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui izin role'),
  });

  const bulkGroupMutation = useMutation({
    mutationFn: async ({ role, permKeys, enable }: { role: RoleKey; permKeys: string[]; enable: boolean }) => {
      if (enable) {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .upsert(permKeys.map(k => ({ role, permission_key: k, is_enabled: true })), { onConflict: 'role,permission_key' });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('role_permissions' as any) as any)
          .delete().eq('role', role).in('permission_key', permKeys);
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

  const inheritedSets = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    for (const role of MATRIX_ROLES) {
      const childRoles = getInheritedRolesFlat(role.key);
      const inheritedPerms = new Set<string>();
      if (data?.matrix) {
        for (const childRole of childRoles) {
          for (const [permKey, roleMap] of Object.entries(data.matrix)) {
            if (roleMap[childRole] === true && !roleMap[role.key]) {
              inheritedPerms.add(permKey);
            }
          }
        }
      }
      result[role.key] = inheritedPerms;
    }
    return result;
  }, [data?.matrix]);

  const allGroups = useMemo(() => {
    if (!data?.permissions) return [];
    return [...new Set(data.permissions.map(p => p.group_name || 'Lainnya'))];
  }, [data?.permissions]);

  const filteredPermissions = useMemo(() => {
    if (!data?.permissions) return [];
    return data.permissions.filter(p => {
      const g = p.group_name || 'Lainnya';
      const matchGroup = groupFilter === 'all' || g === groupFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || g.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [data?.permissions, search, groupFilter]);

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
    return MATRIX_ROLES.reduce<Record<string, { enabled: number; total: number }>>((acc, r) => {
      const enabled = data.permissions.filter(p => data.matrix[p.key]?.[r.key] === true).length;
      acc[r.key] = { enabled, total: data.permissions.length };
      return acc;
    }, {});
  }, [data]);

  const displayRoles = useMemo(() => {
    if (!compareMode) return MATRIX_ROLES;
    const [a, b] = compareRoles;
    return MATRIX_ROLES.filter(r => r.key === a || r.key === b);
  }, [compareMode, compareRoles]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const getCellState = (permKey: string, roleKey: string) => ({
    direct: data?.matrix[permKey]?.[roleKey] === true,
    inherited: inheritedSets[roleKey]?.has(permKey) ?? false,
  });

  const getCompareCellState = (permKey: string) => {
    const [a, b] = compareRoles;
    const aOn = a ? data?.matrix[permKey]?.[a] === true : false;
    const bOn = b ? data?.matrix[permKey]?.[b] === true : false;
    if (aOn && bOn) return 'both';
    if (aOn) return 'only-a';
    if (bOn) return 'only-b';
    return 'none';
  };

  const handleCompareRoleSelect = (slot: 0 | 1, roleKey: RoleKey) => {
    setCompareRoles(prev => {
      const next = [...prev] as [RoleKey | null, RoleKey | null];
      next[slot] = roleKey;
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3"><Skeleton className="h-9 w-48" /><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-24" /></div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  const roleA = MATRIX_ROLES.find(r => r.key === compareRoles[0]);
  const roleB = MATRIX_ROLES.find(r => r.key === compareRoles[1]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[170px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari permission..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Semua Grup" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Grup</SelectItem>
              {allGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={() => setCollapsedGroups(new Set())} className="h-9 text-xs">Buka</Button>
          <Button size="sm" variant="outline" onClick={() => setCollapsedGroups(new Set(Object.keys(grouped)))} className="h-9 text-xs">Tutup</Button>

          <Button
            size="sm" variant="outline"
            onClick={() => { setCompareMode(m => !m); setCompareRoles([null, null]); }}
            className={cn('h-9 text-xs gap-1.5', compareMode && 'bg-blue-50 border-blue-300 text-blue-700')}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            {compareMode ? 'Keluar Bandingkan' : 'Bandingkan'}
          </Button>

          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isRefetching} className="h-9">
            <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
          </Button>

          <Button
            size="sm" variant="outline"
            onClick={() => data && exportToExcel(data.permissions, data.matrix)}
            className="h-9 gap-1.5 text-xs ml-auto"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>

        {/* ── Compare mode — role selector ──────────────────────────────────── */}
        {compareMode && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <GitCompareArrows className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-sm font-medium text-blue-800">Mode Perbandingan — pilih 2 role:</span>
            <Select value={compareRoles[0] || ''} onValueChange={v => handleCompareRoleSelect(0, v as RoleKey)}>
              <SelectTrigger className="h-8 w-[140px] text-sm bg-white"><SelectValue placeholder="Role A" /></SelectTrigger>
              <SelectContent>{MATRIX_ROLES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <ArrowRight className="h-4 w-4 text-blue-400 shrink-0" />
            <Select value={compareRoles[1] || ''} onValueChange={v => handleCompareRoleSelect(1, v as RoleKey)}>
              <SelectTrigger className="h-8 w-[140px] text-sm bg-white"><SelectValue placeholder="Role B" /></SelectTrigger>
              <SelectContent>{MATRIX_ROLES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            {compareRoles[0] && compareRoles[1] && (
              <div className="flex items-center gap-3 ml-3 text-xs text-blue-700">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Keduanya</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Hanya {roleA?.label}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Hanya {roleB?.label}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Tidak ada</span>
              </div>
            )}
          </div>
        )}

        {/* ── Legenda ────────────────────────────────────────────────────────── */}
        {!compareMode && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" strokeWidth={3} /></span> Langsung</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-teal-100 border-2 border-teal-400 flex items-center justify-center"><Check className="h-3 w-3 text-teal-600" strokeWidth={3} /></span> Inherited</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md border-2 border-slate-200 flex items-center justify-center"><Minus className="h-3 w-3 text-slate-300" /></span> Tidak aktif</span>
          </div>
        )}

        {/* ── Matrix Table ────────────────────────────────────────────────────── */}
        <div className="rounded-xl border shadow-sm overflow-auto max-h-[65vh]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-muted/90 backdrop-blur border-b">
                <th className="sticky left-0 z-40 bg-muted/90 backdrop-blur text-left px-4 py-3 font-semibold min-w-[230px] w-[260px] border-r text-xs uppercase tracking-wide text-muted-foreground">
                  Permission
                  {filteredPermissions.length > 0 && (
                    <span className="ml-2 text-[10px] font-normal normal-case">({filteredPermissions.length})</span>
                  )}
                </th>

                {/* Normal columns */}
                {!compareMode && displayRoles.map(role => (
                  <th key={role.key} className="text-center px-2 py-2 min-w-[90px]">
                    <div className="flex flex-col items-center gap-1">
                      <Badge className={cn('text-[10px] font-semibold border px-2 py-0.5 whitespace-nowrap', role.color)}>{role.label}</Badge>
                      {columnStats[role.key] && (
                        <span className="text-[10px] text-muted-foreground">{columnStats[role.key].enabled}/{columnStats[role.key].total}</span>
                      )}
                      <div className="flex gap-0.5 mt-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => bulkRoleMutation.mutate({ role: role.key as RoleKey, enable: true })} disabled={bulkRoleMutation.isPending}
                              className="rounded px-1.5 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors disabled:opacity-50">
                              ✓ Semua
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Aktifkan semua untuk {role.label}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => setBulkResetTarget(role.key as RoleKey)} disabled={bulkRoleMutation.isPending}
                              className="rounded px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 border border-red-200 transition-colors disabled:opacity-50">
                              ✗ Reset
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Reset semua permission {role.label}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </th>
                ))}

                {/* Compare columns */}
                {compareMode && (
                  <>
                    {roleA && (
                      <th className="text-center px-3 py-2 min-w-[110px]">
                        <Badge className={cn('text-[10px] font-semibold border px-2 py-0.5 whitespace-nowrap', roleA.color)}>{roleA.label}</Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">A</div>
                      </th>
                    )}
                    {roleB && (
                      <th className="text-center px-3 py-2 min-w-[110px]">
                        <Badge className={cn('text-[10px] font-semibold border px-2 py-0.5 whitespace-nowrap', roleB.color)}>{roleB.label}</Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">B</div>
                      </th>
                    )}
                    {roleA && roleB && (
                      <th className="text-center px-3 py-2 min-w-[90px]">
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Hasil</div>
                      </th>
                    )}
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {Object.entries(grouped).map(([group, perms]) => {
                const isCollapsed = collapsedGroups.has(group);
                return (
                  <> 
                    {/* Group header */}
                    <tr key={`grp-${group}`}
                      className="bg-slate-100/80 dark:bg-slate-800/50 border-y cursor-pointer select-none hover:bg-slate-200/60 transition-colors"
                      onClick={() => toggleGroup(group)}>
                      <td className="sticky left-0 z-20 bg-slate-100/90 dark:bg-slate-800/70 px-4 py-2 border-r">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <span className="font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">{group}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{perms.length}</Badge>
                        </div>
                      </td>

                      {!compareMode && displayRoles.map(role => {
                        const enabledCount = perms.filter(p => getCellState(p.key, role.key).direct).length;
                        const allOn = enabledCount === perms.length;
                        return (
                          <td key={role.key} className="text-center px-1 py-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={e => { e.stopPropagation(); bulkGroupMutation.mutate({ role: role.key as RoleKey, permKeys: perms.map(p => p.key), enable: !allOn }); }}
                                  disabled={bulkGroupMutation.isPending}
                                  className={cn('text-[10px] font-medium px-2 py-0.5 rounded border transition-colors disabled:opacity-50',
                                    allOn ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' :
                                    enabledCount > 0 ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' :
                                    'text-slate-500 bg-white border-slate-200 hover:bg-slate-50')}>
                                  {enabledCount}/{perms.length}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{allOn ? 'Nonaktifkan grup' : 'Aktifkan seluruh grup'}</TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}

                      {compareMode && <td colSpan={3} />}
                    </tr>

                    {/* Permission rows */}
                    {!isCollapsed && perms.map((perm, idx) => {
                      const compareResult = compareMode ? getCompareCellState(perm.key) : 'none';
                      return (
                        <tr key={perm.key} className={cn(
                          'border-b transition-colors',
                          compareMode && compareResult === 'both' && 'bg-emerald-50/40',
                          compareMode && compareResult === 'only-a' && 'bg-blue-50/40',
                          compareMode && compareResult === 'only-b' && 'bg-orange-50/40',
                          !compareMode && idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/60',
                          'hover:bg-primary/5',
                        )}>
                          <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-r">
                            <div>
                              <p className="font-medium text-sm leading-tight">{perm.label}</p>
                              <code className="text-[10px] text-muted-foreground font-mono">{perm.key}</code>
                            </div>
                          </td>

                          {/* Normal cells */}
                          {!compareMode && displayRoles.map(role => {
                            const cellId = `${perm.key}|${role.key}`;
                            const { direct, inherited } = getCellState(perm.key, role.key);
                            const isPending = pendingCell === cellId;
                            return (
                              <td key={role.key} className="text-center px-2 py-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => toggleMutation.mutate({ permKey: perm.key, role: role.key as RoleKey, enable: !direct })}
                                      disabled={isPending || toggleMutation.isPending}
                                      className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all border-2',
                                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                                        isPending && 'opacity-60 cursor-wait',
                                        direct ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-sm focus:ring-emerald-400'
                                          : inherited ? 'bg-teal-50 border-teal-400 text-teal-600 hover:bg-teal-100 focus:ring-teal-300'
                                          : 'bg-white border-slate-200 text-slate-300 hover:border-slate-400 hover:text-slate-500 focus:ring-slate-300',
                                      )}
                                      aria-label={`${direct ? 'Cabut' : 'Berikan'} "${perm.label}" untuk ${role.label}`}
                                      aria-pressed={direct || inherited}
                                    >
                                      {isPending ? <RefreshCw className="h-3 w-3 animate-spin" />
                                        : (direct || inherited) ? <Check className="h-3.5 w-3.5" strokeWidth={direct ? 3 : 2} />
                                        : <Minus className="h-3 w-3" />}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[220px]">
                                    <p className="font-semibold">{perm.label}</p>
                                    <p className="text-muted-foreground">Role: <span className="font-medium">{role.label}</span></p>
                                    {inherited && !direct && <p className="text-teal-400 flex items-center gap-1"><Info className="h-3 w-3" /> Inherited dari role turunan</p>}
                                    <p className={direct ? 'text-red-400' : 'text-emerald-400 mt-0.5'}>{direct ? 'Klik untuk mencabut akses langsung' : 'Klik untuk memberikan akses langsung'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            );
                          })}

                          {/* Compare cells */}
                          {compareMode && (() => {
                            const aOn = compareRoles[0] ? data?.matrix[perm.key]?.[compareRoles[0]] === true : false;
                            const bOn = compareRoles[1] ? data?.matrix[perm.key]?.[compareRoles[1]] === true : false;
                            const diffLabel = aOn && bOn ? 'Keduanya punya' : aOn ? `Hanya ${roleA?.label}` : bOn ? `Hanya ${roleB?.label}` : 'Tidak ada';
                            const diffColor = aOn && bOn ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : aOn ? 'text-blue-600 bg-blue-50 border-blue-200' : bOn ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-slate-400 bg-white border-slate-200';
                            return (
                              <>
                                <td className="text-center px-3 py-2">
                                  {compareRoles[0] ? (
                                    <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center mx-auto border-2', aOn ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-300')}>
                                      {aOn ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Minus className="h-3 w-3" />}
                                    </span>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </td>
                                <td className="text-center px-3 py-2">
                                  {compareRoles[1] ? (
                                    <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center mx-auto border-2', bOn ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-300')}>
                                      {bOn ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Minus className="h-3 w-3" />}
                                    </span>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </td>
                                {compareRoles[0] && compareRoles[1] && (
                                  <td className="text-center px-2 py-2">
                                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap', diffColor)}>{diffLabel}</span>
                                  </td>
                                )}
                              </>
                            );
                          })()}
                        </tr>
                      );
                    })}
                  </>
                );
              })}

              {Object.keys(grouped).length === 0 && (
                <tr>
                  <td colSpan={20} className="text-center py-16 text-muted-foreground text-sm">
                    Tidak ada permission yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          * Super Admin selalu punya akses penuh. Sel hijau = akses langsung, sel teal = inherited dari role turunan. Klik grup angka untuk toggle bulk.
        </p>
      </div>

      {/* Confirmation dialog untuk bulk reset */}
      <AlertDialog open={!!bulkResetTarget} onOpenChange={open => !open && setBulkResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              Reset Semua Permission?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan <strong>menghapus semua permission</strong> untuk role{' '}
              <strong>{MATRIX_ROLES.find(r => r.key === bulkResetTarget)?.label}</strong>.
              User dengan role ini tidak akan dapat mengakses fitur apapun hingga permission dikonfigurasi ulang.
              Tindakan ini tidak dapat dibatalkan secara otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (bulkResetTarget) {
                  bulkRoleMutation.mutate({ role: bulkResetTarget, enable: false });
                  setBulkResetTarget(null);
                }
              }}
            >
              Ya, Reset Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
