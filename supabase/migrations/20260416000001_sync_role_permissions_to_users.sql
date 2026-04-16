-- Migration: 20260416000001_sync_role_permissions_to_users.sql
-- Description: Add function and trigger to automatically sync role_permissions changes to user_permissions

-- =====================================================
-- 1. FUNCTION: sync_role_permissions_to_users
-- =====================================================
-- This function synchronizes permissions from a specific role to all users
-- who have that role. It ensures that changes in role templates are reflected
-- in individual user permissions.

CREATE OR REPLACE FUNCTION public.sync_role_permissions_to_users(_role_name VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- Iterate over all users who have the specified role
    FOR _user_id IN (SELECT user_id FROM public.user_roles WHERE role = _role_name)
    LOOP
        -- Delete existing user permissions that originated from this role
        -- This is a simplification; a more complex logic might merge or prioritize
        -- For now, we assume role changes should overwrite previous role-derived permissions
        DELETE FROM public.user_permissions
        WHERE user_id = _user_id
          AND permission_key IN (SELECT permission_key FROM public.role_permissions WHERE role = _role_name);

        -- Re-insert/upsert permissions for this user based on the updated role_permissions
        INSERT INTO public.user_permissions (user_id, permission_key, is_enabled)
        SELECT _user_id, rp.permission_key, rp.is_enabled
        FROM public.role_permissions rp
        WHERE rp.role = _role_name
        ON CONFLICT (user_id, permission_key) DO UPDATE SET
            is_enabled = EXCLUDED.is_enabled,
            updated_at = now();

        -- Also, ensure that any user-level overrides for permissions *not* in this role
        -- are not inadvertently removed if they were not part of the role's original set.
        -- This function primarily focuses on syncing permissions *from* the role.
        -- For a full reset to role defaults, reset_user_permissions_to_role_defaults should be used.

    END LOOP;
END;
$$;

-- =====================================================
-- 2. TRIGGER: trigger_sync_role_permissions
-- =====================================================
-- This trigger fires after any INSERT, UPDATE, or DELETE on role_permissions
-- to automatically call the sync_role_permissions_to_users function.

CREATE OR REPLACE FUNCTION public.handle_role_permissions_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- When a role permission is deleted, sync for the old role
        PERFORM public.sync_role_permissions_to_users(OLD.role);
    ELSE
        -- When a role permission is inserted or updated, sync for the new role
        PERFORM public.sync_role_permissions_to_users(NEW.role);
    END IF;
    RETURN NULL; -- Result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_permissions ON public.role_permissions;

CREATE TRIGGER trigger_sync_role_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_role_permissions_change();

-- =====================================================
-- 3. GRANT EXECUTE on new function
-- =====================================================
GRANT EXECUTE ON FUNCTION public.sync_role_permissions_to_users(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_role_permissions_change() TO authenticated;
