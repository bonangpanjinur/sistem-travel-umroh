-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 004: Branches Table
-- Regional office / kantor cabang.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.branches (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  code             TEXT        UNIQUE,
  slug             TEXT        UNIQUE,
  address          TEXT,
  city             TEXT,
  province         TEXT,
  phone            TEXT,
  email            TEXT,
  manager_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  logo_url         TEXT,
  description      TEXT,
  meta_data        JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jika tabel sudah ada dari schema lama, tambahkan kolom baru secara idempotent
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS slug        TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS logo_url    TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS meta_data   JSONB;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_branches_slug ON public.branches(slug);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(is_active);

COMMENT ON TABLE public.branches IS 'Kantor cabang perusahaan. Digunakan sebagai scope dalam user_roles.';
