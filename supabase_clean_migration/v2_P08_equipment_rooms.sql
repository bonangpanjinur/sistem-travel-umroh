-- =============================================================================
-- v2_P08 — Perlengkapan, Kamar, Hotel Contracts
-- Modul : Operasional Lapangan
-- Aman  : CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EQUIPMENT_ITEMS — Barang perlengkapan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_items (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT    NOT NULL,
  category            TEXT    NOT NULL DEFAULT 'umum',
  description         TEXT,
  photo_url           TEXT,
  stock_quantity      INTEGER DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  gender_target       TEXT    NOT NULL DEFAULT 'all'
                              CHECK (gender_target IN ('all','male','female')),
  has_variants        BOOLEAN NOT NULL DEFAULT FALSE,
  has_sizes           BOOLEAN NOT NULL DEFAULT FALSE,
  available_sizes     TEXT[]  DEFAULT '{}',
  pic                 TEXT,
  pic_type            TEXT,
  qr_code             TEXT,
  unit_cost           INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ei_category ON equipment_items(category);

ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ei_equipment_manage" ON equipment_items;
DROP POLICY IF EXISTS "ei_staff_read"       ON equipment_items;

CREATE POLICY "ei_equipment_manage" ON equipment_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','equipment','operational'))
  );

CREATE POLICY "ei_staff_read" ON equipment_items
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ei_updated_at'
    AND tgrelid='equipment_items'::regclass) THEN
    CREATE TRIGGER set_ei_updated_at
      BEFORE UPDATE ON equipment_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. EQUIPMENT_VARIANTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_variants (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id        UUID    NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  size                TEXT,
  color               TEXT,
  sku                 TEXT,
  stock_good          INTEGER NOT NULL DEFAULT 0,
  stock_damaged       INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 2,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ev_equipment_id ON equipment_variants(equipment_id);

ALTER TABLE equipment_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ev_manage" ON equipment_variants;
CREATE POLICY "ev_manage" ON equipment_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','equipment','operational'))
  );

-- ---------------------------------------------------------------------------
-- 3. EQUIPMENT_STOCK_HISTORY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_stock_history (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id UUID    NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  change_type       TEXT    NOT NULL CHECK (change_type IN ('in','out','adjustment','damage','return')),
  quantity_change   INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity      INTEGER NOT NULL DEFAULT 0,
  reason            TEXT,
  reference_id      UUID,
  created_by        UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_esh_equipment_id ON equipment_stock_history(equipment_item_id);

ALTER TABLE equipment_stock_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "esh_manage" ON equipment_stock_history;
CREATE POLICY "esh_manage" ON equipment_stock_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','equipment','operational'))
  );

-- ---------------------------------------------------------------------------
-- 4. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan ke jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_distributions (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID    NOT NULL REFERENCES customers(id)    ON DELETE CASCADE,
  departure_id        UUID    REFERENCES departures(id)            ON DELETE SET NULL,
  booking_id          UUID    REFERENCES bookings(id)              ON DELETE SET NULL,
  equipment_id        UUID    REFERENCES equipment_items(id)       ON DELETE RESTRICT,
  item_name           TEXT    NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  size                TEXT,
  distributed_at      TIMESTAMPTZ DEFAULT NOW(),
  distributed_by      UUID    REFERENCES auth.users(id)            ON DELETE SET NULL,
  returned_at         TIMESTAMPTZ,
  confirmed_by_jamaah BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT
);
CREATE INDEX IF NOT EXISTS idx_eddist_departure_id ON equipment_distributions(departure_id);
CREATE INDEX IF NOT EXISTS idx_eddist_customer_id  ON equipment_distributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_eddist_booking_id   ON equipment_distributions(booking_id);

ALTER TABLE equipment_distributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eddist_manage"       ON equipment_distributions;
DROP POLICY IF EXISTS "eddist_own_read"     ON equipment_distributions;

