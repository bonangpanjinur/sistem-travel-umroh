-- =============================================================================
-- 02_missing_tables.sql
-- Tables that are referenced in migration_fresh.sql (via ALTER TABLE /
-- triggers / policies) but whose CREATE TABLE statement was in an older
-- Supabase migration file that is NOT included in migration_fresh.sql.
--
-- Idempotent: every statement uses IF NOT EXISTS guards.
-- =============================================================================

-- ── Supabase-compatibility roles ──────────────────────────────────────────────
-- Supabase creates these roles automatically; plain Postgres / Neon doesn't.
-- We need them so GRANT/REVOKE statements in migration_fresh.sql don't error.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- ── payments ──────────────────────────────────────────────────────────────────
-- This table exists in vinstour_schema_1_foundation.sql but was accidentally
-- omitted from migration_fresh.sql (which concatenates only the Supabase
-- incremental migration files, not the original foundation).
CREATE TABLE IF NOT EXISTS payments (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method   TEXT NOT NULL DEFAULT 'transfer'
    CHECK (payment_method IN ('transfer','cash','midtrans','qris','va','gopay','shopeepay','ovo','lainnya')),
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','cancelled')),
  proof_url        TEXT,
  notes            TEXT,
  verified_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  transaction_id   TEXT,
  payment_type     TEXT,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  payment_code     TEXT,
  bank_name        TEXT,
  account_name     TEXT,
  account_number   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id     ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status         ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date   ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch_id      ON payments(branch_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_admin_manage" ON payments;
DROP POLICY IF EXISTS "payments_own_read"     ON payments;

CREATE POLICY "payments_admin_manage" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "payments_own_read" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_payments_updated_at'
      AND tgrelid = 'payments'::regclass
  ) THEN
    CREATE TRIGGER set_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── savings_payments (referenced in migration_fresh.sql triggers) ─────────────
CREATE TABLE IF NOT EXISTS savings_payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_id     UUID REFERENCES savings_plans(id) ON DELETE CASCADE,
  schedule_id    UUID REFERENCES savings_schedules(id) ON DELETE SET NULL,
  amount         NUMERIC(15,2) NOT NULL,
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'transfer',
  proof_url      TEXT,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected')),
  verified_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_payments_savings_id ON savings_payments(savings_id);

-- ── invoice_templates (referenced in supabase/migrations) ────────────────────
CREATE TABLE IF NOT EXISTS invoice_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES branches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  content     JSONB DEFAULT '{}',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
