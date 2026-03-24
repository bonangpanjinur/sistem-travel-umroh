import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { AppRole } from "@/types/database";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function usePermissions() {
  const { roles, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions", roles],
    queryFn: async () => {
      if (!roles || roles.length === 0) return [];
      
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_key, is_enabled, role")
        .in("role", roles)
        .eq("is_enabled", true);
      
      if (error) {
        console.error("Error fetching permissions:", error);
        throw error;
      }
      return data;
    },
    enabled: !!user && roles.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time subscription to role_permissions changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "role_permissions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const hasPermission = (permissionKey: string): boolean => {
    // Super admin and owner always have full access
    if (roles.includes("super_admin") || roles.includes("owner")) {
      return true;
    }
    
    return permissions.some(p => p.permission_key === permissionKey);
  };

  return {
    permissions,
    isLoading,
    hasPermission,
  };
}
