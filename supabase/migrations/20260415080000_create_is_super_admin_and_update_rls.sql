-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Update RLS policies to use is_super_admin
-- Note: DROP POLICY IF EXISTS requires the table name: DROP POLICY [IF EXISTS] name ON table_name

-- permissions_list
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions_list;
DROP POLICY IF EXISTS "Allow super_admin and owner to manage permissions_list" ON public.permissions_list;
CREATE POLICY "Super Admins can manage permissions" 
ON public.permissions_list FOR ALL USING (public.is_super_admin(auth.uid()));

-- role_permissions
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Super Admins can manage role permissions" 
ON public.role_permissions FOR ALL USING (public.is_super_admin(auth.uid()));

-- user_permissions
-- user_permissions is a view in some migrations, but if it's a table, we apply RLS.
-- Checking if it's a table or view. Based on 20240324_create_permissions_list_fixed.sql, it's a VIEW.
-- RLS cannot be applied to a VIEW in the same way as a table. 
-- However, if there's a table named user_permissions (for overrides), we apply it there.
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_permissions' AND table_type = 'BASE TABLE') THEN
        DROP POLICY IF EXISTS "Admins can manage user permissions" ON public.user_permissions;
        EXECUTE 'CREATE POLICY "Super Admins can manage user permissions" ON public.user_permissions FOR ALL USING (public.is_super_admin(auth.uid()))';
    END IF;
END $$;

-- permission_groups
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permission_groups') THEN
        DROP POLICY IF EXISTS "Admins can manage permission groups" ON public.permission_groups;
        EXECUTE 'CREATE POLICY "Super Admins can manage permission groups" ON public.permission_groups FOR ALL USING (public.is_super_admin(auth.uid()))';
    END IF;
END $$;

-- permission_group_members
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permission_group_members') THEN
        DROP POLICY IF EXISTS "Admins can manage group members" ON public.permission_group_members;
        EXECUTE 'CREATE POLICY "Super Admins can manage group members" ON public.permission_group_members FOR ALL USING (public.is_super_admin(auth.uid()))';
    END IF;
END $$;

-- role_hierarchy
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_hierarchy') THEN
        DROP POLICY IF EXISTS "Admins can manage role hierarchy" ON public.role_hierarchy;
        EXECUTE 'CREATE POLICY "Super Admins can manage role hierarchy" ON public.role_hierarchy FOR ALL USING (public.is_super_admin(auth.uid()))';
    END IF;
END $$;

-- access_policies
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'access_policies') THEN
        DROP POLICY IF EXISTS "Admins can manage access policies" ON public.access_policies;
        EXECUTE 'CREATE POLICY "Super Admins can manage access policies" ON public.access_policies FOR ALL USING (public.is_super_admin(auth.uid()))';
    END IF;
END $$;

-- Update check_permission_v2 to use is_super_admin
CREATE OR REPLACE FUNCTION public.check_permission_v2(_user_id UUID, _permission_key TEXT, _context JSONB DEFAULT '{}')
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super_admin BOOLEAN;
  _user_permission_status BOOLEAN;
  _found_user_override BOOLEAN;
  _role_permission_status BOOLEAN;
BEGIN
  -- 1. Super Admin bypass
  SELECT public.is_super_admin(_user_id) INTO _is_super_admin;
  IF _is_super_admin THEN RETURN TRUE; END IF;

  -- 2. User-Level Override (Highest Priority)
  -- Check if user_permissions table exists before querying
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_permissions' AND table_type = 'BASE TABLE') THEN
    SELECT is_enabled, TRUE INTO _user_permission_status, _found_user_override
    FROM public.user_permissions
    WHERE user_id = _user_id AND permission_key = _permission_key;

    IF _found_user_override THEN RETURN _user_permission_status; END IF;
  END IF;

  -- 3. Role-Based Permissions (including Hierarchy)
  -- We use a recursive CTE to find all roles a user has, including inherited ones
  WITH RECURSIVE user_all_roles AS (
    -- Base: roles explicitly assigned to user
    SELECT role FROM public.user_roles WHERE user_id = _user_id
    UNION
    -- Recursive: roles inherited via hierarchy
    -- Only join if role_hierarchy table exists
    SELECT rh.child_role
    FROM public.role_hierarchy rh
    JOIN user_all_roles uar ON rh.parent_role = uar.role
    WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_hierarchy')
  )
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role IN (SELECT role FROM user_all_roles)
      AND rp.permission_key = _permission_key
      AND rp.is_enabled = TRUE
  ) INTO _role_permission_status;

  RETURN _role_permission_status;
END;
$$;
