-- Step 1: Fix reset_role_permissions to use the actual group_name values present in permissions_list
CREATE OR REPLACE FUNCTION public.reset_role_permissions(_role app_role)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_keys text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can reset role permissions';
  END IF;

  -- Map roles to actual group_name values from permissions_list:
  -- Overview, Penjualan, Keuangan, Keberangkatan, Jamaah, Master Data, Pengaturan
  v_keys := CASE _role::text
    WHEN 'operational' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Keberangkatan','Jamaah','Overview')
    )
    WHEN 'equipment' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Keberangkatan','Overview')
    )
    WHEN 'finance' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Keuangan','Overview')
    )
    WHEN 'sales' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Penjualan','Jamaah','Overview')
    )
    WHEN 'marketing' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Penjualan','Overview')
    )
    WHEN 'agent' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Jamaah','Overview')
    )
    WHEN 'branch_manager' THEN ARRAY(
      SELECT key FROM public.permissions_list
    )
    WHEN 'owner' THEN ARRAY(
      SELECT key FROM public.permissions_list
    )
    ELSE ARRAY[]::text[]
  END;

  -- Wipe existing then re-seed
  DELETE FROM public.role_permissions WHERE role = _role;

  INSERT INTO public.role_permissions(role, permission_key, is_enabled)
  SELECT _role, k, true
  FROM unnest(v_keys) AS k
  ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.log_rbac_change('role','reset_defaults', _role::text, NULL, NULL,
    NULL, jsonb_build_object('count', v_count));
  RETURN v_count;
END;
$function$;

-- Step 2: Seed role_permissions for all staff roles directly (bypass auth check by inserting from migration)
-- owner & branch_manager → all keys
INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'owner'::app_role, key, true FROM public.permissions_list
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'branch_manager'::app_role, key, true FROM public.permissions_list
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

-- operational
INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'operational'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Keberangkatan','Jamaah','Overview')
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

-- equipment
INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'equipment'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Keberangkatan','Overview')
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

-- finance
INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'finance'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Keuangan','Overview')
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

-- sales
INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'sales'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Penjualan','Jamaah','Overview')
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

-- marketing
INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'marketing'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Penjualan','Overview')
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();

-- agent (read-only style: jamaah + overview)
INSERT INTO public.role_permissions(role, permission_key, is_enabled)
SELECT 'agent'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Jamaah','Overview')
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true, updated_at = now();