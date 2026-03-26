/**
 * User Permission Service
 * 
 * Service untuk mengelola hak akses granular per pengguna.
 * Memungkinkan grant/revoke permission langsung ke pengguna individu,
 * melampaui hak akses berbasis peran.
 */

import { supabase } from '@/integrations/supabase/client';

export interface UserPermission {
  user_id: string;
  permission_key: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionWithDetails {
  permission_key: string;
  label: string;
  group_name: string;
  is_enabled: boolean;
  source: 'user' | 'role';
}

export interface PermissionAuditLog {
  id: number;
  user_id: string;
  permission_key: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_is_enabled: boolean | null;
  new_is_enabled: boolean | null;
  changed_by: string;
  changed_at: string;
}

/**
 * Grant a specific permission to a user
 */
export async function grantUserPermission(
  userId: string,
  permissionKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('grant_user_permission', {
      _user_id: userId,
      _permission_key: permissionKey
    });

    if (error) {
      console.error('Error granting permission:', error);
      return {
        success: false,
        error: error.message || 'Gagal memberikan izin'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in grantUserPermission:', error);
    return {
      success: false,
      error: 'Error granting permission'
    };
  }
}

/**
 * Revoke a specific permission from a user
 */
export async function revokeUserPermission(
  userId: string,
  permissionKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('revoke_user_permission', {
      _user_id: userId,
      _permission_key: permissionKey
    });

    if (error) {
      console.error('Error revoking permission:', error);
      return {
        success: false,
        error: error.message || 'Gagal mencabut izin'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in revokeUserPermission:', error);
    return {
      success: false,
      error: 'Error revoking permission'
    };
  }
}

/**
 * Get all permissions for a specific user (including role-based and user-level)
 */
export async function getUserAllPermissions(
  userId: string
): Promise<PermissionWithDetails[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_all_permissions', {
      _user_id: userId
    });

    if (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAllPermissions:', error);
    return [];
  }
}

/**
 * Get user-level permissions only (excluding role-based)
 */
export async function getUserLevelPermissions(
  userId: string
): Promise<UserPermission[]> {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user-level permissions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserLevelPermissions:', error);
    return [];
  }
}

/**
 * Get permission audit logs for a specific user
 */
export async function getUserPermissionAuditLogs(
  userId: string,
  limit: number = 100
): Promise<PermissionAuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('user_permissions_audit')
      .select('*')
      .eq('user_id', userId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserPermissionAuditLogs:', error);
    return [];
  }
}

/**
 * Bulk grant permissions to a user
 */
export async function bulkGrantPermissions(
  userId: string,
  permissionKeys: string[]
): Promise<{ success: boolean; error?: string; granted: number }> {
  try {
    const results = await Promise.all(
      permissionKeys.map(key => grantUserPermission(userId, key))
    );

    const failedCount = results.filter(r => !r.success).length;

    if (failedCount > 0) {
      return {
        success: false,
        error: `${failedCount} dari ${permissionKeys.length} izin gagal diberikan`,
        granted: permissionKeys.length - failedCount
      };
    }

    return {
      success: true,
      granted: permissionKeys.length
    };
  } catch (error) {
    console.error('Error in bulkGrantPermissions:', error);
    return {
      success: false,
      error: 'Error granting permissions',
      granted: 0
    };
  }
}

/**
 * Bulk revoke permissions from a user
 */
export async function bulkRevokePermissions(
  userId: string,
  permissionKeys: string[]
): Promise<{ success: boolean; error?: string; revoked: number }> {
  try {
    const results = await Promise.all(
      permissionKeys.map(key => revokeUserPermission(userId, key))
    );

    const failedCount = results.filter(r => !r.success).length;

    if (failedCount > 0) {
      return {
        success: false,
        error: `${failedCount} dari ${permissionKeys.length} izin gagal dicabut`,
        revoked: permissionKeys.length - failedCount
      };
    }

    return {
      success: true,
      revoked: permissionKeys.length
    };
  } catch (error) {
    console.error('Error in bulkRevokePermissions:', error);
    return {
      success: false,
      error: 'Error revoking permissions',
      revoked: 0
    };
  }
}

/**
 * Get all available permissions grouped by category
 */
export async function getAllPermissions(): Promise<
  Record<string, Array<{ key: string; label: string; description: string }>>
> {
  try {
    const { data, error } = await supabase
      .from('permissions_list')
      .select('key, label, group_name, description')
      .order('group_name', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error getting permissions:', error);
      return {};
    }

    // Group by group_name
    const grouped: Record<
      string,
      Array<{ key: string; label: string; description: string }>
    > = {};

    data?.forEach(perm => {
      if (!grouped[perm.group_name]) {
        grouped[perm.group_name] = [];
      }
      grouped[perm.group_name].push({
        key: perm.key,
        label: perm.label,
        description: perm.description
      });
    });

    return grouped;
  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    return {};
  }
}

/**
 * Sync user permissions from role to user level
 * Useful when transitioning from role-based to user-based permissions
 */
export async function syncUserPermissionsFromRole(
  userId: string
): Promise<{ success: boolean; error?: string; synced: number }> {
  try {
    // Get user's role-based permissions
    const { data: rolePermissions, error: roleError } = await supabase
      .from('user_roles')
      .select(
        `
        role,
        role_permissions (
          permission_key,
          is_enabled
        )
      `
      )
      .eq('user_id', userId);

    if (roleError) {
      return {
        success: false,
        error: 'Gagal mengambil permission berbasis role',
        synced: 0
      };
    }

    // Collect all permissions from roles
    const permissionsToSync = new Set<string>();
    rolePermissions?.forEach(ur => {
      ur.role_permissions?.forEach(rp => {
        if (rp.is_enabled) {
          permissionsToSync.add(rp.permission_key);
        }
      });
    });

    // Grant all permissions to user
    const result = await bulkGrantPermissions(
      userId,
      Array.from(permissionsToSync)
    );

    return {
      success: result.success,
      error: result.error,
      synced: result.granted
    };
  } catch (error) {
    console.error('Error in syncUserPermissionsFromRole:', error);
    return {
      success: false,
      error: 'Error syncing permissions',
      synced: 0
    };
  }
}

/**
 * Compare user permissions with role permissions
 * Useful for identifying overrides
 */
export async function compareUserAndRolePermissions(
  userId: string
): Promise<{
  rolePermissions: string[];
  userOverrides: string[];
  userRevokes: string[];
}> {
  try {
    // Get role-based permissions
    const { data: rolePerms } = await supabase
      .from('user_roles')
      .select(
        `
        role,
        role_permissions (
          permission_key,
          is_enabled
        )
      `
      )
      .eq('user_id', userId);

    const rolePermissionKeys = new Set<string>();
    rolePerms?.forEach(ur => {
      ur.role_permissions?.forEach(rp => {
        if (rp.is_enabled) {
          rolePermissionKeys.add(rp.permission_key);
        }
      });
    });

    // Get user-level permissions
    const userPerms = await getUserLevelPermissions(userId);

    const userOverrides = userPerms
      .filter(p => p.is_enabled && !rolePermissionKeys.has(p.permission_key))
      .map(p => p.permission_key);

    const userRevokes = userPerms
      .filter(p => !p.is_enabled && rolePermissionKeys.has(p.permission_key))
      .map(p => p.permission_key);

    return {
      rolePermissions: Array.from(rolePermissionKeys),
      userOverrides,
      userRevokes
    };
  } catch (error) {
    console.error('Error in compareUserAndRolePermissions:', error);
    return {
      rolePermissions: [],
      userOverrides: [],
      userRevokes: []
    };
  }
}
