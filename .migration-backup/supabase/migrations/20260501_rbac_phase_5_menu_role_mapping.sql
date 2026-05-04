-- =====================================================
-- RBAC Phase 5: Menu-Role Mapping Management
-- Tanggal: 2026-05-01
-- Deskripsi: RPC functions untuk mengelola pemetaan menu per role secara visual
-- =====================================================

-- =====================================================
-- 1. CREATE TABLE: role_menu_mapping (if not exists)
-- =====================================================
-- Tabel ini menyimpan pemetaan menu mana saja yang bisa diakses oleh setiap role
CREATE TABLE IF NOT EXISTS public.role_menu_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, menu_item_id)
);

-- Enable RLS
ALTER TABLE public.role_menu_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super admins can view/modify
CREATE POLICY "Super admins can manage role menu mapping" ON public.role_menu_mapping
FOR ALL USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_menu_mapping_role ON public.role_menu_mapping(role);
CREATE INDEX IF NOT EXISTS idx_role_menu_mapping_menu ON public.role_menu_mapping(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_role_menu_mapping_enabled ON public.role_menu_mapping(is_enabled);

-- =====================================================
-- 2. FUNCTION: Get all menus for a specific role
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_role_menus(_role VARCHAR)
RETURNS TABLE(
  menu_id UUID,
  key VARCHAR,
  label VARCHAR,
  path VARCHAR,
  icon VARCHAR,
  group_name VARCHAR,
  sort_order INTEGER,
  required_permission VARCHAR,
  is_mapped BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can access this
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can access role menus';
  END IF;

  RETURN QUERY
  SELECT 
    mi.id,
    mi.key,
    mi.label,
    mi.path,
    mi.icon,
    mi.group_name,
    mi.sort_order,
    mi.required_permission,
    COALESCE(rmm.is_enabled, FALSE) as is_mapped
  FROM public.menu_items mi
  LEFT JOIN public.role_menu_mapping rmm 
    ON mi.id = rmm.menu_item_id AND rmm.role = _role
  WHERE mi.is_visible = TRUE
  ORDER BY mi.group_name, mi.sort_order;
END;
$$;

-- =====================================================
-- 3. FUNCTION: Toggle menu access for a role
-- =====================================================
CREATE OR REPLACE FUNCTION public.toggle_role_menu_access(
  _role VARCHAR,
  _menu_item_id UUID,
  _enable BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result BOOLEAN;
BEGIN
  -- Only super admins can modify
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can modify role menu access';
  END IF;

  -- Validate role exists
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = _role LIMIT 1) THEN
    RAISE EXCEPTION 'Role % does not exist', _role;
  END IF;

  -- Validate menu exists
  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE id = _menu_item_id) THEN
    RAISE EXCEPTION 'Menu item % does not exist', _menu_item_id;
  END IF;

  IF _enable THEN
    -- Insert or update to enable
    INSERT INTO public.role_menu_mapping (role, menu_item_id, is_enabled)
    VALUES (_role, _menu_item_id, TRUE)
    ON CONFLICT (role, menu_item_id) DO UPDATE
    SET is_enabled = TRUE, updated_at = now();
    _result := TRUE;
  ELSE
    -- Delete to disable (or update to FALSE)
    DELETE FROM public.role_menu_mapping
    WHERE role = _role AND menu_item_id = _menu_item_id;
    _result := FALSE;
  END IF;

  -- Log audit
  INSERT INTO public.rbac_audit_log (
    actor_id, actor_email, scope, action, target_role, target_menu_id,
    old_value, new_value, metadata
  ) VALUES (
    auth.uid(),
    auth.jwt()->>'email',
    'role_menu',
    CASE WHEN _enable THEN 'grant_menu' ELSE 'revoke_menu' END,
    _role,
    _menu_item_id,
    jsonb_build_object('is_enabled', NOT _enable),
    jsonb_build_object('is_enabled', _enable),
    jsonb_build_object('menu_key', (SELECT key FROM public.menu_items WHERE id = _menu_item_id))
  );

  RETURN _result;
END;
$$;

-- =====================================================
-- 4. FUNCTION: Bulk toggle menu access for a role
-- =====================================================
CREATE OR REPLACE FUNCTION public.bulk_toggle_role_menu_access(
  _role VARCHAR,
  _menu_item_ids UUID[],
  _enable BOOLEAN
)
RETURNS TABLE(
  success_count INTEGER,
  failed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _success_count INTEGER := 0;
  _failed_count INTEGER := 0;
  _menu_id UUID;
BEGIN
  -- Only super admins can modify
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can modify role menu access';
  END IF;

  FOREACH _menu_id IN ARRAY _menu_item_ids
  LOOP
    BEGIN
      PERFORM public.toggle_role_menu_access(_role, _menu_id, _enable);
      _success_count := _success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      _failed_count := _failed_count + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT _success_count, _failed_count;
END;
$$;

-- =====================================================
-- 5. FUNCTION: Reset role menu access to defaults
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_role_menu_access(_role VARCHAR)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  -- Only super admins can modify
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can reset role menu access';
  END IF;

  -- Delete all role-menu mappings for this role
  DELETE FROM public.role_menu_mapping WHERE role = _role;
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;

  -- Log audit
  INSERT INTO public.rbac_audit_log (
    actor_id, actor_email, scope, action, target_role,
    metadata
  ) VALUES (
    auth.uid(),
    auth.jwt()->>'email',
    'role_menu',
    'reset_menu_access',
    _role,
    jsonb_build_object('deleted_count', _deleted_count)
  );

  RETURN _deleted_count;
END;
$$;

-- =====================================================
-- 6. FUNCTION: Get menu access summary for all roles
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_menu_access_summary()
RETURNS TABLE(
  role VARCHAR,
  total_menus INTEGER,
  accessible_menus INTEGER,
  access_percentage NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can access this
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can access menu access summary';
  END IF;

  RETURN QUERY
  SELECT 
    ur.role,
    COUNT(DISTINCT mi.id)::INTEGER as total_menus,
    COUNT(DISTINCT CASE WHEN rmm.is_enabled THEN mi.id END)::INTEGER as accessible_menus,
    ROUND(
      COUNT(DISTINCT CASE WHEN rmm.is_enabled THEN mi.id END)::NUMERIC / 
      COUNT(DISTINCT mi.id)::NUMERIC * 100, 
      2
    ) as access_percentage
  FROM (
    SELECT DISTINCT role FROM public.user_roles WHERE role != 'super_admin'
  ) ur
  CROSS JOIN public.menu_items mi
  LEFT JOIN public.role_menu_mapping rmm 
    ON ur.role = rmm.role AND mi.id = rmm.menu_item_id AND rmm.is_enabled = TRUE
  WHERE mi.is_visible = TRUE
  GROUP BY ur.role
  ORDER BY ur.role;
END;
$$;

-- =====================================================
-- 7. FUNCTION: Sync menu items from frontend registry
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_menus_from_registry(
  _menu_items JSONB
)
RETURNS TABLE(
  synced_count INTEGER,
  failed_count INTEGER,
  total_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _synced_count INTEGER := 0;
  _failed_count INTEGER := 0;
  _total_count INTEGER := 0;
  _item JSONB;
BEGIN
  -- Only super admins can sync menus
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can sync menus';
  END IF;

  _total_count := jsonb_array_length(_menu_items);

  FOR _item IN SELECT jsonb_array_elements(_menu_items)
  LOOP
    BEGIN
      -- Ensure permission exists
      IF NOT EXISTS (
        SELECT 1 FROM public.permissions_list 
        WHERE key = _item->>'required_permission'
      ) THEN
        INSERT INTO public.permissions_list (key, description, module)
        VALUES (
          _item->>'required_permission',
          'Auto-generated permission for menu: ' || (_item->>'label'),
          'Menu'
        )
        ON CONFLICT (key) DO NOTHING;
      END IF;

      -- Insert or update menu item
      INSERT INTO public.menu_items (
        key, label, path, icon, group_name, sort_order, required_permission
      )
      VALUES (
        _item->>'key',
        _item->>'label',
        _item->>'path',
        _item->>'icon',
        _item->>'group_name',
        (_item->>'sort_order')::INTEGER,
        _item->>'required_permission'
      )
      ON CONFLICT (key) DO UPDATE SET
        label = EXCLUDED.label,
        path = EXCLUDED.path,
        icon = EXCLUDED.icon,
        group_name = EXCLUDED.group_name,
        sort_order = EXCLUDED.sort_order,
        required_permission = EXCLUDED.required_permission,
        updated_at = now();

      _synced_count := _synced_count + 1;
    EXCEPTION WHEN OTHERS THEN
      _failed_count := _failed_count + 1;
    END;
  END LOOP;

  -- Log audit
  INSERT INTO public.rbac_audit_log (
    actor_id, actor_email, scope, action,
    metadata
  ) VALUES (
    auth.uid(),
    auth.jwt()->>'email',
    'system',
    'sync_menus_from_registry',
    jsonb_build_object(
      'synced_count', _synced_count,
      'failed_count', _failed_count,
      'total_count', _total_count
    )
  );

  RETURN QUERY SELECT _synced_count, _failed_count, _total_count;
END;
$$;

-- =====================================================
-- 8. FUNCTION: Get effective menu list for a user
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_accessible_menus_v2(_user_id UUID)
RETURNS TABLE(
  menu_id UUID,
  key VARCHAR,
  label VARCHAR,
  path VARCHAR,
  icon VARCHAR,
  group_name VARCHAR,
  sort_order INTEGER,
  required_permission VARCHAR,
  has_access BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super_admin BOOLEAN;
  _user_roles VARCHAR[];
BEGIN
  -- Check if user is super admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  ) INTO _is_super_admin;

  -- Get user's roles
  SELECT ARRAY_AGG(role) INTO _user_roles
  FROM public.user_roles
  WHERE user_id = _user_id;

  -- Return all menus with access flag
  RETURN QUERY
  SELECT 
    mi.id,
    mi.key,
    mi.label,
    mi.path,
    mi.icon,
    mi.group_name,
    mi.sort_order,
    mi.required_permission,
    CASE 
      WHEN _is_super_admin THEN TRUE
      WHEN EXISTS (
        SELECT 1 FROM public.role_menu_mapping rmm
        WHERE rmm.menu_item_id = mi.id 
          AND rmm.role = ANY(_user_roles)
          AND rmm.is_enabled = TRUE
      ) THEN TRUE
      ELSE FALSE
    END as has_access
  FROM public.menu_items mi
  WHERE mi.is_visible = TRUE
  ORDER BY mi.group_name, mi.sort_order;
END;
$$;

-- =====================================================
-- 9. AUDIT TABLE: rbac_audit_log (ensure exists)
-- =====================================================
-- Add target_menu_id column if it doesn't exist
ALTER TABLE public.rbac_audit_log
ADD COLUMN IF NOT EXISTS target_menu_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL;

-- Create index for menu audit queries
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_menu ON public.rbac_audit_log(target_menu_id);

-- =====================================================
-- 10. INITIAL SETUP: Populate role_menu_mapping from role_permissions
-- =====================================================
-- Jika belum ada mapping, kita buat berdasarkan permission yang sudah ada
-- Ini adalah satu kali setup untuk migrasi data
INSERT INTO public.role_menu_mapping (role, menu_item_id, is_enabled)
SELECT DISTINCT
  rp.role,
  mi.id,
  TRUE
FROM public.role_permissions rp
JOIN public.menu_items mi ON mi.required_permission = rp.permission_key
WHERE rp.is_enabled = TRUE
  AND mi.is_visible = TRUE
ON CONFLICT (role, menu_item_id) DO NOTHING;
