-- =============================================================================
-- AUTH BOOTSTRAP — Neon/plain-Postgres compatibility layer
-- Runs BEFORE migration_fresh.sql on every first boot.
-- Safe to re-run: all statements are idempotent.
-- =============================================================================

-- UUID support (gen_random_uuid is built-in since PG 13; uuid_generate_v4 needs the extension)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- auth schema + auth.users table
-- Supabase manages these internally; on Neon we create them ourselves.
-- The Express auth layer (lib/auth.ts) reads/writes this table directly.
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT        NOT NULL UNIQUE,
  encrypted_password   TEXT,
  raw_user_meta_data   JSONB       NOT NULL DEFAULT '{}',
  raw_app_meta_data    JSONB       NOT NULL DEFAULT '{}',
  email_confirmed_at   TIMESTAMPTZ,
  last_sign_in_at      TIMESTAMPTZ,
  confirmation_token   TEXT,
  recovery_token       TEXT,
  role                 TEXT        NOT NULL DEFAULT 'authenticated',
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth.users (email);

-- =============================================================================
-- Supabase auth stub functions
-- These exist so RLS policies in migration_fresh.sql are created successfully.
-- In practice, all DB access goes through the Express API (which bypasses RLS
-- because it connects as the DB owner), so these functions are never called
-- during normal app operation.
-- =============================================================================
CREATE OR REPLACE FUNCTION auth.uid()
  RETURNS uuid
  LANGUAGE sql STABLE
AS $$ SELECT NULL::uuid $$;

CREATE OR REPLACE FUNCTION auth.role()
  RETURNS text
  LANGUAGE sql STABLE
AS $$ SELECT 'anon'::text $$;

CREATE OR REPLACE FUNCTION auth.jwt()
  RETURNS jsonb
  LANGUAGE sql STABLE
AS $$ SELECT NULL::jsonb $$;

-- =============================================================================
-- Schema migrations tracker
-- One row per named migration; prevents double-runs across restarts.
-- =============================================================================
CREATE TABLE IF NOT EXISTS _schema_migrations (
  name        TEXT        PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
