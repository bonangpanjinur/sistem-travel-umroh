-- =============================================================================
-- 092_ensure_core_relations.sql
-- Memastikan semua tabel dan relasi inti ada — FULLY IDEMPOTENT.
-- Aman dijalankan berkali-kali pada database yang sudah ada maupun fresh.
--
-- Urutan penting:
--   1. auth schema + auth.users
--   2. Helper functions (is_admin, has_role, user_belongs_to_branch)
--   3. profiles + user_roles (FK ke auth.users)
--   4. airlines (direferensikan oleh departures & migration 091)
--   5. Kolom-kolom tambahan yang mungkin belum ada
--   6. Trigger on_auth_user_created
-- =============================================================================

-- ── 0. Extensions yang diperlukan ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Roles PostgreSQL yang dibutuhkan RLS ───────────────────────────────────
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE anon          NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. auth schema + auth.users ───────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT        NOT NULL UNIQUE,
  encrypted_password    TEXT        NOT NULL DEFAULT '',
  email_confirmed_at    TIMESTAMPTZ,
  last_sign_in_at       TIMESTAMPTZ,
  raw_app_meta_data     JSONB       DEFAULT '{}',
  raw_user_meta_data    JSONB       DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  role                  TEXT        NOT NULL DEFAULT 'authenticated',
  aud                   TEXT        NOT NULL DEFAULT 'authenticated',
  confirmation_token    TEXT,
  recovery_token        TEXT,
  invited_at            TIMESTAMPTZ,
  phone                 TEXT,
  phone_confirmed_at    TIMESTAMPTZ,
  banned_until          TIMESTAMPTZ,
  is_super_admin        BOOLEAN     DEFAULT FALSE,
  is_sso_user           BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Kolom confirmed_at (generated) — tambah hanya jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE auth.users
      ADD COLUMN confirmed_at TIMESTAMPTZ
        GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS auth_users_email_idx      ON auth.users (email);
CREATE INDEX IF NOT EXISTS auth_users_deleted_at_idx ON auth.users (deleted_at);

-- ── 3. Stub functions auth.uid / auth.role / auth.jwt / auth.email ───────────
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID $$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT
  LANGUAGE sql STABLE AS
  $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') $$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB
  LANGUAGE sql STABLE AS
  $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb) $$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT
  LANGUAGE sql STABLE AS
  $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'email', '') $$;

GRANT EXECUTE ON FUNCTION auth.uid()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role()  TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.jwt()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.email() TO PUBLIC;

-- ── 4. update_updated_at_column helper ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 5. Helper fungsi RBAC — harus ada sebelum RLS policies ──────────────────

