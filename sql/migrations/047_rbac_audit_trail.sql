-- Migration 047: RBAC Audit Trail (RBAC-P1)
-- Trigger SQL ke admin_activity_log saat permission/role diubah

-- Pastikan tabel admin_activity_log sudah ada (dari fase0), jika belum, buat
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_act_user_id    ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_act_action     ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_act_entity     ON admin_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_act_created    ON admin_activity_log(created_at DESC);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_activity_log" ON admin_activity_log;
CREATE POLICY "admin_read_activity_log" ON admin_activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin'))
  );

DROP POLICY IF EXISTS "system_insert_activity_log" ON admin_activity_log;
CREATE POLICY "system_insert_activity_log" ON admin_activity_log
  FOR INSERT WITH CHECK (TRUE);

-- ─── Trigger: log perubahan user_roles ───────────────────────────────────────
CREATE OR REPLACE FUNCTION tg_log_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_activity_log (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'role_assigned',
      'user_roles',
      NEW.user_id::TEXT,
      NULL,
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_activity_log (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'role_revoked',
      'user_roles',
      OLD.user_id::TEXT,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role),
      NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO admin_activity_log (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'role_updated',
      'user_roles',
      NEW.user_id::TEXT,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role),
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_role_change ON user_roles;
CREATE TRIGGER trg_log_role_change
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION tg_log_role_change();

-- ─── Trigger: log perubahan role_permissions ─────────────────────────────────
CREATE OR REPLACE FUNCTION tg_log_permission_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_activity_log (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'permission_granted',
      'role_permissions',
      COALESCE(NEW.role, ''),
      NULL,
      jsonb_build_object('role', NEW.role, 'permission_key', NEW.permission_key)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_activity_log (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'permission_revoked',
      'role_permissions',
      COALESCE(OLD.role, ''),
      jsonb_build_object('role', OLD.role, 'permission_key', OLD.permission_key),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_permission_change ON role_permissions;
CREATE TRIGGER trg_log_permission_change
  AFTER INSERT OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION tg_log_permission_change();

-- ─── Trigger: log perubahan user_permissions (individual override) ────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_permissions'
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION tg_log_user_permission_change()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $f$
      BEGIN
        INSERT INTO admin_activity_log (user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (
          auth.uid(),
          CASE WHEN TG_OP = 'INSERT' THEN 'individual_permission_granted'
               WHEN TG_OP = 'DELETE' THEN 'individual_permission_revoked'
               ELSE 'individual_permission_updated' END,
          'user_permissions',
          COALESCE(NEW.user_id, OLD.user_id)::TEXT,
          CASE WHEN TG_OP = 'INSERT' THEN NULL
               ELSE jsonb_build_object('user_id', OLD.user_id, 'permission_key', OLD.permission_key, 'granted', OLD.granted) END,
          CASE WHEN TG_OP = 'DELETE' THEN NULL
               ELSE jsonb_build_object('user_id', NEW.user_id, 'permission_key', NEW.permission_key, 'granted', NEW.granted) END
        );
        RETURN COALESCE(NEW, OLD);
      END;
      $f$;

      DROP TRIGGER IF EXISTS trg_log_user_permission_change ON user_permissions;
      CREATE TRIGGER trg_log_user_permission_change
        AFTER INSERT OR UPDATE OR DELETE ON user_permissions
        FOR EACH ROW EXECUTE FUNCTION tg_log_user_permission_change();
    $sql$;
  END IF;
END;
$$;

SELECT 'Migration 047 completed — RBAC audit trail triggers created' AS result;
