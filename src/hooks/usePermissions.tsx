import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { AppRole } from "@/types/database";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface Permission {
  permission_key: string;
  is_enabled: boolean;
  role: AppRole;
}

export function usePermissions() {
  const { roles, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch granular permissions from role_permissions
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
      return data as Permission[];
    },
    enabled: !!user && roles.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time subscription to role_permissions changes
  useEffect(() => {
    if (!user || roles.length === 0) return;

    // Use a unique channel name for each hook instance to avoid "cannot add postgres_changes after subscribe" errors.
    // This happens when multiple components use this hook and try to attach listeners to the same channel name.
    const channel = supabase
      .channel(`role-permissions-sync-${crypto.randomUUID()}`)
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
      );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, roles.join(','), queryClient]);

  /**
   * Check if the user has a specific permission
   * Supports both module-level (e.g., 'bookings') and granular (e.g., 'bookings.view') permissions
   * Super admin and owner always have full access
   */
  const hasPermission = (permissionKey: string): boolean => {
    // Super admin and owner always have full access
    if (roles.includes("super_admin") || roles.includes("owner")) {
      return true;
    }
    
    // Check if user has the specific granular permission
    return permissions.some(p => p.permission_key === permissionKey && p.is_enabled);
  };

  /**
   * Check if the user has any of the specified permissions
   * Useful for checking if user can perform any action in a group
   */
  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    // Super admin and owner always have full access
    if (roles.includes("super_admin") || roles.includes("owner")) {
      return true;
    }

    return permissionKeys.some(key => 
      permissions.some(p => p.permission_key === key && p.is_enabled)
    );
  };

  /**
   * Check if the user has all of the specified permissions
   * Useful for checking if user can perform multiple actions
   */
  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    // Super admin and owner always have full access
    if (roles.includes("super_admin") || roles.includes("owner")) {
      return true;
    }

    return permissionKeys.every(key =>
      permissions.some(p => p.permission_key === key && p.is_enabled)
    );
  };

  /**
   * Get all permissions for the current user
   */
  const getAllPermissions = (): string[] => {
    if (roles.includes("super_admin") || roles.includes("owner")) {
      return ["*"]; // Wildcard for all permissions
    }

    return permissions
      .filter(p => p.is_enabled)
      .map(p => p.permission_key);
  };

  /**
   * Check if user has permission for a specific CRUD operation on a resource
   * e.g., canPerformAction('bookings', 'create') checks for 'bookings.create'
   */
  const canPerformAction = (resource: string, action: 'view' | 'create' | 'edit' | 'delete' | 'verify'): boolean => {
    const permissionKey = `${resource}.${action}`;
    return hasPermission(permissionKey);
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAllPermissions,
    canPerformAction,
  };
}
