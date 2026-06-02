-- ──────────────────────────────────────────────────────────────────────────────
-- fase28: Package Financial Management
-- HPP (Harga Pokok Penjualan), Pengeluaran, Pendapatan per Departure
-- Hotel bersifat DINAMIS: bisa Makkah, Madinah, Istanbul, Dubai, transit, dll.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. departure_cost_items (HPP per item per keberangkatan) ────────────────
-- Komponen biaya modal / HPP. Hotel bisa diinput berkali-kali untuk beda kota.
--
-- Kategori HPP:
--   'airline'       → tiket pesawat (bisa multi-leg: CGK-DOH, DOH-JED, dll.)
--   'hotel'         → hotel DI KOTA MANAPUN; isi kolom location + nights
--   'land_transport'→ bus, taksi, kereta di negara tujuan
--   'visa'          → biaya visa & pengurusan dokumen
--   'handling'      → handling bandara, porter, baggage
--   'muthawif'      → biaya guide / muthawif
--   'equipment'     → koper, seragam, buku manasik, perlengkapan jamaah
--   'manasik'       → biaya pelatihan manasik
--   'insurance'     → asuransi perjalanan / jiwa
--   'document'      → paspor, legalisasi, surat kesehatan, dll.
--   'marketing'     → biaya promosi yang dialokasikan ke departure ini
--   'pic_fee'       → komisi agen / PIC yang menjadi beban paket
--   'overhead'      → biaya overhead kantor dialokasikan
--   'other'         → lainnya
--
-- Unit HPP:
--   'per_pax'   → dikali jumlah jamaah (pax)
--   'per_seat'  → sama dengan per_pax (alias lebih jelas untuk tiket)
--   'per_room'  → dikali jumlah kamar (untuk hotel dengan room rate)
--   'fixed'     → biaya tetap terlepas dari jumlah pax
--   'per_night' → per malam (otomatis × nights jika diisi)
--
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,

  -- Klasifikasi
  category        TEXT        NOT NULL DEFAULT 'other',
  sub_category    TEXT,               -- detail tambahan, bebas isi (mis: "Bintang 5", "Business Class")

  -- Hotel: dinamis, bebas tambah berapa kota pun
  location        TEXT,               -- nama kota/tujuan, mis: "Makkah", "Madinah", "Istanbul", "Dubai", "Jeddah (Transit)"
  hotel_id        UUID        REFERENCES hotels(id) ON DELETE SET NULL,  -- opsional, link ke master hotel
  nights          INTEGER,            -- jumlah malam menginap (khusus kategori 'hotel')
  room_type       TEXT,               -- 'quad','triple','double','single','suite' — opsional
  check_in_date   DATE,               -- tanggal check-in di hotel ini
  check_out_date  DATE,               -- tanggal check-out

  -- Penerbangan: bisa multi-leg
  airline_id      UUID        REFERENCES airlines(id) ON DELETE SET NULL,  -- opsional
  flight_route    TEXT,               -- mis: "CGK → DOH → JED"
  flight_class    TEXT,               -- 'economy','business','first'

  -- Deskripsi & Harga
  description     TEXT        NOT NULL DEFAULT '',
  unit            TEXT        NOT NULL DEFAULT 'per_pax',
  quantity        NUMERIC     NOT NULL DEFAULT 1,
  unit_cost       NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  total_cost_idr  NUMERIC     GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,

  -- Meta
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  notes           TEXT,
  reference_id    UUID,               -- booking referensi eksternal, kontrak hotel, dll.
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_cost_items_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_category     ON departure_cost_items(category);
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_location     ON departure_cost_items(location);

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

