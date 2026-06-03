-- =============================================================================
-- 00_auth_bootstrap.sql
-- Creates the auth schema, auth.users table, Supabase stub functions,
-- and the _schema_migrations tracker table.
-- This file is idempotent and safe to run multiple times.
-- =============================================================================

-- ── 1. auth schema ────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

-- ── 2. auth.users table ───────────────────────────────────────────────────────
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
  confirmed_at          TIMESTAMPTZ GENERATED ALWAYS AS (
                          LEAST(email_confirmed_at, phone_confirmed_at)
                        ) STORED,
  phone                 TEXT,
  phone_confirmed_at    TIMESTAMPTZ,
  banned_until          TIMESTAMPTZ,
  is_super_admin        BOOLEAN     DEFAULT FALSE,
  is_sso_user           BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth.users (email);
CREATE INDEX IF NOT EXISTS auth_users_deleted_at_idx ON auth.users (deleted_at);

-- ── 3. Supabase stub functions ────────────────────────────────────────────────
-- These stubs allow RLS policies that reference auth.uid() / auth.role()
-- to compile and run. In production (Supabase) the real functions are used.
-- In our Express proxy, auth context is set via set_config before queries.

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID $$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT
  LANGUAGE sql STABLE
  AS $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') $$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB
  LANGUAGE sql STABLE
  AS $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb) $$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT
  LANGUAGE sql STABLE
  AS $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'email', '') $$;

-- ── 4. _schema_migrations tracker ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _schema_migrations (
  name       TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
SELECT '00_auth_bootstrap complete' AS result;
