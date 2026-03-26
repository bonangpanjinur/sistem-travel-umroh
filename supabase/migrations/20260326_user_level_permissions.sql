-- User-Level Granular Permissions Implementation
-- Memungkinkan penetapan izin langsung ke pengguna individu, melampaui hak akses berbasis peran

-- =====================================================
-- 1. CREATE USER_PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL REFERENCES public.permissions_list(key) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint to ensure each user has only one entry per permission
  CONSTRAINT user_permissions_unique UNIQUE (user_id, permission_key),
  
  -- Primary key
  PRIMARY KEY (user_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. RLS POLICIES FOR USER_PERMISSIONS
-- =====================================================

-- Policy: Admins can manage all user permissions
CREATE POLICY "Admins can manage user permissions" 
ON public.user_permissions 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Policy: Users can view their own permissions
CREATE POLICY "Users can view own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Policy: Only admins can insert/update/delete user permissions
CREATE POLICY "Only admins can modify user permissions" 
ON public.user_permissions 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update user permissions" 
ON public.user_permissions 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete user permissions" 
ON public.user_permissions 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_key ON public.user_permissions(permission_key);

-- =====================================================
-- 4. UPDATE CHECK_PERMISSION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_permission(_user_id UUID, _permission_key TEXT)
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
  _found BOOLEAN;
BEGIN
  -- 1. Check if the user is a super_admin or owner (they have all permissions)
  SELECT public.is_admin(_user_id) INTO _is_admin;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner') INTO _is_owner;

  IF _is_admin OR _is_owner THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit user-level permission override
  SELECT is_enabled, TRUE
  INTO _user_permission_status, _found
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key;

  IF _found THEN
    RETURN _user_permission_status; -- Explicitly granted or denied for this user
  END IF;

  -- 3. Fallback to role-based permissions
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.is_enabled = TRUE
  );
END;
$$;

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS FOR PERMISSION MANAGEMENT
-- =====================================================

-- Function to grant a permission to a specific user
CREATE OR REPLACE FUNCTION public.grant_user_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can grant permissions
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can grant permissions';
  END IF;

  INSERT INTO public.user_permissions (user_id, permission_key, is_enabled)
  VALUES (_user_id, _permission_key, TRUE)
  ON CONFLICT (user_id, permission_key) DO UPDATE
  SET is_enabled = TRUE, updated_at = now();

  RETURN TRUE;
END;
$$;

-- Function to revoke a permission from a specific user
CREATE OR REPLACE FUNCTION public.revoke_user_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can revoke permissions
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can revoke permissions';
  END IF;

  INSERT INTO public.user_permissions (user_id, permission_key, is_enabled)
  VALUES (_user_id, _permission_key, FALSE)
  ON CONFLICT (user_id, permission_key) DO UPDATE
  SET is_enabled = FALSE, updated_at = now();

  RETURN TRUE;
END;
$$;

-- Function to get all permissions for a specific user (including role-based and user-level)
CREATE OR REPLACE FUNCTION public.get_user_all_permissions(_user_id UUID)
RETURNS TABLE(permission_key VARCHAR, label VARCHAR, group_name VARCHAR, is_enabled BOOLEAN, source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Get user-level permissions first (they override role-based)
  SELECT 
    pl.key,
    pl.label,
    pl.group_name,
    up.is_enabled,
    'user'::TEXT as source
  FROM public.user_permissions up
  JOIN public.permissions_list pl ON up.permission_key = pl.key
  WHERE up.user_id = _user_id
  
  UNION ALL
  
  -- Get role-based permissions (only if not already in user-level)
  SELECT 
    pl.key,
    pl.label,
    pl.group_name,
    rp.is_enabled,
    'role'::TEXT as source
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role = rp.role
  JOIN public.permissions_list pl ON rp.permission_key = pl.key
  WHERE ur.user_id = _user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.permission_key = pl.key
    );
END;
$$;

-- =====================================================
-- 6. CREATE AUDIT TRIGGER FOR USER_PERMISSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_permissions_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  action TEXT NOT NULL,
  old_is_enabled BOOLEAN,
  new_is_enabled BOOLEAN,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.user_permissions_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view permission audit logs" 
ON public.user_permissions_audit 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Function to audit permission changes
CREATE OR REPLACE FUNCTION public.audit_user_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_permissions_audit (
    user_id, 
    permission_key, 
    action, 
    old_is_enabled, 
    new_is_enabled, 
    changed_by
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.permission_key, OLD.permission_key),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.is_enabled ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.is_enabled ELSE NULL END,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for audit
DROP TRIGGER IF EXISTS user_permissions_audit_trigger ON public.user_permissions;
CREATE TRIGGER user_permissions_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_permission_change();

-- =====================================================
-- 7. EXAMPLE: SETUP FOR NIDA AND SANDI
-- =====================================================

-- Assuming Nida has user_id = 'nida-uuid' and Sandi has user_id = 'sandi-uuid'
-- This is just an example; replace with actual UUIDs

-- For Nida (Manager Operasional): Grant full package management
-- INSERT INTO public.user_permissions (user_id, permission_key, is_enabled) VALUES
-- ('nida-uuid', 'packages.create', TRUE),
-- ('nida-uuid', 'packages.edit', TRUE),
-- ('nida-uuid', 'packages.delete', TRUE)
-- ON CONFLICT (user_id, permission_key) DO NOTHING;

-- For Sandi (Staff Operasional): Grant only package creation
-- INSERT INTO public.user_permissions (user_id, permission_key, is_enabled) VALUES
-- ('sandi-uuid', 'packages.create', TRUE),
-- ('sandi-uuid', 'packages.edit', FALSE),  -- Explicitly deny edit
-- ('sandi-uuid', 'packages.delete', FALSE) -- Explicitly deny delete
-- ON CONFLICT (user_id, permission_key) DO NOTHING;
