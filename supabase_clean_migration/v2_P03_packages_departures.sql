-- =============================================================================
-- v2_P03 — ALTER: Packages & Departures (kolom yang hilang)
-- Modul : Paket Perjalanan & Keberangkatan
-- Aman  : ADD COLUMN IF NOT EXISTS, FK via DO block
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PACKAGES — Kolom tambahan
-- ---------------------------------------------------------------------------
ALTER TABLE packages ADD COLUMN IF NOT EXISTS airline_id
  UUID REFERENCES airlines(id) ON DELETE SET NULL;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS child_price_percent    NUMERIC(5,2) DEFAULT 75;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS infant_price_percent   NUMERIC(5,2) DEFAULT 50;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS cancellation_rule_id
  UUID REFERENCES cancellation_rules(id) ON DELETE SET NULL;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS meta_title            TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS meta_description      TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS keywords              TEXT[];
ALTER TABLE packages ADD COLUMN IF NOT EXISTS view_count            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_featured           BOOLEAN DEFAULT FALSE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS min_age               INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_pax               INTEGER DEFAULT 45;

CREATE INDEX IF NOT EXISTS idx_packages_airline_id  ON packages(airline_id);
CREATE INDEX IF NOT EXISTS idx_packages_is_featured ON packages(is_featured);

-- ---------------------------------------------------------------------------
-- 2. DEPARTURES — Semua kolom yang hilang (dari analisis §17)
-- ---------------------------------------------------------------------------

-- Penerbangan
ALTER TABLE departures ADD COLUMN IF NOT EXISTS flight_number       TEXT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS departure_time      TIME;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS airline_id
  UUID REFERENCES airlines(id) ON DELETE SET NULL;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS departure_airport_id
  UUID REFERENCES airports(id) ON DELETE SET NULL;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS arrival_airport_id
  UUID REFERENCES airports(id) ON DELETE SET NULL;

-- Hotel
ALTER TABLE departures ADD COLUMN IF NOT EXISTS hotel_makkah_id
  UUID REFERENCES hotels(id) ON DELETE SET NULL;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS hotel_madinah_id
  UUID REFERENCES hotels(id) ON DELETE SET NULL;

-- Kapasitas
ALTER TABLE departures ADD COLUMN IF NOT EXISTS booked_count        INTEGER NOT NULL DEFAULT 0;

-- Harga per kamar
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_single        NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_double        NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_triple        NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_quad          NUMERIC(15,2);

-- Harga per tipe penumpang
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_adult         NUMERIC(15,2) DEFAULT 0;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_child         NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_infant        NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS child_price_percent NUMERIC(5,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS infant_price_percent NUMERIC(5,2);
-- Per-room child/infant pricing (via 88_passenger_per_room_pricing)
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_child_quad    BIGINT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_infant_quad   BIGINT;

-- Keuangan operasional
ALTER TABLE departures ADD COLUMN IF NOT EXISTS currency            TEXT DEFAULT 'IDR';
ALTER TABLE departures ADD COLUMN IF NOT EXISTS break_even_pax      INTEGER;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS operational_cost_per_pax NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS payment_deadline    DATE;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS document_deadline   DATE;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS visa_deadline       DATE;

-- SDM
ALTER TABLE departures ADD COLUMN IF NOT EXISTS muthawif_id
  UUID REFERENCES muthawifs(id) ON DELETE SET NULL;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS team_leader_id
  UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS tour_leader_user_id
  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- SEO & Display
ALTER TABLE departures ADD COLUMN IF NOT EXISTS month               TEXT;  -- format 'YYYY-MM'
ALTER TABLE departures ADD COLUMN IF NOT EXISTS slug                TEXT UNIQUE;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS meta_title          TEXT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS meta_description    TEXT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS is_featured         BOOLEAN DEFAULT FALSE;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS view_count          INTEGER DEFAULT 0;

-- Index baru untuk departures
CREATE INDEX IF NOT EXISTS idx_departures_hotel_makkah         ON departures(hotel_makkah_id);
CREATE INDEX IF NOT EXISTS idx_departures_hotel_madinah        ON departures(hotel_madinah_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_airport    ON departures(departure_airport_id);
CREATE INDEX IF NOT EXISTS idx_departures_arrival_airport      ON departures(arrival_airport_id);
CREATE INDEX IF NOT EXISTS idx_departures_airline_id           ON departures(airline_id);
CREATE INDEX IF NOT EXISTS idx_departures_muthawif_id          ON departures(muthawif_id);
CREATE INDEX IF NOT EXISTS idx_departures_month                ON departures(month);
CREATE INDEX IF NOT EXISTS idx_departures_slug                 ON departures(slug);

-- ---------------------------------------------------------------------------
-- 3. DEPARTURE_MUTHAWIFS — many-to-many (dari migration 082)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departure_muthawifs (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  muthawif_id  UUID    NOT NULL REFERENCES muthawifs(id)  ON DELETE CASCADE,
  role         TEXT    DEFAULT 'muthawif'
                       CHECK (role IN ('muthawif','tour_leader','assistant')),
  notes        TEXT,
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, muthawif_id)
);
CREATE INDEX IF NOT EXISTS idx_dm_departure_id ON departure_muthawifs(departure_id);
CREATE INDEX IF NOT EXISTS idx_dm_muthawif_id  ON departure_muthawifs(muthawif_id);

ALTER TABLE departure_muthawifs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departure_muthawifs_staff" ON departure_muthawifs;
CREATE POLICY "departure_muthawifs_staff" ON departure_muthawifs
  FOR ALL USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 4. DEPARTURE_WAITING_LIST — dari migration 38
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departure_waiting_list (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id      UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  customer_name     TEXT    NOT NULL,
  customer_phone    TEXT    NOT NULL,
  customer_email    TEXT,
  room_type         TEXT    CHECK (room_type IN ('double','triple','quad')),
  pax_count         INTEGER DEFAULT 1,
  notes             TEXT,
  notified          BOOLEAN DEFAULT FALSE,
  notified_at       TIMESTAMPTZ,
  status            TEXT    DEFAULT 'waiting'
                            CHECK (status IN ('waiting','offered','converted','cancelled')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dwl_departure_id ON departure_waiting_list(departure_id);
CREATE INDEX IF NOT EXISTS idx_dwl_status       ON departure_waiting_list(status);

ALTER TABLE departure_waiting_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dwl_staff_manage" ON departure_waiting_list;
CREATE POLICY "dwl_staff_manage" ON departure_waiting_list
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational','sales'))
  );

