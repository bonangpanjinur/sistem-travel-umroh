-- =============================================================================
-- v2_P06 — Finance & Akuntansi
-- Modul : Keuangan (COA, HPP, Jurnal, Kas, Rekonsiliasi)
-- Aman  : CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COA_CATEGORIES — Chart of Accounts (dari migration 15)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coa_categories (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  parent_code  TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  category_key TEXT    CHECK (category_key IN
                         ('revenue','expense','asset','liability','equity','other')),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coa_code       ON coa_categories(code);
CREATE INDEX IF NOT EXISTS idx_coa_parent     ON coa_categories(parent_code);
CREATE INDEX IF NOT EXISTS idx_coa_key        ON coa_categories(category_key);

ALTER TABLE coa_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coa_finance_manage" ON coa_categories;
DROP POLICY IF EXISTS "coa_staff_read"     ON coa_categories;

CREATE POLICY "coa_finance_manage" ON coa_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "coa_staff_read" ON coa_categories
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_coa_categories_updated_at'
    AND tgrelid='coa_categories'::regclass) THEN
    CREATE TRIGGER set_coa_categories_updated_at
      BEFORE UPDATE ON coa_categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed COA standar perjalanan umroh/haji
INSERT INTO coa_categories (code, name, category_key, sort_order) VALUES
  ('1000', 'Aset',                    'asset',     10),
  ('1100', 'Kas & Bank',              'asset',     11),
  ('1200', 'Piutang Jamaah',          'asset',     12),
  ('2000', 'Kewajiban',               'liability', 20),
  ('2100', 'Hutang Vendor',           'liability', 21),
  ('3000', 'Ekuitas',                 'equity',    30),
  ('4000', 'Pendapatan',              'revenue',   40),
  ('4100', 'Pendapatan Umroh',        'revenue',   41),
  ('4200', 'Pendapatan Haji',         'revenue',   42),
  ('4300', 'Pendapatan Wisata',       'revenue',   43),
  ('4400', 'Pendapatan Lain-lain',    'revenue',   44),
  ('5000', 'HPP',                     'expense',   50),
  ('5100', 'HPP Tiket Pesawat',       'expense',   51),
  ('5200', 'HPP Hotel Makkah',        'expense',   52),
  ('5300', 'HPP Hotel Madinah',       'expense',   53),
  ('5400', 'HPP Visa & Dokumen',      'expense',   54),
  ('5500', 'HPP Transportasi',        'expense',   55),
  ('5600', 'HPP Perlengkapan',        'expense',   56),
  ('5700', 'HPP Manasik',             'expense',   57),
  ('6000', 'Biaya Operasional',       'expense',   60),
  ('6100', 'Biaya Gaji',              'expense',   61),
  ('6200', 'Biaya Marketing',         'expense',   62),
  ('6300', 'Biaya Kantor',            'expense',   63),
  ('6400', 'Biaya Komisi Agen',       'expense',   64)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. DEPARTURE_COST_ITEMS — Rencana HPP per keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id             UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category       TEXT    NOT NULL DEFAULT 'other'
                         CHECK (category IN
                           ('hotel','flight','visa','transport','catering',
                            'equipment','manasik','insurance','guide','other')),
  sub_category   TEXT,
  location       TEXT,
  hotel_id       UUID    REFERENCES hotels(id)   ON DELETE SET NULL,
  nights         INTEGER,
  room_type      TEXT    CHECK (room_type IN ('single','double','triple','quad')),
  check_in_date  DATE,
  check_out_date DATE,
  airline_id     UUID    REFERENCES airlines(id) ON DELETE SET NULL,
  flight_route   TEXT,
  flight_class   TEXT,
  description    TEXT    NOT NULL DEFAULT '',
  unit           TEXT    NOT NULL DEFAULT 'per_pax'
                         CHECK (unit IN ('per_pax','per_room','lumpsum','per_day')),
  quantity       NUMERIC NOT NULL DEFAULT 1,
  unit_cost      NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT    NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  total_cost_idr NUMERIC GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,
  account_code   TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  reference_id   UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dci_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_dci_category     ON departure_cost_items(category);

