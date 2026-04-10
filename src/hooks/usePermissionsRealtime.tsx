import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { AppRole } from "@/types/database";

interface RolePermission {
  id: string;
  role: AppRole;
  permission_key: string;
  is_enabled: boolean;
  updated_at?: string;
  updated_by?: string;
}

/**
 * Hook for real-time permission updates using Supabase Realtime
 * 
 * This hook subscribes to changes in the role_permissions table
 * and automatically invalidates the cache when permissions change.
 * 
 * Usage:
 * const { isSubscribed } = usePermissionsRealtime();
 */
export function usePermissionsRealtime() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!user || !roles || roles.length === 0) {
      return;
    }

    // Use unique channel names to avoid collisions between multiple hook instances
    const channel = supabase
      .channel(`role-permissions-changes-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "role_permissions",
          filter: `role=in.(${roles.map(r => `"${r}"`).join(",")})`,
        },
        (payload) => {
          console.log("Permission change detected:", payload);
          
          // Invalidate user permissions cache
          queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
          
          // Invalidate role permissions cache
          queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
          
          // Update last update timestamp
          setLastUpdate(new Date());
          
          // Show notification to user
          const action = payload.eventType;
          const permissionKey = (payload.new as RolePermission)?.permission_key || 
                               (payload.old as RolePermission)?.permission_key;
          
          console.log(`Permission ${action}: ${permissionKey}`);
        }
      );
    
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Subscribed to permission changes");
        setIsSubscribed(true);
      } else if (status === "CLOSED") {
        console.log("Unsubscribed from permission changes");
        setIsSubscribed(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roles, queryClient]);

  return {
    isSubscribed,
    lastUpdate,
  };
}

/**
 * Hook to listen for audit log changes
 * Useful for showing who changed permissions and when
 */
export function usePermissionAuditLog() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Use unique channel names to avoid collisions
    const channel = supabase
      .channel(`audit-logs-changes-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: "table_name=eq.role_permissions",
        },
        (payload) => {
          console.log("Audit log created:", payload);
          setAuditLogs((prev) => [payload.new, ...prev].slice(0, 50)); // Keep last 50 logs
        }
      );
    
    channel.subscribe((status) => {
      setIsSubscribed(status === "SUBSCRIBED");
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    auditLogs,
    isSubscribed,
  };
}
