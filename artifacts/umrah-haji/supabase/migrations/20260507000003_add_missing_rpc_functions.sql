-- 1) RPC: get_user_effective_permissions_v2
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions_v2(_user_id uuid, _roles text[])
RETURNS TABLE(permission_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH
    is_super AS (SELECT public.has_role(_user_id, 'super_admin'::app_role) AS yes),
    role_keys AS (
      SELECT rp.permission_key
      FROM public.role_permissions rp
      WHERE rp.is_enabled = true
        AND rp.role::text = ANY(_roles)
    ),
    user_overrides_on AS (
      SELECT up.permission_key FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.is_enabled = true
    ),
    user_overrides_off AS (
      SELECT up.permission_key FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.is_enabled = false
    )
  SELECT pl.key AS permission_key FROM public.permissions_list pl
    WHERE (SELECT yes FROM is_super)
  UNION
  SELECT permission_key FROM (
    SELECT permission_key FROM role_keys
    UNION
    SELECT permission_key FROM user_overrides_on
  ) merged
  WHERE NOT (SELECT yes FROM is_super)
    AND permission_key NOT IN (SELECT permission_key FROM user_overrides_off);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions_v2(uuid, text[]) TO authenticated;

-- 2) RPC: get_menu_access_summary
CREATE OR REPLACE FUNCTION public.get_menu_access_summary()
RETURNS TABLE(role text, total_menus int, accessible_menus int, access_percentage numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH total AS (SELECT count(*)::int AS n FROM public.menu_items WHERE is_visible = true),
  per_role AS (
    SELECT r.role::text AS role,
      (SELECT count(DISTINCT mi.key)::int
        FROM public.menu_items mi
        JOIN public.role_permissions rp
          ON rp.permission_key = mi.required_permission
        WHERE mi.is_visible = true AND rp.is_enabled = true AND rp.role = r.role
      ) AS accessible
    FROM (
      SELECT unnest(ARRAY['owner','branch_manager','finance','operational','sales','marketing','equipment','agent']::app_role[]) AS role
    ) r
  )
  SELECT pr.role, t.n,
    pr.accessible,
    CASE WHEN t.n = 0 THEN 0 ELSE round((pr.accessible::numeric / t.n) * 100, 1) END
  FROM per_role pr CROSS JOIN total t
  UNION ALL
  SELECT 'super_admin', t.n, t.n, 100 FROM total t
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_menu_access_summary() TO authenticated;
