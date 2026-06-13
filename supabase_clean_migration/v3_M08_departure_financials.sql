-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M08: Departure Financials — HPP Items, Expenses, Other Revenues,
--           Financial Summary (fase28)
-- Depends on: M01–M07
-- =============================================================================

-- =============================================================================
-- 1. DEPARTURE_COST_ITEMS — Komponen HPP (Harga Pokok Penjualan) per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE SET NULL,
  component       TEXT NOT NULL DEFAULT 'other',
  label           TEXT NOT NULL DEFAULT '',
  unit            TEXT NOT NULL DEFAULT 'per_pax',
  currency        TEXT NOT NULL DEFAULT 'USD',
  unit_cost       NUMERIC NOT NULL DEFAULT 0,
  qty             INTEGER NOT NULL DEFAULT 1,
  exchange_rate   NUMERIC NOT NULL DEFAULT 1,
  total_cost_idr  NUMERIC GENERATED ALWAYS AS (unit_cost * qty * exchange_rate) STORED,
  invoice_ref     TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_cost_items_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_vendor_id    ON departure_cost_items(vendor_id);

ALTER TABLE departure_cost_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_cost_items" ON departure_cost_items;
CREATE POLICY "staff_manage_departure_cost_items" ON departure_cost_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_cost_items_updated_at'
    AND tgrelid='departure_cost_items'::regclass) THEN
    CREATE TRIGGER set_departure_cost_items_updated_at
      BEFORE UPDATE ON departure_cost_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON departure_cost_items TO authenticated;


-- =============================================================================
-- 2. DEPARTURE_EXPENSES — Pengeluaran operasional realisasi per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_expenses (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  category       TEXT NOT NULL DEFAULT 'other',
  location       TEXT,
  description    TEXT NOT NULL DEFAULT '',
  amount         NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  amount_idr     NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method TEXT DEFAULT 'transfer',
  receipt_url    TEXT,
  notes          TEXT,
  approved_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_expenses_departure_id ON departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_expense_date ON departure_expenses(expense_date);

ALTER TABLE departure_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_expenses" ON departure_expenses;
CREATE POLICY "staff_manage_departure_expenses" ON departure_expenses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_expenses_updated_at'
    AND tgrelid='departure_expenses'::regclass) THEN
    CREATE TRIGGER set_departure_expenses_updated_at
      BEFORE UPDATE ON departure_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON departure_expenses TO authenticated;


-- =============================================================================
-- 3. DEPARTURE_OTHER_REVENUES — Pendapatan tambahan per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  category      TEXT NOT NULL DEFAULT 'other',
  location      TEXT,
  description   TEXT NOT NULL DEFAULT '',
  amount        NUMERIC NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  amount_idr    NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_other_revenues_departure_id ON departure_other_revenues(departure_id);

ALTER TABLE departure_other_revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_other_revenues" ON departure_other_revenues;
CREATE POLICY "staff_manage_departure_other_revenues" ON departure_other_revenues
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_other_revenues_updated_at'
    AND tgrelid='departure_other_revenues'::regclass) THEN
    CREATE TRIGGER set_departure_other_revenues_updated_at
      BEFORE UPDATE ON departure_other_revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON departure_other_revenues TO authenticated;


-- =============================================================================
-- 4. DEPARTURE_FINANCIAL_SUMMARY — Cache ringkasan keuangan per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_financial_summary (
  departure_id            UUID NOT NULL PRIMARY KEY REFERENCES departures(id) ON DELETE CASCADE,
  quota                   INTEGER NOT NULL DEFAULT 0,
  pax_confirmed           INTEGER NOT NULL DEFAULT 0,
  pax_cancelled           INTEGER NOT NULL DEFAULT 0,
  revenue_gross           NUMERIC NOT NULL DEFAULT 0,
  revenue_paid            NUMERIC NOT NULL DEFAULT 0,
  revenue_outstanding     NUMERIC NOT NULL DEFAULT 0,
  revenue_refunded        NUMERIC NOT NULL DEFAULT 0,
  hpp_total               NUMERIC NOT NULL DEFAULT 0,
  expense_total           NUMERIC NOT NULL DEFAULT 0,
  other_revenue_total     NUMERIC NOT NULL DEFAULT 0,
  gross_profit            NUMERIC GENERATED ALWAYS AS (revenue_gross - hpp_total) STORED,
  net_profit              NUMERIC GENERATED ALWAYS AS (revenue_gross + other_revenue_total - hpp_total - expense_total) STORED,
  gross_margin_pct        NUMERIC GENERATED ALWAYS AS (
    CASE WHEN revenue_gross > 0
      THEN ROUND(((revenue_gross - hpp_total) / revenue_gross) * 100, 2)
      ELSE 0
    END
  ) STORED,
  last_calculated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE departure_financial_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_departure_financial_summary"  ON departure_financial_summary;
DROP POLICY IF EXISTS "staff_write_departure_financial_summary" ON departure_financial_summary;

CREATE POLICY "staff_read_departure_financial_summary" ON departure_financial_summary
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  );

CREATE POLICY "staff_write_departure_financial_summary" ON departure_financial_summary
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','finance','it'))
  );

GRANT SELECT ON departure_financial_summary TO authenticated;


-- =============================================================================
-- SELESAI — File M08: Departure Financials
-- =============================================================================
SELECT 'v3_M08_departure_financials: OK' AS result;
