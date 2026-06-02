-- ──────────────────────────────────────────────────────────────────────────────
-- fase28: Package Financial Management
-- HPP (Harga Pokok Penjualan), Pengeluaran, Pendapatan per Departure
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. departure_cost_items (HPP per item per keberangkatan) ────────────────
-- Komponen biaya modal / HPP yang menyusun 1 seat di keberangkatan tertentu
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL DEFAULT 'other',
  -- category: 'airline', 'hotel_makkah', 'hotel_madinah', 'land_transport',
  --           'visa', 'handling', 'muthawif', 'equipment', 'manasik',
  --           'insurance', 'document', 'marketing', 'overhead', 'other'
  description     TEXT        NOT NULL DEFAULT '',
  unit            TEXT        NOT NULL DEFAULT 'per_pax',
  -- unit: 'per_pax', 'per_seat', 'fixed', 'per_room'
  quantity        NUMERIC     NOT NULL DEFAULT 1,
  unit_cost       NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  total_cost_idr  NUMERIC     GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,
  notes           TEXT,
  reference_id    UUID,   -- e.g. airline booking id, hotel contract id
  created_by      UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_cost_items_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_category     ON departure_cost_items(category);

ALTER TABLE departure_cost_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_cost_items" ON departure_cost_items;
CREATE POLICY "staff_manage_departure_cost_items" ON departure_cost_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  );

-- ─── 2. departure_expenses (Pengeluaran Operasional per Keberangkatan) ────────
-- Pengeluaran aktual yang terjadi selama atau setelah keberangkatan (realisasi)
CREATE TABLE IF NOT EXISTS departure_expenses (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  expense_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  -- category: 'airline_ticket', 'hotel', 'transport', 'visa_fee', 'guide',
  --           'meals', 'tips', 'souvenir', 'printing', 'refund', 'penalty',
  --           'operational', 'other'
  description     TEXT        NOT NULL DEFAULT '',
  amount          NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  amount_idr      NUMERIC     GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method  TEXT        DEFAULT 'transfer',
  -- payment_method: 'cash', 'transfer', 'card', 'other'
  receipt_url     TEXT,
  notes           TEXT,
  approved_by     UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_expenses_departure_id ON departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_expense_date ON departure_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_category     ON departure_expenses(category);

ALTER TABLE departure_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_expenses" ON departure_expenses;
CREATE POLICY "staff_manage_departure_expenses" ON departure_expenses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  );

-- ─── 3. departure_other_revenues (Pendapatan Tambahan per Keberangkatan) ──────
-- Pendapatan di luar harga paket: upgrade kamar, extra night, addon, dll.
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  -- category: 'room_upgrade', 'extra_night', 'addon_service', 'visa_extra',
  --           'transport_extra', 'insurance_extra', 'penalty_fee', 'other'
  description     TEXT        NOT NULL DEFAULT '',
  amount          NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  amount_idr      NUMERIC     GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes           TEXT,
  created_by      UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_other_revenues_departure_id ON departure_other_revenues(departure_id);

ALTER TABLE departure_other_revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_other_revenues" ON departure_other_revenues;
CREATE POLICY "staff_manage_departure_other_revenues" ON departure_other_revenues
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  );

-- ─── 4. departure_financial_summary (Snapshot / Cache ringkasan keuangan) ─────
-- Di-update via trigger atau manual recalculate untuk performa query dashboard
CREATE TABLE IF NOT EXISTS departure_financial_summary (
  departure_id            UUID    NOT NULL PRIMARY KEY REFERENCES departures(id) ON DELETE CASCADE,

  -- Kapasitas & Jamaah
  quota                   INTEGER NOT NULL DEFAULT 0,
  pax_confirmed           INTEGER NOT NULL DEFAULT 0,  -- booking confirmed/completed
  pax_cancelled           INTEGER NOT NULL DEFAULT 0,

  -- Pendapatan dari Booking (harga jual)
  revenue_gross           NUMERIC NOT NULL DEFAULT 0,  -- total_price semua booking confirmed
  revenue_paid            NUMERIC NOT NULL DEFAULT 0,  -- total yang sudah dibayar (paid_amount)
  revenue_outstanding     NUMERIC NOT NULL DEFAULT 0,  -- sisa belum lunas
  revenue_refunded        NUMERIC NOT NULL DEFAULT 0,  -- total refund

  -- HPP (modal per seat × pax)
  hpp_total               NUMERIC NOT NULL DEFAULT 0,  -- total semua departure_cost_items

  -- Pengeluaran operasional aktual
  expense_total           NUMERIC NOT NULL DEFAULT 0,  -- total departure_expenses

  -- Pendapatan tambahan
  other_revenue_total     NUMERIC NOT NULL DEFAULT 0,  -- total departure_other_revenues

  -- Ringkasan Laba Rugi
  -- Laba Kotor = Pendapatan Bruto - HPP
  gross_profit            NUMERIC GENERATED ALWAYS AS (revenue_gross - hpp_total) STORED,
  -- Laba Bersih = Pendapatan Bruto + Pendapatan Tambahan - HPP - Pengeluaran
  net_profit              NUMERIC GENERATED ALWAYS AS (
                            revenue_gross + other_revenue_total - hpp_total - expense_total
                          ) STORED,
  -- Margin
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

DROP POLICY IF EXISTS "staff_read_departure_financial_summary" ON departure_financial_summary;
CREATE POLICY "staff_read_departure_financial_summary" ON departure_financial_summary
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  );

