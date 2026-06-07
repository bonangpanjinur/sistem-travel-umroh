-- ============================================================
-- 16_financial_tables_compat.sql
-- Porting tabel keuangan (fase28) ke API server lokal
-- Tabel: departure_cost_items, departure_expenses,
--        departure_other_revenues, departure_financial_summary
-- + COA account_code column
-- ============================================================

-- ─── 1. departure_cost_items ─────────────────────────────────
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL DEFAULT 'other',
  sub_category    TEXT,
  location        TEXT,
  hotel_id        UUID,
  nights          INTEGER,
  room_type       TEXT,
  check_in_date   DATE,
  check_out_date  DATE,
  airline_id      UUID,
  flight_route    TEXT,
  flight_class    TEXT,
  description     TEXT        NOT NULL DEFAULT '',
  unit            TEXT        NOT NULL DEFAULT 'per_pax',
  quantity        NUMERIC     NOT NULL DEFAULT 1,
  unit_cost       NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  total_cost_idr  NUMERIC     GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,
  account_code    TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  notes           TEXT,
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dci_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_dci_category     ON departure_cost_items(category);
CREATE INDEX IF NOT EXISTS idx_dci_account_code ON departure_cost_items(account_code) WHERE account_code IS NOT NULL;

-- RLS
ALTER TABLE departure_cost_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_departure_cost_items" ON departure_cost_items;
CREATE POLICY "staff_manage_departure_cost_items" ON departure_cost_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 2. departure_expenses ───────────────────────────────────
CREATE TABLE IF NOT EXISTS departure_expenses (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  expense_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  location        TEXT,
  description     TEXT        NOT NULL DEFAULT '',
  amount          NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  amount_idr      NUMERIC     GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method  TEXT        DEFAULT 'transfer',
  receipt_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_expenses_departure_id ON departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_expense_date ON departure_expenses(expense_date);

ALTER TABLE departure_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_departure_expenses" ON departure_expenses;
CREATE POLICY "staff_manage_departure_expenses" ON departure_expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 3. departure_other_revenues ─────────────────────────────
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  location        TEXT,
  description     TEXT        NOT NULL DEFAULT '',
  amount          NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  amount_idr      NUMERIC     GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_other_revenues_departure_id ON departure_other_revenues(departure_id);

ALTER TABLE departure_other_revenues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_departure_other_revenues" ON departure_other_revenues;
CREATE POLICY "staff_manage_departure_other_revenues" ON departure_other_revenues
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 4. departure_financial_summary ──────────────────────────
CREATE TABLE IF NOT EXISTS departure_financial_summary (
  departure_id            UUID    NOT NULL PRIMARY KEY REFERENCES departures(id) ON DELETE CASCADE,
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
  net_profit              NUMERIC GENERATED ALWAYS AS (
                            revenue_gross + other_revenue_total - hpp_total - expense_total
                          ) STORED,
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
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_write_departure_financial_summary" ON departure_financial_summary
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 5. Add account_code to departure_cost_items (if column missing) ─────────
ALTER TABLE departure_cost_items
  ADD COLUMN IF NOT EXISTS account_code TEXT;

-- Auto-populate account_code dari category yang sudah ada
UPDATE departure_cost_items dci
SET account_code = (
  SELECT c.code
  FROM coa_categories c
  WHERE c.category_key = dci.category
  ORDER BY c.sort_order ASC
  LIMIT 1
)
WHERE dci.account_code IS NULL
  AND dci.category IS NOT NULL;

-- ─── 6. recalculate_departure_financial_summary function ─────
CREATE OR REPLACE FUNCTION recalculate_departure_financial_summary(p_departure_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quota          INTEGER;
  v_pax_confirmed  INTEGER;
  v_pax_cancelled  INTEGER;
  v_rev_gross      NUMERIC;
  v_rev_paid       NUMERIC;
  v_rev_refunded   NUMERIC;
  v_hpp            NUMERIC;
  v_expense        NUMERIC;
  v_other_rev      NUMERIC;
BEGIN
  SELECT COALESCE(quota, 0) INTO v_quota
  FROM departures WHERE id = p_departure_id;

  SELECT
    COALESCE(SUM(CASE WHEN booking_status IN ('confirmed','completed') THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN booking_status = 'cancelled'               THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN booking_status IN ('confirmed','completed') THEN total_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN booking_status IN ('confirmed','completed') THEN paid_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'refunded'                THEN paid_amount ELSE 0 END), 0)
  INTO v_pax_confirmed, v_pax_cancelled, v_rev_gross, v_rev_paid, v_rev_refunded
  FROM bookings WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(total_cost_idr), 0) INTO v_hpp
  FROM departure_cost_items WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_expense
  FROM departure_expenses WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_other_rev
  FROM departure_other_revenues WHERE departure_id = p_departure_id;

  INSERT INTO departure_financial_summary (
    departure_id, quota, pax_confirmed, pax_cancelled,
    revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded,
    hpp_total, expense_total, other_revenue_total,
    last_calculated_at, updated_at
  ) VALUES (
    p_departure_id, v_quota, v_pax_confirmed, v_pax_cancelled,
    v_rev_gross, v_rev_paid, GREATEST(0, v_rev_gross - v_rev_paid), v_rev_refunded,
    v_hpp, v_expense, v_other_rev,
    NOW(), NOW()
  )
  ON CONFLICT (departure_id) DO UPDATE SET
    quota                = EXCLUDED.quota,
    pax_confirmed        = EXCLUDED.pax_confirmed,
    pax_cancelled        = EXCLUDED.pax_cancelled,
    revenue_gross        = EXCLUDED.revenue_gross,
    revenue_paid         = EXCLUDED.revenue_paid,
    revenue_outstanding  = EXCLUDED.revenue_outstanding,
    revenue_refunded     = EXCLUDED.revenue_refunded,
    hpp_total            = EXCLUDED.hpp_total,
    expense_total        = EXCLUDED.expense_total,
    other_revenue_total  = EXCLUDED.other_revenue_total,
    last_calculated_at   = NOW(),
    updated_at           = NOW();
END;
$$;
