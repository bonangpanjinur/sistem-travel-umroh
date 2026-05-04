/**
 * Audit Logger Utility
 * 
 * Provides centralized audit logging for permission changes and sensitive operations.
 * This ensures all permission changes are properly tracked in the audit_logs table.
 */

import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  table_name: string;
  record_id?: string;
  action: string;
  action_type: "CREATE" | "UPDATE" | "DELETE" | "PERMISSION_CHANGE" | "VERIFY" | "APPROVE" | "REJECT" | "ACCESS_ATTEMPT";
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, any>;
}

/**
 * Log an audit event
 * @param entry The audit log entry to record
 * @returns Promise with the audit log ID if successful
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<string | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      console.warn("Cannot log audit event: user not authenticated");
      return null;
    }

    // Capture enriched context (User Agent, IP, etc.)
    const context = {
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      platform: typeof window !== 'undefined' ? window.navigator.platform : 'N/A',
      language: typeof window !== 'undefined' ? window.navigator.language : 'N/A',
      ...entry.metadata
    };

    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        user_id: userId,
        table_name: entry.table_name,
        record_id: entry.record_id,
        action: entry.action,
        action_type: entry.action_type,
        old_data: entry.old_data || null,
        new_data: entry.new_data || null,
        severity: entry.severity || "info",
        metadata: context,
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Failed to log audit event:", error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0].id;
    }

    return null;
  } catch (err) {
    console.error("Audit logging error:", err);
    return null;
  }
}


/**
 * Log user permission change
 * @param userId The user whose permission was changed
 * @param permissionKey The permission key
 * @param oldValue The old enabled status
 * @param newValue The new enabled status
 * @param reason The reason for the change
 */
export async function logUserPermissionChange(
  userId: string,
  permissionKey: string,
  oldValue: boolean,
  newValue: boolean,
  reason?: string
): Promise<string | null> {
  return logAuditEvent({
    table_name: "user_permissions",
    record_id: userId,
    action: `User permission '${permissionKey}' changed from ${oldValue} to ${newValue}`,
    action_type: "PERMISSION_CHANGE",
    old_data: { is_enabled: oldValue },
    new_data: { is_enabled: newValue },
    severity: "warning",
    metadata: {
      user_id: userId,
      permission_key: permissionKey,
      reason: reason || "No reason provided",
    },
  });
}

/**
 * Log a data modification (create, update, delete)
 * @param tableName The table that was modified
 * @param recordId The record ID
 * @param action The action type
 * @param oldData The old data (for updates/deletes)
 * @param newData The new data (for creates/updates)
 */
/**
 * Log a role change for a user
 * @param userId The user whose role was changed
 * @param oldRoles The previous roles
 * @param newRoles The new roles
 * @param reason The reason for the change
 */
export async function logUserRoleChange(
  userId: string,
  oldRoles: string[],
  newRoles: string[],
  reason?: string
): Promise<string | null> {
  return logAuditEvent({
    table_name: "user_roles",
    record_id: userId,
    action: `User roles changed from [${oldRoles.join(', ')}] to [${newRoles.join(', ')}]`,
    action_type: "UPDATE",
    old_data: { roles: oldRoles },
    new_data: { roles: newRoles },
    severity: "warning",
    metadata: {
      user_id: userId,
      reason: reason || "No reason provided",
    },
  });
}

export async function logDataModification(
  tableName: string,
  recordId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  oldData?: Record<string, any>,
  newData?: Record<string, any>
): Promise<string | null> {
  return logAuditEvent({
    table_name: tableName,
    record_id: recordId,
    action: `${action} on ${tableName} (ID: ${recordId})`,
    action_type: action,
    old_data: oldData,
    new_data: newData,
    severity: action === "DELETE" ? "critical" : "info",
  });
}