DROP POLICY IF EXISTS "staff_write_departure_financial_summary" ON departure_financial_summary;
CREATE POLICY "staff_write_departure_financial_summary" ON departure_financial_summary
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  );

-- ─── 5. Function: recalculate_departure_financial_summary ────────────────────
-- Panggil setelah insert/update di booking, cost_items, expenses, other_revenues
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
  -- Quota dari departures
  SELECT COALESCE(quota, 0) INTO v_quota
  FROM departures WHERE id = p_departure_id;

  -- Statistik booking
  SELECT
    COALESCE(SUM(CASE WHEN booking_status IN ('confirmed','completed') THEN total_pax ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN booking_status = 'cancelled'              THEN total_pax ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN booking_status IN ('confirmed','completed') THEN total_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN booking_status IN ('confirmed','completed') THEN paid_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'refunded'               THEN paid_amount ELSE 0 END), 0)
  INTO v_pax_confirmed, v_pax_cancelled, v_rev_gross, v_rev_paid, v_rev_refunded
  FROM bookings
  WHERE departure_id = p_departure_id;

  -- HPP dari departure_cost_items
  SELECT COALESCE(SUM(total_cost_idr), 0) INTO v_hpp
  FROM departure_cost_items
  WHERE departure_id = p_departure_id;

  -- Pengeluaran operasional
  SELECT COALESCE(SUM(amount_idr), 0) INTO v_expense
  FROM departure_expenses
  WHERE departure_id = p_departure_id;

  -- Pendapatan lain-lain
  SELECT COALESCE(SUM(amount_idr), 0) INTO v_other_rev
  FROM departure_other_revenues
  WHERE departure_id = p_departure_id;

  -- Upsert summary
  INSERT INTO departure_financial_summary (
    departure_id, quota, pax_confirmed, pax_cancelled,
    revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded,
    hpp_total, expense_total, other_revenue_total,
    last_calculated_at, updated_at
  ) VALUES (
    p_departure_id, v_quota, v_pax_confirmed, v_pax_cancelled,
    v_rev_gross, v_rev_paid, v_rev_gross - v_rev_paid, v_rev_refunded,
    v_hpp, v_expense, v_other_rev,
    NOW(), NOW()
  )
  ON CONFLICT (departure_id) DO UPDATE SET
    quota                 = EXCLUDED.quota,
    pax_confirmed         = EXCLUDED.pax_confirmed,
    pax_cancelled         = EXCLUDED.pax_cancelled,
    revenue_gross         = EXCLUDED.revenue_gross,
    revenue_paid          = EXCLUDED.revenue_paid,
    revenue_outstanding   = EXCLUDED.revenue_outstanding,
    revenue_refunded      = EXCLUDED.revenue_refunded,
    hpp_total             = EXCLUDED.hpp_total,
    expense_total         = EXCLUDED.expense_total,
    other_revenue_total   = EXCLUDED.other_revenue_total,
    last_calculated_at    = NOW(),
    updated_at            = NOW();
END;
$$;

-- ─── 6. Updated_at triggers ───────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_cost_items_updated_at'
    AND tgrelid='departure_cost_items'::regclass) THEN
    CREATE TRIGGER set_departure_cost_items_updated_at
      BEFORE UPDATE ON departure_cost_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_expenses_updated_at'
    AND tgrelid='departure_expenses'::regclass) THEN
    CREATE TRIGGER set_departure_expenses_updated_at
      BEFORE UPDATE ON departure_expenses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_other_revenues_updated_at'
    AND tgrelid='departure_other_revenues'::regclass) THEN
    CREATE TRIGGER set_departure_other_revenues_updated_at
      BEFORE UPDATE ON departure_other_revenues
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
