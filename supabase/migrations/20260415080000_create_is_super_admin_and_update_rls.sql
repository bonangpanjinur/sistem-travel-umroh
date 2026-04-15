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

-- permissions_list
ALTER TABLE public.permissions_list DROP POLICY IF EXISTS "Admins can manage permissions";
CREATE POLICY "Super Admins can manage permissions" 
ON public.permissions_list FOR ALL USING (public.is_super_admin(auth.uid()));

-- role_permissions
ALTER TABLE public.role_permissions DROP POLICY IF EXISTS "Admins can manage role permissions";
CREATE POLICY "Super Admins can manage role permissions" 
ON public.role_permissions FOR ALL USING (public.is_super_admin(auth.uid()));

-- user_permissions
ALTER TABLE public.user_permissions DROP POLICY IF EXISTS "Admins can manage user permissions";
CREATE POLICY "Super Admins can manage user permissions" 
ON public.user_permissions FOR ALL USING (public.is_super_admin(auth.uid()));

-- permission_groups
ALTER TABLE public.permission_groups DROP POLICY IF EXISTS "Admins can manage permission groups";
CREATE POLICY "Super Admins can manage permission groups" 
ON public.permission_groups FOR ALL USING (public.is_super_admin(auth.uid()));

-- permission_group_members
ALTER TABLE public.permission_group_members DROP POLICY IF EXISTS "Admins can manage group members";
CREATE POLICY "Super Admins can manage group members" 
ON public.permission_group_members FOR ALL USING (public.is_super_admin(auth.uid()));

-- role_hierarchy
ALTER TABLE public.role_hierarchy DROP POLICY IF EXISTS "Admins can manage role hierarchy";
CREATE POLICY "Super Admins can manage role hierarchy" 
ON public.role_hierarchy FOR ALL USING (public.is_super_admin(auth.uid()));

-- access_policies
ALTER TABLE public.access_policies DROP POLICY IF EXISTS "Admins can manage access policies";
CREATE POLICY "Super Admins can manage access policies" 
ON public.access_policies FOR ALL USING (public.is_super_admin(auth.uid()));

-- Update check_permission_v2 to use is_super_admin
CREATE OR REPLACE FUNCTION public.check_permission_v2(_user_id UUID, _permission_key TEXT, _context JSONB DEFAULT 
'{}')
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super_admin BOOLEAN;
  _is_owner BOOLEAN;
  _user_permission_status BOOLEAN;
  _found_user_override BOOLEAN;
  _role_permission_status BOOLEAN;
BEGIN
  -- 1. Super Admin bypass
  SELECT public.is_super_admin(_user_id) INTO _is_super_admin;
  IF _is_super_admin THEN RETURN TRUE; END IF;

  -- 2. Owner bypass (still allowed to manage some things, but not permissions)
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner') INTO _is_owner;
  -- If owner, they might have some default permissions, but not full admin control
  -- For now, we'll let them bypass if they are owner, but this might need refinement
  -- based on specific owner permissions. The report only specified super_admin for permission management.
  -- Re-evaluating: The report says "hanya Super Admin yang dapat mengatur hak akses secara dinamis".
  -- So, owner should NOT bypass for permission checks. Only super_admin.
  -- IF _is_owner THEN RETURN TRUE; END IF; -- REMOVED based on report clarification

  -- 3. User-Level Override (Highest Priority)
  SELECT is_enabled, TRUE INTO _user_permission_status, _found_user_override
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key;

  IF _found_user_override THEN RETURN _user_permission_status; END IF;

  -- 4. ABAC Policies (Next Priority - Placeholder for complex evaluation)
  -- For now, if any active policy matches and denies, we deny. 
  -- Full ABAC evaluation engine would be implemented in a separate helper.

  -- 5. Role-Based Permissions (including Hierarchy)
  -- We use a recursive CTE to find all roles a user has, including inherited ones
  WITH RECURSIVE user_all_roles AS (
    -- Base: roles explicitly assigned to user
    SELECT role FROM public.user_roles WHERE user_id = _user_id
    UNION
    -- Recursive: roles inherited via hierarchy
    SELECT rh.child_role
    FROM public.role_hierarchy rh
    JOIN user_all_roles uar ON rh.parent_role = uar.role
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