CREATE POLICY "eddist_manage" ON equipment_distributions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','equipment','operational'))
  );

CREATE POLICY "eddist_own_read" ON equipment_distributions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. PACKAGE_TYPE_EQUIPMENT — Default perlengkapan per tipe paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_type_equipment (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type_id   UUID,
  equipment_item_id UUID    NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  default_quantity  INTEGER NOT NULL DEFAULT 1,
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. ROOM_ASSIGNMENTS — Kamar hotel per keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_assignments (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  room_number    TEXT    NOT NULL,
  room_type      TEXT    NOT NULL DEFAULT 'quad'
                         CHECK (room_type IN ('double','triple','quad')),
  floor          INTEGER,
  capacity       INTEGER DEFAULT 4,
  hotel_name     TEXT,
  hotel_location TEXT    DEFAULT 'mecca'
                         CHECK (hotel_location IN ('mecca','medina')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, room_number, hotel_location)
);
CREATE INDEX IF NOT EXISTS idx_ra_departure_id ON room_assignments(departure_id);

ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ra_staff_manage" ON room_assignments;
DROP POLICY IF EXISTS "ra_own_read"     ON room_assignments;

CREATE POLICY "ra_staff_manage" ON room_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "ra_own_read" ON room_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ra_updated_at'
    AND tgrelid='room_assignments'::regclass) THEN
    CREATE TRIGGER set_ra_updated_at
      BEFORE UPDATE ON room_assignments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. ROOM_OCCUPANTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_occupants (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  room_assignment_id UUID    NOT NULL REFERENCES room_assignments(id) ON DELETE CASCADE,
  customer_id        UUID    NOT NULL REFERENCES customers(id)        ON DELETE CASCADE,
  bed_number         INT,
  mahram_validated   BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_assignment_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_ro_room_id     ON room_occupants(room_assignment_id);
CREATE INDEX IF NOT EXISTS idx_ro_customer_id ON room_occupants(customer_id);

ALTER TABLE room_occupants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ro_staff_manage" ON room_occupants;
CREATE POLICY "ro_staff_manage" ON room_occupants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

-- ---------------------------------------------------------------------------
-- 8. HOTEL_CONTRACTS & HOTEL_VOUCHERS (dari migration 082)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotel_contracts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id        UUID    REFERENCES hotels(id)     ON DELETE RESTRICT,
  departure_id    UUID    REFERENCES departures(id) ON DELETE CASCADE,
  contract_number TEXT,
  contract_date   DATE,
  room_type       TEXT    CHECK (room_type IN ('double','triple','quad')),
  room_count      INTEGER NOT NULL DEFAULT 0,
  price_per_room  NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT    DEFAULT 'SAR',
  check_in_date   DATE,
  check_out_date  DATE,
  nights          INTEGER,
  total_amount    NUMERIC(15,2) GENERATED ALWAYS AS (room_count * price_per_room) STORED,
  status          TEXT    DEFAULT 'draft'
                          CHECK (status IN ('draft','confirmed','paid','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hc_hotel_id     ON hotel_contracts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hc_departure_id ON hotel_contracts(departure_id);

ALTER TABLE hotel_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hc_ops_manage" ON hotel_contracts;
CREATE POLICY "hc_ops_manage" ON hotel_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_hc_updated_at'
    AND tgrelid='hotel_contracts'::regclass) THEN
    CREATE TRIGGER set_hc_updated_at
      BEFORE UPDATE ON hotel_contracts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS hotel_vouchers (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id    UUID    REFERENCES hotel_contracts(id) ON DELETE SET NULL,
  voucher_number TEXT    NOT NULL,
  issued_date    DATE,
  valid_from     DATE,
  valid_until    DATE,
  room_type      TEXT,
  pax_count      INTEGER,
  amount         NUMERIC(15,2),
  status         TEXT    DEFAULT 'active',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hv_contract_id ON hotel_vouchers(contract_id);

