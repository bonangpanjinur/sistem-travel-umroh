-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 008: User Permission Overrides & Staff Invitations
-- Override permission per-user (di luar role default) + undangan staf baru.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. USER_PERMISSION_OVERRIDES — Override permission di luar role default
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT             NOT NULL REFERENCES public.permissions_list(key) ON DELETE CASCADE,
  can_view       BOOLEAN,
  can_create     BOOLEAN,
  can_edit       BOOLEAN,
  can_delete     BOOLEAN,
  reason         TEXT,
  granted_by     UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, permission_key)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_user
  ON public.user_permission_overrides(user_id);

COMMENT ON TABLE public.user_permission_overrides IS
  'Override permission per-user di luar default role. '
  'NULL berarti gunakan nilai dari role_permissions (tidak di-override).';

-- ---------------------------------------------------------------------------
-- 2. STAFF_INVITATIONS — Token undangan onboarding staf baru
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT             NOT NULL,
  role         public.app_role  NOT NULL,
  invited_by   UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id    UUID             REFERENCES public.branches(id) ON DELETE SET NULL,
  token        TEXT             NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token
  ON public.staff_invitations(token);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email
  ON public.staff_invitations(email);

COMMENT ON TABLE public.staff_invitations IS
  'Token undangan untuk onboarding staf baru. Expired setelah 7 hari.';