-- ─── 2. departure_expenses (Pengeluaran Operasional / Realisasi) ──────────────
-- Pengeluaran aktual yang terjadi selama atau setelah keberangkatan.
-- Hotel di sini juga bisa multi-kota, pakai kolom location.
--
-- Kategori Pengeluaran:
--   'airline_ticket'   → tiket tambahan / change fee / upgrade lapangan
--   'hotel'            → biaya hotel realisasi (beda dari HPP jika ada selisih)
--   'transport'        → transportasi darat realisasi
--   'visa_fee'         → biaya visa / pengurusan darurat
--   'guide'            → honor guide / muthawif realisasi
--   'meals'            → konsumsi / makan di lapangan
--   'tips'             → tips guide, porter, driver
--   'souvenir'         → souvenir / oleh-oleh paket
--   'printing'         → cetak buku, ID card, banner
--   'refund'           → refund kepada jamaah
--   'penalty'          → denda pembatalan / selisih
--   'medical'          → biaya medis darurat di lapangan
--   'operational'      → operasional kantor terkait departure ini
--   'other'            → lainnya
--
CREATE TABLE IF NOT EXISTS departure_expenses (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,  -- opsional, jika terkait 1 jamaah

  expense_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  location        TEXT,               -- kota tempat pengeluaran terjadi, mis: "Makkah", "Istanbul"
  description     TEXT        NOT NULL DEFAULT '',

  amount          NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  amount_idr      NUMERIC     GENERATED ALWAYS AS (amount * exchange_rate) STORED,

  payment_method  TEXT        DEFAULT 'transfer',
  receipt_url     TEXT,
  notes           TEXT,
  approved_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
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
--
-- Kategori Pendapatan Tambahan:
--   'room_upgrade'      → upgrade tipe kamar
--   'extra_night'       → malam tambahan di hotel manapun
--   'addon_service'     → layanan tambahan (city tour, ziarah extra, dll.)
--   'visa_extra'        → biaya visa tambahan / multiple entry
--   'transport_extra'   → transport tambahan
--   'insurance_extra'   → upgrade asuransi
--   'equipment_extra'   → perlengkapan tambahan
--   'penalty_fee'       → biaya pembatalan yang jadi pendapatan
--   'other'             → lainnya
--
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,

  revenue_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  location        TEXT,               -- kota terkait jika relevan (mis: hotel upgrade di "Istanbul")
  description     TEXT        NOT NULL DEFAULT '',

  amount          NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  amount_idr      NUMERIC     GENERATED ALWAYS AS (amount * exchange_rate) STORED,

  notes           TEXT,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
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

-- ─── 4. departure_financial_summary (Cache ringkasan keuangan) ────────────────
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
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','admin','owner','branch_manager','finance')
    )
  );

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
    v_rev_gross, v_rev_paid, v_rev_gross - v_rev_paid, v_rev_refunded,
    v_hpp, v_expense, v_other_rev, NOW(), NOW()
  )
  ON CONFLICT (departure_id) DO UPDATE SET
    quota               = EXCLUDED.quota,
    pax_confirmed       = EXCLUDED.pax_confirmed,
    pax_cancelled       = EXCLUDED.pax_cancelled,
    revenue_gross       = EXCLUDED.revenue_gross,
    revenue_paid        = EXCLUDED.revenue_paid,
    revenue_outstanding = EXCLUDED.revenue_outstanding,
    revenue_refunded    = EXCLUDED.revenue_refunded,
    hpp_total           = EXCLUDED.hpp_total,
    expense_total       = EXCLUDED.expense_total,
    other_revenue_total = EXCLUDED.other_revenue_total,
    last_calculated_at  = NOW(),
    updated_at          = NOW();
END;
$$;

-- ─── 6. Updated_at triggers ───────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgname='set_departure_cost_items_updated_at'
      AND tgrelid='departure_cost_items'::regclass) THEN
    CREATE TRIGGER set_departure_cost_items_updated_at
      BEFORE UPDATE ON departure_cost_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgname='set_departure_expenses_updated_at'
      AND tgrelid='departure_expenses'::regclass) THEN
    CREATE TRIGGER set_departure_expenses_updated_at
      BEFORE UPDATE ON departure_expenses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgname='set_departure_other_revenues_updated_at'
      AND tgrelid='departure_other_revenues'::regclass) THEN
    CREATE TRIGGER set_departure_other_revenues_updated_at
      BEFORE UPDATE ON departure_other_revenues
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
