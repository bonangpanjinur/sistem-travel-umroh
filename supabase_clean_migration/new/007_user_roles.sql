-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 007: User Roles Table
-- Fine-grained RBAC role assignments. Satu user bisa punya banyak role.
-- Kolom role menggunakan ENUM public.app_role.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role  NOT NULL,
  branch_id   UUID             REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active   BOOLEAN          NOT NULL DEFAULT TRUE,
  granted_by  UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  UNIQUE (user_id, role, branch_id)
);

-- Jika tabel sudah ada dari schema lama tanpa kolom-kolom ini, tambahkan secara idempotent.
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active   BOOLEAN     NOT NULL DEFAULT TRUE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS granted_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Index paling penting — hot path untuk semua RLS policy
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active
  ON public.user_roles(user_id, role)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_branch
  ON public.user_roles(branch_id)
  WHERE branch_id IS NOT NULL;

COMMENT ON TABLE public.user_roles IS
  'RBAC role assignment. Satu user bisa punya banyak role (misal: admin + finance). '
  'Gunakan has_role() / has_any_role() untuk query — jangan query tabel ini langsung dari policy.';

COMMENT ON COLUMN public.user_roles.branch_id IS
  'Scope role ke cabang tertentu (NULL = global). '
  'branch_manager biasanya punya branch_id terisi.';

COMMENT ON COLUMN public.user_roles.expires_at IS
  'Role sementara — NULL berarti tidak ada expiry.';
