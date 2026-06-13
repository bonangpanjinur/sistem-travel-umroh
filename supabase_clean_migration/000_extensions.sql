-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 000: Extensions, Auth Schema Stubs, Roles, Utility Functions
-- Run FIRST. Idempotent — safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Auth schema stub (for local / non-Supabase Postgres)
-- On Supabase Cloud, auth.users already exists — these are skipped by the
-- IF NOT EXISTS guard. Safe to run on both environments.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  raw_user_meta_data JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Database roles (Supabase-style)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: update_updated_at — generic timestamp updater trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: slugify_text — convert text → URL-safe slug
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION slugify_text(input TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result TEXT;
BEGIN
  result := LOWER(TRIM(input));
  result := unaccent(result);
  result := REGEXP_REPLACE(result, '[^a-z0-9\s-]', '', 'g');
  result := REGEXP_REPLACE(result, '\s+', '-', 'g');
  result := REGEXP_REPLACE(result, '-+', '-', 'g');
  result := TRIM(result, '-');
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: _add_column_if_not_exists — safe ALTER TABLE ADD COLUMN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _add_column_if_not_exists(
  p_table  TEXT,
  p_column TEXT,
  p_type   TEXT
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = p_table
      AND column_name  = p_column
  ) THEN
    EXECUTE FORMAT('ALTER TABLE public.%I ADD COLUMN %I %s', p_table, p_column, p_type);
  END IF;
END;
$$;

-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON SCHEMA public TO service_role;

SELECT '000_extensions: OK' AS result;
