import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search, ChevronDown, ChevronRight, ShieldCheck,
  RotateCcw, CheckCircle2, XCircle, Crown, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { logUserPermissionChange } from "@/lib/audit-logger";

interface UserPermissionsManagerProps {
  userId: string;
  userName: string;
  isSuperAdminTarget?: boolean;
}

interface PermissionRow {
  key: string;
  label: string;
  group_name: string;
  description: string | null;
  is_enabled: boolean;
  hasOverride: boolean;
}

const GROUP_ICONS: Record<string, string> = {
  "Overview": "📊",
  "Produk & Operasional": "📦",
  "Jamaah & Agent": "👥",
  "Keuangan & Akuntansi": "💰",
  "Sales & CRM": "📈",
  "SDM (HR)": "🧑‍💼",
  "Dokumen & Surat": "📄",
  "Master Data": "🗄️",
  "Pengaturan": "⚙️",
  "Laporan": "📋",
  "Support & Komunikasi": "💬",
  "Lainnya": "📁",
};

export function UserPermissionsManager({ userId, userName, isSuperAdminTarget }: UserPermissionsManagerProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["user-permissions-detail", userId],
    queryFn: async () => {
      // Fetch all permissions list
      const { data: list, error: listErr } = await supabase
        .from('permissions_list')
        .select('*')
        .order('group_name', { ascending: true })
        .order('label', { ascending: true });
      if (listErr) throw listErr;

      // Fetch user-specific overrides (user_permissions table)
      const { data: overrides, error: overrideErr } = await supabase
        .from('user_permissions')
        .select('permission_key, is_enabled')
        .eq('user_id', userId);
      if (overrideErr) throw overrideErr;

      const overrideMap = new Map(
        (overrides || []).map(o => [o.permission_key, o.is_enabled])
      );

      return (list || []).map((p: any): PermissionRow => {
        const has = overrideMap.has(p.key);
        return {
          key: p.key,
          label: p.label,
          group_name: p.group_name || 'Lainnya',
          description: p.description,
          is_enabled: has ? (overrideMap.get(p.key) as boolean) : true, // default allow
          hasOverride: has,
        };
      });
    },
    enabled: !isSuperAdminTarget,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, newValue, oldValue }: { key: string; newValue: boolean; oldValue: boolean }) => {
      // Default is enabled. If new value is enabled (true) → remove override
      // If new value is disabled (false) → upsert override is_enabled=false
      if (newValue === true) {
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .upsert(
            { user_id: userId, permission_key: key, is_enabled: false },
            { onConflict: 'user_id,permission_key' }
          );
        if (error) throw error;
      }
      // Audit log (best-effort, don't fail mutation if it errors)
      logUserPermissionChange(userId, key, oldValue, newValue).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions-revoked"] });
      toast.success("Izin diperbarui");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error("Gagal memperbarui izin: " + (error?.message || ''));
    },
  });

  const groupBulkMutation = useMutation({
    mutationFn: async ({ groupItems, enable }: { groupItems: PermissionRow[]; enable: boolean }) => {
      if (enable) {
        const keys = groupItems.filter(p => p.hasOverride).map(p => p.key);
        if (keys.length === 0) return;
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .in('permission_key', keys);
        if (error) throw error;
      } else {
        const upsertPayload = groupItems.map(p => ({
          user_id: userId,
          permission_key: p.key,
          is_enabled: false,
        }));
        const { error } = await supabase
          .from('user_permissions')
          .upsert(upsertPayload, { onConflict: 'user_id,permission_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions-revoked"] });
      toast.success("Izin grup diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui izin grup"),
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions-revoked"] });
      toast.success("Semua izin dikembalikan ke default (akses penuh)");
    },
    onError: () => toast.error("Gagal mereset izin"),
  });

  const grouped = useMemo(() => {
    const filtered = searchQuery
      ? rows.filter(p =>
          p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : rows;
    return filtered.reduce<Record<string, PermissionRow[]>>((acc, p) => {
      if (!acc[p.group_name]) acc[p.group_name] = [];
      acc[p.group_name].push(p);
      return acc;
    }, {});
  }, [rows, searchQuery]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(p => p.is_enabled).length,
    revoked: rows.filter(p => !p.is_enabled).length,
    overrides: rows.filter(p => p.hasOverride).length,
  }), [rows]);

  // Super admin special view
  if (isSuperAdminTarget) {
    return (
      <div className="space-y-4 py-6">
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg mb-3">
            <Crown className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-amber-900">Super Admin</h3>
          <p className="text-sm text-amber-800/80 mt-1">
            <span className="font-semibold">{userName}</span> memiliki akses penuh ke seluruh sistem.
          </p>
          <p className="text-xs text-amber-700/70 mt-2">
            Izin Super Admin tidak dapat dibatasi.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-amber-200 text-xs font-medium text-amber-900">
            <Sparkles className="h-3 w-3" />
            Akses Penuh Aktif
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
        <Skeleton className="h-9 w-full" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">Aktif</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.active}</p>
            <p className="text-[10px] text-emerald-700/70">dari {stats.total} izin</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-red-50 to-rose-50 border-red-200 p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-red-700">Dicabut</span>
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">{stats.revoked}</p>
            <p className="text-[10px] text-red-700/70">tidak dapat akses</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700">Override</span>
            </div>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.overrides}</p>
            <p className="text-[10px] text-amber-700/70">diatur manual</p>
          </div>
        </div>

        {/* Search + reset */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari menu atau izin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          {stats.overrides > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Reset semua ${stats.overrides} pengaturan manual ke akses penuh?`)) {
                  resetAllMutation.mutate();
                }
              }}
              className="h-9 gap-1.5 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Permissions list */}
        <ScrollArea className="h-[55vh] pr-2 -mr-2">
          <div className="space-y-2">
            {Object.entries(grouped).length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Tidak ada izin yang cocok dengan pencarian.
              </div>
            )}
            {Object.entries(grouped).map(([group, items]) => {
              const groupActive = items.filter(p => p.is_enabled).length;
              const isCollapsed = collapsedGroups.has(group);
              const allEnabled = items.every(p => p.is_enabled);
              const allDisabled = items.every(p => !p.is_enabled);
              return (
                <div key={group} className="rounded-xl border bg-card overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-muted/40 to-muted/20 border-b">
                    <button
                      type="button"
                      className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const next = new Set(collapsedGroups);
                        if (next.has(group)) next.delete(group);
                        else next.add(group);
                        setCollapsedGroups(next);
                      }}
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="text-base">{GROUP_ICONS[group] || "📁"}</span>
                      <span className="text-sm font-semibold">{group}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {groupActive}/{items.length}
                      </Badge>
                    </button>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={allEnabled || groupBulkMutation.isPending}
                            onClick={() => groupBulkMutation.mutate({ groupItems: items, enable: true })}
                            className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            Aktif Semua
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Aktifkan semua izin di grup ini</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={allDisabled || groupBulkMutation.isPending}
                            onClick={() => groupBulkMutation.mutate({ groupItems: items, enable: false })}
                            className="h-7 px-2 text-xs text-red-700 hover:text-red-800 hover:bg-red-50"
                          >
                            Cabut Semua
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cabut semua izin di grup ini</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="divide-y divide-border/60">
                      {items.map((perm) => (
                        <div
                          key={perm.key}
                          className={cn(
                            "flex items-center justify-between gap-3 p-3 transition-colors",
                            perm.is_enabled ? "hover:bg-emerald-50/30" : "bg-red-50/30 hover:bg-red-50/50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label
                                htmlFor={`perm-${perm.key}`}
                                className="text-sm font-medium cursor-pointer leading-tight"
                              >
                                {perm.label}
                              </Label>
                              {perm.hasOverride && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-amber-300 bg-amber-50 text-amber-800">
                                      Manual
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Diatur manual oleh Super Admin</TooltipContent>
                                </Tooltip>
                              )}
                              {!perm.hasOverride && (
                                <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-muted-foreground border-border">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-mono">
                              {perm.key}
                            </p>
                            {perm.description && (
                              <p className="text-[11px] text-muted-foreground/80 mt-0.5 line-clamp-2">
                                {perm.description}
                              </p>
                            )}
                          </div>
                          <Switch
                            id={`perm-${perm.key}`}
                            checked={perm.is_enabled}
                            disabled={toggleMutation.isPending}
                            onCheckedChange={(val) =>
                              toggleMutation.mutate({
                                key: perm.key,
                                newValue: val,
                                oldValue: perm.is_enabled,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
