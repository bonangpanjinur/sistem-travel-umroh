import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldOff } from "lucide-react";
import { logUserPermissionChange } from "@/lib/audit-logger";

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

export function UserPermissionsManager({ userId, userName }: UserPermissionsManagerProps) {
  const queryClient = useQueryClient();

  // Fetch all permissions
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

  // Fetch user's overrides
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
        // Create override to revoke
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id: userId, permission_key: permissionKey, is_enabled: false } as any);
        if (error) throw error;
      } else if (existing && newValue === true) {
        // Remove override (restore default allow)
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
      toast.success("Izin berhasil diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui izin");
    },
  });

  const isLoading = loadingPerms || loadingOverrides;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Belum ada data permission. Sinkronkan menu terlebih dahulu.
      </p>
    );
  }

  // Group permissions
  const grouped = permissions.reduce<Record<string, PermissionItem[]>>((acc, p) => {
    if (!acc[p.group_name]) acc[p.group_name] = [];
    acc[p.group_name].push(p);
    return acc;
  }, {});

  const getIsEnabled = (key: string): boolean => {
    const override = overrides.find((o) => o.permission_key === key);
    return override ? override.is_enabled : true; // default allow
  };

  const revokedCount = overrides.filter((o) => !o.is_enabled).length;

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Default: semua menu aktif. Matikan toggle untuk mencabut akses.
        </p>
        {revokedCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <ShieldOff className="h-3 w-3" />
            {revokedCount} dicabut
          </Badge>
        )}
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            {group}
          </h4>
          <div className="space-y-1 pl-1">
            {items.map((perm) => {
              const enabled = getIsEnabled(perm.key);
              return (
                <div
                  key={perm.key}
                  className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${
                    enabled ? "bg-background" : "bg-destructive/5 border border-destructive/20"
                  }`}
                >
                  <Label htmlFor={`perm-${perm.key}`} className="text-sm cursor-pointer flex-1">
                    {perm.label}
                  </Label>
                  <Switch
                    id={`perm-${perm.key}`}
                    checked={enabled}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={(val) =>
                      toggleMutation.mutate({ permissionKey: perm.key, newValue: val })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
