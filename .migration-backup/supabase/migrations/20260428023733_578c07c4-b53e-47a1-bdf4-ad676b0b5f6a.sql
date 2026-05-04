-- =========================================================
-- RBAC: idempotent audit log + reset/sync helpers
-- =========================================================

-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.rbac_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  scope text NOT NULL CHECK (scope IN ('role','user','system')),
  target_role text,
  target_user_id uuid,
  permission_key text,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_created ON public.rbac_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_role ON public.rbac_audit_log (target_role);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_user ON public.rbac_audit_log (target_user_id);

ALTER TABLE public.rbac_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rbac_audit_super_admin_select" ON public.rbac_audit_log;
CREATE POLICY "rbac_audit_super_admin_select"
  ON public.rbac_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "rbac_audit_super_admin_insert" ON public.rbac_audit_log;
CREATE POLICY "rbac_audit_super_admin_insert"
  ON public.rbac_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2) Helper to write audit entries (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_rbac_change(
  _scope text,
  _action text,
  _target_role text DEFAULT NULL,
  _target_user_id uuid DEFAULT NULL,
  _permission_key text DEFAULT NULL,
  _old_value jsonb DEFAULT NULL,
  _new_value jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  SELECT email::text INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.rbac_audit_log(
    actor_id, actor_email, scope, target_role, target_user_id,
    permission_key, action, old_value, new_value, metadata
  ) VALUES (
    auth.uid(), v_email, _scope, _target_role, _target_user_id,
    _permission_key, _action, _old_value, _new_value, _metadata
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 3) Triggers to auto-audit role_permissions & user_permissions
CREATE OR REPLACE FUNCTION public.audit_role_permissions_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_rbac_change('role','grant', NEW.role::text, NULL, NEW.permission_key,
      NULL, jsonb_build_object('is_enabled', NEW.is_enabled));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_enabled IS DISTINCT FROM NEW.is_enabled THEN
      PERFORM public.log_rbac_change('role','toggle', NEW.role::text, NULL, NEW.permission_key,
        jsonb_build_object('is_enabled', OLD.is_enabled),
        jsonb_build_object('is_enabled', NEW.is_enabled));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_rbac_change('role','revoke', OLD.role::text, NULL, OLD.permission_key,
      jsonb_build_object('is_enabled', OLD.is_enabled), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role_permissions ON public.role_permissions;
CREATE TRIGGER trg_audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_permissions_change();

CREATE OR REPLACE FUNCTION public.audit_user_permissions_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_rbac_change('user','override_set', NULL, NEW.user_id, NEW.permission_key,
      NULL, jsonb_build_object('is_enabled', NEW.is_enabled));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_enabled IS DISTINCT FROM NEW.is_enabled THEN
      PERFORM public.log_rbac_change('user','override_change', NULL, NEW.user_id, NEW.permission_key,
        jsonb_build_object('is_enabled', OLD.is_enabled),
        jsonb_build_object('is_enabled', NEW.is_enabled));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_rbac_change('user','override_remove', NULL, OLD.user_id, OLD.permission_key,
      jsonb_build_object('is_enabled', OLD.is_enabled), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_permissions ON public.user_permissions;
CREATE TRIGGER trg_audit_user_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_permissions_change();

-- 4) Reset role permissions to defaults (idempotent)
-- Default templates per role - aligned to plan.md
CREATE OR REPLACE FUNCTION public.reset_role_permissions(_role app_role)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  v_keys text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can reset role permissions';
  END IF;

  -- Pick default permission keys per role from permissions_list using group_name conventions
  v_keys := CASE _role::text
    WHEN 'operational' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Operasional','Produk & Paket','Dashboard')
    )
    WHEN 'finance' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Keuangan','Pembayaran','Dashboard','Laporan')
    )
    WHEN 'sales' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Sales & CRM','Booking & Jamaah','Dashboard')
    )
    WHEN 'marketing' THEN ARRAY(
      SELECT key FROM public.permissions_list
      WHERE group_name IN ('Marketing','Landing Pages','Dashboard')
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
$$;

-- 5) Reset & sync everything (idempotent, safe to call repeatedly)
CREATE OR REPLACE FUNCTION public.resync_all_role_permissions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role app_role;
  v_results jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can resync role permissions';
  END IF;

  FOR v_role IN SELECT unnest(enum_range(NULL::app_role)) LOOP
    BEGIN
      v_count := public.reset_role_permissions(v_role);
      v_results := v_results || jsonb_build_object(v_role::text, v_count);
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(v_role::text, 'error:'||SQLERRM);
    END;
  END LOOP;

  PERFORM public.log_rbac_change('system','resync_all', NULL, NULL, NULL,
    NULL, v_results);
  RETURN v_results;
END;
$$;

-- 6) Convenience view for "users affected by a role"
CREATE OR REPLACE VIEW public.v_role_user_counts AS
SELECT role::text AS role, COUNT(DISTINCT user_id) AS user_count
FROM public.user_roles
GROUP BY role;

GRANT SELECT ON public.v_role_user_counts TO authenticated;
