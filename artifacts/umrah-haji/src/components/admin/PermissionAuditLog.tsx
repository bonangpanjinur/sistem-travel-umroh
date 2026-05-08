/**
 * PermissionAuditLog
 * Timeline real-time perubahan permission & role.
 * - Auto-refresh setiap 30 detik
 * - Filter: scope, action, role, tanggal, search
 * - Tampilan timeline (bukan tabel) — lebih mudah dibaca
 * - Export CSV
 * - Live indicator
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ShieldCheck, ShieldX, RotateCcw, RefreshCw, Download, Search,
  Filter, Circle, Clock, ChevronDown, ChevronRight, UserCircle, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface AuditRow {
  id: string;
  action: string;
  scope: string;
  actor_email: string | null;
  actor_id: string | null;
  target_role: string | null;
  target_user_id: string | null;
  permission_key: string | null;
  old_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; dotColor: string }> = {
  grant:           { label: 'Grant',         icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  revoke:          { label: 'Revoke',        icon: ShieldX,     color: 'bg-rose-100 text-rose-800 border-rose-200',          dotColor: 'bg-rose-500' },
  toggle:          { label: 'Toggle',        icon: RefreshCw,   color: 'bg-sky-100 text-sky-800 border-sky-200',             dotColor: 'bg-sky-500' },
  reset_defaults:  { label: 'Reset Default', icon: RotateCcw,   color: 'bg-amber-100 text-amber-800 border-amber-200',       dotColor: 'bg-amber-500' },
  resync_all:      { label: 'Resync Semua',  icon: RefreshCw,   color: 'bg-purple-100 text-purple-800 border-purple-200',    dotColor: 'bg-purple-500' },
  bulk_enable:     { label: 'Aktifkan Bulk', icon: ShieldCheck, color: 'bg-teal-100 text-teal-800 border-teal-200',          dotColor: 'bg-teal-500' },
  bulk_disable:    { label: 'Nonaktifkan',   icon: ShieldX,     color: 'bg-orange-100 text-orange-800 border-orange-200',    dotColor: 'bg-orange-500' },
  copy_from_role:  { label: 'Salin Role',    icon: ShieldCheck, color: 'bg-violet-100 text-violet-800 border-violet-200',   dotColor: 'bg-violet-500' },
  override_set:    { label: 'Override',      icon: ShieldCheck, color: 'bg-blue-100 text-blue-800 border-blue-200',          dotColor: 'bg-blue-500' },
  override_remove: { label: 'Override Hps',  icon: ShieldX,     color: 'bg-slate-100 text-slate-700 border-slate-200',       dotColor: 'bg-slate-400' },
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 border-purple-200',
  branch_manager: 'bg-blue-100 text-blue-800 border-blue-200',
  finance: 'bg-green-100 text-green-800 border-green-200',
  operational: 'bg-orange-100 text-orange-800 border-orange-200',
  equipment: 'bg-amber-100 text-amber-800 border-amber-200',
  sales: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  marketing: 'bg-pink-100 text-pink-800 border-pink-200',
  agent: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', branch_manager: 'Branch Manager', finance: 'Finance',
  operational: 'Operational', equipment: 'Equipment', sales: 'Sales',
  marketing: 'Marketing', agent: 'Agent',
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { label: action, icon: Info, color: 'bg-muted text-muted-foreground border-border', dotColor: 'bg-muted-foreground' };
}

function exportCSV(rows: AuditRow[]) {
  const header = ['Waktu', 'Aktor', 'Scope', 'Aksi', 'Target Role', 'Permission', 'Nilai Lama', 'Nilai Baru'];
  const data = rows.map(r => [
    format(new Date(r.created_at), 'yyyy-MM-dd HH:mm:ss'),
    r.actor_email || r.actor_id || '—',
    r.scope,
    r.action,
    r.target_role || r.target_user_id || '—',
    r.permission_key || '—',
    r.old_value != null ? JSON.stringify(r.old_value) : '—',
    r.new_value != null ? JSON.stringify(r.new_value) : '—',
  ]);
  const csv = [header, ...data].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-permission-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function LiveDot({ lastRefreshed }: { lastRefreshed: Date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
      <span>Live · diperbarui {formatDistanceToNow(lastRefreshed, { locale: idLocale, addSuffix: true })}</span>
    </div>
  );
}

export function PermissionAuditLog() {
  const [scopeFilter, setScopeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const { data = [], isLoading, refetch, isRefetching } = useQuery<AuditRow[]>({
    queryKey: ['permission-audit-log', scopeFilter, actionFilter, roleFilter, dateFrom, dateTo],
    queryFn: async () => {
      let q: any = (supabase as any)
        .from('rbac_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (scopeFilter !== 'all') q = q.eq('scope', scopeFilter);
      if (actionFilter !== 'all') q = q.eq('action', actionFilter);
      if (roleFilter !== 'all') q = q.eq('target_role', roleFilter);
      if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      setLastRefreshed(new Date());
      return (data || []) as AuditRow[];
    },
    refetchInterval: 30_000,
    retry: 1,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(r =>
      (r.actor_email || '').toLowerCase().includes(q) ||
      (r.target_role || '').toLowerCase().includes(q) ||
      (r.permission_key || '').toLowerCase().includes(q) ||
      (r.action || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => {
    const grants = data.filter(r => r.action === 'grant' || r.action === 'bulk_enable').length;
    const revokes = data.filter(r => r.action === 'revoke' || r.action === 'bulk_disable').length;
    const resets = data.filter(r => r.action === 'reset_defaults' || r.action === 'resync_all').length;
    const uniqueActors = new Set(data.map(r => r.actor_email || r.actor_id).filter(Boolean)).size;
    return { grants, revokes, resets, uniqueActors, total: data.length };
  }, [data]);

  const allActions = useMemo(() => [...new Set(data.map(r => r.action))], [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 bg-gradient-to-br from-slate-100 to-slate-50">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Total Event</p>
            <p className="text-2xl font-bold mt-0.5">{stats.total}</p>
            <p className="text-xs text-muted-foreground">300 terakhir</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-25">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-emerald-700 font-medium">Grant / Aktifkan</p>
            <p className="text-2xl font-bold mt-0.5 text-emerald-700">{stats.grants}</p>
            <p className="text-xs text-muted-foreground">izin diberikan</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-rose-50 to-rose-25">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-rose-700 font-medium">Revoke / Nonaktifkan</p>
            <p className="text-2xl font-bold mt-0.5 text-rose-700">{stats.revokes}</p>
            <p className="text-xs text-muted-foreground">izin dicabut</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-violet-50 to-violet-25">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-violet-700 font-medium">Admin Unik</p>
            <p className="text-2xl font-bold mt-0.5 text-violet-700">{stats.uniqueActors}</p>
            <p className="text-xs text-muted-foreground">yang membuat perubahan</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari aktor, role, permission..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-9 w-[130px] text-sm">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Scope</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue placeholder="Semua Aksi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                {allActions.map(a => (
                  <SelectItem key={a} value={a}>{getActionConfig(a).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue placeholder="Semua Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-[140px] text-sm" />
              <span className="text-muted-foreground text-xs">—</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-[140px] text-sm" />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <LiveDot lastRefreshed={lastRefreshed} />
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isRefetching} className="h-9">
                <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0} className="h-9 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              Menampilkan <strong>{filtered.length}</strong> dari <strong>{data.length}</strong> event
            </span>
            {(scopeFilter !== 'all' || actionFilter !== 'all' || roleFilter !== 'all' || dateFrom || dateTo || search) && (
              <Button
                size="sm" variant="ghost"
                className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                onClick={() => { setScopeFilter('all'); setActionFilter('all'); setRoleFilter('all'); setDateFrom(''); setDateTo(''); setSearch(''); }}
              >
                Hapus filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada log perubahan</p>
            <p className="text-xs text-muted-foreground mt-1">
              Perubahan permission akan muncul di sini secara real-time.
              {data.length === 0 && ' Tabel rbac_audit_log mungkin belum dikonfigurasi di database.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border/60 rounded-full" />

          <div className="space-y-1">
            {filtered.map((row, i) => {
              const cfg = getActionConfig(row.action);
              const Icon = cfg.icon;
              const isExpanded = expandedIds.has(row.id);
              const hasMeta = row.metadata && Object.keys(row.metadata || {}).length > 0;
              const hasValues = row.old_value != null || row.new_value != null;
              const isExpandable = hasMeta || hasValues;
              const isNew = i < 3 && !isRefetching;

              return (
                <div key={row.id} className="relative flex gap-3 pl-0 group">
                  {/* Timeline dot */}
                  <div className={cn(
                    'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 border-background shrink-0',
                    cfg.dotColor.replace('bg-', 'bg-').replace('-500', '-100'),
                  )}>
                    <Icon className={cn('h-4 w-4', cfg.dotColor.replace('bg-', 'text-'))} />
                    {isNew && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background" />
                    )}
                  </div>

                  {/* Content card */}
                  <div className={cn(
                    'flex-1 mb-3 rounded-xl border bg-card overflow-hidden transition-all',
                    'group-hover:shadow-sm',
                    isNew && 'ring-1 ring-emerald-200',
                  )}>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn('text-[11px] font-semibold border', cfg.color)}>
                          {cfg.label}
                        </Badge>
                        {row.target_role && (
                          <Badge className={cn('text-[11px] font-medium border', ROLE_COLORS[row.target_role] || 'bg-muted text-muted-foreground border-border')}>
                            {ROLE_LABELS[row.target_role] || row.target_role}
                          </Badge>
                        )}
                        {row.permission_key && (
                          <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {row.permission_key}
                          </code>
                        )}
                        {row.scope && (
                          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">{row.scope}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 ml-auto">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserCircle className="h-3.5 w-3.5" />
                          <span>{row.actor_email || (row.actor_id ? `${row.actor_id.slice(0, 8)}…` : 'System')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground" title={format(new Date(row.created_at), 'dd MMM yyyy HH:mm:ss', { locale: idLocale })}>
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(row.created_at), { locale: idLocale, addSuffix: true })}
                        </div>
                        {isExpandable && (
                          <button
                            onClick={() => toggleExpand(row.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Change diff (old → new) */}
                    {hasValues && (
                      <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-3 text-xs font-mono">
                        <span className={cn('px-2 py-0.5 rounded', row.old_value === true ? 'bg-emerald-50 text-emerald-700' : row.old_value === false ? 'bg-rose-50 text-rose-700' : 'bg-muted text-muted-foreground')}>
                          {row.old_value != null ? JSON.stringify(row.old_value) : '∅'}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className={cn('px-2 py-0.5 rounded', row.new_value === true ? 'bg-emerald-50 text-emerald-700' : row.new_value === false ? 'bg-rose-50 text-rose-700' : 'bg-muted text-muted-foreground')}>
                          {row.new_value != null ? JSON.stringify(row.new_value) : '∅'}
                        </span>
                        <span className="text-muted-foreground ml-1 text-[10px] font-sans">
                          {format(new Date(row.created_at), 'dd MMM yyyy · HH:mm:ss', { locale: idLocale })}
                        </span>
                      </div>
                    )}

                    {/* Expanded metadata */}
                    {isExpanded && hasMeta && (
                      <div className="px-4 py-3 border-t bg-muted/30">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metadata</p>
                        <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length >= 300 && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Menampilkan 300 event terbaru. Gunakan filter tanggal untuk melihat data lebih lama.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper: tulis satu event ke rbac_audit_log.
 * Dipanggil dari onSuccess mutasi di matrix / role editor.
 */
export async function writeRbacAuditLog(entry: {
  action: string;
  scope: string;
  target_role?: string;
  target_user_id?: string;
  permission_key?: string;
  old_value?: any;
  new_value?: any;
  metadata?: any;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;
    const email = userData?.user?.email || null;

    await (supabase as any).from('rbac_audit_log').insert({
      action: entry.action,
      scope: entry.scope,
      actor_id: userId,
      actor_email: email,
      target_role: entry.target_role || null,
      target_user_id: entry.target_user_id || null,
      permission_key: entry.permission_key || null,
      old_value: entry.old_value ?? null,
      new_value: entry.new_value ?? null,
      metadata: entry.metadata || null,
    });
  } catch (_) {
    // audit log gagal tidak boleh menghentikan operasi utama
  }
}
