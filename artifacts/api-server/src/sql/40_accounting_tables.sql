-- ============================================================
-- 40_accounting_tables.sql
-- Budget, Rekonsiliasi Bank, Reconciliation Items
-- + K-10: account_code columns on payments, cash_transactions, vendor_costs
-- ============================================================

-- ─── 1. finance_budgets ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_budgets (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_year    INTEGER     NOT NULL,
  period_month   INTEGER     NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  account_code   TEXT        NOT NULL,
  budget_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month, account_code)
);

CREATE INDEX IF NOT EXISTS idx_fb_period ON finance_budgets(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_fb_account ON finance_budgets(account_code);

ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_finance_budgets" ON finance_budgets;
CREATE POLICY "staff_manage_finance_budgets"
  ON finance_budgets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── 2. bank_reconciliations ────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id    UUID,
  account_name  TEXT,
  period_date   DATE        NOT NULL,
  bank_balance  NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_balance  NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference    NUMERIC(18,2) GENERATED ALWAYS AS (bank_balance - book_balance) STORED,
  status        TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','reconciled','disputed')),
  notes         TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_br_period  ON bank_reconciliations(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_br_status  ON bank_reconciliations(status);

ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_bank_reconciliations" ON bank_reconciliations;
CREATE POLICY "staff_manage_bank_reconciliations"
  ON bank_reconciliations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── 3. reconciliation_items ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID        NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_ref   TEXT,
  transaction_date  DATE,
  description       TEXT,
  amount            NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_reconciled     BOOLEAN     NOT NULL DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ri_reconciliation_id ON reconciliation_items(reconciliation_id);

ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_reconciliation_items" ON reconciliation_items;
CREATE POLICY "staff_manage_reconciliation_items"
  ON reconciliation_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── 4. K-10: account_code columns ───────────────────────────
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS account_code TEXT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS account_code TEXT;

ALTER TABLE vendor_costs
  ADD COLUMN IF NOT EXISTS account_code TEXT;

-- Auto-populate account_code untuk cash_transactions berdasarkan type
UPDATE cash_transactions
SET account_code = CASE
  WHEN type = 'income'  THEN '4100'
  WHEN type = 'expense' THEN '6100'
  ELSE '1100'
END
WHERE account_code IS NULL
  AND type IS NOT NULL;

-- Auto-populate account_code untuk vendor_costs
UPDATE vendor_costs
SET account_code = '6200'    -- Biaya Perjalanan / Vendor
WHERE account_code IS NULL;

-- Index untuk account_code lookups
CREATE INDEX IF NOT EXISTS idx_ct_account_code ON cash_transactions(account_code) WHERE account_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pay_account_code ON payments(account_code) WHERE account_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vc_account_code ON vendor_costs(account_code) WHERE account_code IS NOT NULL;

COMMENT ON COLUMN cash_transactions.account_code IS 'Kode akun COA (K-10)';
COMMENT ON COLUMN payments.account_code IS 'Kode akun COA (K-10)';
COMMENT ON COLUMN vendor_costs.account_code IS 'Kode akun COA (K-10)';
