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
-- Auth schema stub (for local / non-Supabase Postgres only)
-- On Supabase Cloud, auth schema is managed by Supabase — we have no
-- permission to CREATE TABLE there. This block silently skips on Cloud.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Try to create auth schema (no-op on Supabase Cloud — already exists)
  BEGIN
    CREATE SCHEMA IF NOT EXISTS auth;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- Supabase Cloud: skip silently
  END;

  -- Try to create auth.users stub (only needed for local Postgres)
  BEGIN
    CREATE TABLE IF NOT EXISTS auth.users (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email               TEXT UNIQUE,
      raw_user_meta_data  JSONB,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- Supabase Cloud: skip silently
    WHEN duplicate_table        THEN NULL; -- already exists: skip silently
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- Database roles (Supabase-style)
-- On Supabase Cloud these roles already exist — CREATE ROLE is skipped.
-- On local Postgres they are created fresh.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
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
