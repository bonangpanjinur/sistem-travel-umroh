-- =============================================================================
-- 02_missing_tables.sql
-- Adds tables / columns that may be missing after the main schema run.
-- Idempotent — safe to run multiple times.
-- =============================================================================

-- ── payments table (if not created by main schema) ────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID        NOT NULL,
  payment_code    TEXT        NOT NULL,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'pending',
  payment_method  TEXT,
  bank_name       TEXT,
  account_name    TEXT,
  account_number  TEXT,
  proof_url       TEXT,
  notes           TEXT,
  verified_at     TIMESTAMPTZ,
  verified_by     UUID,
  payment_date    DATE,
  transaction_id  TEXT,
  payment_type    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id      ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status          ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id  ON payments (transaction_id);

-- ── Ensure app_role enum exists (compat with Supabase migrations) ─────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM (
      'super_admin','owner','admin','branch_manager','finance',
      'operational','sales','marketing','hr','equipment',
      'agent','sub_agent','customer','jamaah','visa_officer'
    );
  END IF;
END $$;

-- ── user_roles table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID  NOT NULL,
  role        TEXT  NOT NULL DEFAULT 'customer',
  branch_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON user_roles (role);

-- =============================================================================
SELECT '02_missing_tables complete' AS result;
