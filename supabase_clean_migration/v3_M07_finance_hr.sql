-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M07: Finance & HR — Accounting, COA, Journals, Payroll,
--           Commissions, Company Settings
-- Depends on: M01–M06
-- =============================================================================

-- =============================================================================
-- 1. CHART_OF_ACCOUNTS — Bagan akun / COA
-- =============================================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'expense'
    CHECK (type IN ('asset','liability','equity','revenue','expense','cogs')),
  parent_id      UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coa_type      ON chart_of_accounts(type);
CREATE INDEX IF NOT EXISTS idx_coa_parent_id ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_code      ON chart_of_accounts(code);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coa_auth_read"   ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_admin_write" ON chart_of_accounts;

CREATE POLICY "coa_auth_read" ON chart_of_accounts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "coa_admin_write" ON chart_of_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_coa_updated_at'
    AND tgrelid='chart_of_accounts'::regclass) THEN
    CREATE TRIGGER set_coa_updated_at
      BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON chart_of_accounts TO authenticated;


-- =============================================================================
-- 2. JOURNAL_ENTRIES — Jurnal akuntansi
-- =============================================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_number   TEXT UNIQUE,
  description    TEXT NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  total_debit    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit   NUMERIC(15,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','posted','reversed')),
  posted_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  posted_at      TIMESTAMPTZ,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date         ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status       ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference_id ON journal_entries(reference_id);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_entries_finance_manage" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_staff_read"     ON journal_entries;

CREATE POLICY "journal_entries_finance_manage" ON journal_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','finance','it'))
  );

CREATE POLICY "journal_entries_staff_read" ON journal_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_journal_entries_updated_at'
    AND tgrelid='journal_entries'::regclass) THEN
    CREATE TRIGGER set_journal_entries_updated_at
      BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON journal_entries TO authenticated;


-- =============================================================================
-- 3. JOURNAL_LINES — Baris detail jurnal
-- =============================================================================
CREATE TABLE IF NOT EXISTS journal_lines (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id    UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  debit       NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit      NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id   ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id);

ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_lines_finance_manage" ON journal_lines;

CREATE POLICY "journal_lines_finance_manage" ON journal_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','finance','it'))
  );

GRANT SELECT ON journal_lines TO authenticated;


-- =============================================================================
-- 4. VENDOR_INVOICES — Faktur dari vendor
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id      UUID REFERENCES vendors(id) ON DELETE RESTRICT,
  departure_id   UUID REFERENCES departures(id) ON DELETE SET NULL,
  invoice_number TEXT,
  invoice_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  amount_idr     NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  category       TEXT NOT NULL DEFAULT 'other',
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','overdue','cancelled')),
  paid_at        TIMESTAMPTZ,
  proof_url      TEXT,
  notes          TEXT,
  approved_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id    ON vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_departure_id ON vendor_invoices(departure_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status       ON vendor_invoices(status);

ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_invoices_finance_manage" ON vendor_invoices;
DROP POLICY IF EXISTS "vendor_invoices_staff_read"     ON vendor_invoices;

CREATE POLICY "vendor_invoices_finance_manage" ON vendor_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','operational','it'))
  );

CREATE POLICY "vendor_invoices_staff_read" ON vendor_invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendor_invoices_updated_at'
    AND tgrelid='vendor_invoices'::regclass) THEN
    CREATE TRIGGER set_vendor_invoices_updated_at
      BEFORE UPDATE ON vendor_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON vendor_invoices TO authenticated;


-- =============================================================================
-- 5. COMMISSIONS — Komisi agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS commissions (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  rate_percent    NUMERIC(5,2),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','cancelled')),
  approved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  payment_ref     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_booking_id ON commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_agent_id   ON commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status     ON commissions(status);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_finance_manage"  ON commissions;
DROP POLICY IF EXISTS "commissions_agent_own_read"  ON commissions;

CREATE POLICY "commissions_finance_manage" ON commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','it'))
  );

CREATE POLICY "commissions_agent_own_read" ON commissions
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_commissions_updated_at'
    AND tgrelid='commissions'::regclass) THEN
    CREATE TRIGGER set_commissions_updated_at
      BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON commissions TO authenticated;


-- =============================================================================
-- 6. PAYROLL — Penggajian karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year     INTEGER NOT NULL,
  period_month    INTEGER NOT NULL,
  base_salary     NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances      NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions      NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus           NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary      NUMERIC(15,2) GENERATED ALWAYS AS (base_salary + allowances + bonus - deductions) STORED,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  payment_method  TEXT DEFAULT 'transfer',
  notes           TEXT,
  approved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period      ON payroll(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status      ON payroll(status);

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_hr_manage"   ON payroll;
DROP POLICY IF EXISTS "payroll_own_read"    ON payroll;

CREATE POLICY "payroll_hr_manage" ON payroll
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','hr','finance','it'))
  );

CREATE POLICY "payroll_own_read" ON payroll
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_payroll_updated_at'
    AND tgrelid='payroll'::regclass) THEN
    CREATE TRIGGER set_payroll_updated_at
      BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON payroll TO authenticated;


-- =============================================================================
-- 7. COMPANY_SETTINGS — Pengaturan global perusahaan
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT 'null'::JSONB,
  setting_type  TEXT NOT NULL DEFAULT 'string'
    CHECK (setting_type IN ('string','number','boolean','json','url','color')),
  description   TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_key       ON company_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_company_settings_is_public ON company_settings(is_public);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings_anon_public_read"  ON company_settings;
DROP POLICY IF EXISTS "company_settings_auth_read"         ON company_settings;
DROP POLICY IF EXISTS "company_settings_admin_write"       ON company_settings;

CREATE POLICY "company_settings_anon_public_read" ON company_settings
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "company_settings_auth_read" ON company_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "company_settings_admin_write" ON company_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_company_settings_updated_at'
    AND tgrelid='company_settings'::regclass) THEN
    CREATE TRIGGER set_company_settings_updated_at
      BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON company_settings TO anon, authenticated;


-- =============================================================================
-- 8. LOYALTY_POINTS — Poin loyalitas jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS loyalty_points (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points       INTEGER NOT NULL DEFAULT 0,
  type         TEXT NOT NULL DEFAULT 'earn'
    CHECK (type IN ('earn','redeem','expire','adjust')),
  reason       TEXT NOT NULL,
  reference_id UUID,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_id ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_type        ON loyalty_points(type);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_points_staff_manage" ON loyalty_points;
DROP POLICY IF EXISTS "loyalty_points_own_read"     ON loyalty_points;

CREATE POLICY "loyalty_points_staff_manage" ON loyalty_points
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

CREATE POLICY "loyalty_points_own_read" ON loyalty_points
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

GRANT SELECT ON loyalty_points TO authenticated;


-- =============================================================================
-- SELESAI — File M07: Finance & HR
-- =============================================================================
SELECT 'v3_M07_finance_hr: OK' AS result;
