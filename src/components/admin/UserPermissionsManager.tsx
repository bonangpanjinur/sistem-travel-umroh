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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import { logUserPermissionChange } from "@/lib/audit-logger";
import { cn } from "@/lib/utils";

interface UserPermissionsManagerProps {
  userId: string;
  userName: string;
}

interface PermissionItem {
  key: string;
  label: string;
  group_name: string;
  description: string | null;
}

interface UserPermissionOverride {
  permission_key: string;
  is_enabled: boolean;
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
};

export function UserPermissionsManager({ userId, userName }: UserPermissionsManagerProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ["permissions-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions_list")
        .select("key, label, group_name, description")
        .order("group_name")
        .order("label");
      if (error) throw error;
      return (data || []) as PermissionItem[];
    },
  });

  const { data: overrides = [], isLoading: loadingOverrides } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission_key, is_enabled")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []) as UserPermissionOverride[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ permissionKey, newValue }: { permissionKey: string; newValue: boolean }) => {
      const existing = overrides.find((o) => o.permission_key === permissionKey);

      if (!existing && newValue === false) {
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id: userId, permission_key: permissionKey, is_enabled: false } as any);
        if (error) throw error;
      } else if (existing && newValue === true) {
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission_key", permissionKey);
        if (error) throw error;
      } else if (existing) {
        const { error } = await supabase
          .from("user_permissions")
          .update({ is_enabled: newValue } as any)
          .eq("user_id", userId)
          .eq("permission_key", permissionKey);
        if (error) throw error;
      }

      await logUserPermissionChange(
        userId,
        permissionKey,
        existing ? existing.is_enabled : true,
        newValue,
        `Super Admin mengubah izin untuk ${userName}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
    },
    onError: () => {
      toast.error("Gagal memperbarui izin");
    },
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ keys, enable }: { keys: string[]; enable: boolean }) => {
      for (const key of keys) {
        const existing = overrides.find((o) => o.permission_key === key);
        if (enable) {
          if (existing) {
            await supabase
              .from("user_permissions")
              .delete()
              .eq("user_id", userId)
              .eq("permission_key", key);
          }
        } else {
          if (!existing) {
            await supabase
              .from("user_permissions")
              .insert({ user_id: userId, permission_key: key, is_enabled: false } as any);
          } else if (existing.is_enabled) {
            await supabase
              .from("user_permissions")
              .update({ is_enabled: false } as any)
              .eq("user_id", userId)
              .eq("permission_key", key);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
      toast.success("Izin grup berhasil diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui izin grup");
    },
  });

  const isLoading = loadingPerms || loadingOverrides;

  const getIsEnabled = (key: string): boolean => {
    const override = overrides.find((o) => o.permission_key === key);
    return override ? override.is_enabled : true;
  };

  const grouped = useMemo(() => {
    const filtered = searchQuery
      ? permissions.filter(
          (p) =>
            p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      : permissions;

    return filtered.reduce<Record<string, PermissionItem[]>>((acc, p) => {
      if (!acc[p.group_name]) acc[p.group_name] = [];
      acc[p.group_name].push(p);
      return acc;
    }, {});
  }, [permissions, searchQuery]);

  const revokedCount = overrides.filter((o) => !o.is_enabled).length;
  const totalCount = permissions.length;
  const activeCount = totalCount - revokedCount;

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const getGroupStats = (items: PermissionItem[]) => {
    const revoked = items.filter((p) => !getIsEnabled(p.key)).length;
    return { total: items.length, active: items.length - revoked, revoked };
  };

  const toggleAllInGroup = (groupItems: PermissionItem[], enable: boolean) => {
    const keys = groupItems.map((p) => p.key);
    bulkToggleMutation.mutate({ keys, enable });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Belum ada data permission. Sinkronkan menu terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium">{activeCount} Aktif</span>
        </Badge>
        {revokedCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5">
            <XCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{revokedCount} Dicabut</span>
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          dari {totalCount} total izin
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari izin akses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Info text */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Default: semua menu <strong>aktif</strong>. Matikan toggle untuk mencabut akses user ini.
      </p>

      {/* Permission Groups */}
      <ScrollArea className="h-[50vh] pr-2">
        <div className="space-y-2">
          {Object.entries(grouped).map(([group, items]) => {
            const stats = getGroupStats(items);
            const isCollapsed = collapsedGroups.has(group);
            const icon = GROUP_ICONS[group] || "📁";
            const allEnabled = stats.revoked === 0;
            const allDisabled = stats.active === 0;

            return (
              <div
                key={group}
                className={cn(
                  "rounded-lg border transition-colors",
                  stats.revoked > 0
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-card"
                )}
              >
                {/* Group Header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-accent/50 rounded-t-lg transition-colors"
                  onClick={() => toggleGroup(group)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-base mr-1">{icon}</span>
                  <span className="text-sm font-semibold flex-1">{group}</span>
                  <div className="flex items-center gap-1.5">
                    {stats.revoked > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                        {stats.revoked} off
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {stats.active}/{stats.total}
                    </span>
                  </div>
                </div>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="px-2 pb-2 space-y-0.5">
                    {/* Bulk Actions */}
                    <div className="flex items-center gap-1 px-2 py-1.5 mb-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        disabled={allEnabled || bulkToggleMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInGroup(items, true);
                        }}
                      >
                        <ToggleRight className="h-3 w-3 mr-1" />
                        Aktifkan Semua
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={allDisabled || bulkToggleMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInGroup(items, false);
                        }}
                      >
                        <ToggleLeft className="h-3 w-3 mr-1" />
                        Nonaktifkan Semua
                      </Button>
                    </div>

                    <Separator className="mb-1" />

                    {items.map((perm) => {
                      const enabled = getIsEnabled(perm.key);
                      return (
                        <div
                          key={perm.key}
                          className={cn(
                            "flex items-center gap-3 py-2 px-3 rounded-md transition-all",
                            enabled
                              ? "hover:bg-accent/50"
                              : "bg-destructive/8 border border-destructive/15"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <Label
                              htmlFor={`perm-${perm.key}`}
                              className={cn(
                                "text-sm cursor-pointer block",
                                !enabled && "text-muted-foreground line-through"
                              )}
                            >
                              {perm.label}
                            </Label>
                            {perm.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {perm.description}
                              </p>
                            )}
                          </div>
                          <Switch
                            id={`perm-${perm.key}`}
                            checked={enabled}
                            disabled={toggleMutation.isPending || bulkToggleMutation.isPending}
                            onCheckedChange={(val) =>
                              toggleMutation.mutate({ permissionKey: perm.key, newValue: val })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(grouped).length === 0 && searchQuery && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Tidak ditemukan izin untuk "{searchQuery}"
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
