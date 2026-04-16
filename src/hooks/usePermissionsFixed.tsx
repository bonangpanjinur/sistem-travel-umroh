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

export function usePermissionsFixed() {
  const { roles, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch granular permissions from role_permissions
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Use the RPC that handles both multiple roles and user-level overrides
      const { data, error } = await supabase.rpc('get_user_all_permissions', {
        _user_id: user.id
      });
      
      if (error) {
        console.error("Error fetching permissions:", error);
        throw error;
      }
      
      // Map RPC output to Permission interface for compatibility
      return (data as any[]).map(p => ({
        permission_key: p.permission_key,
        is_enabled: p.is_enabled,
        role: p.source === 'role' ? 'dynamic' : 'user'
      })) as Permission[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time subscription to role_permissions changes
  useEffect(() => {
    if (!user || roles.length === 0) return;

    // Use a unique channel name for each hook instance to avoid "cannot add postgres_changes after subscribe" errors.
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
          console.log("Role permissions changed, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
          // PENTING: Juga invalidate UDAC cache agar sidebar refresh
          queryClient.invalidateQueries({ queryKey: ["udac-permissions"] });
        }
      );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, roles.join(','), queryClient]);

  /**
   * Check if the user has a specific permission
   * Supports fallback logic: if permission ends with .view_own, also check for .view_branch, .view_all, and .view
   * Super admin and owner always have full access
   */
  const hasPermission = (permissionKey: string): boolean => {
    // Super admin and owner always have full access
    if (roles.includes("super_admin") || roles.includes("owner")) {
      return true;
    }
    
    // Check if user has the specific granular permission
    const hasExactPermission = permissions.some(p => p.permission_key === permissionKey && p.is_enabled);
    if (hasExactPermission) return true;

    // Enhanced permission check: Support fallback for view_own -> view_branch/view_all/view
    // This aligns sidebar logic with route guard logic
    if (permissionKey.endsWith('.view_own')) {
      const base = permissionKey.replace('.view_own', '');
      return permissions.some(p => 
        (p.permission_key === `${base}.view_branch` || 
         p.permission_key === `${base}.view_all` ||
         p.permission_key === `${base}.view`) && 
        p.is_enabled
      );
    }

    return false;
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

    return permissionKeys.some(key => hasPermission(key));
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

    return permissionKeys.every(key => hasPermission(key));
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
