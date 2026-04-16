-- Simplify Permission Resolution: User-Centric Architecture
-- Tanggal: 2026-04-19
-- Deskripsi: Menyederhanakan sistem resolusi izin untuk fokus pada user_permissions sebagai sumber kebenaran tunggal.
--            Peran berfungsi sebagai template izin yang disalin ke user_permissions saat diterapkan.

-- =====================================================
-- 1. UPDATE FUNCTION: get_user_effective_permission
-- =====================================================
-- Fungsi ini sekarang hanya membaca dari user_permissions (setelah peran disalin)
-- Super admin tetap memiliki bypass penuh

CREATE OR REPLACE FUNCTION public.get_user_effective_permission(
  _user_id UUID,
  _permission_key VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super_admin BOOLEAN;
  _user_permission_status BOOLEAN;
BEGIN
  -- 1. Check if user is super_admin (bypass all checks)
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  ) INTO _is_super_admin;
  
  IF _is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit user-level permission (single source of truth)
  SELECT is_enabled
  INTO _user_permission_status
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key;

  -- Default to FALSE if no explicit entry exists
  RETURN COALESCE(_user_permission_status, FALSE);
END;
$$;

-- =====================================================
-- 2. NEW FUNCTION: assign_role_to_user
-- =====================================================
-- Fungsi ini menambahkan peran ke pengguna dan menyalin izin dari role_permissions ke user_permissions

CREATE OR REPLACE FUNCTION public.assign_role_to_user(
  _user_id UUID,
  _role_name VARCHAR
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  permissions_copied INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permissions_copied INTEGER := 0;
  _role_exists BOOLEAN;
  _user_exists BOOLEAN;
  _role_already_assigned BOOLEAN;
BEGIN
  -- 1. Validate inputs
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id LIMIT 1) INTO _user_exists;
  IF NOT _user_exists THEN
    -- User might not exist in user_roles yet, but should exist in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = _user_id) INTO _user_exists;
    IF NOT _user_exists THEN
      RETURN QUERY SELECT FALSE, 'User does not exist'::TEXT, 0;
      RETURN;
    END IF;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.role_permissions WHERE role = _role_name LIMIT 1) INTO _role_exists;
  IF NOT _role_exists THEN
    RETURN QUERY SELECT FALSE, 'Role does not exist'::TEXT, 0;
    RETURN;
  END IF;

  -- 2. Check if role is already assigned
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role_name
  ) INTO _role_already_assigned;

  -- 3. Add role to user_roles if not already assigned
  IF NOT _role_already_assigned THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role_name)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 4. Copy permissions from role_permissions to user_permissions
  WITH role_perms AS (
    SELECT permission_key, is_enabled
    FROM public.role_permissions
    WHERE role = _role_name
  )
  INSERT INTO public.user_permissions (user_id, permission_key, is_enabled)
  SELECT _user_id, permission_key, is_enabled
  FROM role_perms
  ON CONFLICT (user_id, permission_key) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    updated_at = now();

  -- 5. Count permissions copied
  SELECT COUNT(*)
  INTO _permissions_copied
  FROM public.user_permissions
  WHERE user_id = _user_id;

  RETURN QUERY SELECT TRUE, 'Role assigned and permissions copied successfully'::TEXT, _permissions_copied;
END;
$$;

-- =====================================================
-- 3. NEW FUNCTION: remove_role_from_user
-- =====================================================
-- Fungsi ini menghapus peran dari pengguna
-- Catatan: Izin di user_permissions tetap ada (tidak dihapus otomatis) untuk memberikan kontrol yang lebih baik

CREATE OR REPLACE FUNCTION public.remove_role_from_user(
  _user_id UUID,
  _role_name VARCHAR
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_exists BOOLEAN;
BEGIN
  -- 1. Validate inputs
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role_name
  ) INTO _role_exists;

  IF NOT _role_exists THEN
    RETURN QUERY SELECT FALSE, 'User does not have this role'::TEXT;
    RETURN;
  END IF;

  -- 2. Remove role from user_roles
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role_name;

  RETURN QUERY SELECT TRUE, 'Role removed successfully. User permissions remain unchanged in user_permissions table.'::TEXT;
END;
$$;

-- =====================================================
-- 4. NEW FUNCTION: reset_user_permissions_to_role_defaults
-- =====================================================
-- Fungsi ini mereset izin pengguna ke default berdasarkan peran yang saat ini dimiliki pengguna

