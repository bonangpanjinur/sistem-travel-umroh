CREATE OR REPLACE FUNCTION public.wipe_and_reset_all_role_permissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_results jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can wipe and reset role permissions';
  END IF;

  -- Hard wipe everything first so we never carry stale legacy keys
  -- (e.g. "customers.view", "payments.verify") that no longer match
  -- the simple keys used by the current frontend menu_items.
  DELETE FROM public.role_permissions;

  FOR v_role IN SELECT unnest(enum_range(NULL::app_role)) LOOP
    BEGIN
      v_count := public.reset_role_permissions(v_role);
      v_results := v_results || jsonb_build_object(v_role::text, v_count);
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(v_role::text, 'error:'||SQLERRM);
    END;
  END LOOP;

  PERFORM public.log_rbac_change('system','wipe_and_reset_all', NULL, NULL, NULL,
    NULL, v_results);
  RETURN v_results;
END;
$function$;