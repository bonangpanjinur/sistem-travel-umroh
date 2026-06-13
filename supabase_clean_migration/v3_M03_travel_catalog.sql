-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M03: Travel Catalog — Airlines, Hotels, Vendors, Packages, Departures
-- Depends on: M01, M02
-- =============================================================================

-- =============================================================================
-- 1. AIRLINES — Maskapai penerbangan
-- =============================================================================
CREATE TABLE IF NOT EXISTS airlines (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  logo_url   TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airlines_read_authenticated" ON airlines;
DROP POLICY IF EXISTS "airlines_admin_write"        ON airlines;

CREATE POLICY "airlines_read_authenticated" ON airlines
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "airlines_admin_write" ON airlines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_airlines_updated_at'
    AND tgrelid='airlines'::regclass) THEN
    CREATE TRIGGER set_airlines_updated_at
      BEFORE UPDATE ON airlines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON airlines TO authenticated, anon;


-- =============================================================================
-- 2. HOTELS — Data hotel (Mekkah, Madinah, transit)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hotels (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'Saudi Arabia',
  star_rating     INTEGER CHECK (star_rating BETWEEN 1 AND 7),
  distance_to_haram_m INTEGER,
  address         TEXT,
  amenities       TEXT[] DEFAULT '{}',
  image_urls      TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotels_city      ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON hotels(is_active);

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotels_read_authenticated" ON hotels;
DROP POLICY IF EXISTS "hotels_admin_write"        ON hotels;

CREATE POLICY "hotels_read_authenticated" ON hotels
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "hotels_admin_write" ON hotels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_hotels_updated_at'
    AND tgrelid='hotels'::regclass) THEN
    CREATE TRIGGER set_hotels_updated_at
      BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON hotels TO authenticated, anon;


-- =============================================================================
-- 3. HOTEL_ROOM_CAPACITIES — Kapasitas kamar per kategori (fase 065)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hotel_room_capacities (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type     TEXT NOT NULL,
  capacity_pax  INTEGER NOT NULL DEFAULT 1,
  total_rooms   INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hotel_id, room_type)
);

CREATE INDEX IF NOT EXISTS idx_hotel_room_caps_hotel_id ON hotel_room_capacities(hotel_id);

ALTER TABLE hotel_room_capacities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_room_caps_read"  ON hotel_room_capacities;
DROP POLICY IF EXISTS "hotel_room_caps_write" ON hotel_room_capacities;

CREATE POLICY "hotel_room_caps_read" ON hotel_room_capacities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "hotel_room_caps_write" ON hotel_room_capacities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_hotel_room_caps_updated_at'
    AND tgrelid='hotel_room_capacities'::regclass) THEN
    CREATE TRIGGER set_hotel_room_caps_updated_at
      BEFORE UPDATE ON hotel_room_capacities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. VENDORS — Vendor/supplier (bus, katering, guide, dll)
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other',
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  npwp            TEXT,
  bank_name       TEXT,
  bank_account    TEXT,
  bank_account_name TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_category  ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_staff_manage" ON vendors;
DROP POLICY IF EXISTS "vendors_staff_read"   ON vendors;

CREATE POLICY "vendors_staff_read" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "vendors_staff_manage" ON vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendors_updated_at'
    AND tgrelid='vendors'::regclass) THEN
    CREATE TRIGGER set_vendors_updated_at
      BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON vendors TO authenticated;


-- =============================================================================
-- 5. PACKAGES — Paket Umroh / Haji / Wisata
-- =============================================================================
CREATE TABLE IF NOT EXISTS packages (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  TEXT NOT NULL,
  code                  TEXT UNIQUE,
  type                  TEXT NOT NULL DEFAULT 'umroh'
    CHECK (type IN ('umroh','haji','haji_plus','wisata','custom')),
  description           TEXT,
  short_description     TEXT,
  duration_days         INTEGER NOT NULL DEFAULT 9,
  base_price            NUMERIC(15,2) NOT NULL DEFAULT 0,
  child_price_percent   NUMERIC(5,2) NOT NULL DEFAULT 85.00,
  infant_price_percent  NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  currency              TEXT NOT NULL DEFAULT 'IDR',
  airline_id            UUID REFERENCES airlines(id) ON DELETE SET NULL,
  hotel_makkah_id       UUID REFERENCES hotels(id) ON DELETE SET NULL,
  hotel_madinah_id      UUID REFERENCES hotels(id) ON DELETE SET NULL,
  room_types            TEXT[] DEFAULT ARRAY['quad','triple','double'],
  max_capacity          INTEGER DEFAULT 45,
  min_capacity          INTEGER DEFAULT 20,
  is_featured           BOOLEAN NOT NULL DEFAULT FALSE,
  is_published          BOOLEAN NOT NULL DEFAULT FALSE,
  thumbnail_url         TEXT,
  gallery_urls          TEXT[] DEFAULT '{}',
  inclusions            TEXT[] DEFAULT '{}',
  exclusions            TEXT[] DEFAULT '{}',
  highlight_text        TEXT,
  seo_title             TEXT,
  seo_description       TEXT,
  slug                  TEXT UNIQUE,
  departure_city        TEXT DEFAULT 'Jakarta',
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_type        ON packages(type);
CREATE INDEX IF NOT EXISTS idx_packages_is_published ON packages(is_published);
CREATE INDEX IF NOT EXISTS idx_packages_is_featured  ON packages(is_featured);
CREATE INDEX IF NOT EXISTS idx_packages_slug         ON packages(slug);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_anon_read"    ON packages;
DROP POLICY IF EXISTS "packages_auth_read"    ON packages;
DROP POLICY IF EXISTS "packages_staff_write"  ON packages;

CREATE POLICY "packages_anon_read" ON packages
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "packages_auth_read" ON packages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "packages_staff_write" ON packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','sales','marketing','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_packages_updated_at'
    AND tgrelid='packages'::regclass) THEN
    CREATE TRIGGER set_packages_updated_at
      BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON packages TO anon, authenticated;

