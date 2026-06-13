-- ============================================================
-- V0 MISSING TABLES — 001: Core Business Tables
-- Tabel-tabel inti yang direferensikan di seluruh migration
-- tetapi tidak pernah ada di migration file mana pun.
-- Kemungkinan dibuat langsung via Supabase Dashboard.
--
-- Tabel: payments, airlines, departure_hotels,
--        loyalty_points, agent_commissions
-- ============================================================

-- ── 1. AIRLINES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airlines (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT        NOT NULL,
  code           TEXT,                          -- IATA/ICAO code, e.g. 'GA', 'QZ'
  logo_url       TEXT,
  country        TEXT        DEFAULT 'Indonesia',
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airlines_code ON airlines(code);

CREATE TRIGGER set_airlines_updated_at
  BEFORE UPDATE ON airlines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage airlines"
  ON airlines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 2. PAYMENTS ───────────────────────────────────────────────
-- Tabel rekaman pembayaran booking jamaah.
-- fase23 menambah: transaction_id, payment_type (sudah di-ALTER TABLE di v2_sprint_phases)
CREATE TABLE IF NOT EXISTS payments (
  id               UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id       UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount           NUMERIC     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','verified','rejected','cancelled')),
  method           TEXT        NOT NULL DEFAULT 'transfer'
                               CHECK (method IN ('transfer','cash','midtrans','va','qris','gopay')),
  payment_type     TEXT                                          -- dp | cicilan | pelunasan (via fase23)
                               CHECK (payment_type IN ('dp','cicilan','pelunasan') OR payment_type IS NULL),
  transaction_id   TEXT,                                         -- Midtrans transaction_id (via fase23)
  proof_url        TEXT,                                         -- URL bukti transfer
  notes            TEXT,
  verified_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payments"
  ON payments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can manage payments"
  ON payments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales')
    )
  );

CREATE POLICY "Branch managers see only own branch payments"
  ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN user_roles ur ON ur.user_id = auth.uid()
        AND ur.role = 'branch_manager'
      JOIN branches br ON br.id = ur.branch_id AND br.id = b.branch_id
      WHERE b.id = payments.booking_id
    )
  );

-- ── 3. DEPARTURE_HOTELS ───────────────────────────────────────
-- Hotel assignment per keberangkatan.
-- 066b_multi_hotel_per_city.sql menambah kolom city dan trigger sync.
CREATE TABLE IF NOT EXISTS departure_hotels (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id   UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  hotel_id       UUID        NOT NULL REFERENCES hotels(id)     ON DELETE RESTRICT,
  hotel_role     TEXT        NOT NULL DEFAULT 'makkah'
                             CHECK (hotel_role IN ('makkah','madinah','transit','arafah','aziziyah')),
  city           TEXT,                                           -- auto-filled via trigger (066b)
  check_in_date  DATE,
  check_out_date DATE,
  room_type      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departure_hotels_departure_id ON departure_hotels(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_hotels_hotel_role   ON departure_hotels(hotel_role);
CREATE INDEX IF NOT EXISTS idx_departure_hotels_city         ON departure_hotels(city);

CREATE TRIGGER set_departure_hotels_updated_at
  BEFORE UPDATE ON departure_hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE departure_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read departure_hotels"
  ON departure_hotels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage departure_hotels"
  ON departure_hotels FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational')
    )
  );

-- ── 4. LOYALTY_POINTS ────────────────────────────────────────
-- Poin dan tier loyalitas pelanggan.
-- tier_level dipakai oleh trigger tg_badge_loyalty_tier dan fungsi apply_tier_discount.
CREATE TABLE IF NOT EXISTS loyalty_points (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id    UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  total_points   INTEGER     NOT NULL DEFAULT 0,
  tier_level     TEXT        NOT NULL DEFAULT 'silver'
                             CHECK (tier_level IN ('silver','gold','platinum','diamond')),
  lifetime_points INTEGER    NOT NULL DEFAULT 0,              -- tidak berkurang saat redeem
  last_earned_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_id ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_tier        ON loyalty_points(tier_level);

CREATE TRIGGER set_loyalty_points_updated_at
  BEFORE UPDATE ON loyalty_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers see own loyalty"
  ON loyalty_points FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales')
    )
  );

-- ── 5. AGENT_COMMISSIONS ────────────────────────────────────
-- Rekaman komisi agen per booking.
-- Diisi oleh trigger attribute_commission_to_parent (v4_patches/20260511000842).
CREATE TABLE IF NOT EXISTS agent_commissions (
  id                UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id          UUID        NOT NULL REFERENCES agents(id)    ON DELETE CASCADE,
  booking_id        UUID        NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  commission_amount NUMERIC     NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','paid','cancelled')),
  notes             TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_id   ON agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_booking_id ON agent_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status     ON agent_commissions(status);

CREATE TRIGGER set_agent_commissions_updated_at
  BEFORE UPDATE ON agent_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents see own commissions"
  ON agent_commissions FOR SELECT TO authenticated
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager')
    )
  );
CREATE POLICY "Staff manage commissions"
  ON agent_commissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager')
    )
  );
