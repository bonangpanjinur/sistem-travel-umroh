# Audit Logging Fix - Comprehensive Documentation

## Problem Summary

The UDAC Audit & Monitoring page was returning a **400 Bad Request** error when trying to fetch audit logs, and permission changes were not being recorded in the `audit_logs` table.

### Root Causes Identified

1. **Invalid Query Relationship**: The frontend was querying `select("*, profiles(full_name)")` on the `audit_logs` table, but there was no foreign key relationship defined between `audit_logs` and `profiles` in the database schema. The relationship should have been `profiles:user_id(full_name)` to join through the `user_id` field.

2. **Schema Inconsistency**: The `audit_logs` table had multiple schema versions across different migrations:
   - Version 1 (20260121): Basic columns (`id`, `user_id`, `action`, `table_name`, `record_id`, `old_data`, `new_data`, `ip_address`, `user_agent`, `created_at`)
   - Version 2 (20260122015259): Added columns (`entity_name`, `entity_id`, `action_type`, `severity`, `branch_id`, `metadata`)
   - Version 3 (20260324000011): Different column naming (`resource_type`, `resource_id`, `old_values`, `new_values`)

3. **Silent Trigger Failures**: The permission change triggers (`handle_role_permissions_audit`) had exception handlers that silently swallowed errors (`EXCEPTION WHEN OTHERS THEN NULL`), so failures in inserting audit logs didn't surface to the frontend.

4. **Missing Audit Logging on Frontend**: The frontend permission management page (`AdminUdacManagement.tsx`) was not explicitly logging permission changes to the `audit_logs` table, relying only on database triggers which were failing silently.

5. **RLS Policy Issues**: The Row-Level Security (RLS) policies on `audit_logs` were inconsistent and may have blocked inserts from authenticated users.

## Solutions Implemented

### 1. Database Migration: Schema Unification (20260416000000_fix_audit_logs_final.sql)

**Purpose**: Ensure all necessary columns exist and are properly configured.

**Changes**:
- Added all missing columns to `audit_logs` table if they don't exist
- Ensured consistency across all previous schema versions
- Fixed column naming to use standard names: `old_data`, `new_data`, `action_type`, `severity`

**Key Columns in Final Schema**:
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- action (VARCHAR 100)
- table_name (VARCHAR 100)
- record_id (UUID)
- old_data (JSONB)
- new_data (JSONB)
- ip_address (VARCHAR 50)
- user_agent (TEXT)
- created_at (TIMESTAMPTZ)
- entity_name (VARCHAR 100) -- For semantic naming
- entity_id (UUID) -- For semantic IDs
- action_type (VARCHAR 50) -- CREATE, UPDATE, DELETE, PERMISSION_CHANGE, etc.
- severity (VARCHAR 20) -- info, warning, critical
- branch_id (UUID) -- For branch-specific auditing
- metadata (JSONB) -- For additional context
```

### 2. Fixed Audit Triggers

**Problem**: Triggers were silently failing due to schema mismatches.

**Solution**: Updated `handle_role_permissions_audit()` function to:
- Use explicit column mapping
- Log warnings instead of silently failing
- Include descriptive action messages
- Properly categorize action types

**Updated Trigger Function**:
```sql
CREATE OR REPLACE FUNCTION public.handle_role_permissions_audit()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
BEGIN
    _user_id := auth.uid();
    NEW.updated_at = NOW();
    NEW.updated_by = _user_id;
    
    INSERT INTO public.audit_logs (
        user_id, table_name, record_id, action, action_type,
        old_data, new_data, severity, created_at
    ) VALUES (
        _user_id, 'role_permissions', NEW.id,
        'Update role permission: ' || NEW.permission_key || ' for ' || NEW.role,
        CASE WHEN TG_OP = 'INSERT' THEN 'CREATE'
             WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
             WHEN TG_OP = 'DELETE' THEN 'DELETE'
             ELSE TG_OP END,
        to_jsonb(OLD), to_jsonb(NEW), 'warning', NOW()
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit log failed for role_permissions: %', SQLERRM;
    RETURN NEW;
END;
```

### 3. Fixed Frontend Query (AdminUdacAudit.tsx)

**Problem**: Invalid relationship query causing 400 error.

**Before**:
```typescript
.select("*, profiles(full_name)")
```

**After**:
```typescript
.select(`
  *,
  profiles:user_id (
    full_name
  )
`)
```

This properly specifies the join through the `user_id` foreign key.

### 4. Frontend Audit Logger Utility (src/lib/audit-logger.ts)

**Purpose**: Provide a centralized, reliable way to log audit events from the frontend.

**Key Functions**:
- `logAuditEvent(entry)` - Generic audit logging
- `logPermissionChange(role, permissionKey, oldValue, newValue)` - Permission-specific logging
- `logUserPermissionChange(userId, permissionKey, oldValue, newValue)` - User-level permissions
- `logDataModification(tableName, recordId, action, oldData, newData)` - Data changes
- `logBatchPermissionChanges(changes)` - Batch logging

**Benefits**:
- Centralized error handling
- Consistent logging format
- Fallback logging if triggers fail
- User context automatically captured

### 5. Updated Permission Management (AdminUdacManagement.tsx)

**Changes**:
- Imported `logPermissionChange` from audit logger
- Added explicit audit logging after permission upserts
- Logs both the old and new values
- Includes metadata for context

**Code Example**:
```typescript
// After upserting permission
if (upsertData && upsertData.length > 0) {
  await logPermissionChange(
    selectedRole,
    update.key,
    originalValue,
    update.isEnabled,
    { record_id: upsertData[0].id }
  );
}
```

### 6. Fixed RLS Policies

**Changes**:
- Ensured admins can view all audit logs
- Ensured authenticated users can insert audit logs
- Removed conflicting policies
- Used consistent policy naming

**Final Policies**:
```sql
-- View policy for admins
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner')
    )
);

