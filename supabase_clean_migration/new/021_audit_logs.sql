-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 021: Audit Logs & Security Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AUDIT_LOGS — Log aksi penting (immutable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role   public.app_role,
  action       TEXT             NOT NULL,
  table_name   TEXT,
  record_id    UUID,
  before_data  JSONB,
  after_data   JSONB,
  ip_address   INET,
  user_agent   TEXT,
  context      JSONB,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Partisi friendly index
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table
  ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS
  'Immutable audit trail. Hanya bisa INSERT, tidak boleh UPDATE/DELETE. '
  'Service role insert via trigger. Admin bisa SELECT saja.';

-- ---------------------------------------------------------------------------
-- 2. RBAC_AUDIT_TRAIL — Log perubahan role/permission
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rbac_audit_trail (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by      UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id  UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT             NOT NULL
                                   CHECK (action IN ('role_granted','role_revoked',
                                                      'permission_changed','role_expired')),
  role            public.app_role,
  permission_key  TEXT,
  details         JSONB,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rbac_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rbac_audit_target
  ON public.rbac_audit_trail(target_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. LOGIN_ATTEMPTS — Log percobaan login
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL,
  ip_address   INET,
  user_agent   TEXT,
  success      BOOLEAN     NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_attempts_email
  ON public.login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip
  ON public.login_attempts(ip_address, created_at DESC);

-- ---------------------------------------------------------------------------
-- Helper function: write_audit_log
-- Dipanggil dari trigger atau aplikasi untuk menulis audit log
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_user_id    UUID,
  p_action     TEXT,
  p_table_name TEXT,
  p_record_id  UUID,
  p_before     JSONB DEFAULT NULL,
  p_after      JSONB DEFAULT NULL,
  p_context    JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_role public.app_role;
BEGIN
  SELECT public.get_user_primary_role(p_user_id) INTO v_role;

  INSERT INTO public.audit_logs
    (user_id, actor_role, action, table_name, record_id, before_data, after_data, context)
  VALUES
    (p_user_id, v_role, p_action, p_table_name, p_record_id, p_before, p_after, p_context)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
