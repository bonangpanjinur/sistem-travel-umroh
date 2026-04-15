-- =====================================================
-- UDAC INFRASTRUCTURE (Universal Dynamic Access Control)
-- =====================================================

-- 1. ENHANCE permissions_list table
ALTER TABLE public.permissions_list 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'ACTION', -- UI_COMPONENT, API_ENDPOINT, DATA_FIELD, ACTION
ADD COLUMN IF NOT EXISTS resource_identifier VARCHAR(255), -- bookings, payments, etc.
ADD COLUMN IF NOT EXISTS default_enabled BOOLEAN DEFAULT FALSE;

-- 2. CREATE permission_groups table
CREATE TABLE IF NOT EXISTS public.permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for permission_groups
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permission groups" 
ON public.permission_groups FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view permission groups" 
ON public.permission_groups FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. CREATE permission_group_members table
CREATE TABLE IF NOT EXISTS public.permission_group_members (
  group_id UUID REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  permission_key VARCHAR(255) REFERENCES public.permissions_list(key) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_key)
);

-- Enable RLS for permission_group_members
ALTER TABLE public.permission_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group members" 
ON public.permission_group_members FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view group members" 
ON public.permission_group_members FOR SELECT USING (auth.uid() IS NOT NULL);

-- 4. CREATE role_hierarchy table
CREATE TABLE IF NOT EXISTS public.role_hierarchy (
  parent_role public.app_role NOT NULL,
  child_role public.app_role NOT NULL,
  PRIMARY KEY (parent_role, child_role),
  CONSTRAINT different_roles CHECK (parent_role <> child_role)
);

-- Enable RLS for role_hierarchy
ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role hierarchy" 
ON public.role_hierarchy FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view role hierarchy" 
ON public.role_hierarchy FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. CREATE access_policies table (ABAC)
CREATE TABLE IF NOT EXISTS public.access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  policy_definition JSONB NOT NULL, -- { "condition": "...", "effect": "permit/deny" }
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for access_policies
ALTER TABLE public.access_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage access policies" 
ON public.access_policies FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active policies" 
ON public.access_policies FOR SELECT USING (is_active = TRUE OR public.is_admin(auth.uid()));

-- 6. UPDATE check_permission function to support UDAC (Multi-layered)
CREATE OR REPLACE FUNCTION public.check_permission_v2(_user_id UUID, _permission_key TEXT, _context JSONB DEFAULT '{}')
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _is_owner BOOLEAN;
  _user_permission_status BOOLEAN;
  _found_user_override BOOLEAN;
  _role_permission_status BOOLEAN;
BEGIN
  -- 1. Super Admin & Owner bypass
  SELECT public.is_admin(_user_id) INTO _is_admin;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner') INTO _is_owner;
  IF _is_admin OR _is_owner THEN RETURN TRUE; END IF;

  -- 2. User-Level Override (Highest Priority)
  SELECT is_enabled, TRUE INTO _user_permission_status, _found_user_override
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key;

  IF _found_user_override THEN RETURN _user_permission_status; END IF;

  -- 3. ABAC Policies (Next Priority - Placeholder for complex evaluation)
  -- For now, if any active policy matches and denies, we deny. 
  -- Full ABAC evaluation engine would be implemented in a separate helper.

  -- 4. Role-Based Permissions (including Hierarchy)
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
