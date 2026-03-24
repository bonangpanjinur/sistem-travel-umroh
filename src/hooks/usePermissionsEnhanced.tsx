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

interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string; // Alasan mengapa akses ditolak
}

/**
 * Enhanced usePermissions Hook
 * 
 * Provides comprehensive permission checking with:
 * - Granular action-level permissions (resource.action format)
 * - Branch-level and own-data level permissions
 * - Detailed permission check results with reasons
 * - Real-time permission updates
 * - Audit logging for sensitive actions
 */
export function usePermissionsEnhanced() {
  const { roles, user, branch_id } = useAuth();
  const queryClient = useQueryClient();

  // Fetch granular permissions from role_permissions
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions-enhanced", roles],
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
    if (!user) return;

    const channel = supabase
      .channel("schema-db-changes-enhanced")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "role_permissions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-permissions-enhanced"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
  const canPerformAction = (resource: string, action: 'view' | 'create' | 'edit' | 'delete' | 'verify' | 'approve' | 'refund'): boolean => {
    const permissionKey = `${resource}.${action}`;
    return hasPermission(permissionKey);
  };

  /**
   * Check if user can perform a specific action with detailed reason
   * Returns object with hasPermission boolean and reason for denial
   */
  const canPerformActionWithReason = (resource: string, action: string): PermissionCheckResult => {
    // Check if super admin or owner
    if (roles.includes("super_admin") || roles.includes("owner")) {
      return { hasPermission: true };
    }

    const permissionKey = `${resource}.${action}`;
    const hasAccess = hasPermission(permissionKey);

    if (!hasAccess) {
      return {
        hasPermission: false,
        reason: `Anda tidak memiliki izin untuk ${action} ${resource}`
      };
    }

    return { hasPermission: true };
  };

  /**
   * Check if user can view data with specific scope
   * Supports view_all, view_branch, view_own patterns
   */
  const canViewWithScope = (resource: string, scope: 'all' | 'branch' | 'own'): boolean => {
    const permissionKey = `${resource}.view_${scope}`;
    return hasPermission(permissionKey);
  };

  /**
   * Get the highest permission level for a resource
   * Returns 'all', 'branch', 'own', or null
   */
  const getViewPermissionLevel = (resource: string): 'all' | 'branch' | 'own' | null => {
    if (canViewWithScope(resource, 'all')) return 'all';
    if (canViewWithScope(resource, 'branch')) return 'branch';
    if (canViewWithScope(resource, 'own')) return 'own';
    return null;
  };

  /**
   * Check if user is restricted to their branch
   * Returns true if user can only view branch data (not all)
   */
  const isRestrictedToBranch = (resource: string): boolean => {
    const level = getViewPermissionLevel(resource);
    return level === 'branch' && !canViewWithScope(resource, 'all');
  };

  /**
   * Check if user is restricted to their own data
   * Returns true if user can only view own data (not branch or all)
   */
  const isRestrictedToOwn = (resource: string): boolean => {
    const level = getViewPermissionLevel(resource);
    return level === 'own' && !canViewWithScope(resource, 'branch') && !canViewWithScope(resource, 'all');
  };

  /**
   * Log an action for audit trail
   * Useful for tracking sensitive operations like payments.verify, bookings.delete, etc.
   */
  const logAuditAction = async (
    action: string,
    resourceType: string,
    resourceId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase
        .rpc('log_audit_action', {
          _action: action,
          _resource_type: resourceType,
          _resource_id: resourceId,
          _old_values: oldValues ? JSON.stringify(oldValues) : null,
          _new_values: newValues ? JSON.stringify(newValues) : null
        });

      if (error) {
        console.error("Error logging audit action:", error);
      }
    } catch (err) {
      console.error("Error logging audit action:", err);
    }
  };

  /**
   * Check if user can perform sensitive action and log it
   */
  const performSensitiveAction = async (
    resource: string,
    action: string,
    resourceId: string,
    callback: () => Promise<any>,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ) => {
    const permissionCheck = canPerformActionWithReason(resource, action);

    if (!permissionCheck.hasPermission) {
      throw new Error(permissionCheck.reason || "Akses ditolak");
    }

    try {
      const result = await callback();

      // Log the action
      await logAuditAction(
        `${resource.toUpperCase()}_${action.toUpperCase()}`,
        resource,
        resourceId,
        oldValues,
        newValues
      );

      return result;
    } catch (error) {
      console.error(`Error performing ${action} on ${resource}:`, error);
      throw error;
    }
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAllPermissions,
    canPerformAction,
    canPerformActionWithReason,
    canViewWithScope,
    getViewPermissionLevel,
    isRestrictedToBranch,
    isRestrictedToOwn,
    logAuditAction,
    performSensitiveAction,
    userBranchId: branch_id,
  };
}
