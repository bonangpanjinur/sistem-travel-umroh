-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 006: Permissions Tables
-- Master registry permission + mapping role → permission
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERMISSIONS_LIST — Master registry semua permission key
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions_list (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  group_name  TEXT        NOT NULL DEFAULT 'general',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.permissions_list ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_permissions_list_group ON public.permissions_list(group_name);

COMMENT ON TABLE public.permissions_list IS 'Master daftar semua permission key yang tersedia di sistem.';

-- ---------------------------------------------------------------------------
-- 2. ROLE_PERMISSIONS — Mapping role → permission dengan CRUD flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  role           public.app_role   NOT NULL,
  permission_key TEXT              NOT NULL REFERENCES public.permissions_list(key) ON DELETE CASCADE,
  can_view       BOOLEAN           NOT NULL DEFAULT FALSE,
  can_create     BOOLEAN           NOT NULL DEFAULT FALSE,
  can_edit       BOOLEAN           NOT NULL DEFAULT FALSE,
  can_delete     BOOLEAN           NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (role, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON public.role_permissions(permission_key);

COMMENT ON TABLE public.role_permissions IS 'Mapping role → permission. Kolom role menggunakan ENUM app_role.';
COMMENT ON COLUMN public.role_permissions.role IS 'Gunakan public.app_role ENUM — bukan TEXT.';