ALTER TABLE departure_cost_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dci_finance_manage" ON departure_cost_items;

CREATE POLICY "dci_finance_manage" ON departure_cost_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_dci_updated_at'
    AND tgrelid='departure_cost_items'::regclass) THEN
    CREATE TRIGGER set_dci_updated_at
      BEFORE UPDATE ON departure_cost_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. DEPARTURE_EXPENSES — Realisasi biaya
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departure_expenses (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  expense_date    DATE    NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT    NOT NULL DEFAULT 'other',
  location        TEXT,
  description     TEXT    NOT NULL DEFAULT '',
  amount          NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC NOT NULL DEFAULT 1,
  amount_idr      NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method  TEXT    DEFAULT 'transfer',
  receipt_url     TEXT,
  approval_status TEXT    DEFAULT 'pending_approval'
                          CHECK (approval_status IN
                            ('pending_approval','approved','rejected','cancelled')),
  approved_by     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_de_departure_id     ON departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_de_expense_date     ON departure_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_de_approval_status  ON departure_expenses(approval_status);

ALTER TABLE departure_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "de_finance_manage" ON departure_expenses;

CREATE POLICY "de_finance_manage" ON departure_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_de_updated_at'
    AND tgrelid='departure_expenses'::regclass) THEN
    CREATE TRIGGER set_de_updated_at
      BEFORE UPDATE ON departure_expenses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. DEPARTURE_OTHER_REVENUES — Pendapatan non-booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id             UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id     UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
  category       TEXT    NOT NULL DEFAULT 'other',
  location       TEXT,
  description    TEXT    NOT NULL DEFAULT '',
  amount         NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT    NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  amount_idr     NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dor_departure_id ON departure_other_revenues(departure_id);

ALTER TABLE departure_other_revenues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dor_finance_manage" ON departure_other_revenues;
CREATE POLICY "dor_finance_manage" ON departure_other_revenues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

-- ---------------------------------------------------------------------------
-- 5. DEPARTURE_FINANCIAL_SUMMARY — Ringkasan per keberangkatan (materialized)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departure_financial_summary (
  departure_id        UUID    NOT NULL PRIMARY KEY REFERENCES departures(id) ON DELETE CASCADE,
  quota               INTEGER NOT NULL DEFAULT 0,
  pax_confirmed       INTEGER NOT NULL DEFAULT 0,
  pax_cancelled       INTEGER NOT NULL DEFAULT 0,
  revenue_gross       NUMERIC NOT NULL DEFAULT 0,
  revenue_paid        NUMERIC NOT NULL DEFAULT 0,
  revenue_outstanding NUMERIC NOT NULL DEFAULT 0,
  revenue_refunded    NUMERIC NOT NULL DEFAULT 0,
  hpp_planned         NUMERIC NOT NULL DEFAULT 0,
  hpp_realized        NUMERIC NOT NULL DEFAULT 0,
  hpp_total           NUMERIC NOT NULL DEFAULT 0,
  expense_total       NUMERIC NOT NULL DEFAULT 0,
  other_revenue_total NUMERIC NOT NULL DEFAULT 0,
  gross_profit        NUMERIC GENERATED ALWAYS AS (revenue_gross - hpp_total) STORED,
  net_profit          NUMERIC GENERATED ALWAYS AS
                        (revenue_gross + other_revenue_total - hpp_total - expense_total) STORED,
  gross_margin_pct    NUMERIC GENERATED ALWAYS AS (
                        CASE WHEN revenue_gross > 0
                          THEN ROUND(((revenue_gross - hpp_total) / revenue_gross) * 100, 2)
                          ELSE 0 END) STORED,
  hpp_variance        NUMERIC GENERATED ALWAYS AS (hpp_realized - hpp_planned) STORED,
  last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE departure_financial_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dfs_finance_read" ON departure_financial_summary;
CREATE POLICY "dfs_finance_read" ON departure_financial_summary
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','branch_manager'))
  );

