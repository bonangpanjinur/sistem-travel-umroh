-- Phase 1: Unified Authorization and Audit Log Implementation

-- 1. Create permissions_list table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.permissions_list (
    key VARCHAR(100) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    group_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create user_permissions_overrides table
CREATE TABLE IF NOT EXISTS public.user_permissions_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) REFERENCES public.permissions_list(key) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, permission_key)
);

-- 3. Create menu_access_audit table
CREATE TABLE IF NOT EXISTS public.menu_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    permission_key VARCHAR(100) NOT NULL,
    access_granted BOOLEAN NOT NULL,
    accessed_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.permissions_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_access_audit ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin status within this migration context
-- This ensures the migration works even if public.is_admin is not yet visible or has search_path issues
CREATE OR REPLACE FUNCTION public.check_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id 
        AND role IN ('super_admin', 'owner', 'branch_manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
DROP POLICY IF EXISTS "Everyone can view permissions list" ON public.permissions_list;
CREATE POLICY "Everyone can view permissions list" ON public.permissions_list FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage permissions list" ON public.permissions_list;
CREATE POLICY "Admins can manage permissions list" ON public.permissions_list FOR ALL USING (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own overrides" ON public.user_permissions_overrides;
CREATE POLICY "Users can view their own overrides" ON public.user_permissions_overrides FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all overrides" ON public.user_permissions_overrides;
CREATE POLICY "Admins can manage all overrides" ON public.user_permissions_overrides FOR ALL USING (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.menu_access_audit;
CREATE POLICY "Admins can view audit logs" ON public.menu_access_audit FOR SELECT USING (public.check_is_admin(auth.uid()));

-- 4. Unified Authorization Function
CREATE OR REPLACE FUNCTION public.get_user_effective_permission(
    p_user_id UUID,
    p_permission_key VARCHAR(100)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_enabled BOOLEAN;
BEGIN
    -- 1. Check for manual override first
    SELECT is_enabled INTO v_is_enabled
    FROM public.user_permissions_overrides
    WHERE user_id = p_user_id AND permission_key = p_permission_key;

    IF NOT FOUND THEN
        -- 2. Check role-based permissions
        SELECT EXISTS (
            SELECT 1 
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role = rp.role
            WHERE ur.user_id = p_user_id 
              AND rp.permission_key = p_permission_key
              AND rp.is_enabled = true
        ) INTO v_is_enabled;
    END IF;

    -- 3. Audit the access attempt
    INSERT INTO public.menu_access_audit (user_id, permission_key, access_granted)
    VALUES (p_user_id, p_permission_key, COALESCE(v_is_enabled, FALSE));

    RETURN COALESCE(v_is_enabled, FALSE);
END;
$$;

-- 5. Helper function for bulk checking
CREATE OR REPLACE FUNCTION public.get_user_all_effective_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_key VARCHAR(100),
    is_enabled BOOLEAN,
    source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_roles_perms AS (
        SELECT DISTINCT rp.permission_key, true as is_enabled
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = p_user_id AND rp.is_enabled = true
    ),
    overrides AS (
        SELECT upo.permission_key, upo.is_enabled
        FROM public.user_permissions_overrides upo
        WHERE upo.user_id = p_user_id
    ),
    all_keys AS (
        SELECT key FROM public.permissions_list
    )
    SELECT 
        ak.key as permission_key,
        COALESCE(o.is_enabled, urp.is_enabled, false) as is_enabled,
        CASE 
            WHEN o.permission_key IS NOT NULL THEN 'override'
            WHEN urp.permission_key IS NOT NULL THEN 'role'
            ELSE 'default'
        END as source
    FROM all_keys ak
    LEFT JOIN overrides o ON ak.key = o.permission_key
    LEFT JOIN user_roles_perms urp ON ak.key = urp.permission_key;
END;
$$;

-- 6. Context-aware View
DROP VIEW IF EXISTS public.user_permissions;
CREATE VIEW public.user_permissions 
WITH (security_invoker = true)
AS
SELECT 
    p_all.permission_key,
    p_all.is_enabled,
    p_all.source,
    pl.label,
    pl.group_name,
    pl.description,
    auth.uid() as user_id
FROM public.get_user_all_effective_permissions(auth.uid()) p_all
JOIN public.permissions_list pl ON p_all.permission_key = pl.key;

GRANT SELECT ON public.user_permissions TO authenticated;

-- 7. Populate initial data
INSERT INTO public.permissions_list (key, label, group_name)
SELECT DISTINCT permission_key, INITCAP(REPLACE(permission_key, '_', ' ')), 'General'
FROM public.role_permissions
ON CONFLICT (key) DO NOTHING;
