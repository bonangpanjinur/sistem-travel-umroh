-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M01: Foundation — Extensions, Helpers, Auth Schema
-- Jalankan PERTAMA sebelum semua file lainnya.
-- Safe to re-run: idempotent.
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- =============================================================================
-- 2. AUTH SCHEMA (Neon / non-Supabase environments)
-- Supabase cloud sudah punya schema ini. Untuk Neon, kita buat minimal.
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT UNIQUE,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  raw_user_meta_data JSONB DEFAULT '{}'::JSONB,
  role          TEXT DEFAULT 'authenticated'
);

-- Fungsi stub auth.uid() — Supabase overrides ini secara native
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::UUID;
$$;

-- Fungsi stub auth.role()
CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'anon');
$$;

-- Fungsi stub auth.email()
CREATE OR REPLACE FUNCTION auth.email()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
$$;


-- =============================================================================
-- 3. HELPER FUNCTIONS
-- =============================================================================

-- update_updated_at_column: dipakai oleh semua trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- slugify_text: konversi teks ke slug URL-safe
CREATE OR REPLACE FUNCTION slugify_text(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(unaccent(input_text));
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '[\s-]+',       '-', 'g');
  result := trim(both '-' from result);
  IF result = '' THEN
    result := 'item-' || left(gen_random_uuid()::text, 8);
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =============================================================================
-- 4. DATABASE ROLES (untuk RLS)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;


-- =============================================================================
-- 5. COLUMN GUARD — ADD COLUMN IF NOT EXISTS helper
-- =============================================================================
-- Helper: tambah kolom jika belum ada (dipakai di file ALTER berikutnya)
CREATE OR REPLACE FUNCTION _add_column_if_not_exists(
  p_table  TEXT,
  p_column TEXT,
  p_type   TEXT,
  p_extra  TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = p_table
      AND column_name  = p_column
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s %s', p_table, p_column, p_type, p_extra);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table % does not exist yet — skipping column %', p_table, p_column;
END;
$$;


-- =============================================================================
-- SELESAI — File M01: Foundation
-- =============================================================================
SELECT 'v3_M01_foundation: OK' AS result;