-- 5a. is_admin(user_id) — cek apakah user adalah super_admin/owner/admin
-- Gunakan DROP + CREATE untuk menghindari konflik nama parameter
DROP FUNCTION IF EXISTS public.is_admin(UUID);
CREATE FUNCTION public.is_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = COALESCE(
      is_admin.user_id,
      NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID
    )
    AND ur.role IN ('super_admin', 'owner', 'admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO PUBLIC;

-- 5b. has_role(user_id, role) — cek apakah user memiliki role tertentu
--     Mendukung TEXT (fleksibel) maupun jika app_role enum ada
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = p_user_id
      AND user_roles.role = p_role
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO PUBLIC;

-- 5c. Overload has_role untuk app_role ENUM (dipakai oleh beberapa RLS policy)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
      RETURNS BOOLEAN
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT public.has_role(p_user_id, p_role::TEXT);
      $body$;
      GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO PUBLIC;
    $func$;
  END IF;
END $$;

-- 5d. user_belongs_to_branch(user_id, branch_id) — cek keanggotaan cabang
CREATE OR REPLACE FUNCTION public.user_belongs_to_branch(p_user_id UUID, p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = p_user_id
      AND user_roles.branch_id = p_branch_id
  )
  OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.user_id = p_user_id
      AND employees.branch_id = p_branch_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_branch(UUID, UUID) TO PUBLIC;

-- ── 6. profiles — ekstensi auth.users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  email         TEXT,
  role          TEXT        DEFAULT 'customer',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom-kolom yang mungkin belum ada di profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- Trigger updated_at untuk profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_profiles_updated_at'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own"           ON public.profiles;
DROP POLICY IF EXISTS "staff_read_profiles"    ON public.profiles;
DROP POLICY IF EXISTS "admin_manage_profiles"  ON public.profiles;

CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "staff_read_profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_profiles" ON public.profiles
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ── 7. user_roles — RBAC utama ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'customer'
             CHECK (role IN (
               'super_admin','owner','admin','branch_manager','finance',
               'operational','sales','marketing','hr','equipment',
               'agent','sub_agent','customer','jamaah','visa_officer','it'
             )),
  branch_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id   ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role       ON public.user_roles (role);
CREATE INDEX IF NOT EXISTS idx_user_roles_branch_id  ON public.user_roles (branch_id);

-- RLS user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read_own"     ON public.user_roles;

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- ── 8. Trigger: auto-create profile saat auth.users baru dibuat ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-assign role 'customer' jika belum ada role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 9. airlines — tabel maskapai yang direferensikan banyak tempat ────────────
CREATE TABLE IF NOT EXISTS public.airlines (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  code        TEXT        NOT NULL UNIQUE,
  logo_url    TEXT,
  country     TEXT        DEFAULT 'Indonesia',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airlines_code      ON public.airlines (code);
CREATE INDEX IF NOT EXISTS idx_airlines_is_active ON public.airlines (is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_airlines_updated_at'
      AND tgrelid = 'public.airlines'::regclass
  ) THEN
    CREATE TRIGGER set_airlines_updated_at
      BEFORE UPDATE ON public.airlines
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Seed maskapai umum yang sering dipakai Umroh/Haji
INSERT INTO public.airlines (name, code, country) VALUES
  ('Saudi Arabian Airlines',    'SV',  'Saudi Arabia'),
  ('Garuda Indonesia',          'GA',  'Indonesia'),
  ('Lion Air',                  'JT',  'Indonesia'),
  ('Batik Air',                 'ID',  'Indonesia'),
  ('Citilink',                  'QG',  'Indonesia'),
  ('Air Asia',                  'QZ',  'Indonesia'),
  ('Emirates',                  'EK',  'United Arab Emirates'),
  ('Qatar Airways',             'QR',  'Qatar'),
  ('Etihad Airways',            'EY',  'United Arab Emirates'),
  ('Turkish Airlines',          'TK',  'Turkey'),
  ('flyadeal',                  'F3',  'Saudi Arabia'),
  ('flynas',                    'XY',  'Saudi Arabia')
ON CONFLICT (code) DO NOTHING;

-- ── 10. Kolom airline_id pada departures (FK ke airlines) ────────────────────
ALTER TABLE public.departures
  ADD COLUMN IF NOT EXISTS airline_id UUID REFERENCES public.airlines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departures_airline_id ON public.departures (airline_id);

-- ── 11. Kolom tambahan di packages yang direferensikan di berbagai query ───────
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS airline_id           UUID REFERENCES public.airlines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hotel_makkah_id      UUID,
  ADD COLUMN IF NOT EXISTS hotel_madinah_id     UUID,
  ADD COLUMN IF NOT EXISTS package_type         TEXT DEFAULT 'umroh',
  ADD COLUMN IF NOT EXISTS is_featured          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slug                 TEXT,
  ADD COLUMN IF NOT EXISTS seo_title            TEXT,
  ADD COLUMN IF NOT EXISTS seo_description      TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords         TEXT;

CREATE INDEX IF NOT EXISTS idx_packages_airline_id   ON public.packages (airline_id);
CREATE INDEX IF NOT EXISTS idx_packages_is_featured  ON public.packages (is_featured);

-- ── 12. _schema_migrations tracker ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public._schema_migrations (
  name       TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Juga di schema publik untuk backward compat
CREATE TABLE IF NOT EXISTS _schema_migrations (
  name       TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 13. GRANT dasar ke role authenticated dan anon ───────────────────────────
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.airlines   TO authenticated, anon;
GRANT SELECT ON public.packages   TO authenticated, anon;
GRANT SELECT ON public.departures TO authenticated, anon;
GRANT SELECT ON public.hotels     TO authenticated, anon;
GRANT SELECT ON public.branches   TO authenticated, anon;
GRANT SELECT ON public.profiles   TO authenticated;
GRANT ALL    ON public.profiles   TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- =============================================================================
SELECT '092_ensure_core_relations complete — auth + profiles + user_roles + airlines idempotent' AS result;
