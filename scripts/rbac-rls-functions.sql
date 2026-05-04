-- 1. Function to check user permission in SQL
-- This can be used in RLS policies for consistent logic
CREATE OR REPLACE FUNCTION auth.check_user_permission(_permission_key text)
RETURNS boolean AS $$
DECLARE
    _user_id uuid;
    _is_super_admin boolean;
    _has_permission boolean;
BEGIN
    _user_id := auth.uid();
    IF _user_id IS NULL THEN RETURN false; END IF;

    -- Check if super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = 'super_admin'
    ) INTO _is_super_admin;

    IF _is_super_admin THEN RETURN true; END IF;

    -- Check effective permissions (role permissions + user overrides)
    -- This assumes the presence of a materialized view or complex join
    -- For simplicity in this SQL, we check the user_permissions override first
    SELECT is_enabled INTO _has_permission
    FROM public.user_permissions
    WHERE user_id = _user_id AND permission_key = _permission_key;

    IF _has_permission IS NOT NULL THEN
        RETURN _has_permission;
    END IF;

    -- If no override, check role-based permissions
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = _user_id AND rp.permission_key = _permission_key
    ) INTO _has_permission;

    RETURN _has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Improved get_user_effective_permissions_v2 to support role hierarchy
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions_v2(_user_id uuid, _roles text[])
RETURNS TABLE(permission_key text) AS $$
BEGIN
    RETURN QUERY
    WITH all_roles AS (
        SELECT unnest(_roles) as role
    ),
    role_perms AS (
        SELECT DISTINCT rp.permission_key
        FROM public.role_permissions rp
        JOIN all_roles ar ON rp.role = ar.role
    ),
    user_overrides AS (
        SELECT up.permission_key, up.is_enabled
        FROM public.user_permissions up
        WHERE up.user_id = _user_id
    )
    SELECT rp.permission_key
    FROM role_perms rp
    LEFT JOIN user_overrides uo ON rp.permission_key = uo.permission_key
    WHERE uo.is_enabled IS NULL OR uo.is_enabled = true
    UNION
    SELECT uo.permission_key
    FROM user_overrides uo
    WHERE uo.is_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Example of applying RLS using the helper function
-- ALTER TABLE public.some_sensitive_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Only users with 'manage-data' permission can update"
-- ON public.some_sensitive_table
-- FOR UPDATE
-- USING (auth.check_user_permission('manage-data'));