CREATE OR REPLACE FUNCTION public.reset_user_permissions_to_role_defaults(
  _user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  permissions_reset INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permissions_reset INTEGER := 0;
BEGIN
  -- 1. Delete all existing user permissions
  DELETE FROM public.user_permissions
  WHERE user_id = _user_id;

  -- 2. Copy permissions from all assigned roles
  WITH user_roles_perms AS (
    SELECT DISTINCT rp.permission_key, rp.is_enabled
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
  )
  INSERT INTO public.user_permissions (user_id, permission_key, is_enabled)
  SELECT _user_id, permission_key, is_enabled
  FROM user_roles_perms;

  -- 3. Count permissions reset
  SELECT COUNT(*)
  INTO _permissions_reset
  FROM public.user_permissions
  WHERE user_id = _user_id;

  RETURN QUERY SELECT TRUE, 'User permissions reset to role defaults'::TEXT, _permissions_reset;
END;
$$;

-- =====================================================
-- 5. NEW FUNCTION: grant_user_permission
-- =====================================================
-- Fungsi ini memberikan izin spesifik kepada pengguna

CREATE OR REPLACE FUNCTION public.grant_user_permission(
  _user_id UUID,
  _permission_key VARCHAR
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permission_exists BOOLEAN;
BEGIN
  -- 1. Validate permission exists
  SELECT EXISTS(
    SELECT 1 FROM public.permissions_list 
    WHERE key = _permission_key
  ) INTO _permission_exists;

  IF NOT _permission_exists THEN
    RETURN QUERY SELECT FALSE, 'Permission does not exist'::TEXT;
    RETURN;
  END IF;

  -- 2. Grant permission
  INSERT INTO public.user_permissions (user_id, permission_key, is_enabled)
  VALUES (_user_id, _permission_key, TRUE)
  ON CONFLICT (user_id, permission_key) DO UPDATE SET
    is_enabled = TRUE,
    updated_at = now();

  RETURN QUERY SELECT TRUE, 'Permission granted successfully'::TEXT;
END;
$$;

-- =====================================================
-- 6. NEW FUNCTION: revoke_user_permission
-- =====================================================
-- Fungsi ini mencabut izin spesifik dari pengguna

CREATE OR REPLACE FUNCTION public.revoke_user_permission(
  _user_id UUID,
  _permission_key VARCHAR
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Revoke permission (set to FALSE)
  UPDATE public.user_permissions
  SET is_enabled = FALSE, updated_at = now()
  WHERE user_id = _user_id AND permission_key = _permission_key;

  -- 2. If no row was updated, insert a new one with is_enabled = FALSE
  IF NOT FOUND THEN
    INSERT INTO public.user_permissions (user_id, permission_key, is_enabled)
    VALUES (_user_id, _permission_key, FALSE);
  END IF;

  RETURN QUERY SELECT TRUE, 'Permission revoked successfully'::TEXT;
END;
$$;

-- =====================================================
-- 7. UPDATE FUNCTION: get_user_all_permissions (Simplified)
-- =====================================================
-- Fungsi ini sekarang hanya mengembalikan izin dari user_permissions (sumber kebenaran tunggal)

CREATE OR REPLACE FUNCTION public.get_user_all_permissions(_user_id UUID)
RETURNS TABLE(
  permission_key VARCHAR, 
  label VARCHAR, 
  group_name VARCHAR, 
  is_enabled BOOLEAN, 
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.permission_key,
    pl.label,
    pl.group_name,
    up.is_enabled,
    'user'::TEXT as source
  FROM public.user_permissions up
  JOIN public.permissions_list pl ON up.permission_key = pl.key
  WHERE up.user_id = _user_id
  ORDER BY pl.group_name, pl.label;
END;
$$;

-- =====================================================
-- 8. CREATE AUDIT TABLE FOR ROLE ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_assignment_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('ASSIGNED', 'REMOVED')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_assignment_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view audit logs
CREATE POLICY "Admins can view role assignment audit" ON public.role_assignment_audit 
FOR SELECT USING (public.is_admin(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_user ON public.role_assignment_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_role ON public.role_assignment_audit(role_name);

-- =====================================================
-- 9. CREATE TRIGGER FOR ROLE ASSIGNMENT AUDIT
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_assignment_audit (user_id, role_name, action, assigned_by)
    VALUES (NEW.user_id, NEW.role, 'ASSIGNED', auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_assignment_audit (user_id, role_name, action, assigned_by)
    VALUES (OLD.user_id, OLD.role, 'REMOVED', auth.uid());
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_role_assignment ON public.user_roles;

CREATE TRIGGER trigger_audit_role_assignment
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_assignment();

-- =====================================================
-- 10. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_user_effective_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_all_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_role_from_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_permissions_to_role_defaults TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_permission TO authenticated;