-- Insert policy for authenticated users
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## How to Apply These Fixes

### Step 1: Apply Database Migration
```bash
# The migration file is already created:
# supabase/migrations/20260416000000_fix_audit_logs_final.sql

# Push to Supabase
supabase push
```

### Step 2: Deploy Frontend Changes
The following files have been updated:
- `src/pages/admin/AdminUdacAudit.tsx` - Fixed query
- `src/pages/admin/AdminUdacManagement.tsx` - Added audit logging
- `src/lib/audit-logger.ts` - New audit logger utility

### Step 3: Verify the Fix

1. **Test Audit Log Viewing**:
   - Navigate to Admin > UDAC > Audit Log
   - Should no longer show 400 error
   - Should display existing audit logs

2. **Test Permission Logging**:
   - Go to Admin > UDAC > Management
   - Change a permission for any role
   - Click Save
   - Navigate to Audit Log
   - New entry should appear with the permission change details

3. **Verify Audit Entry Contains**:
   - User name and ID
   - Timestamp
   - Table name: `role_permissions`
   - Action type: `PERMISSION_CHANGE`
   - Old and new values
   - Severity: `warning`

## Monitoring & Troubleshooting

### Check Audit Logs Directly
```sql
SELECT * FROM public.audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

### Check for Trigger Errors
```sql
-- View Supabase logs for warnings
-- Look for "Audit log failed for role_permissions" messages
```

### Verify RLS Policies
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'audit_logs';
```

### Test Audit Insert Directly
```sql
INSERT INTO public.audit_logs (
  user_id, table_name, record_id, action, action_type, severity
) VALUES (
  auth.uid(), 'test', gen_random_uuid(), 'test action', 'CREATE', 'info'
);
```

## Future Improvements

1. **Audit Log Retention**: Implement automatic cleanup of old audit logs (e.g., keep only 90 days)
2. **Audit Log Encryption**: Encrypt sensitive data in `old_data` and `new_data` fields
3. **Real-time Notifications**: Alert admins of critical permission changes
4. **Audit Report Generation**: Create automated reports of permission changes
5. **Compliance Export**: Generate compliance-ready audit reports for audits

## References

- **Supabase Relationships**: https://supabase.com/docs/reference/javascript/select
- **RLS Policies**: https://supabase.com/docs/guides/auth/row-level-security
- **Audit Best Practices**: https://owasp.org/www-community/attacks/Audit_Log_Injection

## Questions or Issues?

If you encounter any issues:
1. Check the Supabase logs for error messages
2. Verify the migration was applied: `SELECT * FROM information_schema.tables WHERE table_name = 'audit_logs'`
3. Check RLS policies are correctly configured
4. Ensure user has admin role to view audit logs
