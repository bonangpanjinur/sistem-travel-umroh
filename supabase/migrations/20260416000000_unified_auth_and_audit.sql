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

-- 2. Create user_permissions_overrides table (to replace the view with manual overrides)
-- This table stores individual user permission overrides (enable/disable)
CREATE TABLE IF NOT EXISTS public.user_permissions_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) REFERENCES public.permissions_list(key) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, permission_key)
);

-- 3. Create menu_access_audit table for tracking access attempts
CREATE TABLE IF NOT EXISTS public.menu_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    permission_key VARCHAR(100) NOT NULL,
    access_granted BOOLEAN NOT NULL,
    accessed_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT
);

-- Enable RLS for new tables
ALTER TABLE public.permissions_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_access_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view permissions list" ON public.permissions_list FOR SELECT USING (true);
CREATE POLICY "Admins can manage permissions list" ON public.permissions_list FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own overrides" ON public.user_permissions_overrides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all overrides" ON public.user_permissions_overrides FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs" ON public.menu_access_audit FOR SELECT USING (public.is_admin(auth.uid()));

-- 4. Unified Authorization Function: get_user_effective_permission
-- This function checks:
-- 1. If there's a manual override for the user (highest priority)
-- 2. If not, checks the role-based permissions
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
    v_has_override BOOLEAN := FALSE;
BEGIN
    -- Check for manual override first
    SELECT is_enabled INTO v_is_enabled
    FROM public.user_permissions_overrides
    WHERE user_id = p_user_id AND permission_key = p_permission_key;

    IF FOUND THEN
        v_has_override := TRUE;
    ELSE
        -- If no override, check role-based permissions
        -- A user has permission if ANY of their roles has the permission enabled
        SELECT EXISTS (
            SELECT 1 
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role = rp.role
            WHERE ur.user_id = p_user_id 
              AND rp.permission_key = p_permission_key
              AND rp.is_enabled = true
        ) INTO v_is_enabled;
    END IF;

    -- Audit the access attempt
    -- Note: In a real Supabase environment, IP and User Agent might need to be passed from frontend
    -- or extracted from request headers if available in the context.
    INSERT INTO public.menu_access_audit (user_id, permission_key, access_granted)
    VALUES (p_user_id, p_permission_key, COALESCE(v_is_enabled, FALSE));

    RETURN COALESCE(v_is_enabled, FALSE);
END;
$$;

-- 5. Helper function for bulk checking (useful for frontend initialization)
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
        -- Permissions from roles
        SELECT DISTINCT rp.permission_key, true as is_enabled, 'role'::TEXT as source
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = p_user_id AND rp.is_enabled = true
    ),
    overrides AS (
        -- Manual overrides
        SELECT upo.permission_key, upo.is_enabled, 'override'::TEXT as source
        FROM public.user_permissions_overrides upo
        WHERE upo.user_id = p_user_id
    ),
    all_keys AS (
        -- All unique keys from both sources
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

-- 6. Cleanup old view if it exists and replace with a more robust one
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
    auth.uid() as user_id -- This view is context-aware for the logged-in user
FROM public.get_user_all_effective_permissions(auth.uid()) p_all
JOIN public.permissions_list pl ON p_all.permission_key = pl.key;

GRANT SELECT ON public.user_permissions TO authenticated;

-- 7. Populate permissions_list with initial data from existing role_permissions
INSERT INTO public.permissions_list (key, label, group_name)
SELECT DISTINCT permission_key, INITCAP(REPLACE(permission_key, '_', ' ')), 'General'
FROM public.role_permissions
ON CONFLICT (key) DO NOTHING;