-- ---------------------------------------------------------------------------
-- 6. JOURNAL_ENTRIES + JOURNAL_ENTRY_LINES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number    TEXT    NOT NULL UNIQUE,
  entry_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT    NOT NULL DEFAULT '',
  ref_type        TEXT,   -- 'booking'|'payment'|'vendor_cost'|'cash'|'manual'
  ref_id          UUID,
  ref_code        TEXT,
  status          TEXT    NOT NULL DEFAULT 'posted'
                          CHECK (status IN ('draft','posted','voided')),
  total_debit     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit    NUMERIC(18,2) NOT NULL DEFAULT 0,
  branch_id       UUID    REFERENCES branches(id) ON DELETE SET NULL,
  created_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  voided_at       TIMESTAMPTZ,
  voided_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_je_entry_date  ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_ref_type    ON journal_entries(ref_type);
CREATE INDEX IF NOT EXISTS idx_je_ref_id      ON journal_entries(ref_id);
CREATE INDEX IF NOT EXISTS idx_je_branch_id   ON journal_entries(branch_id);
CREATE INDEX IF NOT EXISTS idx_je_status      ON journal_entries(status);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "je_finance_manage" ON journal_entries;
DROP POLICY IF EXISTS "je_staff_read"     ON journal_entries;

CREATE POLICY "je_finance_manage" ON journal_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "je_staff_read" ON journal_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','branch_manager'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_je_updated_at'
    AND tgrelid='journal_entries'::regclass) THEN
    CREATE TRIGGER set_je_updated_at
      BEFORE UPDATE ON journal_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id           UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id     UUID    NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number  INTEGER NOT NULL DEFAULT 1,
  account_code TEXT    NOT NULL,
  account_name TEXT,
  description  TEXT,
  debit        NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit       NUMERIC(18,2) NOT NULL DEFAULT 0,
  ref_id       UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jel_entry_id     ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_code ON journal_entry_lines(account_code);

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jel_finance_manage" ON journal_entry_lines;
CREATE POLICY "jel_finance_manage" ON journal_entry_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

-- ---------------------------------------------------------------------------
-- 7. CASH_TRANSACTIONS — TABEL BARU (phantom di kode, belum ada di DB)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_transactions (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID    REFERENCES branches(id) ON DELETE SET NULL,
  transaction_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  type             TEXT    NOT NULL CHECK (type IN ('income','expense','transfer')),
  category         TEXT    NOT NULL DEFAULT 'other',
  description      TEXT    NOT NULL,
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference_id     UUID,
  reference_type   TEXT,
  account_code     TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  payment_method   TEXT    DEFAULT 'cash'
                           CHECK (payment_method IN ('cash','transfer','check')),
  receipt_url      TEXT,
  recorded_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_branch_id        ON cash_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_ct_transaction_date ON cash_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ct_type             ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ct_reference_id     ON cash_transactions(reference_id);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ct_finance_manage" ON cash_transactions;
DROP POLICY IF EXISTS "ct_finance_read"   ON cash_transactions;

CREATE POLICY "ct_finance_manage" ON cash_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "ct_finance_read" ON cash_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','branch_manager'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ct_updated_at'
    AND tgrelid='cash_transactions'::regclass) THEN
    CREATE TRIGGER set_ct_updated_at
      BEFORE UPDATE ON cash_transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. FINANCE_BUDGETS — Anggaran per periode
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance_budgets (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  period_year    INTEGER NOT NULL,
  period_month   INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  account_code   TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  budget_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  branch_id      UUID    REFERENCES branches(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_year, period_month, account_code, branch_id)
);

ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fb_finance_manage" ON finance_budgets;
CREATE POLICY "fb_finance_manage" ON finance_budgets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

-- ---------------------------------------------------------------------------
-- 9. BANK_RECONCILIATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id     UUID    REFERENCES bank_accounts(id) ON DELETE SET NULL,
  account_name   TEXT,
  period_date    DATE    NOT NULL,
  bank_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  book_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  difference     NUMERIC(15,2) GENERATED ALWAYS AS (bank_balance - book_balance) STORED,
  status         TEXT    DEFAULT 'draft'
                         CHECK (status IN ('draft','reconciled','discrepancy')),
  notes          TEXT,
  reconciled_by  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  reconciled_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "br_finance_manage" ON bank_reconciliations;
CREATE POLICY "br_finance_manage" ON bank_reconciliations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