-- ALTER TABLE guards untuk kolom yang mungkin belum ada di db lama
SELECT _add_column_if_not_exists('packages','child_price_percent',  'NUMERIC(5,2)', 'NOT NULL DEFAULT 85.00');
SELECT _add_column_if_not_exists('packages','infant_price_percent', 'NUMERIC(5,2)', 'NOT NULL DEFAULT 20.00');


-- =============================================================================
-- 6. PACKAGE_HPP_TEMPLATES — Template komponen HPP per paket (fase 067)
-- =============================================================================
CREATE TABLE IF NOT EXISTS package_hpp_templates (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  component    TEXT NOT NULL,
  label        TEXT NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'per_pax',
  currency     TEXT NOT NULL DEFAULT 'USD',
  amount       NUMERIC NOT NULL DEFAULT 0,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  amount_idr   NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pkg_hpp_templates_package_id ON package_hpp_templates(package_id);

ALTER TABLE package_hpp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pkg_hpp_templates_staff_manage" ON package_hpp_templates;
DROP POLICY IF EXISTS "pkg_hpp_templates_staff_read"   ON package_hpp_templates;

CREATE POLICY "pkg_hpp_templates_staff_read" ON package_hpp_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pkg_hpp_templates_staff_manage" ON package_hpp_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_pkg_hpp_templates_updated_at'
    AND tgrelid='package_hpp_templates'::regclass) THEN
    CREATE TRIGGER set_pkg_hpp_templates_updated_at
      BEFORE UPDATE ON package_hpp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 7. DEPARTURES — Jadwal keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departures (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id            UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  departure_date        DATE NOT NULL,
  return_date           DATE NOT NULL,
  quota                 INTEGER NOT NULL DEFAULT 45,
  available_seats       INTEGER NOT NULL DEFAULT 45,
  status                TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','full','closed','departed','completed','cancelled')),
  price_adult           NUMERIC(15,2),
  child_price_percent   NUMERIC(5,2) DEFAULT 85.00,
  infant_price_percent  NUMERIC(5,2) DEFAULT 20.00,
  airline_id            UUID REFERENCES airlines(id) ON DELETE SET NULL,
  flight_number_out     TEXT,
  flight_number_back    TEXT,
  hotel_makkah_id       UUID REFERENCES hotels(id) ON DELETE SET NULL,
  hotel_madinah_id      UUID REFERENCES hotels(id) ON DELETE SET NULL,
  hotel_transit_id      UUID REFERENCES hotels(id) ON DELETE SET NULL,
  muttawif_id           UUID,
  guide_name            TEXT,
  notes                 TEXT,
  is_published          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  branch_id             UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departures_package_id    ON departures(package_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_date ON departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_departures_status        ON departures(status);
CREATE INDEX IF NOT EXISTS idx_departures_is_published  ON departures(is_published);
CREATE INDEX IF NOT EXISTS idx_departures_branch_id     ON departures(branch_id);

ALTER TABLE departures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departures_anon_read"   ON departures;
DROP POLICY IF EXISTS "departures_auth_read"   ON departures;
DROP POLICY IF EXISTS "departures_staff_write" ON departures;

CREATE POLICY "departures_anon_read" ON departures
  FOR SELECT USING (is_published = TRUE AND status NOT IN ('draft','cancelled'));

CREATE POLICY "departures_auth_read" ON departures
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "departures_staff_write" ON departures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','sales','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departures_updated_at'
    AND tgrelid='departures'::regclass) THEN
    CREATE TRIGGER set_departures_updated_at
      BEFORE UPDATE ON departures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON departures TO anon, authenticated;

-- ALTER TABLE guards untuk kolom fase29
SELECT _add_column_if_not_exists('departures','price_adult',           'NUMERIC(15,2)', '');
SELECT _add_column_if_not_exists('departures','child_price_percent',   'NUMERIC(5,2)',  'DEFAULT 85.00');
SELECT _add_column_if_not_exists('departures','infant_price_percent',  'NUMERIC(5,2)',  'DEFAULT 20.00');
SELECT _add_column_if_not_exists('departures','hotel_transit_id',      'UUID',          '');


-- =============================================================================
-- 8. DEPARTURE_MULTI_HOTELS — Multi-hotel per segmen perjalanan (fase 066)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_multi_hotels (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  segment       TEXT NOT NULL CHECK (segment IN ('makkah','madinah','transit_in','transit_out','other')),
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  checkin_date  DATE,
  checkout_date DATE,
  room_type     TEXT,
  nights        INTEGER GENERATED ALWAYS AS (
    CASE WHEN checkout_date IS NOT NULL AND checkin_date IS NOT NULL
      THEN (checkout_date - checkin_date)::INTEGER
      ELSE NULL
    END
  ) STORED,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departure_id, segment, hotel_id)
);

CREATE INDEX IF NOT EXISTS idx_dep_multi_hotels_departure_id ON departure_multi_hotels(departure_id);

ALTER TABLE departure_multi_hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dep_multi_hotels_staff_manage" ON departure_multi_hotels;
DROP POLICY IF EXISTS "dep_multi_hotels_auth_read"    ON departure_multi_hotels;

CREATE POLICY "dep_multi_hotels_auth_read" ON departure_multi_hotels
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "dep_multi_hotels_staff_manage" ON departure_multi_hotels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','it'))
  );


-- =============================================================================
-- SELESAI — File M03: Travel Catalog
-- =============================================================================
SELECT 'v3_M03_travel_catalog: OK' AS result;
