-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — FRESH SQL MIGRATION (COMPLETE)
-- Generated: 2026-05-14
-- Contains: All tables, indexes, RLS policies, triggers, functions, and seed data
-- Safe to run: Uses CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS
-- =============================================================================

-- =============================================================================
-- BAGIAN 1: FASE 0 — FOUNDATION TABLES
-- =============================================================================

-- =============================================================================
-- FASE 0: FOUNDATIONAL TABLES — Semua tabel inti yang direferensikan seluruh migrasi
-- Jalankan file ini PERTAMA sebelum semua migration lainnya.
-- =============================================================================

-- Helper: trigger function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. PROFILES — Ekstensi dari auth.users
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  avatar_url TEXT,
  phone      TEXT,
  email      TEXT,
  role       TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own" ON profiles;
DROP POLICY IF EXISTS "staff_read_profiles" ON profiles;

CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "staff_read_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_profiles_updated_at'
    AND tgrelid='profiles'::regclass) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Auto-create profile saat user baru register
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- 2. USER_ROLES — Role-Based Access Control
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN (
    'super_admin','owner','admin','branch_manager','finance',
    'operational','sales','marketing','hr','equipment',
    'agent','sub_agent','customer','jamaah','visa_officer'
  )),
  branch_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_admin_manage" ON user_roles;
DROP POLICY IF EXISTS "user_roles_read_own"     ON user_roles;

CREATE POLICY "user_roles_admin_manage" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "user_roles_read_own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- =============================================================================
-- 3. ROLE_PERMISSIONS — Izin per role
-- =============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role           TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled     BOOLEAN DEFAULT TRUE,
  UNIQUE (role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_perms_admin_manage" ON role_permissions;
DROP POLICY IF EXISTS "role_perms_staff_read"   ON role_permissions;

CREATE POLICY "role_perms_admin_manage" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "role_perms_staff_read" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- 4. HOTELS — Data hotel
-- =============================================================================
CREATE TABLE IF NOT EXISTS hotels (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  stars       INTEGER DEFAULT 3 CHECK (stars BETWEEN 1 AND 7),
  city        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Saudi Arabia',
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  description TEXT,
  photo_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotels_city      ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON hotels(is_active);

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotels_admin_manage" ON hotels;
DROP POLICY IF EXISTS "hotels_public_read"  ON hotels;

CREATE POLICY "hotels_admin_manage" ON hotels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational')
    )
  );

CREATE POLICY "hotels_public_read" ON hotels
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_hotels_updated_at'
    AND tgrelid='hotels'::regclass) THEN
    CREATE TRIGGER set_hotels_updated_at
      BEFORE UPDATE ON hotels
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 5. VENDORS — Mitra/vendor eksternal
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendors (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'lainnya'
    CHECK (type IN ('maskapai','hotel','bus','katering','asuransi','visa','lainnya')),
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  npwp         TEXT,
  bank_account TEXT,
  bank_name    TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_type      ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_admin_manage" ON vendors;
DROP POLICY IF EXISTS "vendors_staff_read"   ON vendors;

CREATE POLICY "vendors_admin_manage" ON vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance','operational')
    )
  );

CREATE POLICY "vendors_staff_read" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendors_updated_at'
    AND tgrelid='vendors'::regclass) THEN
    CREATE TRIGGER set_vendors_updated_at
      BEFORE UPDATE ON vendors
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 6. BRANCHES — Kantor cabang
-- =============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  TEXT NOT NULL,
  code                  TEXT NOT NULL UNIQUE,
  address               TEXT,
  city                  TEXT,
  province              TEXT,
  phone                 TEXT,
  email                 TEXT,
  manager_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active             BOOLEAN DEFAULT TRUE,
  slug                  TEXT UNIQUE,
  website_description   TEXT,
  website_banner_url    TEXT,
  website_gallery       JSONB DEFAULT '[]',
  website_testimonials  JSONB DEFAULT '[]',
  featured_package_ids  JSONB DEFAULT '[]',
  view_count            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_code      ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_slug      ON branches(slug);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_admin_manage"        ON branches;
DROP POLICY IF EXISTS "branches_manager_manage_own"  ON branches;
DROP POLICY IF EXISTS "branches_public_read"         ON branches;

CREATE POLICY "branches_admin_manage" ON branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "branches_manager_manage_own" ON branches
  FOR ALL USING (manager_user_id = auth.uid());

CREATE POLICY "branches_public_read" ON branches
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_branches_updated_at'
    AND tgrelid='branches'::regclass) THEN
    CREATE TRIGGER set_branches_updated_at
      BEFORE UPDATE ON branches
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 7. AGENTS — Agen perjalanan
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  parent_agent_id     UUID REFERENCES agents(id) ON DELETE SET NULL,
  company_name        TEXT NOT NULL,
  agent_code          TEXT NOT NULL UNIQUE,
  contact_name        TEXT,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  commission_rate     NUMERIC(5,2) DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  slug                TEXT UNIQUE,
  featured_package_ids JSONB DEFAULT '[]',
  website_bio         TEXT,
  level               INTEGER DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id   ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_branch_id ON agents(branch_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_slug      ON agents(slug);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_admin_manage" ON agents;
DROP POLICY IF EXISTS "agents_own_manage"   ON agents;
DROP POLICY IF EXISTS "agents_public_read"  ON agents;

CREATE POLICY "agents_admin_manage" ON agents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','branch_manager')
    )
  );

CREATE POLICY "agents_own_manage" ON agents
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "agents_public_read" ON agents
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agents_updated_at'
    AND tgrelid='agents'::regclass) THEN
    CREATE TRIGGER set_agents_updated_at
      BEFORE UPDATE ON agents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 8. PACKAGES — Paket perjalanan umroh/haji
-- =============================================================================
CREATE TABLE IF NOT EXISTS packages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'umroh'
    CHECK (type IN ('umroh','haji','haji_plus','wisata')),
  description    TEXT,
  highlights     TEXT,
  price          NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_double   NUMERIC(15,2),
  price_triple   NUMERIC(15,2),
  price_quad     NUMERIC(15,2),
  duration_days  INTEGER DEFAULT 9,
  departure_city TEXT,
  airline        TEXT,
  hotel_mecca    TEXT,
  hotel_medina   TEXT,
  includes       JSONB DEFAULT '[]',
  excludes       JSONB DEFAULT '[]',
  terms          TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  photo_url      TEXT,
  gallery_urls   JSONB DEFAULT '[]',
  quota          INTEGER DEFAULT 45,
  fee_branch     NUMERIC(5,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_branch_id ON packages(branch_id);
CREATE INDEX IF NOT EXISTS idx_packages_type      ON packages(type);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_admin_manage" ON packages;
DROP POLICY IF EXISTS "packages_public_read"  ON packages;

CREATE POLICY "packages_admin_manage" ON packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "packages_public_read" ON packages
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_packages_updated_at'
    AND tgrelid='packages'::regclass) THEN
    CREATE TRIGGER set_packages_updated_at
      BEFORE UPDATE ON packages
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 9. DEPARTURES — Jadwal keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departures (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id       UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  departure_date   DATE NOT NULL,
  return_date      DATE,
  quota            INTEGER DEFAULT 45,
  available_seats  INTEGER DEFAULT 45,
  status           TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','full','cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departures_package_id     ON departures(package_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_date ON departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_departures_status         ON departures(status);

ALTER TABLE departures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departures_admin_manage" ON departures;
DROP POLICY IF EXISTS "departures_public_read"  ON departures;

CREATE POLICY "departures_admin_manage" ON departures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "departures_public_read" ON departures
  FOR SELECT USING (status IN ('open','full'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departures_updated_at'
    AND tgrelid='departures'::regclass) THEN
    CREATE TRIGGER set_departures_updated_at
      BEFORE UPDATE ON departures
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 10. MUTHAWIFS — Pembimbing ibadah
-- =============================================================================
CREATE TABLE IF NOT EXISTS muthawifs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  specialization TEXT,
  languages     TEXT[] DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  photo_url     TEXT,
  bio           TEXT,
  rating        NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muthawifs_branch_id ON muthawifs(branch_id);
CREATE INDEX IF NOT EXISTS idx_muthawifs_is_active ON muthawifs(is_active);

ALTER TABLE muthawifs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawifs_admin_manage" ON muthawifs;
DROP POLICY IF EXISTS "muthawifs_public_read"  ON muthawifs;

CREATE POLICY "muthawifs_admin_manage" ON muthawifs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "muthawifs_public_read" ON muthawifs
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_muthawifs_updated_at'
    AND tgrelid='muthawifs'::regclass) THEN
    CREATE TRIGGER set_muthawifs_updated_at
      BEFORE UPDATE ON muthawifs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 11. EMPLOYEES — Data karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name     TEXT NOT NULL,
  employee_code TEXT UNIQUE,
  position      TEXT,
  department    TEXT,
  phone         TEXT,
  email         TEXT,
  join_date     DATE,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','resigned')),
  salary        NUMERIC(15,2) DEFAULT 0,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id   ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status    ON employees(status);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_admin_manage" ON employees;
DROP POLICY IF EXISTS "employees_hr_manage"    ON employees;
DROP POLICY IF EXISTS "employees_own_read"     ON employees;

CREATE POLICY "employees_admin_manage" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','hr')
    )
  );

CREATE POLICY "employees_hr_manage" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('branch_manager')
    )
  );

CREATE POLICY "employees_own_read" ON employees
  FOR SELECT USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_employees_updated_at'
    AND tgrelid='employees'::regclass) THEN
    CREATE TRIGGER set_employees_updated_at
      BEFORE UPDATE ON employees
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 12. CUSTOMERS — Data jamaah/pelanggan
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id                              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id                       UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name                       TEXT NOT NULL,
  nik                             TEXT,
  gender                          TEXT CHECK (gender IN ('L','P')),
  phone                           TEXT,
  email                           TEXT,
  address                         TEXT,
  city                            TEXT,
  province                        TEXT,
  postal_code                     TEXT,
  birth_date                      DATE,
  birth_place                     TEXT,
  passport_number                 TEXT,
  passport_expiry                 DATE,
  passport_issued                 TEXT,
  photo_url                       TEXT,
  is_active                       BOOLEAN DEFAULT TRUE,
  nomor_porsi_haji                TEXT,
  embarkasi_kode                  TEXT,
  estimasi_keberangkatan_haji     INTEGER,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id   ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_admin_manage" ON customers;
DROP POLICY IF EXISTS "customers_own_read"     ON customers;

CREATE POLICY "customers_admin_manage" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance')
    )
  );

CREATE POLICY "customers_own_read" ON customers
  FOR SELECT USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customers_updated_at'
    AND tgrelid='customers'::regclass) THEN
    CREATE TRIGGER set_customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 13. BOOKINGS — Data pemesanan
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  departure_id     UUID REFERENCES departures(id) ON DELETE SET NULL,
  agent_id         UUID REFERENCES agents(id) ON DELETE SET NULL,
  booking_code     TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed')),
  total_price      NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid')),
  room_type        TEXT DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  notes            TEXT,
  referral_source  TEXT DEFAULT 'direct'
    CHECK (referral_source IN ('direct','agent_website','branch_website','referral','whatsapp','instagram','facebook','other')),
  bagasi_kg_allowed INTEGER DEFAULT 23,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id   ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code   ON bookings(booking_code);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_admin_manage"   ON bookings;
DROP POLICY IF EXISTS "bookings_own_read"       ON bookings;
DROP POLICY IF EXISTS "bookings_agent_read"     ON bookings;

CREATE POLICY "bookings_admin_manage" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "bookings_own_read" ON bookings
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings_agent_read" ON bookings
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bookings_updated_at'
    AND tgrelid='bookings'::regclass) THEN
    CREATE TRIGGER set_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 14. BOOKING_PASSENGERS — Daftar penumpang per booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_passengers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  is_main_passenger BOOLEAN DEFAULT FALSE,
  passenger_type    TEXT DEFAULT 'dewasa'
    CHECK (passenger_type IN ('dewasa','lansia','anak','mahram')),
  room_preference   TEXT,
  room_number       TEXT,
  room_group_id     UUID,
  family_group_id   UUID,
  checkin_status    TEXT DEFAULT 'not_checked',
  checkin_time      TIMESTAMPTZ,
  checkin_notes     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking_id  ON booking_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_customer_id ON booking_passengers(customer_id);

ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_passengers_admin_manage" ON booking_passengers;
DROP POLICY IF EXISTS "booking_passengers_own_read"     ON booking_passengers;

CREATE POLICY "booking_passengers_admin_manage" ON booking_passengers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "booking_passengers_own_read" ON booking_passengers
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 15. ROOM_ASSIGNMENTS — Penugasan kamar hotel
-- =============================================================================
CREATE TABLE IF NOT EXISTS room_assignments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID REFERENCES departures(id) ON DELETE CASCADE,
  room_number    TEXT NOT NULL,
  room_type      TEXT NOT NULL DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  floor          INTEGER,
  capacity       INTEGER DEFAULT 4,
  hotel_name     TEXT,
  hotel_location TEXT DEFAULT 'mecca'
    CHECK (hotel_location IN ('mecca','medina')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_departure_id ON room_assignments(departure_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_room_type    ON room_assignments(room_type);

ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_assignments_staff_manage" ON room_assignments;

CREATE POLICY "room_assignments_staff_manage" ON room_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_room_assignments_updated_at'
    AND tgrelid='room_assignments'::regclass) THEN
    CREATE TRIGGER set_room_assignments_updated_at
      BEFORE UPDATE ON room_assignments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 16. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment_distributions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id   UUID REFERENCES departures(id) ON DELETE SET NULL,
  item_name      TEXT NOT NULL,
  quantity       INTEGER DEFAULT 1,
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_dist_customer_id  ON equipment_distributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_departure_id ON equipment_distributions(departure_id);

ALTER TABLE equipment_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equip_dist_staff_manage" ON equipment_distributions;
DROP POLICY IF EXISTS "equip_dist_own_read"     ON equipment_distributions;

CREATE POLICY "equip_dist_staff_manage" ON equipment_distributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "equip_dist_own_read" ON equipment_distributions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 17. SAVINGS_PLANS — Tabungan perjalanan
-- =============================================================================
CREATE TABLE IF NOT EXISTS savings_plans (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'Tabungan Umroh',
  target_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_plans_customer_id ON savings_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_savings_plans_status      ON savings_plans(status);

ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_plans_admin_manage" ON savings_plans;
DROP POLICY IF EXISTS "savings_plans_own_manage"   ON savings_plans;

CREATE POLICY "savings_plans_admin_manage" ON savings_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "savings_plans_own_manage" ON savings_plans
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_savings_plans_updated_at'
    AND tgrelid='savings_plans'::regclass) THEN
    CREATE TRIGGER set_savings_plans_updated_at
      BEFORE UPDATE ON savings_plans
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 18. SAVINGS_DEPOSITS — Setoran tabungan
-- =============================================================================
CREATE TABLE IF NOT EXISTS savings_deposits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id      UUID NOT NULL REFERENCES savings_plans(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_deposits_plan_id ON savings_deposits(plan_id);

ALTER TABLE savings_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_deposits_admin_manage" ON savings_deposits;
DROP POLICY IF EXISTS "savings_deposits_own_read"     ON savings_deposits;

CREATE POLICY "savings_deposits_admin_manage" ON savings_deposits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "savings_deposits_own_read" ON savings_deposits
  FOR SELECT USING (
    plan_id IN (
      SELECT sp.id FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 19. LEADS — Data calon jamaah/prospek
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  source     TEXT DEFAULT 'direct'
    CHECK (source IN ('direct','whatsapp','instagram','facebook','referral','website','lainnya')),
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id   UUID REFERENCES agents(id) ON DELETE SET NULL,
  status     TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost')),
  notes      TEXT,
  package_interest TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent_id  ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_staff_manage"     ON leads;
DROP POLICY IF EXISTS "leads_agent_own_manage" ON leads;

CREATE POLICY "leads_staff_manage" ON leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing')
    )
  );

CREATE POLICY "leads_agent_own_manage" ON leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_leads_updated_at'
    AND tgrelid='leads'::regclass) THEN
    CREATE TRIGGER set_leads_updated_at
      BEFORE UPDATE ON leads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 20. NOTIFICATIONS — Notifikasi sistem
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info'
    CHECK (type IN ('info','success','warning','error','urgent')),
  target_role TEXT,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  link        TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_manage" ON notifications;
DROP POLICY IF EXISTS "notifications_admin_send" ON notifications;

CREATE POLICY "notifications_own_manage" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_send" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

-- =============================================================================
-- 21. SUPPORT_TICKETS — Tiket dukungan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  priority    TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status      ON support_tickets(status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_staff_manage"    ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_own_manage"      ON support_tickets;

CREATE POLICY "support_tickets_staff_manage" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "support_tickets_own_manage" ON support_tickets
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_support_tickets_updated_at'
    AND tgrelid='support_tickets'::regclass) THEN
    CREATE TRIGGER set_support_tickets_updated_at
      BEFORE UPDATE ON support_tickets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 22. ANNOUNCEMENTS — Pengumuman internal
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  type         TEXT DEFAULT 'info'
    CHECK (type IN ('info','warning','success','urgent')),
  target_roles TEXT[] DEFAULT '{}',
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  starts_at    TIMESTAMPTZ DEFAULT NOW(),
  ends_at      TIMESTAMPTZ,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_branch_id ON announcements(branch_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_admin_manage"  ON announcements;
DROP POLICY IF EXISTS "announcements_staff_read"    ON announcements;

CREATE POLICY "announcements_admin_manage" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager')
    )
  );

CREATE POLICY "announcements_staff_read" ON announcements
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_announcements_updated_at'
    AND tgrelid='announcements'::regclass) THEN
    CREATE TRIGGER set_announcements_updated_at
      BEFORE UPDATE ON announcements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 23. BANNERS — Banner promosi website
-- =============================================================================
CREATE TABLE IF NOT EXISTS banners (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  link_url    TEXT,
  link_text   TEXT,
  position    TEXT DEFAULT 'home'
    CHECK (position IN ('home','packages','about','contact')),
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_position  ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_branch_id ON banners(branch_id);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_admin_manage" ON banners;
DROP POLICY IF EXISTS "banners_public_read"  ON banners;

CREATE POLICY "banners_admin_manage" ON banners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

CREATE POLICY "banners_public_read" ON banners
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_banners_updated_at'
    AND tgrelid='banners'::regclass) THEN
    CREATE TRIGGER set_banners_updated_at
      BEFORE UPDATE ON banners
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 24. COUPONS — Kupon diskon
-- =============================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  discount_type  TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(15,2) NOT NULL,
  min_purchase   NUMERIC(15,2) DEFAULT 0,
  max_discount   NUMERIC(15,2),
  quota          INTEGER,
  used_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code      ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_admin_manage"  ON coupons;
DROP POLICY IF EXISTS "coupons_public_read"   ON coupons;

CREATE POLICY "coupons_admin_manage" ON coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

CREATE POLICY "coupons_public_read" ON coupons
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_coupons_updated_at'
    AND tgrelid='coupons'::regclass) THEN
    CREATE TRIGGER set_coupons_updated_at
      BEFORE UPDATE ON coupons
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 25. DOCUMENT_TYPES — Jenis dokumen yang diperlukan
-- =============================================================================
CREATE TABLE IF NOT EXISTS document_types (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  category    TEXT DEFAULT 'umum'
    CHECK (category IN ('identitas','perjalanan','kesehatan','keuangan','umum')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_types_admin_manage" ON document_types;
DROP POLICY IF EXISTS "document_types_public_read"  ON document_types;

CREATE POLICY "document_types_admin_manage" ON document_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "document_types_public_read" ON document_types
  FOR SELECT USING (TRUE);

-- =============================================================================
-- 26. MENU_ITEMS — Navigasi menu dashboard
-- =============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key                 TEXT NOT NULL UNIQUE,
  label               TEXT NOT NULL,
  path                TEXT NOT NULL,
  icon                TEXT,
  group_name          TEXT,
  sort_order          INTEGER DEFAULT 0,
  required_permission TEXT,
  is_visible          BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON menu_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_visible ON menu_items(is_visible);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_admin_manage" ON menu_items;
DROP POLICY IF EXISTS "menu_items_staff_read"   ON menu_items;

CREATE POLICY "menu_items_admin_manage" ON menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "menu_items_staff_read" ON menu_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- 27. VISA_APPLICATIONS — Pengajuan visa
-- =============================================================================
CREATE TABLE IF NOT EXISTS visa_applications (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','processing','approved','rejected','expired')),
  applied_date     DATE,
  approved_date    DATE,
  rejection_reason TEXT,
  visa_number      TEXT,
  passport_number  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_apps_customer_id ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_booking_id  ON visa_applications(booking_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_status      ON visa_applications(status);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visa_apps_staff_manage"   ON visa_applications;
DROP POLICY IF EXISTS "visa_apps_own_read"       ON visa_applications;

CREATE POLICY "visa_apps_staff_manage" ON visa_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')
    )
  );

CREATE POLICY "visa_apps_own_read" ON visa_applications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_visa_apps_updated_at'
    AND tgrelid='visa_applications'::regclass) THEN
    CREATE TRIGGER set_visa_apps_updated_at
      BEFORE UPDATE ON visa_applications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 28. SOS_ALERTS — Darurat jamaah di lapangan
-- =============================================================================
CREATE TABLE IF NOT EXISTS sos_alerts (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id          UUID REFERENCES departures(id) ON DELETE SET NULL,
  message               TEXT NOT NULL DEFAULT 'SOS — butuh bantuan!',
  location              TEXT,
  latitude              NUMERIC(10,6),
  longitude             NUMERIC(10,6),
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','responded','resolved')),
  assigned_muthawif_id  UUID REFERENCES muthawifs(id) ON DELETE SET NULL,
  responded_at          TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_customer_id   ON sos_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_departure_id  ON sos_alerts(departure_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status        ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at    ON sos_alerts(created_at DESC);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sos_alerts_staff_manage" ON sos_alerts;
DROP POLICY IF EXISTS "sos_alerts_own_insert"   ON sos_alerts;
DROP POLICY IF EXISTS "sos_alerts_own_read"     ON sos_alerts;

CREATE POLICY "sos_alerts_staff_manage" ON sos_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "sos_alerts_own_insert" ON sos_alerts
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "sos_alerts_own_read" ON sos_alerts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- SEED: Menu items dasar
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('dashboard',         'Dashboard',         '/admin',                 'LayoutDashboard', 'Umum',        1,   'dashboard',         true),
  ('bookings',          'Pemesanan',          '/admin/bookings',        'BookOpen',        'Operasional', 10,  'bookings',          true),
  ('customers',         'Data Jamaah',        '/admin/customers',       'Users',           'Operasional', 20,  'customers',         true),
  ('packages',          'Paket Perjalanan',   '/admin/packages',        'Package',         'Operasional', 30,  'packages',          true),
  ('departures',        'Keberangkatan',      '/admin/departures',      'Plane',           'Operasional', 40,  'departures',        true),
  ('payments',          'Pembayaran',         '/admin/payments',        'CreditCard',      'Keuangan',    100, 'payments',          true),
  ('reports',           'Laporan',            '/admin/reports',         'BarChart2',       'Keuangan',    110, 'reports',           true),
  ('agents',            'Agen',               '/admin/agents',          'UserCheck',       'Penjualan',   200, 'agents',            true),
  ('leads',             'Prospek',            '/admin/leads',           'Target',          'Penjualan',   210, 'leads',             true),
  ('employees',         'Karyawan',           '/admin/employees',       'Briefcase',       'SDM',         300, 'employees',         true),
  ('branches',          'Cabang',             '/admin/branches',        'Building2',       'Sistem',      800, 'branches',          true),
  ('users',             'Manajemen User',     '/admin/users',           'UserCog',         'Sistem',      810, 'users',             true),
  ('settings',          'Pengaturan',         '/admin/settings',        'Settings',        'Sistem',      900, 'settings',          true),
  ('website-settings',  'Pengaturan Website', '/admin/website-settings','Globe',           'Sistem',      905, 'website-settings',  true),
  ('vendors',           'Vendor',             '/admin/vendors',         'Store',           'Operasional', 50,  'vendors',           true),
  ('hotels',            'Hotel',              '/admin/hotels',          'Hotel',           'Operasional', 60,  'hotels',            true),
  ('muthawifs',         'Muthawif',           '/admin/muthawifs',       'User',            'Operasional', 70,  'muthawifs',         true),
  ('visa',              'Visa',               '/admin/visa',            'FileText',        'Operasional', 80,  'visa',              true),
  ('notifications',     'Notifikasi',         '/admin/notifications',   'Bell',            'Sistem',      820, 'notifications',     true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- SEED: Role permissions dasar
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES
  ('super_admin'),('owner'),('admin')
) AS r(role)
CROSS JOIN (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('reports'),('agents'),('leads'),('employees'),
  ('branches'),('users'),('settings'),('website-settings'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),('notifications')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('reports'),('agents'),('leads'),('employees'),
  ('vendors'),('hotels'),('muthawifs'),('visa')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'operational', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('departures'),
  ('vendors'),('hotels'),('muthawifs'),('visa')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'finance', p FROM (VALUES
  ('dashboard'),('bookings'),('payments'),('reports')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'sales', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('leads'),('agents')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'marketing', p FROM (VALUES
  ('dashboard'),('leads'),('packages')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'agent', p FROM (VALUES
  ('dashboard'),('bookings'),('customers')
) AS t(p)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Fase 0: Semua tabel fondasi Vinstour siap.
-- =============================================================================
SELECT 'Fase 0 Foundation: semua tabel inti berhasil dibuat.' AS result;


-- =============================================================================
-- BAGIAN 2: FASE 1-15 — CONSOLIDATED (Customers, Bookings, Packages, etc.)
-- =============================================================================

-- =============================================================================
-- MIGRASI KONSOLIDASI LENGKAP — Vinstour Travel Portal
-- Menggabungkan semua fase (1–20) menjadi satu file yang bersih dan idempotent.
-- Jalankan SATU KALI di Supabase SQL Editor (atau re-run aman karena IF NOT EXISTS).
-- =============================================================================

-- =============================================================================
-- BAGIAN 0: HELPER FUNCTIONS (idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION slugify_text(input TEXT)
RETURNS TEXT AS $$
DECLARE result TEXT;
BEGIN
  result := lower(input);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(result, '-');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =============================================================================
-- BAGIAN 1: TABEL INTI — website_settings (dibuat lebih awal karena di-ALTER oleh fase1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS website_settings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id         UUID REFERENCES agents(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name     TEXT,
  logo_url         TEXT,
  favicon_url      TEXT,
  active_theme     TEXT NOT NULL DEFAULT 'default',
  primary_color    TEXT,
  accent_color     TEXT,
  foreground_color TEXT,
  background_color TEXT,
  body_font        TEXT,
  heading_font     TEXT,
  footer_description TEXT,
  footer_address   TEXT,
  footer_phone     TEXT,
  footer_email     TEXT,
  footer_whatsapp  TEXT,
  footer_bottom_text TEXT,
  footer_links     JSONB,
  custom_sections  JSONB,
  -- Kolom fase1
  profile_photo_url TEXT,
  banner_url        TEXT,
  bio               TEXT,
  testimonials      JSONB DEFAULT '[]',
  gallery_urls      JSONB DEFAULT '[]',
  seo_title         TEXT,
  seo_description   TEXT,
  view_count        INTEGER DEFAULT 0,
  social_youtube    TEXT,
  social_tiktok     TEXT,
  maps_embed_url    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_agent
  ON website_settings(agent_id)  WHERE agent_id  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_branch
  ON website_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_global
  ON website_settings((1)) WHERE agent_id IS NULL AND branch_id IS NULL;

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_website_settings"      ON website_settings;
DROP POLICY IF EXISTS "agent_manage_own_website_settings"  ON website_settings;
DROP POLICY IF EXISTS "branch_manage_own_website_settings" ON website_settings;
DROP POLICY IF EXISTS "public_read_website_settings"       ON website_settings;

CREATE POLICY "admin_manage_website_settings" ON website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "agent_manage_own_website_settings" ON website_settings
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "branch_manage_own_website_settings" ON website_settings
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

CREATE POLICY "public_read_website_settings" ON website_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_website_settings_updated_at'
    AND tgrelid='website_settings'::regclass) THEN
    CREATE TRIGGER set_website_settings_updated_at
      BEFORE UPDATE ON website_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Kolom tambahan yang mungkin belum ada (idempotent)
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '[]';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS social_youtube TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS social_tiktok TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS maps_embed_url TEXT;

-- Seed: setting global default
INSERT INTO website_settings (company_name, active_theme, primary_color, accent_color,
  footer_description, footer_bottom_text)
VALUES (
  'Vinstour Travel', 'default', '#16a34a', '#0d9488',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.'
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- BAGIAN 2: FASE 1 — Membership & Komisi Cabang
-- =============================================================================

CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('agent', 'branch')),
  price_yearly NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_sub_agents INTEGER DEFAULT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  description TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order) VALUES
  ('Silver',  'agent', 500000,  5,    2, 'Paket dasar untuk agen baru',         '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%"]', 1),
  ('Gold',    'agent', 1500000, 20,   3, 'Paket menengah dengan fitur lengkap', '["Dashboard portal agen","Website agen lengkap","Digital kit promosi","Laporan komisi","Maksimal 20 sub agen","Komisi 3%"]', 2),
  ('Platinum','agent', 3000000, NULL, 4, 'Paket premium tanpa batas sub agen',  '["Semua fitur Gold","Sub agen tidak terbatas","Priority support","Leaderboard","Komisi 4%"]', 3),
  ('Reguler', 'branch',5000000, 50,   1, 'Paket cabang standar',                '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%"]', 1),
  ('Premium', 'branch',12000000,NULL, 2, 'Paket cabang premium',                '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","Komisi cabang 2%"]', 2)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS agent_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date DATE,
  end_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memberships_agent_id ON agent_memberships(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memberships_status   ON agent_memberships(status);

CREATE TABLE IF NOT EXISTS branch_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date DATE,
  end_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_memberships_branch_id ON branch_memberships(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_memberships_status    ON branch_memberships(status);

CREATE TABLE IF NOT EXISTS branch_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  commission_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_commissions_branch_id ON branch_commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_commissions_status    ON branch_commissions(status);

-- fee_branch di packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS fee_branch NUMERIC(5,2) DEFAULT 0;

-- Function increment view count
CREATE OR REPLACE FUNCTION increment_website_view(p_agent_id UUID DEFAULT NULL, p_branch_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_agent_id IS NOT NULL THEN
    UPDATE website_settings SET view_count = COALESCE(view_count, 0) + 1 WHERE agent_id = p_agent_id;
  ELSIF p_branch_id IS NOT NULL THEN
    UPDATE website_settings SET view_count = COALESCE(view_count, 0) + 1 WHERE branch_id = p_branch_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- BAGIAN 3: FASE 2 — Public Website Agen & Cabang (Slug)
-- =============================================================================

ALTER TABLE agents   ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE agents   ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE agents   ADD COLUMN IF NOT EXISTS website_bio TEXT;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_description TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_banner_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_gallery JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_testimonials JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS branches_manager_user_id_idx ON branches(manager_user_id);

-- Backfill slug agen
DO $$
DECLARE rec RECORD; base_slug TEXT; final_slug TEXT; counter INTEGER;
BEGIN
  FOR rec IN SELECT id, company_name, agent_code FROM agents WHERE slug IS NULL LOOP
    base_slug  := slugify_text(COALESCE(rec.company_name, rec.agent_code, rec.id::TEXT));
    final_slug := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM agents WHERE slug = final_slug AND id != rec.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    UPDATE agents SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- Backfill slug cabang
DO $$
DECLARE rec RECORD; base_slug TEXT; final_slug TEXT; counter INTEGER;
BEGIN
  FOR rec IN SELECT id, name, code FROM branches WHERE slug IS NULL LOOP
    base_slug  := slugify_text(COALESCE(rec.name, rec.code, rec.id::TEXT));
    final_slug := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM branches WHERE slug = final_slug AND id != rec.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    UPDATE branches SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION set_agent_slug()
RETURNS TRIGGER AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := slugify_text(COALESCE(NEW.company_name, NEW.agent_code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM agents WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_slug ON agents;
CREATE TRIGGER trg_agent_slug
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION set_agent_slug();

CREATE OR REPLACE FUNCTION set_branch_slug()
RETURNS TRIGGER AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := slugify_text(COALESCE(NEW.name, NEW.code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM branches WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branch_slug ON branches;
CREATE TRIGGER trg_branch_slug
  BEFORE INSERT OR UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_branch_slug();


-- =============================================================================
-- BAGIAN 4: FASE 3 — Customer Portal (Portal Jamaah)
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  referred_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_slug TEXT,
  branch_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_user_id     ON customer_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_agent_id    ON customer_accounts(referred_by_agent_id);

CREATE TABLE IF NOT EXISTS customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error','urgent')),
  link TEXT,
  icon TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_is_read     ON customer_notifications(is_read);

ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';

CREATE TABLE IF NOT EXISTS booking_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  aspects JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT 'direct'
  CHECK (referral_source IN ('direct','agent_website','branch_website','referral','whatsapp','instagram','facebook','other'));

CREATE OR REPLACE FUNCTION create_customer_account(
  p_user_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_agent_slug TEXT DEFAULT NULL,
  p_branch_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_account_id UUID;
BEGIN
  INSERT INTO customer_accounts (user_id, referred_by_agent_id, referred_by_branch_id, agent_slug, branch_slug)
  VALUES (p_user_id, p_agent_id, p_branch_id, p_agent_slug, p_branch_slug)
  ON CONFLICT (user_id) DO UPDATE SET
    referred_by_agent_id  = COALESCE(customer_accounts.referred_by_agent_id,  EXCLUDED.referred_by_agent_id),
    referred_by_branch_id = COALESCE(customer_accounts.referred_by_branch_id, EXCLUDED.referred_by_branch_id),
    agent_slug  = COALESCE(customer_accounts.agent_slug,  EXCLUDED.agent_slug),
    branch_slug = COALESCE(customer_accounts.branch_slug, EXCLUDED.branch_slug),
    updated_at  = now()
  RETURNING id INTO v_account_id;
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE customer_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_feedback       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_accounts_own" ON customer_accounts;
CREATE POLICY "customer_accounts_own" ON customer_accounts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "customer_notif_own" ON customer_notifications;
CREATE POLICY "customer_notif_own" ON customer_notifications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customer_notif_update" ON customer_notifications;
CREATE POLICY "customer_notif_update" ON customer_notifications
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_manage_notifications" ON customer_notifications;
CREATE POLICY "staff_manage_notifications" ON customer_notifications
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "booking_feedback_own" ON booking_feedback;
CREATE POLICY "booking_feedback_own" ON booking_feedback
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- BAGIAN 5: FASE 4-6 — Email Templates, Logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code      TEXT UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  subject   TEXT NOT NULL,
  body      TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  trigger   TEXT DEFAULT 'manual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_email_templates"   ON email_templates;
DROP POLICY IF EXISTS "staff_manage_email_templates" ON email_templates;

CREATE POLICY "staff_read_email_templates" ON email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "staff_manage_email_templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','branch_manager','marketing')
    )
  );

CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_code   TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  subject         TEXT,
  status          TEXT DEFAULT 'pending',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  booking_id      UUID REFERENCES bookings(id)  ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_customer_id ON email_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status      ON email_logs(status);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_email_logs"   ON email_logs;
DROP POLICY IF EXISTS "staff_insert_email_logs" ON email_logs;

CREATE POLICY "staff_read_email_logs" ON email_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "staff_insert_email_logs" ON email_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- =============================================================================
-- BAGIAN 6: SOS ALERTS — Versi lengkap (Fase 16)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sos_alerts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_code   TEXT,
  emergency_type TEXT NOT NULL
    CHECK (emergency_type IN ('medical','lost','security','other')),
  message        TEXT,
  latitude       FLOAT8,
  longitude      FLOAT8,
  accuracy       FLOAT8,
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','responding','resolved')),
  response_notes TEXT,
  resolved_at    TIMESTAMPTZ,
  resolved_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status      ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_customer_id ON sos_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_branch_id   ON sos_alerts(branch_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at  ON sos_alerts(created_at DESC);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_sos"   ON sos_alerts;
DROP POLICY IF EXISTS "customer_read_own_sos" ON sos_alerts;
DROP POLICY IF EXISTS "staff_manage_sos"      ON sos_alerts;

CREATE POLICY "customer_insert_sos" ON sos_alerts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customer_read_own_sos" ON sos_alerts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_manage_sos" ON sos_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sos_alerts_updated_at'
    AND tgrelid='sos_alerts'::regclass) THEN
    CREATE TRIGGER set_sos_alerts_updated_at
      BEFORE UPDATE ON sos_alerts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 7: VISA APPLICATIONS — Versi lengkap
-- =============================================================================

CREATE TABLE IF NOT EXISTS visa_applications (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id     UUID REFERENCES departures(id) ON DELETE SET NULL,
  visa_type        TEXT DEFAULT 'umroh',
  passport_number  TEXT,
  passport_expiry  DATE,
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','processing','approved','rejected')),
  visa_number      TEXT,
  visa_expiry      DATE,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_applications_customer  ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_departure ON visa_applications(departure_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_status            ON visa_applications(status);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_visas"                ON visa_applications;
DROP POLICY IF EXISTS "Admins can manage visa applications" ON visa_applications;
DROP POLICY IF EXISTS "Customers can view own visa applications" ON visa_applications;

CREATE POLICY "staff_manage_visas" ON visa_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')
    )
  );

CREATE POLICY "customer_view_own_visas" ON visa_applications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_visa_applications_updated_at'
    AND tgrelid='visa_applications'::regclass) THEN
    CREATE TRIGGER set_visa_applications_updated_at
      BEFORE UPDATE ON visa_applications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 8: FASE 4-6 — Kolom tambahan booking_passengers
-- =============================================================================

ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_status TEXT DEFAULT 'not_checked';
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_time   TIMESTAMPTZ;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_notes  TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS family_group_id UUID;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS room_group_id   UUID;

CREATE INDEX IF NOT EXISTS idx_booking_passengers_family_group
  ON booking_passengers(family_group_id) WHERE family_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_passengers_room_group
  ON booking_passengers(room_group_id)  WHERE room_group_id  IS NOT NULL;


-- =============================================================================
-- BAGIAN 9: FASE 6 — App Settings & Tabel Jamaah Digital
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_admin" ON app_settings;
CREATE POLICY "app_settings_admin" ON app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

-- virtual_accounts — nomor VA per customer per bank
-- (menggunakan profiles karena Supabase; ganti dengan customers jika perlu)
CREATE TABLE IF NOT EXISTS virtual_accounts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bank_code   TEXT NOT NULL,
  va_number   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (customer_id, bank_code)
);
CREATE INDEX IF NOT EXISTS va_customer_idx ON virtual_accounts(customer_id);

ALTER TABLE virtual_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "va_admin" ON virtual_accounts;
DROP POLICY IF EXISTS "va_customer_read" ON virtual_accounts;

CREATE POLICY "va_admin" ON virtual_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','finance')
    )
  );

CREATE POLICY "va_customer_read" ON virtual_accounts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS agent_monthly_targets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  month_key         TEXT NOT NULL,
  booking_target    INT  NOT NULL DEFAULT 10,
  commission_target BIGINT NOT NULL DEFAULT 10000000,
  jamaah_target     INT  NOT NULL DEFAULT 10,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, month_key)
);
CREATE INDEX IF NOT EXISTS amt_agent_month_idx ON agent_monthly_targets(agent_id, month_key);

ALTER TABLE agent_monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amt_agent_own" ON agent_monthly_targets;
CREATE POLICY "amt_agent_own" ON agent_monthly_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = agent_id AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

CREATE TABLE IF NOT EXISTS jamaah_doa_sessions (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dzikir_id    TEXT NOT NULL,
  dzikir_name  TEXT NOT NULL,
  dzikir_arab  TEXT,
  dzikir_latin TEXT,
  icon         TEXT,
  target       INT NOT NULL DEFAULT 33,
  count        INT NOT NULL DEFAULT 0,
  completed    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jds_user_idx ON jamaah_doa_sessions(user_id);

ALTER TABLE jamaah_doa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jds_own" ON jamaah_doa_sessions;
CREATE POLICY "jds_own" ON jamaah_doa_sessions FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_jurnal (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  mood       TEXT,
  location   TEXT,
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jj_user_idx  ON jamaah_jurnal(user_id);
CREATE INDEX IF NOT EXISTS jj_date_idx  ON jamaah_jurnal(user_id, date);

ALTER TABLE jamaah_jurnal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jj_own" ON jamaah_jurnal;
CREATE POLICY "jj_own" ON jamaah_jurnal FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_ibadah_targets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  icon         TEXT,
  unit         TEXT NOT NULL DEFAULT 'kali',
  daily_target INT NOT NULL DEFAULT 1,
  category     TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jit_user_idx ON jamaah_ibadah_targets(user_id);

ALTER TABLE jamaah_ibadah_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jit_own" ON jamaah_ibadah_targets;
CREATE POLICY "jit_own" ON jamaah_ibadah_targets FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_ibadah_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id  UUID NOT NULL REFERENCES jamaah_ibadah_targets(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL,
  count      INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (target_id, log_date)
);
CREATE INDEX IF NOT EXISTS jil_user_date_idx ON jamaah_ibadah_logs(user_id, log_date);

ALTER TABLE jamaah_ibadah_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jil_own" ON jamaah_ibadah_logs;
CREATE POLICY "jil_own" ON jamaah_ibadah_logs FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_badges (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS jb_user_idx ON jamaah_badges(user_id);

ALTER TABLE jamaah_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jb_own" ON jamaah_badges;
CREATE POLICY "jb_own" ON jamaah_badges FOR ALL USING (user_id = auth.uid());


-- =============================================================================
-- BAGIAN 10: HR — Penggajian, Cuti, Penilaian Kinerja
-- =============================================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_salary        NUMERIC(15,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances          JSONB DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name           TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_name   TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_id              TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kes_number     TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_tk_number      TEXT;

CREATE TABLE IF NOT EXISTS payroll_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year          INTEGER NOT NULL,
  period_month         INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary         NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances           NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay         NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus                NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions           NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employee    NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employer    NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employee     NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employer     NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_pph21            NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary           NUMERIC(15,2) NOT NULL DEFAULT 0,
  working_days         INTEGER DEFAULT 0,
  present_days         INTEGER DEFAULT 0,
  absent_days          INTEGER DEFAULT 0,
  late_days            INTEGER DEFAULT 0,
  overtime_hours       NUMERIC(5,2)  DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  notes                TEXT,
  paid_at              TIMESTAMPTZ,
  approved_by          UUID REFERENCES auth.users(id),
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period      ON payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status      ON payroll_records(status);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_payroll" ON payroll_records;
CREATE POLICY "hr_can_manage_payroll" ON payroll_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','branch_manager','finance')
    )
  );

CREATE TABLE IF NOT EXISTS leave_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type       TEXT NOT NULL DEFAULT 'annual'
    CHECK (leave_type IN ('annual','sick','maternity','paternity','emergency','unpaid','other')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  total_days       INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason           TEXT NOT NULL,
  attachment_url   TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by      UUID REFERENCES auth.users(id),
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status      ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_dates       ON leave_requests(start_date, end_date);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_can_view_own_leaves"  ON leave_requests;
DROP POLICY IF EXISTS "employee_can_create_leave"     ON leave_requests;
DROP POLICY IF EXISTS "hr_can_manage_leaves"          ON leave_requests;

CREATE POLICY "employee_can_view_own_leaves" ON leave_requests
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "employee_can_create_leave" ON leave_requests
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "hr_can_manage_leaves" ON leave_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','branch_manager')
    )
  );

CREATE TABLE IF NOT EXISTS leave_quotas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL,
  annual_quota   INTEGER NOT NULL DEFAULT 12,
  annual_used    INTEGER NOT NULL DEFAULT 0,
  sick_used      INTEGER NOT NULL DEFAULT 0,
  carry_over     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_leave_quotas" ON leave_quotas;
CREATE POLICY "hr_can_manage_leave_quotas" ON leave_quotas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','branch_manager','finance')
    )
  );

CREATE TABLE IF NOT EXISTS performance_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id       UUID REFERENCES auth.users(id),
  review_period     TEXT NOT NULL,
  review_type       TEXT NOT NULL DEFAULT 'quarterly'
    CHECK (review_type IN ('monthly','quarterly','semi_annual','annual')),
  score_quality     NUMERIC(3,1) CHECK (score_quality BETWEEN 1 AND 5),
  score_productivity NUMERIC(3,1) CHECK (score_productivity BETWEEN 1 AND 5),
  score_initiative  NUMERIC(3,1) CHECK (score_initiative BETWEEN 1 AND 5),
  score_teamwork    NUMERIC(3,1) CHECK (score_teamwork BETWEEN 1 AND 5),
  score_attendance  NUMERIC(3,1) CHECK (score_attendance BETWEEN 1 AND 5),
  overall_score     NUMERIC(3,1) GENERATED ALWAYS AS (
    (COALESCE(score_quality,0) + COALESCE(score_productivity,0) +
     COALESCE(score_initiative,0) + COALESCE(score_teamwork,0) +
     COALESCE(score_attendance,0)) / 5.0
  ) STORED,
  grade          TEXT,
  strengths      TEXT,
  improvements   TEXT,
  goals          TEXT,
  comments       TEXT,
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','acknowledged')),
  acknowledged_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_period      ON performance_reviews(review_period);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_performance"      ON performance_reviews;
DROP POLICY IF EXISTS "employee_can_view_own_review"   ON performance_reviews;

CREATE POLICY "hr_can_manage_performance" ON performance_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','branch_manager')
    )
  );

CREATE POLICY "employee_can_view_own_review" ON performance_reviews
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );


-- =============================================================================
-- BAGIAN 11: PERMISSIONS & RBAC
-- =============================================================================

-- Kolom mahram tambahan
ALTER TABLE customer_mahrams ADD COLUMN IF NOT EXISTS relation_category TEXT DEFAULT 'lainnya';
ALTER TABLE customer_mahrams DROP CONSTRAINT IF EXISTS customer_mahrams_relation_category_check;
ALTER TABLE customer_mahrams ADD CONSTRAINT customer_mahrams_relation_category_check
  CHECK (relation_category IN ('suami','istri','anak','ayah','ibu','saudara','kakek','nenek','cucu','lainnya'));

CREATE TABLE IF NOT EXISTS permissions_list (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  label      TEXT NOT NULL,
  group_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role           TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled     BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

ALTER TABLE permissions_list  ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_permissions_list"  ON permissions_list;
DROP POLICY IF EXISTS "admin_manage_permissions_list" ON permissions_list;
DROP POLICY IF EXISTS "staff_read_role_permissions"  ON role_permissions;
DROP POLICY IF EXISTS "admin_manage_role_permissions" ON role_permissions;

CREATE POLICY "staff_read_permissions_list" ON permissions_list
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_permissions_list" ON permissions_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner')
    )
  );

CREATE POLICY "staff_read_role_permissions" ON role_permissions
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_role_permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner')
    )
  );

-- Seed permissions_list
INSERT INTO permissions_list (key, label, group_name, description) VALUES
  ('dashboard','Dashboard','Overview','Halaman utama dashboard'),
  ('analytics','Analytics','Overview','Laporan analitik'),
  ('leads','Leads & Prospek','Penjualan','Manajemen lead calon jamaah'),
  ('bookings','Booking','Penjualan','Manajemen pemesanan paket'),
  ('packages','Paket Umroh & Haji','Penjualan','Manajemen paket wisata'),
  ('package-types','Tipe Paket','Penjualan','Jenis-jenis paket'),
  ('coupons','Kupon & Promo','Penjualan','Kode diskon & promosi'),
  ('announcements','Pengumuman','Konten & Marketing','Pengumuman ke jamaah'),
  ('banners','Banner Carousel','Konten & Marketing','Banner halaman depan'),
  ('landing-pages','Landing Page','Konten & Marketing','Halaman pendaratan'),
  ('marketing-materials','Materi Marketing','Konten & Marketing','Brosur & materi digital'),
  ('whatsapp','WhatsApp Blast','Konten & Marketing','Pengiriman WA massal'),
  ('departures','Jadwal Keberangkatan','Keberangkatan','Manajemen jadwal keberangkatan'),
  ('room-assignments','Kamar & Rooming','Keberangkatan','Penempatan kamar jamaah'),
  ('haji','Manajemen Haji','Keberangkatan','Fitur khusus haji'),
  ('manasik','Manasik','Keberangkatan','Jadwal dan materi manasik'),
  ('itinerary-templates','Template Itinerary','Keberangkatan','Template jadwal perjalanan'),
  ('equipment','Perlengkapan','Keberangkatan','Distribusi perlengkapan jamaah'),
  ('payments','Pembayaran','Keuangan','Verifikasi & rekap pembayaran'),
  ('finance-cash','Kas & Bank','Keuangan','Manajemen kas dan rekening'),
  ('finance-ar','Piutang (AR)','Keuangan','Accounts receivable'),
  ('finance-ap','Hutang (AP)','Keuangan','Accounts payable'),
  ('finance','Laporan P&L','Keuangan','Laporan laba rugi'),
  ('savings','Program Tabungan','Keuangan','Tabungan umroh'),
  ('reports','Laporan','Keuangan','Laporan keuangan'),
  ('advanced-reports','Laporan Lanjutan','Keuangan','Analitik lanjutan'),
  ('scheduled-reports','Laporan Terjadwal','Keuangan','Laporan otomatis'),
  ('customers','Data Jamaah','Jamaah & Agen','Profil & data jamaah'),
  ('agents','Agen','Jamaah & Agen','Mitra agen'),
  ('branches','Cabang','Jamaah & Agen','Kantor cabang'),
  ('loyalty','Program Loyalitas','Jamaah & Agen','Poin & reward jamaah'),
  ('referrals','Referral','Jamaah & Agen','Program referral'),
  ('visa','Visa','Jamaah & Agen','Proses visa jamaah'),
  ('hr','SDM / HR','SDM','Manajemen sumber daya manusia'),
  ('payroll','Penggajian','SDM','Gaji dan tunjangan staf'),
  ('document-verification','Verifikasi Dokumen','Dokumen','Verifikasi dokumen jamaah'),
  ('document-types','Jenis Dokumen','Dokumen','Konfigurasi jenis dokumen'),
  ('documents-generator','Generator Surat','Dokumen','Cetak surat & dokumen'),
  ('offline-content','Konten Offline','Dokumen','Konten untuk jamaah offline'),
  ('support','Tiket Support','Dokumen','Layanan dukungan pelanggan'),
  ('hotels','Hotel','Master Data','Data hotel mitra'),
  ('airlines','Maskapai','Master Data','Data maskapai penerbangan'),
  ('airports','Bandara','Master Data','Data bandara'),
  ('vendors','Vendor','Master Data','Data vendor & supplier'),
  ('muthawifs','Muthawif','Master Data','Data muthawif/guide'),
  ('bus-providers','Penyedia Bus','Master Data','Data penyedia transportasi'),
  ('master-data','Master Data Lainnya','Master Data','Data referensi lainnya'),
  ('users','Manajemen User','Pengaturan','Akun dan akses staf'),
  ('roles','Manajemen Role','Pengaturan','Hak akses per role'),
  ('dashboard-access','Akses Dashboard','Pengaturan','Konfigurasi akses dashboard'),
  ('rbac-tools','RBAC Tools','Pengaturan','Alat manajemen akses'),
  ('rbac-status','Status RBAC','Pengaturan','Status sistem RBAC'),
  ('security-audit','Audit Keamanan','Pengaturan','Log dan audit keamanan'),
  ('2fa','Pengaturan 2FA','Pengaturan','Autentikasi dua faktor'),
  ('appearance','Tampilan & Tema','Pengaturan','Desain dan branding aplikasi'),
  ('settings','Pengaturan Umum','Pengaturan','Konfigurasi sistem'),
  ('api-connect','API Connect ke Apps','Pengaturan','Integrasi API eksternal'),
  ('supabase-setup','Panduan Setup Supabase','Pengaturan','Konfigurasi database')
ON CONFLICT (key) DO UPDATE SET
  label       = EXCLUDED.label,
  group_name  = EXCLUDED.group_name,
  description = EXCLUDED.description;

-- Phase5: update constraint user_roles jika ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_roles' AND constraint_name = 'user_roles_role_check'
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
      CHECK (role IN (
        'super_admin','owner','branch_manager','finance','operational',
        'sales','marketing','equipment','agent','sub_agent','customer','jamaah','hr','admin','visa_officer'
      ));
  END IF;
END $$;

-- Phase5: seed sub_agent permissions
INSERT INTO role_permissions (role, permission_key, is_enabled)
VALUES ('sub_agent','packages',true),('sub_agent','bookings',true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Phase5: sub_agent view own bookings policy (hanya jika tabel agent_profiles ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bookings'
  ) THEN
    DROP POLICY IF EXISTS "sub_agent_view_own_bookings" ON bookings;
    CREATE POLICY "sub_agent_view_own_bookings" ON bookings
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'sub_agent')
        AND agent_id IN (
          SELECT id FROM agents WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 12: ROOMING — Fungsi helper & audit
-- =============================================================================

CREATE OR REPLACE FUNCTION get_roommates(passenger_id UUID)
RETURNS TABLE(id UUID, customer_id UUID, full_name TEXT, gender TEXT, room_preference TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT bp.id, bp.customer_id, c.full_name, c.gender, bp.room_preference
  FROM booking_passengers bp
  JOIN customers c ON bp.customer_id = c.id
  WHERE bp.room_group_id = (SELECT room_group_id FROM booking_passengers WHERE id = passenger_id)
    AND bp.id != passenger_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_room_group_capacity(group_id UUID, expected_room_type TEXT)
RETURNS TABLE(is_valid BOOLEAN, current_count INT, max_capacity INT, message TEXT) AS $$
DECLARE count INT; max_cap INT;
BEGIN
  SELECT COUNT(*) INTO count FROM booking_passengers WHERE room_group_id = group_id;
  max_cap := CASE expected_room_type
    WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 WHEN 'quad' THEN 4 ELSE 4
  END;
  RETURN QUERY SELECT
    count <= max_cap,
    count,
    max_cap,
    CASE WHEN count <= max_cap THEN 'Kapasitas valid'
         ELSE format('Melebihi kapasitas %s (%s/%s)', expected_room_type, count, max_cap)
    END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_room_group_members(group_id UUID)
RETURNS TABLE(id UUID, customer_id UUID, full_name TEXT, gender TEXT, room_preference TEXT, room_number TEXT, booking_code TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT bp.id, bp.customer_id, c.full_name, c.gender, bp.room_preference, bp.room_number, b.booking_code
  FROM booking_passengers bp
  JOIN customers c ON bp.customer_id = c.id
  JOIN bookings b ON bp.booking_id = b.id
  WHERE bp.room_group_id = group_id
  ORDER BY bp.created_at;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS room_group_audit (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_group_id UUID,
  passenger_id  UUID,
  action        TEXT NOT NULL,
  old_room_type TEXT,
  new_room_type TEXT,
  old_room_number TEXT,
  new_room_number TEXT,
  reason        TEXT,
  changed_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_group_audit_group_id     ON room_group_audit(room_group_id);
CREATE INDEX IF NOT EXISTS idx_room_group_audit_passenger_id ON room_group_audit(passenger_id);
CREATE INDEX IF NOT EXISTS idx_room_group_audit_created_at   ON room_group_audit(created_at DESC);

ALTER TABLE room_group_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_room_group_audit"  ON room_group_audit;
DROP POLICY IF EXISTS "admin_manage_room_group_audit" ON room_group_audit;

CREATE POLICY "staff_read_room_group_audit" ON room_group_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','operational')
    )
  );

CREATE POLICY "admin_manage_room_group_audit" ON room_group_audit
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','operational')
    )
  );

-- Migrate roommate_id → room_group_id jika kolom roommate_id ada
DO $$
DECLARE pair RECORD; group_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='booking_passengers' AND column_name='roommate_id'
  ) THEN
    FOR pair IN
      SELECT DISTINCT LEAST(id, roommate_id) AS first_id, GREATEST(id, roommate_id) AS second_id
      FROM booking_passengers WHERE roommate_id IS NOT NULL AND id < roommate_id
    LOOP
      group_id := gen_random_uuid();
      UPDATE booking_passengers SET room_group_id = group_id
      WHERE id = pair.first_id OR id = pair.second_id;
    END LOOP;
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 13: OPERATIONAL — Dokumen, Checklist, View
-- =============================================================================

ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS departure_id UUID REFERENCES departures(id);
ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS distributed_by UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_departure ON equipment_distributions(departure_id);

ALTER TABLE room_assignments ADD COLUMN IF NOT EXISTS departure_id UUID REFERENCES departures(id);
CREATE INDEX IF NOT EXISTS idx_room_assign_departure ON room_assignments(departure_id);

CREATE TABLE IF NOT EXISTS generated_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id  UUID REFERENCES departures(id),
  booking_id    UUID REFERENCES bookings(id),
  document_type TEXT NOT NULL,
  document_number TEXT,
  file_url      TEXT,
  generated_by  UUID REFERENCES auth.users(id),
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gendocs_customer  ON generated_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_gendocs_departure ON generated_documents(departure_id);
CREATE INDEX IF NOT EXISTS idx_gendocs_type      ON generated_documents(document_type);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_can_manage_generated_docs" ON generated_documents;
CREATE POLICY "staff_can_manage_generated_docs" ON generated_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','branch_manager','operational','finance')
    )
  );

CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id            UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  has_passport            BOOLEAN DEFAULT FALSE,
  has_visa                BOOLEAN DEFAULT FALSE,
  has_ktp                 BOOLEAN DEFAULT FALSE,
  has_kk                  BOOLEAN DEFAULT FALSE,
  has_photo               BOOLEAN DEFAULT FALSE,
  has_meningitis_vaccine  BOOLEAN DEFAULT FALSE,
  has_ihram               BOOLEAN DEFAULT FALSE,
  has_bag                 BOOLEAN DEFAULT FALSE,
  has_id_card             BOOLEAN DEFAULT FALSE,
  has_insurance           BOOLEAN DEFAULT FALSE,
  has_attended_manasik    BOOLEAN DEFAULT FALSE,
  is_fully_paid           BOOLEAN DEFAULT FALSE,
  room_assigned           BOOLEAN DEFAULT FALSE,
  notes                   TEXT,
  checked_by              UUID REFERENCES auth.users(id),
  checked_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id, departure_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_departure ON jamaah_checklist(departure_id);
CREATE INDEX IF NOT EXISTS idx_checklist_customer  ON jamaah_checklist(customer_id);

ALTER TABLE jamaah_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operational_can_manage_checklist" ON jamaah_checklist;
CREATE POLICY "operational_can_manage_checklist" ON jamaah_checklist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','branch_manager','operational','equipment')
    )
  );

-- View jamaah_operational_status
CREATE OR REPLACE VIEW jamaah_operational_status AS
SELECT
  bp.id AS booking_passenger_id,
  bp.customer_id,
  bp.booking_id,
  bp.is_main_passenger,
  bp.passenger_type,
  c.full_name,
  c.nik,
  c.gender,
  c.passport_number,
  c.passport_expiry,
  c.phone,
  c.email,
  b.departure_id,
  b.booking_code,
  b.total_price,
  b.paid_amount,
  b.payment_status,
  b.room_type,
  (
    SELECT COUNT(*) > 0
    FROM equipment_distributions ed
    WHERE ed.customer_id = bp.customer_id
      AND ed.departure_id = b.departure_id
  ) AS has_equipment,
  (
    SELECT COUNT(*)
    FROM generated_documents gd
    WHERE gd.customer_id = bp.customer_id
      AND gd.departure_id = b.departure_id
  ) AS document_count,
  ROUND((b.paid_amount / NULLIF(b.total_price, 0)) * 100) AS payment_percent,
  b.total_price - b.paid_amount AS remaining_amount
FROM booking_passengers bp
JOIN bookings b   ON bp.booking_id   = b.id
JOIN customers c  ON bp.customer_id  = c.id
WHERE b.status NOT IN ('cancelled');


-- =============================================================================
-- BAGIAN 14: PAYMENT DEADLINE REMINDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_deadline_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code     TEXT NOT NULL,
  phone            TEXT NOT NULL,
  full_name        TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC(15,2),
  days_before      INTEGER NOT NULL DEFAULT 3,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','cancelled')),
  sent_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_pdr_status   ON payment_deadline_reminders(status);
CREATE INDEX IF NOT EXISTS idx_pdr_deadline ON payment_deadline_reminders(payment_deadline);
CREATE INDEX IF NOT EXISTS idx_pdr_created  ON payment_deadline_reminders(created_at DESC);

ALTER TABLE payment_deadline_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_payment_reminder" ON payment_deadline_reminders;
DROP POLICY IF EXISTS "staff_all_payment_reminder"   ON payment_deadline_reminders;

CREATE POLICY "anon_insert_payment_reminder" ON payment_deadline_reminders
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "staff_all_payment_reminder" ON payment_deadline_reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pdr_updated_at'
    AND tgrelid='payment_deadline_reminders'::regclass) THEN
    CREATE TRIGGER trg_pdr_updated_at
      BEFORE UPDATE ON payment_deadline_reminders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 15: WHATSAPP INTEGRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL DEFAULT 'fonnte',
  api_key       TEXT,
  sender_number TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  message_template TEXT NOT NULL,
  variables        TEXT[] DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone     TEXT NOT NULL,
  message_content     TEXT NOT NULL,
  template_code       TEXT,
  booking_id          UUID REFERENCES bookings(id)  ON DELETE SET NULL,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed')),
  error_message       TEXT,
  provider_message_id TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE whatsapp_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_full_access_wa_config"    ON whatsapp_config;
DROP POLICY IF EXISTS "staff_full_access_wa_templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "staff_full_access_wa_logs"      ON whatsapp_logs;

CREATE POLICY "staff_full_access_wa_config"    ON whatsapp_config    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_full_access_wa_templates" ON whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_full_access_wa_logs"      ON whatsapp_logs      FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO whatsapp_templates (code, name, message_template, variables) VALUES
('BOOKING_CONFIRM',   'Konfirmasi Booking',
 E'Assalamu''alaikum {nama} 🕌\n\n✅ *Booking Anda Berhasil!*\n\n📋 Kode Booking: *{kode_booking}*\n📦 Paket: {nama_paket}\n📅 Keberangkatan: {tanggal_berangkat}\n💰 Total: {total_harga}\n💳 DP/Terbayar: {terbayar}\n⏳ Sisa: {sisa_bayar}\n\nTerima kasih telah mempercayakan perjalanan ibadah Anda kepada kami. 🙏\n\nInfo: {nomor_cs}',
 ARRAY['nama','kode_booking','nama_paket','tanggal_berangkat','total_harga','terbayar','sisa_bayar','nomor_cs']),
('PAYMENT_CONFIRM',   'Konfirmasi Pembayaran',
 E'Assalamu''alaikum {nama} 🕌\n\n✅ *Pembayaran Diterima!*\n\n📋 Kode Booking: *{kode_booking}*\n💰 Jumlah Diterima: *{jumlah_bayar}*\n📅 Tanggal: {tanggal_bayar}\n💳 Total Terbayar: {total_terbayar}\n⏳ Sisa: {sisa_bayar}\n\nJazakallahu khairan atas kepercayaan Anda. 🙏\n\nInfo: {nomor_cs}',
 ARRAY['nama','kode_booking','jumlah_bayar','tanggal_bayar','total_terbayar','sisa_bayar','nomor_cs']),
('PAYMENT_LUNAS',     'Pembayaran Lunas',
 E'Assalamu''alaikum {nama} 🕌\n\n🎉 *Pembayaran Lunas!*\n\nAlhamdulillah, pembayaran Anda untuk paket *{nama_paket}* telah LUNAS.\n\n📋 Kode Booking: *{kode_booking}*\n📅 Keberangkatan: {tanggal_berangkat}\n\nKami akan segera memproses dokumen perjalanan Anda.\n\nInfo: {nomor_cs} 🙏',
 ARRAY['nama','nama_paket','kode_booking','tanggal_berangkat','nomor_cs']),
('DOCUMENT_READY',    'Dokumen Siap',
 E'Assalamu''alaikum {nama} 🕌\n\n📄 *Dokumen Anda Sudah Siap!*\n\nJenis dokumen: *{jenis_dokumen}*\nPaket: {nama_paket}\nKeberangkatan: {tanggal_berangkat}\n\nSilakan hubungi kami untuk pengambilan dokumen.\n\nInfo: {nomor_cs} 🙏',
 ARRAY['nama','jenis_dokumen','nama_paket','tanggal_berangkat','nomor_cs']),
('DEPARTURE_REMINDER','Pengingat Keberangkatan',
 E'Assalamu''alaikum {nama} 🕌\n\n⏰ *Pengingat Keberangkatan!*\n\nKeberangkatan Anda tinggal *{sisa_hari} hari* lagi!\n\n📅 Tanggal: {tanggal_berangkat}\n✈️ Penerbangan: {nomor_penerbangan}\n🏨 Hotel Makkah: {hotel_makkah}\n📍 Titik Kumpul: {titik_kumpul}\n\nPastikan dokumen perjalanan sudah lengkap. Semoga menjadi haji/umrah yang mabrur! 🤲\n\nInfo: {nomor_cs}',
 ARRAY['nama','sisa_hari','tanggal_berangkat','nomor_penerbangan','hotel_makkah','titik_kumpul','nomor_cs'])
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- BAGIAN 16: FASE 13-15 — CRM, Chat Leads, Manasik, Reviews
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_leads (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id   UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  stage      TEXT NOT NULL DEFAULT 'baru'
    CHECK (stage IN ('baru','dihubungi','tertarik','negosiasi','booking')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_leads_agent_id_idx ON agent_leads(agent_id);
CREATE INDEX IF NOT EXISTS agent_leads_stage_idx    ON agent_leads(stage);

ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_manage_own_leads" ON agent_leads;
DROP POLICY IF EXISTS "admin_manage_all_leads"  ON agent_leads;

CREATE POLICY "agents_manage_own_leads" ON agent_leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_manage_all_leads" ON agent_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agent_leads_updated_at'
    AND tgrelid='agent_leads'::regclass) THEN
    CREATE TRIGGER set_agent_leads_updated_at
      BEFORE UPDATE ON agent_leads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS discount_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id      UUID REFERENCES bookings(id)  ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id)    ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id)  ON DELETE CASCADE,
  discount_amount NUMERIC(15,2),
  discount_pct    NUMERIC(5,2),
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  notes           TEXT,
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discount_requests_branch_id_idx ON discount_requests(branch_id);
CREATE INDEX IF NOT EXISTS discount_requests_agent_id_idx  ON discount_requests(agent_id);
CREATE INDEX IF NOT EXISTS discount_requests_status_idx    ON discount_requests(status);

ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_create_discount_requests"   ON discount_requests;
DROP POLICY IF EXISTS "agents_view_own_requests"          ON discount_requests;
DROP POLICY IF EXISTS "branch_managers_manage_requests"   ON discount_requests;

CREATE POLICY "agents_create_discount_requests" ON discount_requests
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "agents_view_own_requests" ON discount_requests
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "branch_managers_manage_requests" ON discount_requests
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_discount_requests_updated_at'
    AND tgrelid='discount_requests'::regclass) THEN
    CREATE TRIGGER set_discount_requests_updated_at
      BEFORE UPDATE ON discount_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS chat_leads (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  source     TEXT DEFAULT 'chat_widget'
    CHECK (source IN ('chat_widget','lead_form','whatsapp','landing_page')),
  message    TEXT,
  tenant_id  UUID,
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id   UUID REFERENCES agents(id)   ON DELETE SET NULL,
  status     TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_leads_tenant_id_idx  ON chat_leads(tenant_id);
CREATE INDEX IF NOT EXISTS chat_leads_status_idx     ON chat_leads(status);
CREATE INDEX IF NOT EXISTS chat_leads_created_at_idx ON chat_leads(created_at DESC);

ALTER TABLE chat_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert_chat_leads" ON chat_leads;
DROP POLICY IF EXISTS "staff_manage_chat_leads"  ON chat_leads;

CREATE POLICY "anyone_insert_chat_leads" ON chat_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "staff_manage_chat_leads" ON chat_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_chat_leads_updated_at'
    AND tgrelid='chat_leads'::regclass) THEN
    CREATE TRIGGER set_chat_leads_updated_at
      BEFORE UPDATE ON chat_leads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS manasik_schedules (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id      UUID REFERENCES branches(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  type           TEXT DEFAULT 'umum'
    CHECK (type IN ('fiqih','doa','persiapan','praktik','kesehatan','umum')),
  scheduled_date DATE NOT NULL,
  time           TEXT,
  location       TEXT,
  description    TEXT,
  video_url      TEXT,
  material_url   TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS manasik_schedules_branch_id_idx ON manasik_schedules(branch_id);
CREATE INDEX IF NOT EXISTS manasik_schedules_date_idx      ON manasik_schedules(scheduled_date);

ALTER TABLE manasik_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_manasik_schedules"  ON manasik_schedules;
DROP POLICY IF EXISTS "jamaah_view_manasik_schedules"   ON manasik_schedules;

CREATE POLICY "staff_manage_manasik_schedules" ON manasik_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "jamaah_view_manasik_schedules" ON manasik_schedules
  FOR SELECT USING (
    is_active = TRUE AND (
      branch_id IN (SELECT branch_id FROM customers WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
      )
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_manasik_schedules_updated_at'
    AND tgrelid='manasik_schedules'::regclass) THEN
    CREATE TRIGGER set_manasik_schedules_updated_at
      BEFORE UPDATE ON manasik_schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS manasik_attendance (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id  UUID NOT NULL REFERENCES manasik_schedules(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  attended     BOOLEAN,
  notes        TEXT,
  UNIQUE(schedule_id, customer_id)
);

CREATE INDEX IF NOT EXISTS manasik_attendance_schedule_id_idx ON manasik_attendance(schedule_id);
CREATE INDEX IF NOT EXISTS manasik_attendance_customer_id_idx ON manasik_attendance(customer_id);

ALTER TABLE manasik_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah_manage_own_attendance" ON manasik_attendance;
DROP POLICY IF EXISTS "staff_view_all_attendance"    ON manasik_attendance;

CREATE POLICY "jamaah_manage_own_attendance" ON manasik_attendance
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_view_all_attendance" ON manasik_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE TABLE IF NOT EXISTS package_reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id  UUID NOT NULL REFERENCES packages(id)  ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_public   BOOLEAN DEFAULT TRUE,
  admin_reply TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, customer_id)
);

CREATE INDEX IF NOT EXISTS package_reviews_package_id_idx ON package_reviews(package_id);
CREATE INDEX IF NOT EXISTS package_reviews_is_public_idx  ON package_reviews(is_public);
CREATE INDEX IF NOT EXISTS package_reviews_rating_idx     ON package_reviews(rating);

ALTER TABLE package_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_view_public_reviews"  ON package_reviews;
DROP POLICY IF EXISTS "jamaah_manage_own_reviews"   ON package_reviews;
DROP POLICY IF EXISTS "admin_moderate_reviews"      ON package_reviews;

CREATE POLICY "anyone_view_public_reviews" ON package_reviews
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "jamaah_manage_own_reviews" ON package_reviews
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_moderate_reviews" ON package_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_package_reviews_updated_at'
    AND tgrelid='package_reviews'::regclass) THEN
    CREATE TRIGGER set_package_reviews_updated_at
      BEFORE UPDATE ON package_reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 17: FASE 16 — Tabel Baru Lengkap
-- =============================================================================

-- Visa Status Logs
CREATE TABLE IF NOT EXISTS visa_status_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_id         UUID REFERENCES visa_applications(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  notes           TEXT,
  changed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_role TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_status_logs_visa_id     ON visa_status_logs(visa_id);
CREATE INDEX IF NOT EXISTS idx_visa_status_logs_customer_id ON visa_status_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_status_logs_created_at  ON visa_status_logs(created_at DESC);

ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_visa_log"      ON visa_status_logs;
DROP POLICY IF EXISTS "staff_read_visa_logs"       ON visa_status_logs;
DROP POLICY IF EXISTS "customer_read_own_visa_logs" ON visa_status_logs;

CREATE POLICY "staff_insert_visa_log" ON visa_status_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')
    )
  );

CREATE POLICY "staff_read_visa_logs" ON visa_status_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')
    )
  );

CREATE POLICY "customer_read_own_visa_logs" ON visa_status_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Approval Requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type           TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  reference_id   UUID,
  reference_code TEXT,
  requester_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_role TEXT NOT NULL,
  amount         NUMERIC(15,2),
  percentage     NUMERIC(5,2),
  reason         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','escalated','cancelled')),
  current_level  SMALLINT NOT NULL DEFAULT 1,
  max_level      SMALLINT NOT NULL DEFAULT 2,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  resolved_at    TIMESTAMPTZ,
  resolved_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status    ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type      ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_branch_id ON approval_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created   ON approval_requests(created_at DESC);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_approval_request"  ON approval_requests;
DROP POLICY IF EXISTS "requester_read_own_requests"    ON approval_requests;
DROP POLICY IF EXISTS "branch_manager_manage_requests" ON approval_requests;
DROP POLICY IF EXISTS "admin_manage_all_requests"      ON approval_requests;

CREATE POLICY "staff_insert_approval_request" ON approval_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND requester_id = auth.uid());

CREATE POLICY "requester_read_own_requests" ON approval_requests
  FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "branch_manager_manage_requests" ON approval_requests
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "admin_manage_all_requests" ON approval_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_approval_requests_updated_at'
    AND tgrelid='approval_requests'::regclass) THEN
    CREATE TRIGGER set_approval_requests_updated_at
      BEFORE UPDATE ON approval_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Approval Actions
CREATE TABLE IF NOT EXISTS approval_actions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  actor_id   UUID NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  actor_role TEXT NOT NULL,
  action     TEXT NOT NULL
    CHECK (action IN ('approved','rejected','escalated','noted')),
  level      SMALLINT NOT NULL DEFAULT 1,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_actor_id   ON approval_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_created_at ON approval_actions(created_at DESC);

ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_approval_action" ON approval_actions;
DROP POLICY IF EXISTS "staff_read_approval_actions"  ON approval_actions;
DROP POLICY IF EXISTS "requester_read_own_actions"   ON approval_actions;

CREATE POLICY "staff_insert_approval_action" ON approval_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    ) AND actor_id = auth.uid()
  );

CREATE POLICY "staff_read_approval_actions" ON approval_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance','operational')
    )
  );

CREATE POLICY "requester_read_own_actions" ON approval_actions
  FOR SELECT USING (
    request_id IN (SELECT id FROM approval_requests WHERE requester_id = auth.uid())
  );

-- Dashboard Access Config (versi fase16 — lebih lengkap)
CREATE TABLE IF NOT EXISTS dashboard_access_config (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role             TEXT NOT NULL UNIQUE,
  enabled_modules  TEXT[] DEFAULT '{}',
  disabled_modules TEXT[] DEFAULT '{}',
  default_dashboard TEXT NOT NULL DEFAULT 'overview',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dac_role      ON dashboard_access_config(role);
CREATE INDEX IF NOT EXISTS idx_dac_is_active ON dashboard_access_config(is_active);

ALTER TABLE dashboard_access_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_dashboard_config"      ON dashboard_access_config;
DROP POLICY IF EXISTS "staff_read_dashboard_config"        ON dashboard_access_config;
DROP POLICY IF EXISTS "super_admin_can_manage_dashboard_config" ON dashboard_access_config;
DROP POLICY IF EXISTS "staff_can_view_own_dashboard_config"     ON dashboard_access_config;

CREATE POLICY "admin_manage_dashboard_config" ON dashboard_access_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner')
    )
  );

CREATE POLICY "staff_read_dashboard_config" ON dashboard_access_config
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_dashboard_access_config_updated_at'
    AND tgrelid='dashboard_access_config'::regclass) THEN
    CREATE TRIGGER set_dashboard_access_config_updated_at
      BEFORE UPDATE ON dashboard_access_config
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO dashboard_access_config (role, enabled_modules, disabled_modules, default_dashboard)
VALUES
  ('super_admin',    ARRAY['all'],                           ARRAY[]::TEXT[], 'overview'),
  ('owner',          ARRAY['all'],                           ARRAY[]::TEXT[], 'overview'),
  ('admin',          ARRAY['all'],                           ARRAY['hr_payroll'], 'overview'),
  ('branch_manager', ARRAY['branch','sales','ops','crm'],    ARRAY['hr_payroll','finance_full'], 'branch_overview'),
  ('finance',        ARRAY['finance','payments','reports'],  ARRAY[]::TEXT[], 'finance'),
  ('operational',    ARRAY['operations','manifest','sos'],   ARRAY['finance_full'], 'operations'),
  ('marketing',      ARRAY['marketing','leads','website'],   ARRAY['finance_full'], 'marketing'),
  ('sales',          ARRAY['sales','crm','leads'],           ARRAY['finance_full'], 'sales'),
  ('hr',             ARRAY['hr','employees','payroll'],      ARRAY['finance_full'], 'hr'),
  ('agent',          ARRAY['agent_portal'],                  ARRAY[]::TEXT[], 'agent'),
  ('customer',       ARRAY['customer_portal'],               ARRAY[]::TEXT[], 'customer')
ON CONFLICT (role) DO NOTHING;

-- Dashboard Access Audit Log
CREATE TABLE IF NOT EXISTS dashboard_access_audit_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role       TEXT NOT NULL,
  action     TEXT NOT NULL,
  module_key TEXT,
  old_value  TEXT,
  new_value  TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata   JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_daal_role       ON dashboard_access_audit_log(role);
CREATE INDEX IF NOT EXISTS idx_daal_changed_by ON dashboard_access_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_daal_changed_at ON dashboard_access_audit_log(changed_at DESC);

ALTER TABLE dashboard_access_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_dashboard_audit"          ON dashboard_access_audit_log;
DROP POLICY IF EXISTS "super_admin_can_view_dashboard_audit_log"   ON dashboard_access_audit_log;
DROP POLICY IF EXISTS "super_admin_can_create_dashboard_audit_log" ON dashboard_access_audit_log;

CREATE POLICY "admin_manage_dashboard_audit" ON dashboard_access_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner')
    )
  );

-- Dashboard Stats
CREATE TABLE IF NOT EXISTS dashboard_stats (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id         UUID REFERENCES branches(id) ON DELETE CASCADE,
  stat_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  total_revenue     NUMERIC(20,2) DEFAULT 0,
  total_bookings    INTEGER DEFAULT 0,
  total_pax         INTEGER DEFAULT 0,
  total_outstanding NUMERIC(20,2) DEFAULT 0,
  new_leads         INTEGER DEFAULT 0,
  new_customers     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_stats_branch_id ON dashboard_stats(branch_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_stat_date ON dashboard_stats(stat_date DESC);

ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_dashboard_stats"     ON dashboard_stats;
DROP POLICY IF EXISTS "branch_manager_read_branch_stats" ON dashboard_stats;

CREATE POLICY "admin_manage_dashboard_stats" ON dashboard_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "branch_manager_read_branch_stats" ON dashboard_stats
  FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_dashboard_stats_updated_at'
    AND tgrelid='dashboard_stats'::regclass) THEN
    CREATE TRIGGER set_dashboard_stats_updated_at
      BEFORE UPDATE ON dashboard_stats
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Financial Summary
CREATE TABLE IF NOT EXISTS financial_summary (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_type       TEXT NOT NULL DEFAULT 'monthly'
    CHECK (period_type IN ('daily','weekly','monthly','yearly')),
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  branch_id         UUID REFERENCES branches(id) ON DELETE CASCADE,
  total_revenue     NUMERIC(20,2) NOT NULL DEFAULT 0,
  total_expenses    NUMERIC(20,2) NOT NULL DEFAULT 0,
  total_outstanding NUMERIC(20,2) NOT NULL DEFAULT 0,
  net_profit        NUMERIC(20,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_fin_summary_branch_id    ON financial_summary(branch_id);
CREATE INDEX IF NOT EXISTS idx_fin_summary_period_start ON financial_summary(period_start DESC);

ALTER TABLE financial_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_summary"          ON financial_summary;
DROP POLICY IF EXISTS "branch_manager_read_fin_summary" ON financial_summary;

CREATE POLICY "finance_manage_summary" ON financial_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance')
    )
  );

CREATE POLICY "branch_manager_read_fin_summary" ON financial_summary
  FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID REFERENCES branches(id)  ON DELETE SET NULL,
  booking_id       UUID REFERENCES bookings(id)  ON DELETE SET NULL,
  description      TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('income','expense')),
  category         TEXT,
  amount           NUMERIC(20,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','cancelled')),
  reference_no     TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_branch_id        ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type             ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status           ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_transactions"   ON transactions;
DROP POLICY IF EXISTS "branch_manager_read_own_trans" ON transactions;

CREATE POLICY "finance_manage_transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance')
    )
  );

CREATE POLICY "branch_manager_read_own_trans" ON transactions
  FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_transactions_updated_at'
    AND tgrelid='transactions'::regclass) THEN
    CREATE TRIGGER set_transactions_updated_at
      BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID REFERENCES branches(id)   ON DELETE SET NULL,
  departure_id UUID REFERENCES departures(id) ON DELETE SET NULL,
  category     TEXT NOT NULL,
  description  TEXT,
  amount       NUMERIC(20,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id    ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_departure_id ON expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status       ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date         ON expenses(expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_expenses"        ON expenses;
DROP POLICY IF EXISTS "finance_manage_expenses"      ON expenses;
DROP POLICY IF EXISTS "branch_manager_read_expenses" ON expenses;

CREATE POLICY "staff_insert_expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance')
    )
  );

CREATE POLICY "finance_manage_expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance')
    )
  );

CREATE POLICY "branch_manager_read_expenses" ON expenses
  FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_expenses_updated_at'
    AND tgrelid='expenses'::regclass) THEN
    CREATE TRIGGER set_expenses_updated_at
      BEFORE UPDATE ON expenses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  channel     TEXT DEFAULT 'social_media'
    CHECK (channel IN ('social_media','whatsapp','email','sms','offline','referral','other')),
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','cancelled')),
  budget      NUMERIC(20,2) DEFAULT 0,
  spent       NUMERIC(20,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks      BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_branch_id ON marketing_campaigns(branch_id);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_status    ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_created   ON marketing_campaigns(created_at DESC);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "staff_read_campaigns"       ON marketing_campaigns;

CREATE POLICY "marketing_manage_campaigns" ON marketing_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

CREATE POLICY "staff_read_campaigns" ON marketing_campaigns
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_marketing_campaigns_updated_at'
    AND tgrelid='marketing_campaigns'::regclass) THEN
    CREATE TRIGGER set_marketing_campaigns_updated_at
      BEFORE UPDATE ON marketing_campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Marketing Metrics
CREATE TABLE IF NOT EXISTS marketing_metrics (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions BIGINT DEFAULT 0,
  clicks      BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue     NUMERIC(20,2) DEFAULT 0,
  cost        NUMERIC(20,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_mkt_metrics_campaign_id ON marketing_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mkt_metrics_date        ON marketing_metrics(metric_date DESC);

ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_metrics" ON marketing_metrics;
CREATE POLICY "marketing_manage_metrics" ON marketing_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

-- Marketing Conversions
CREATE TABLE IF NOT EXISTS marketing_conversions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  campaign_name TEXT,
  booking_id    UUID REFERENCES bookings(id)   ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id)  ON DELETE SET NULL,
  conversions   INTEGER DEFAULT 1,
  revenue       NUMERIC(20,2) DEFAULT 0,
  converted_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_conv_campaign_id  ON marketing_conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mkt_conv_converted_at ON marketing_conversions(converted_at DESC);

ALTER TABLE marketing_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_conversions" ON marketing_conversions;
CREATE POLICY "marketing_manage_conversions" ON marketing_conversions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing','sales')
    )
  );

-- Equipment (inventaris — berbeda dari equipment_items yang sudah ada)
CREATE TABLE IF NOT EXISTS equipment (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','in_use','maintenance','damaged','retired')),
  condition      TEXT NOT NULL DEFAULT 'good'
    CHECK (condition IN ('new','good','fair','damaged')),
  quantity       INTEGER NOT NULL DEFAULT 1,
  serial_no      TEXT,
  purchase_date  DATE,
  purchase_price NUMERIC(15,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_branch_id ON equipment(branch_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status    ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category  ON equipment(category);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment" ON equipment;
DROP POLICY IF EXISTS "staff_read_equipment"   ON equipment;

CREATE POLICY "staff_manage_equipment" ON equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "staff_read_equipment" ON equipment
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_equipment_updated_at'
    AND tgrelid='equipment'::regclass) THEN
    CREATE TRIGGER set_equipment_updated_at
      BEFORE UPDATE ON equipment
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Equipment Maintenance
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id         UUID REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name       TEXT,
  maintenance_type     TEXT NOT NULL
    CHECK (maintenance_type IN ('preventive','corrective','calibration','inspection','other')),
  maintenance_date     DATE NOT NULL,
  performed_by         TEXT,
  cost                 NUMERIC(15,2) DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes                TEXT,
  next_maintenance_date DATE,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_maint_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_maint_status       ON equipment_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_equip_maint_date         ON equipment_maintenance(maintenance_date DESC);

ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "staff_manage_equipment_maintenance" ON equipment_maintenance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_equipment_maintenance_updated_at'
    AND tgrelid='equipment_maintenance'::regclass) THEN
    CREATE TRIGGER set_equipment_maintenance_updated_at
      BEFORE UPDATE ON equipment_maintenance
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Equipment Damage
CREATE TABLE IF NOT EXISTS equipment_damage (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id   UUID REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name TEXT,
  reported_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  damage_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  description    TEXT NOT NULL,
  severity       TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low','medium','high','critical')),
  status         TEXT NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported','in_progress','repaired','written_off')),
  repair_cost    NUMERIC(15,2),
  repaired_at    TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_damage_equipment_id ON equipment_damage(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_damage_status       ON equipment_damage(status);
CREATE INDEX IF NOT EXISTS idx_equip_damage_severity     ON equipment_damage(severity);

ALTER TABLE equipment_damage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment_damage" ON equipment_damage;
CREATE POLICY "staff_manage_equipment_damage" ON equipment_damage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_equipment_damage_updated_at'
    AND tgrelid='equipment_damage'::regclass) THEN
    CREATE TRIGGER set_equipment_damage_updated_at
      BEFORE UPDATE ON equipment_damage
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Sales Targets
CREATE TABLE IF NOT EXISTS sales_targets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  role              TEXT,
  period_type       TEXT NOT NULL DEFAULT 'monthly'
    CHECK (period_type IN ('weekly','monthly','quarterly','yearly')),
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  target_amount     NUMERIC(20,2) NOT NULL DEFAULT 0,
  target_bookings   INTEGER DEFAULT 0,
  target_leads      INTEGER DEFAULT 0,
  achieved_amount   NUMERIC(20,2) DEFAULT 0,
  achieved_bookings INTEGER DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id   ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_branch_id ON sales_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period    ON sales_targets(period_start DESC);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_sales_targets"          ON sales_targets;
DROP POLICY IF EXISTS "staff_read_own_sales_targets"        ON sales_targets;
DROP POLICY IF EXISTS "branch_manager_read_branch_targets"  ON sales_targets;

CREATE POLICY "admin_manage_sales_targets" ON sales_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "staff_read_own_sales_targets" ON sales_targets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "branch_manager_read_branch_targets" ON sales_targets
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sales_targets_updated_at'
    AND tgrelid='sales_targets'::regclass) THEN
    CREATE TRIGGER set_sales_targets_updated_at
      BEFORE UPDATE ON sales_targets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trip Timeline
CREATE TABLE IF NOT EXISTS trip_timeline (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_date   DATE,
  event_time   TEXT,
  location     TEXT,
  type         TEXT DEFAULT 'info'
    CHECK (type IN ('info','flight','hotel','activity','ceremony','warning','milestone')),
  sort_order   INTEGER DEFAULT 0,
  is_public    BOOLEAN DEFAULT TRUE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_timeline_departure_id ON trip_timeline(departure_id);
CREATE INDEX IF NOT EXISTS idx_trip_timeline_event_date   ON trip_timeline(event_date);
CREATE INDEX IF NOT EXISTS idx_trip_timeline_sort_order   ON trip_timeline(departure_id, sort_order);

ALTER TABLE trip_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_trip_timeline"  ON trip_timeline;
DROP POLICY IF EXISTS "customer_read_trip_timeline" ON trip_timeline;

CREATE POLICY "staff_manage_trip_timeline" ON trip_timeline
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "customer_read_trip_timeline" ON trip_timeline
  FOR SELECT USING (
    is_public = TRUE
    AND departure_id IN (
      SELECT DISTINCT b.departure_id
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_trip_timeline_updated_at'
    AND tgrelid='trip_timeline'::regclass) THEN
    CREATE TRIGGER set_trip_timeline_updated_at
      BEFORE UPDATE ON trip_timeline
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Booking Document Logs
CREATE TABLE IF NOT EXISTS booking_document_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  doc_type     TEXT NOT NULL,
  doc_label    TEXT,
  file_url     TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_booking_id   ON booking_document_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_customer_id  ON booking_document_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_generated_at ON booking_document_logs(generated_at DESC);

ALTER TABLE booking_document_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_booking_doc_logs" ON booking_document_logs;
DROP POLICY IF EXISTS "customer_read_own_doc_logs"    ON booking_document_logs;

CREATE POLICY "staff_manage_booking_doc_logs" ON booking_document_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance')
    )
  );

CREATE POLICY "customer_read_own_doc_logs" ON booking_document_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  channel        TEXT NOT NULL DEFAULT 'push'
    CHECK (channel IN ('push','whatsapp','email','sms','in_app')),
  title          TEXT,
  body           TEXT NOT NULL,
  variables      TEXT[] DEFAULT '{}',
  trigger_event  TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_templates_code    ON notification_templates(code);
CREATE INDEX IF NOT EXISTS idx_notif_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notif_templates_active  ON notification_templates(is_active);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_notif_templates" ON notification_templates;
DROP POLICY IF EXISTS "staff_read_notif_templates"   ON notification_templates;

CREATE POLICY "admin_manage_notif_templates" ON notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "staff_read_notif_templates" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_notification_templates_updated_at'
    AND tgrelid='notification_templates'::regclass) THEN
    CREATE TRIGGER set_notification_templates_updated_at
      BEFORE UPDATE ON notification_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO notification_templates (code, name, channel, title, body, variables, trigger_event) VALUES
  ('booking_confirmed',   'Booking Dikonfirmasi',    'push',   'Booking Dikonfirmasi ✅', 'Booking {{booking_code}} Anda telah dikonfirmasi.', ARRAY['booking_code'], 'booking.confirmed'),
  ('payment_received',    'Pembayaran Diterima',     'push',   'Pembayaran Diterima 💰',  'Kami telah menerima pembayaran Anda sebesar Rp {{amount}}.', ARRAY['amount'], 'payment.received'),
  ('visa_status_changed', 'Status Visa Berubah',     'push',   'Update Status Visa 🛂',   'Status visa Anda berubah menjadi: {{status}}.', ARRAY['status'], 'visa.status_changed'),
  ('sos_received',        'SOS Diterima',            'in_app', 'SOS ALERT 🆘',            'Alert darurat dari jamaah {{customer_name}}: {{message}}', ARRAY['customer_name','message'], 'sos.received'),
  ('departure_reminder',  'Pengingat Keberangkatan', 'push',   'Pengingat Keberangkatan ✈️', 'Keberangkatan Anda {{days}} hari lagi. Pastikan dokumen sudah lengkap.', ARRAY['days'], 'departure.reminder'),
  ('approval_needed',     'Persetujuan Dibutuhkan',  'in_app', 'Menunggu Persetujuan Anda', 'Ada {{type}} senilai Rp {{amount}} yang membutuhkan persetujuan Anda.', ARRAY['type','amount'], 'approval.created'),
  ('manasik_reminder',    'Pengingat Manasik',       'push',   'Jadwal Manasik Besok 📿', 'Jangan lupa manasik besok: {{title}} pukul {{time}} di {{location}}.', ARRAY['title','time','location'], 'manasik.reminder')
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- BAGIAN 18: FASE 17 — Vendor Contracts, Budgets, Training, Media, dll.
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendor_contracts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  service_type    TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           NUMERIC(15,2),
  currency        TEXT DEFAULT 'IDR',
  payment_terms   TEXT,
  auto_renew      BOOLEAN DEFAULT FALSE,
  document_url    TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','expired','terminated')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id)  ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id  ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end_date   ON vendor_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status     ON vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_branch_id  ON vendor_contracts(branch_id);

ALTER TABLE vendor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_vendor_contracts"        ON vendor_contracts;
DROP POLICY IF EXISTS "branch_manager_read_vendor_contracts" ON vendor_contracts;

CREATE POLICY "admin_manage_vendor_contracts" ON vendor_contracts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','finance','operational')
    )
  );

CREATE POLICY "branch_manager_read_vendor_contracts" ON vendor_contracts
  FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendor_contracts_updated_at'
    AND tgrelid='vendor_contracts'::regclass) THEN
    CREATE TRIGGER set_vendor_contracts_updated_at
      BEFORE UPDATE ON vendor_contracts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS departure_budgets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
    CHECK (category IN ('hotel','tiket','visa','katering','transportasi','handling',
                        'manasik','perlengkapan','lainnya')),
  description     TEXT,
  budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  pax_count       INTEGER,
  per_pax_amount  NUMERIC(15,2),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, category)
);

CREATE INDEX IF NOT EXISTS idx_departure_budgets_departure_id ON departure_budgets(departure_id);

ALTER TABLE departure_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_budgets"  ON departure_budgets;
DROP POLICY IF EXISTS "branch_manager_read_dep_budgets" ON departure_budgets;

CREATE POLICY "staff_manage_departure_budgets" ON departure_budgets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance','operational')
    )
  );

CREATE POLICY "branch_manager_read_dep_budgets" ON departure_budgets
  FOR SELECT USING (
    departure_id IN (
      SELECT d.id FROM departures d
      JOIN packages p ON p.id = d.package_id
      JOIN branches b ON b.id = p.branch_id
      WHERE b.manager_user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_budgets_updated_at'
    AND tgrelid='departure_budgets'::regclass) THEN
    CREATE TRIGGER set_departure_budgets_updated_at
      BEFORE UPDATE ON departure_budgets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS training_modules (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL
    CHECK (category IN ('product_knowledge','script_penjualan','sop','regulasi','lainnya')),
  content_type     TEXT NOT NULL
    CHECK (content_type IN ('text','video','pdf','mixed')),
  content_url      TEXT,
  content_text     TEXT,
  thumbnail_url    TEXT,
  duration_minutes INTEGER,
  is_mandatory     BOOLEAN DEFAULT FALSE,
  order_index      INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_active   ON training_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_training_modules_order    ON training_modules(order_index);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_modules" ON training_modules;
DROP POLICY IF EXISTS "agent_read_training_modules"   ON training_modules;

CREATE POLICY "admin_manage_training_modules" ON training_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager')
    )
  );

CREATE POLICY "agent_read_training_modules" ON training_modules
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_training_modules_updated_at'
    AND tgrelid='training_modules'::regclass) THEN
    CREATE TRIGGER set_training_modules_updated_at
      BEFORE UPDATE ON training_modules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS training_quizzes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_module_id ON training_quizzes(module_id);

ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_quizzes" ON training_quizzes;
DROP POLICY IF EXISTS "agent_read_training_quizzes"   ON training_quizzes;

CREATE POLICY "admin_manage_training_quizzes" ON training_quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager')
    )
  );

CREATE POLICY "agent_read_training_quizzes" ON training_quizzes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS agent_training_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id     UUID NOT NULL REFERENCES agents(id)          ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed','failed')),
  quiz_score   INTEGER,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_training_agent_id  ON agent_training_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_module_id ON agent_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_status    ON agent_training_progress(status);

ALTER TABLE agent_training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_training" ON agent_training_progress;
DROP POLICY IF EXISTS "admin_read_all_training"   ON agent_training_progress;

CREATE POLICY "agent_manage_own_training" ON agent_training_progress
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_read_all_training" ON agent_training_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agent_training_updated_at'
    AND tgrelid='agent_training_progress'::regclass) THEN
    CREATE TRIGGER set_agent_training_updated_at
      BEFORE UPDATE ON agent_training_progress
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS media_gallery (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type             TEXT NOT NULL
    CHECK (type IN ('video_testimonial','virtual_tour','hotel_photo')),
  title            TEXT,
  description      TEXT,
  media_url        TEXT NOT NULL,
  thumbnail_url    TEXT,
  hotel_id         UUID REFERENCES hotels(id)   ON DELETE SET NULL,
  package_id       UUID REFERENCES packages(id) ON DELETE SET NULL,
  jamaah_name      TEXT,
  departure_year   INTEGER,
  duration_seconds INTEGER,
  is_active        BOOLEAN DEFAULT TRUE,
  order_index      INTEGER DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_gallery_type       ON media_gallery(type);
CREATE INDEX IF NOT EXISTS idx_media_gallery_hotel_id   ON media_gallery(hotel_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_package_id ON media_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_active     ON media_gallery(is_active);
CREATE INDEX IF NOT EXISTS idx_media_gallery_order      ON media_gallery(order_index);

ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_media_gallery" ON media_gallery;
DROP POLICY IF EXISTS "public_read_media_gallery"  ON media_gallery;

CREATE POLICY "admin_manage_media_gallery" ON media_gallery
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','marketing')
    )
  );

CREATE POLICY "public_read_media_gallery" ON media_gallery
  FOR SELECT USING (is_active = TRUE);

CREATE TABLE IF NOT EXISTS siskohat_sync_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type     TEXT NOT NULL CHECK (sync_type IN ('export','manual_input','validation')),
  record_count  INTEGER,
  status        TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success','partial','failed')),
  error_message TEXT,
  file_url      TEXT,
  exported_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id     UUID REFERENCES branches(id)   ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_created_at ON siskohat_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_status     ON siskohat_sync_logs(status);

ALTER TABLE siskohat_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_siskohat_logs" ON siskohat_sync_logs;
CREATE POLICY "admin_manage_siskohat_logs" ON siskohat_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','operational')
    )
  );

CREATE TABLE IF NOT EXISTS approval_configs (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type                 TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  level                SMALLINT NOT NULL DEFAULT 1,
  required_role        TEXT NOT NULL,
  amount_threshold     NUMERIC(15,2),
  percentage_threshold NUMERIC(5,2),
  auto_approve_below   NUMERIC(15,2),
  is_active            BOOLEAN DEFAULT TRUE,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, level, required_role)
);

ALTER TABLE approval_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_approval_configs" ON approval_configs;
DROP POLICY IF EXISTS "staff_read_approval_configs"   ON approval_configs;

CREATE POLICY "admin_manage_approval_configs" ON approval_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner')
    )
  );

CREATE POLICY "staff_read_approval_configs" ON approval_configs
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO approval_configs (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',         1,'branch_manager',5000000,  NULL,  500000),
  ('refund',         2,'admin',         50000000, NULL, 5000000),
  ('refund',         3,'owner',         NULL,     NULL,    NULL),
  ('discount',       1,'branch_manager',NULL,     10.0,    NULL),
  ('discount',       2,'admin',         NULL,     30.0,    NULL),
  ('cancellation',   1,'branch_manager',NULL,     NULL,    NULL),
  ('cancellation',   2,'admin',         NULL,     NULL,    NULL),
  ('vendor_invoice', 1,'finance',       10000000, NULL, 1000000),
  ('vendor_invoice', 2,'owner',         NULL,     NULL,10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;

CREATE TABLE IF NOT EXISTS agent_override_commissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  sub_agent_id        UUID NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  override_percentage NUMERIC(5,2) NOT NULL,
  override_amount     NUMERIC(15,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_override_agent_id     ON agent_override_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_sub_agent_id ON agent_override_commissions(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_booking_id   ON agent_override_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_status       ON agent_override_commissions(status);

ALTER TABLE agent_override_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_read_own_override" ON agent_override_commissions;
DROP POLICY IF EXISTS "admin_manage_override"   ON agent_override_commissions;

CREATE POLICY "agent_read_own_override" ON agent_override_commissions
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_manage_override" ON agent_override_commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','finance')
    )
  );

CREATE TABLE IF NOT EXISTS baggage_reference_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  estimated_weight_kg NUMERIC(5,2) NOT NULL,
  is_mandatory        BOOLEAN DEFAULT FALSE,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_baggage_reference_category ON baggage_reference_items(category);

ALTER TABLE baggage_reference_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_baggage_reference"  ON baggage_reference_items;
DROP POLICY IF EXISTS "admin_manage_baggage_reference" ON baggage_reference_items;

CREATE POLICY "public_read_baggage_reference" ON baggage_reference_items
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_manage_baggage_reference" ON baggage_reference_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory) VALUES
  ('Koper besar (kosong)',      'koper',      3.50, TRUE),
  ('Koper kabin (kosong)',      'koper',      2.00, FALSE),
  ('Tas ransel',                'tas',        0.80, FALSE),
  ('Baju ihram pria (2 lembar)','pakaian',    0.80, TRUE),
  ('Mukena',                    'pakaian',    0.40, FALSE),
  ('Baju ganti (per pasang)',   'pakaian',    0.50, FALSE),
  ('Sandal',                    'alas_kaki',  0.40, TRUE),
  ('Sepatu',                    'alas_kaki',  0.70, FALSE),
  ('Al-Quran',                  'ibadah',     0.50, FALSE),
  ('Sajadah travel',            'ibadah',     0.30, FALSE),
  ('Tasbih',                    'ibadah',     0.10, FALSE),
  ('Payung',                    'aksesoris',  0.30, FALSE),
  ('Obat-obatan pribadi',       'kesehatan',  0.50, FALSE),
  ('Masker (kotak)',            'kesehatan',  0.20, TRUE),
  ('Sunscreen & skincare',      'kesehatan',  0.40, FALSE),
  ('Charger & kabel',           'elektronik', 0.30, FALSE),
  ('Power bank',                'elektronik', 0.25, FALSE),
  ('Kamera',                    'elektronik', 0.50, FALSE),
  ('Bantal leher',              'kenyamanan', 0.25, FALSE),
  ('Makanan ringan/bekal',      'makanan',    0.50, FALSE)
ON CONFLICT DO NOTHING;

-- Kolom tambahan fase17
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nomor_porsi_haji TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS embarkasi_kode TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS estimasi_keberangkatan_haji INTEGER;
ALTER TABLE bookings  ADD COLUMN IF NOT EXISTS bagasi_kg_allowed INTEGER DEFAULT 23;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS assigned_muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE agents    ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;


-- =============================================================================
-- BAGIAN 19: FASE 18 — Company Settings, Bank Accounts, Contact Page
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type  TEXT NOT NULL DEFAULT 'string'
    CHECK (setting_type IN ('string','number','boolean','json','color','url')),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_key ON company_settings(setting_key);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_company_settings" ON company_settings;
DROP POLICY IF EXISTS "public_read_company_settings"  ON company_settings;

CREATE POLICY "admin_manage_company_settings" ON company_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "public_read_company_settings" ON company_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_company_settings_updated_at'
    AND tgrelid='company_settings'::regclass) THEN
    CREATE TRIGGER set_company_settings_updated_at
      BEFORE UPDATE ON company_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO company_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name',        '"Vinstour Travel"',    'string', 'Nama resmi perusahaan'),
  ('company_tagline',     '"Perjalanan Suci Anda"','string','Tagline perusahaan'),
  ('company_phone',       '"021-1234567"',         'string', 'Nomor telepon utama'),
  ('company_email',       '"info@vinstour.com"',   'string', 'Email utama perusahaan'),
  ('company_address',     '"Jakarta, Indonesia"',  'string', 'Alamat kantor pusat'),
  ('company_logo_url',    'null',                  'url',    'URL logo perusahaan'),
  ('company_wa_number',   '"628111234567"',         'string', 'Nomor WhatsApp utama (format 62xxx)'),
  ('kpi_targets_monthly', '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}', 'json', 'Target KPI bulanan'),
  ('fonnte_api_key',      'null',                  'string', 'API key Fonnte untuk kirim WhatsApp'),
  ('siskohat_api_key',    'null',                  'string', 'API key SISKOHAT Kemenag'),
  ('max_booking_dp_pct',  '30',                    'number', 'Persentase minimal DP booking (%)'),
  ('booking_expiry_hours','24',                    'number', 'Jam sebelum booking pending kadaluarsa')
ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name   TEXT NOT NULL,
  branch_name    TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active  ON bank_accounts(is_active)  WHERE is_active  = TRUE;

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "public_read_bank_accounts"  ON bank_accounts;

CREATE POLICY "admin_manage_bank_accounts" ON bank_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','finance')
    )
  );

CREATE POLICY "public_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bank_accounts_updated_at'
    AND tgrelid='bank_accounts'::regclass) THEN
    CREATE TRIGGER set_bank_accounts_updated_at
      BEFORE UPDATE ON bank_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO bank_accounts (bank_name, account_number, account_name, branch_name, is_primary, is_active) VALUES
  ('Bank BCA',    '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat',  TRUE,  TRUE),
  ('Bank Mandiri','0987654321', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan', FALSE, TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS contact_page_content (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id     UUID REFERENCES website_settings(id) ON DELETE CASCADE,
  hero_title      TEXT,
  hero_subtitle   TEXT,
  form_title      TEXT,
  map_url         TEXT,
  operating_hours JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_contact_content" ON contact_page_content;
DROP POLICY IF EXISTS "public_read_contact_content"  ON contact_page_content;

CREATE POLICY "admin_manage_contact_content" ON contact_page_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "public_read_contact_content" ON contact_page_content
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_contact_page_updated_at'
    AND tgrelid='contact_page_content'::regclass) THEN
    CREATE TRIGGER set_contact_page_updated_at
      BEFORE UPDATE ON contact_page_content
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO contact_page_content (hero_title, hero_subtitle, form_title, operating_hours)
VALUES (
  'Hubungi Kami',
  'Tim kami siap membantu Anda merencanakan perjalanan ibadah terbaik.',
  'Kirim Pesan',
  '{"senin_jumat":"08.00 - 17.00 WIB","sabtu":"08.00 - 13.00 WIB","minggu":"Tutup"}'::jsonb
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- BAGIAN 20: FASE 19 — Branch Monthly Targets
-- =============================================================================

CREATE TABLE IF NOT EXISTS branch_monthly_targets (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id             UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  month_key             TEXT NOT NULL,
  bookings_target       INTEGER NOT NULL DEFAULT 50,
  revenue_target        NUMERIC(18,2) NOT NULL DEFAULT 500000000,
  new_customers_target  INTEGER NOT NULL DEFAULT 100,
  agents_booking_target INTEGER NOT NULL DEFAULT 30,
  conversion_target     NUMERIC(5,2) NOT NULL DEFAULT 25,
  notes                 TEXT,
  set_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_bmt_branch_id ON branch_monthly_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_bmt_month_key ON branch_monthly_targets(month_key);

ALTER TABLE branch_monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_branch_targets"       ON branch_monthly_targets;
DROP POLICY IF EXISTS "branch_manager_manage_own_targets" ON branch_monthly_targets;

CREATE POLICY "admin_manage_branch_targets" ON branch_monthly_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "branch_manager_manage_own_targets" ON branch_monthly_targets
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bmt_updated_at'
    AND tgrelid='branch_monthly_targets'::regclass) THEN
    CREATE TRIGGER set_bmt_updated_at
      BEFORE UPDATE ON branch_monthly_targets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 21: FASE 20 — Webhook Configs, Logs, Push Subscriptions
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_configs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  url               TEXT NOT NULL,
  secret            TEXT NOT NULL DEFAULT '',
  events            TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  success_count     INTEGER NOT NULL DEFAULT 0,
  fail_count        INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_status       TEXT CHECK (last_status IN ('success','failed','pending')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_is_active ON webhook_configs(is_active);

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_webhook_configs" ON webhook_configs;
CREATE POLICY "admin_manage_webhook_configs" ON webhook_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_webhook_configs_updated_at'
    AND tgrelid='webhook_configs'::regclass) THEN
    CREATE TRIGGER set_webhook_configs_updated_at
      BEFORE UPDATE ON webhook_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id  UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('success','failed')),
  status_code INTEGER,
  duration_ms INTEGER,
  error_msg   TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status     ON webhook_logs(status);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_webhook_logs" ON webhook_logs;
CREATE POLICY "admin_manage_webhook_logs" ON webhook_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

-- Push Subscriptions (versi terbaru — fase20)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_customer_id ON push_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint    ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_manage_own_push_sub"             ON push_subscriptions;
DROP POLICY IF EXISTS "admin_read_push_subs"                     ON push_subscriptions;
DROP POLICY IF EXISTS "Admins can manage push subscriptions"     ON push_subscriptions;
DROP POLICY IF EXISTS "Customers can manage own push subscriptions" ON push_subscriptions;

CREATE POLICY "customer_manage_own_push_sub" ON push_subscriptions
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR customer_id IS NULL
  );

CREATE POLICY "admin_read_push_subs" ON push_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_push_subs_updated_at'
    AND tgrelid='push_subscriptions'::regclass) THEN
    CREATE TRIGGER set_push_subs_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 22: SEED — Menu Items & Role Permissions (konsolidasi semua fase)
-- =============================================================================

INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  -- Fase 13-15
  ('chat-leads',        'Leads Chat Widget',     '/admin/chat-leads',         'MessageCircle',  'Penjualan',   206, 'chat-leads',         true),
  -- Fase 16
  ('sos-alerts',        'SOS Alerts',            '/admin/sos-alerts',         'AlertTriangle',  'Operasional', 310, 'sos-alerts',         true),
  ('approval-requests', 'Approval Workflow',     '/admin/approvals',          'CheckSquare',    'Keuangan',    410, 'approval-requests',  true),
  ('visa-status-logs',  'Log Status Visa',       '/admin/visa-logs',          'FileSearch',     'Operasional', 320, 'visa-status-logs',   true),
  ('expenses',          'Pengeluaran',           '/admin/expenses',           'Receipt',        'Keuangan',    420, 'expenses',           true),
  ('transactions',      'Transaksi',             '/admin/transactions',       'ArrowLeftRight', 'Keuangan',    430, 'transactions',       true),
  ('marketing-campaigns','Kampanye Marketing',   '/admin/marketing/campaigns','Megaphone',      'Marketing',   510, 'marketing-campaigns',true),
  ('equipment',         'Inventaris Alat',       '/admin/equipment',          'Package',        'Operasional', 330, 'equipment',          true),
  ('sales-targets',     'Target Penjualan',      '/admin/sales-targets',      'Target',         'Penjualan',   220, 'sales-targets',      true),
  ('dashboard-config',  'Konfigurasi Dashboard', '/admin/dashboard-config',   'Settings2',      'Sistem',      910, 'dashboard-config',   true),
  -- Fase 17
  ('vendor-contracts',  'Kontrak Vendor',        '/admin/vendor-contracts',   'FilePen',        'Operasional', 340, 'vendor-contracts',   true),
  ('training',          'Pelatihan Agen',        '/admin/training',           'GraduationCap',  'SDM',         610, 'training',           true),
  ('siskohat',          'SISKOHAT Kemenag',      '/admin/siskohat',           'Landmark',       'Operasional', 350, 'siskohat',           true),
  ('media-gallery',     'Galeri Media',          '/admin/media-gallery',      'Film',           'Marketing',   520, 'media-gallery',      true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- Role Permissions
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('super_admin'),('owner'),('admin')) AS r(role)
CROSS JOIN (VALUES
  ('chat-leads'),
  ('sos-alerts'),('approval-requests'),('visa-status-logs'),('expenses'),
  ('transactions'),('marketing-campaigns'),('equipment'),('sales-targets'),
  ('dashboard-config'),
  ('vendor-contracts'),('training'),('siskohat'),('media-gallery')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', p FROM (VALUES
  ('chat-leads'),('sos-alerts'),('approval-requests'),('visa-status-logs'),
  ('expenses'),('equipment'),('sales-targets'),
  ('vendor-contracts'),('training'),('siskohat')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
VALUES
  ('finance',     'approval-requests'),
  ('finance',     'expenses'),
  ('finance',     'transactions'),
  ('operational', 'sos-alerts'),
  ('operational', 'visa-status-logs'),
  ('operational', 'equipment'),
  ('operational', 'siskohat'),
  ('marketing',   'marketing-campaigns'),
  ('marketing',   'media-gallery'),
  ('sales',       'sales-targets'),
  ('sales',       'approval-requests'),
  ('sales',       'chat-leads')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Konsolidasi lengkap semua fase berhasil
-- =============================================================================
SELECT 'Konsolidasi migrasi Vinstour (Fase 1–20) selesai — semua tabel siap.' AS result;


-- =============================================================================
-- BAGIAN 3: FASE 13-15 (Extra konsolidasi: CRM leads, agent tables)
-- =============================================================================

-- =============================================================================
-- MIGRASI KONSOLIDASI — FASE 11, 12, 13, 14, 15
-- Vinstour Travel Portal — Umroh/Haji Management System
-- Jalankan satu kali di Supabase SQL Editor
-- =============================================================================

-- ============================================
-- FASE 12 — CRM Pipeline Agen
-- ============================================

CREATE TABLE IF NOT EXISTS agent_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'baru'
    CHECK (stage IN ('baru', 'dihubungi', 'tertarik', 'negosiasi', 'booking')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_leads_agent_id_idx ON agent_leads(agent_id);
CREATE INDEX IF NOT EXISTS agent_leads_stage_idx ON agent_leads(stage);

ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_manage_own_leads" ON agent_leads;
CREATE POLICY "agents_manage_own_leads" ON agent_leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_all_leads" ON agent_leads;
CREATE POLICY "admin_manage_all_leads" ON agent_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager')
    )
  );

-- ============================================
-- FASE 13 — Panel Cabang Mandiri
-- ============================================

-- Tabel permintaan diskon dari agen ke manajer cabang
CREATE TABLE IF NOT EXISTS discount_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  discount_amount NUMERIC(15, 2),
  discount_pct NUMERIC(5, 2),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discount_requests_branch_id_idx ON discount_requests(branch_id);
CREATE INDEX IF NOT EXISTS discount_requests_agent_id_idx ON discount_requests(agent_id);
CREATE INDEX IF NOT EXISTS discount_requests_status_idx ON discount_requests(status);

ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_create_discount_requests" ON discount_requests;
CREATE POLICY "agents_create_discount_requests" ON discount_requests
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "agents_view_own_requests" ON discount_requests;
CREATE POLICY "agents_view_own_requests" ON discount_requests
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "branch_managers_manage_requests" ON discount_requests;
CREATE POLICY "branch_managers_manage_requests" ON discount_requests
  FOR ALL USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

-- Kolom manager_user_id di branches (jika belum ada)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS branches_manager_user_id_idx ON branches(manager_user_id);

-- ============================================
-- FASE 14 — Live Chat & Konversi Publik
-- ============================================

-- Tabel lead dari chat widget publik
CREATE TABLE IF NOT EXISTS chat_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT DEFAULT 'chat_widget'
    CHECK (source IN ('chat_widget', 'lead_form', 'whatsapp', 'landing_page')),
  message TEXT,
  tenant_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_leads_tenant_id_idx ON chat_leads(tenant_id);
CREATE INDEX IF NOT EXISTS chat_leads_status_idx ON chat_leads(status);
CREATE INDEX IF NOT EXISTS chat_leads_created_at_idx ON chat_leads(created_at DESC);

ALTER TABLE chat_leads ENABLE ROW LEVEL SECURITY;

-- Siapa pun bisa insert (form publik)
DROP POLICY IF EXISTS "anyone_insert_chat_leads" ON chat_leads;
CREATE POLICY "anyone_insert_chat_leads" ON chat_leads
  FOR INSERT WITH CHECK (true);

-- Admin & branch manager bisa lihat & kelola
DROP POLICY IF EXISTS "staff_manage_chat_leads" ON chat_leads;
CREATE POLICY "staff_manage_chat_leads" ON chat_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'sales', 'marketing')
    )
  );

-- ============================================
-- FASE 15 — Manasik Digital & Review Publik
-- ============================================

-- Jadwal sesi manasik
CREATE TABLE IF NOT EXISTS manasik_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'umum'
    CHECK (type IN ('fiqih', 'doa', 'persiapan', 'praktik', 'kesehatan', 'umum')),
  scheduled_date DATE NOT NULL,
  time TEXT,
  location TEXT,
  description TEXT,
  video_url TEXT,
  material_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS manasik_schedules_branch_id_idx ON manasik_schedules(branch_id);
CREATE INDEX IF NOT EXISTS manasik_schedules_date_idx ON manasik_schedules(scheduled_date);

ALTER TABLE manasik_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_manasik_schedules" ON manasik_schedules;
CREATE POLICY "staff_manage_manasik_schedules" ON manasik_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

DROP POLICY IF EXISTS "jamaah_view_manasik_schedules" ON manasik_schedules;
CREATE POLICY "jamaah_view_manasik_schedules" ON manasik_schedules
  FOR SELECT USING (
    is_active = TRUE AND (
      branch_id IN (
        SELECT branch_id FROM customers WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'owner', 'admin')
      )
    )
  );

-- Konfirmasi kehadiran manasik oleh jamaah
CREATE TABLE IF NOT EXISTS manasik_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES manasik_schedules(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN,
  notes TEXT,
  UNIQUE(schedule_id, customer_id)
);

CREATE INDEX IF NOT EXISTS manasik_attendance_schedule_id_idx ON manasik_attendance(schedule_id);
CREATE INDEX IF NOT EXISTS manasik_attendance_customer_id_idx ON manasik_attendance(customer_id);

ALTER TABLE manasik_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah_manage_own_attendance" ON manasik_attendance;
CREATE POLICY "jamaah_manage_own_attendance" ON manasik_attendance
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_view_all_attendance" ON manasik_attendance;
CREATE POLICY "staff_view_all_attendance" ON manasik_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

-- Review publik per paket
CREATE TABLE IF NOT EXISTS package_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  admin_reply TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, customer_id)
);

CREATE INDEX IF NOT EXISTS package_reviews_package_id_idx ON package_reviews(package_id);
CREATE INDEX IF NOT EXISTS package_reviews_is_public_idx ON package_reviews(is_public);
CREATE INDEX IF NOT EXISTS package_reviews_rating_idx ON package_reviews(rating);

ALTER TABLE package_reviews ENABLE ROW LEVEL SECURITY;

-- Siapa pun (termasuk anonymous) bisa baca review publik
DROP POLICY IF EXISTS "anyone_view_public_reviews" ON package_reviews;
CREATE POLICY "anyone_view_public_reviews" ON package_reviews
  FOR SELECT USING (is_public = TRUE);

-- Jamaah bisa tulis & edit review sendiri
DROP POLICY IF EXISTS "jamaah_manage_own_reviews" ON package_reviews;
CREATE POLICY "jamaah_manage_own_reviews" ON package_reviews
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Admin bisa moderasi semua review
DROP POLICY IF EXISTS "admin_moderate_reviews" ON package_reviews;
CREATE POLICY "admin_moderate_reviews" ON package_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

-- =============================================================================
-- TRIGGER: updated_at otomatis
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_leads', 'discount_requests', 'chat_leads',
    'manasik_schedules', 'manasik_attendance', 'package_reviews'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_' || t || '_updated_at'
        AND tgrelid = t::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_%s_updated_at
         BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- SEED: Menu Item "Leads Chat Widget" (Fase 14)
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES (
  'chat-leads',
  'Leads Chat Widget',
  '/admin/chat-leads',
  'MessageCircle',
  'Penjualan',
  206,
  'chat-leads',
  true
)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- Seed role_permissions agar 'chat-leads' langsung terlihat di sidebar
INSERT INTO role_permissions (role, permission_key)
SELECT unnest(ARRAY['super_admin','owner','branch_manager','sales','marketing']),
       'chat-leads'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Pre-Departure Checklist (K2 Sprint 1)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_checklists (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id uuid REFERENCES departures(id) ON DELETE CASCADE,
  items       jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(departure_id)
);

ALTER TABLE departure_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_checklists" ON departure_checklists;
CREATE POLICY "staff_manage_departure_checklists"
  ON departure_checklists FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_departure_checklists_updated_at'
      AND tgrelid = 'departure_checklists'::regclass
  ) THEN
    CREATE TRIGGER set_departure_checklists_updated_at
      BEFORE UPDATE ON departure_checklists
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- =============================================================================
-- SELESAI — Jalankan di Supabase Dashboard → SQL Editor
-- =============================================================================


-- =============================================================================
-- BAGIAN 4: FASE 16 — New Tables (muthawifs, manasik, room assignments, etc.)
-- =============================================================================

-- =============================================================================
-- MIGRASI FASE 16 — Tabel-Tabel Baru Lengkap
-- Vinstour Travel Portal — Umroh/Haji Management System
-- Meliputi: sos_alerts, visa_status_logs, approval_requests, approval_actions,
--           dashboard_access_config, dashboard_stats, financial tables,
--           marketing tables, equipment tables, sales_targets, dan lainnya.
-- Jalankan satu kali di Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- HELPER: fungsi updated_at otomatis (idempotent)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper macro untuk membuat trigger updated_at hanya bila belum ada
CREATE OR REPLACE FUNCTION _create_updated_at_trigger(p_table TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_' || p_table || '_updated_at'
      AND tgrelid = p_table::regclass
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER set_%1$s_updated_at
       BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      p_table
    );
  END IF;
END;
$$;


-- =============================================================================
-- 1. SOS ALERTS — Darurat jamaah di lapangan (idempotent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sos_alerts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_code   TEXT,
  emergency_type TEXT NOT NULL
    CHECK (emergency_type IN ('medical', 'lost', 'security', 'other')),
  message        TEXT,
  latitude       FLOAT8,
  longitude      FLOAT8,
  accuracy       FLOAT8,
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'responding', 'resolved')),
  response_notes TEXT,
  resolved_at    TIMESTAMPTZ,
  resolved_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status      ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_customer_id ON sos_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_branch_id   ON sos_alerts(branch_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at  ON sos_alerts(created_at DESC);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_sos"    ON sos_alerts;
DROP POLICY IF EXISTS "customer_read_own_sos"  ON sos_alerts;
DROP POLICY IF EXISTS "staff_manage_sos"       ON sos_alerts;

-- Jamaah bisa kirim SOS
CREATE POLICY "customer_insert_sos" ON sos_alerts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Jamaah bisa lihat SOS milik sendiri
CREATE POLICY "customer_read_own_sos" ON sos_alerts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Staff operasional & admin kelola semua SOS
CREATE POLICY "staff_manage_sos" ON sos_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

SELECT _create_updated_at_trigger('sos_alerts');


-- =============================================================================
-- 2. VISA STATUS LOGS — Riwayat perubahan status visa
-- =============================================================================
CREATE TABLE IF NOT EXISTS visa_status_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_id       UUID REFERENCES visa_applications(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  old_status    TEXT,
  new_status    TEXT NOT NULL,
  notes         TEXT,
  changed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_role TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_status_logs_visa_id     ON visa_status_logs(visa_id);
CREATE INDEX IF NOT EXISTS idx_visa_status_logs_customer_id ON visa_status_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_status_logs_created_at  ON visa_status_logs(created_at DESC);

ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_visa_log"      ON visa_status_logs;
DROP POLICY IF EXISTS "staff_read_visa_logs"        ON visa_status_logs;
DROP POLICY IF EXISTS "customer_read_own_visa_logs" ON visa_status_logs;

-- Staff bisa insert log
CREATE POLICY "staff_insert_visa_log" ON visa_status_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational', 'visa_officer')
    )
  );

-- Staff bisa baca semua log
CREATE POLICY "staff_read_visa_logs" ON visa_status_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational', 'visa_officer')
    )
  );

-- Jamaah bisa baca log visa milik sendiri
CREATE POLICY "customer_read_own_visa_logs" ON visa_status_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 3. APPROVAL REQUESTS — Multi-level approval untuk refund, diskon, batal, dll.
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type            TEXT NOT NULL
    CHECK (type IN ('refund', 'discount', 'cancellation', 'vendor_invoice')),
  reference_id    UUID,
  reference_code  TEXT,
  requester_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_role  TEXT NOT NULL,
  amount          NUMERIC(15, 2),
  percentage      NUMERIC(5, 2),
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'cancelled')),
  current_level   SMALLINT NOT NULL DEFAULT 1,
  max_level       SMALLINT NOT NULL DEFAULT 2,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status    ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type      ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_branch_id ON approval_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created   ON approval_requests(created_at DESC);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_approval_request"  ON approval_requests;
DROP POLICY IF EXISTS "requester_read_own_requests"    ON approval_requests;
DROP POLICY IF EXISTS "branch_manager_manage_requests" ON approval_requests;
DROP POLICY IF EXISTS "admin_manage_all_requests"      ON approval_requests;

-- Staff & agen bisa buat request
CREATE POLICY "staff_insert_approval_request" ON approval_requests
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND requester_id = auth.uid()
  );

-- Pemohon bisa lihat request milik sendiri
CREATE POLICY "requester_read_own_requests" ON approval_requests
  FOR SELECT USING (requester_id = auth.uid());

-- Branch manager kelola request di cabang sendiri
CREATE POLICY "branch_manager_manage_requests" ON approval_requests
  FOR ALL USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

-- Admin & owner bisa kelola semua
CREATE POLICY "admin_manage_all_requests" ON approval_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

SELECT _create_updated_at_trigger('approval_requests');


-- =============================================================================
-- 4. APPROVAL ACTIONS — Log setiap aksi terhadap approval request
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_actions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role  TEXT NOT NULL,
  action      TEXT NOT NULL
    CHECK (action IN ('approved', 'rejected', 'escalated', 'noted')),
  level       SMALLINT NOT NULL DEFAULT 1,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_actor_id   ON approval_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_created_at ON approval_actions(created_at DESC);

ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_approval_action" ON approval_actions;
DROP POLICY IF EXISTS "staff_read_approval_actions"  ON approval_actions;
DROP POLICY IF EXISTS "requester_read_own_actions"   ON approval_actions;

-- Approver (branch_manager ke atas) bisa insert aksi
CREATE POLICY "staff_insert_approval_action" ON approval_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'finance')
    )
    AND actor_id = auth.uid()
  );

-- Staff bisa baca semua aksi
CREATE POLICY "staff_read_approval_actions" ON approval_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'finance', 'operational')
    )
  );

-- Pemohon bisa lihat aksi atas request miliknya
CREATE POLICY "requester_read_own_actions" ON approval_actions
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM approval_requests WHERE requester_id = auth.uid()
    )
  );


-- =============================================================================
-- 5. DASHBOARD ACCESS CONFIG — Konfigurasi modul per role
-- =============================================================================
CREATE TABLE IF NOT EXISTS dashboard_access_config (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role              TEXT NOT NULL UNIQUE,
  enabled_modules   TEXT[] DEFAULT '{}',
  disabled_modules  TEXT[] DEFAULT '{}',
  default_dashboard TEXT NOT NULL DEFAULT 'overview',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dac_role      ON dashboard_access_config(role);
CREATE INDEX IF NOT EXISTS idx_dac_is_active ON dashboard_access_config(is_active);

ALTER TABLE dashboard_access_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_dashboard_config" ON dashboard_access_config;
DROP POLICY IF EXISTS "staff_read_dashboard_config"   ON dashboard_access_config;

-- Hanya super_admin & owner yang bisa ubah konfigurasi dashboard
CREATE POLICY "admin_manage_dashboard_config" ON dashboard_access_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner')
    )
  );

-- Semua authenticated staff bisa baca config
CREATE POLICY "staff_read_dashboard_config" ON dashboard_access_config
  FOR SELECT USING (auth.role() = 'authenticated');

SELECT _create_updated_at_trigger('dashboard_access_config');

-- Seed konfigurasi default per role
INSERT INTO dashboard_access_config (role, enabled_modules, disabled_modules, default_dashboard)
VALUES
  ('super_admin',    ARRAY['all'],                       ARRAY[]::TEXT[], 'overview'),
  ('owner',          ARRAY['all'],                       ARRAY[]::TEXT[], 'overview'),
  ('admin',          ARRAY['all'],                       ARRAY['hr_payroll'], 'overview'),
  ('branch_manager', ARRAY['branch','sales','ops','crm'], ARRAY['hr_payroll','finance_full'], 'branch_overview'),
  ('finance',        ARRAY['finance','payments','reports'], ARRAY[]::TEXT[], 'finance'),
  ('operational',    ARRAY['operations','manifest','sos'],  ARRAY['finance_full'], 'operations'),
  ('marketing',      ARRAY['marketing','leads','website'],  ARRAY['finance_full'], 'marketing'),
  ('sales',          ARRAY['sales','crm','leads'],          ARRAY['finance_full'], 'sales'),
  ('hr',             ARRAY['hr','employees','payroll'],      ARRAY['finance_full'], 'hr'),
  ('agent',          ARRAY['agent_portal'],                 ARRAY[]::TEXT[], 'agent'),
  ('customer',       ARRAY['customer_portal'],              ARRAY[]::TEXT[], 'customer')
ON CONFLICT (role) DO NOTHING;


-- =============================================================================
-- 6. DASHBOARD ACCESS AUDIT LOG — Riwayat perubahan konfigurasi dashboard
-- =============================================================================
CREATE TABLE IF NOT EXISTS dashboard_access_audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role        TEXT NOT NULL,
  action      TEXT NOT NULL,
  module_key  TEXT,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at  TIMESTAMPTZ DEFAULT NOW(),
  metadata    JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_daal_role       ON dashboard_access_audit_log(role);
CREATE INDEX IF NOT EXISTS idx_daal_changed_by ON dashboard_access_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_daal_changed_at ON dashboard_access_audit_log(changed_at DESC);

ALTER TABLE dashboard_access_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_dashboard_audit" ON dashboard_access_audit_log;

CREATE POLICY "admin_manage_dashboard_audit" ON dashboard_access_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner')
    )
  );


-- =============================================================================
-- 7. DASHBOARD STATS — Snapshot statistik per cabang (cache harian)
-- =============================================================================
CREATE TABLE IF NOT EXISTS dashboard_stats (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE,
  stat_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  total_revenue      NUMERIC(20, 2) DEFAULT 0,
  total_bookings     INTEGER DEFAULT 0,
  total_pax          INTEGER DEFAULT 0,
  total_outstanding  NUMERIC(20, 2) DEFAULT 0,
  new_leads          INTEGER DEFAULT 0,
  new_customers      INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_stats_branch_id  ON dashboard_stats(branch_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_stat_date  ON dashboard_stats(stat_date DESC);

ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_dashboard_stats"      ON dashboard_stats;
DROP POLICY IF EXISTS "branch_manager_read_branch_stats"  ON dashboard_stats;

CREATE POLICY "admin_manage_dashboard_stats" ON dashboard_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

CREATE POLICY "branch_manager_read_branch_stats" ON dashboard_stats
  FOR SELECT USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'finance')
    )
  );

SELECT _create_updated_at_trigger('dashboard_stats');


-- =============================================================================
-- 8. FINANCIAL SUMMARY — Ringkasan keuangan per periode (materialized view-like)
-- =============================================================================
CREATE TABLE IF NOT EXISTS financial_summary (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_type        TEXT NOT NULL DEFAULT 'monthly'
    CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE,
  total_revenue      NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_expenses     NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_outstanding  NUMERIC(20, 2) NOT NULL DEFAULT 0,
  net_profit         NUMERIC(20, 2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_fin_summary_branch_id    ON financial_summary(branch_id);
CREATE INDEX IF NOT EXISTS idx_fin_summary_period_start ON financial_summary(period_start DESC);

ALTER TABLE financial_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_summary"         ON financial_summary;
DROP POLICY IF EXISTS "branch_manager_read_fin_summary" ON financial_summary;

CREATE POLICY "finance_manage_summary" ON financial_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'finance')
    )
  );

CREATE POLICY "branch_manager_read_fin_summary" ON financial_summary
  FOR SELECT USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
  );


-- =============================================================================
-- 9. TRANSACTIONS — Transaksi keuangan operasional
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  description      TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category         TEXT,
  amount           NUMERIC(20, 2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_no     TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_branch_id        ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type             ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status           ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_transactions"    ON transactions;
DROP POLICY IF EXISTS "branch_manager_read_own_trans"  ON transactions;

CREATE POLICY "finance_manage_transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'finance')
    )
  );

CREATE POLICY "branch_manager_read_own_trans" ON transactions
  FOR SELECT USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
  );

SELECT _create_updated_at_trigger('transactions');


-- =============================================================================
-- 10. EXPENSES — Pengeluaran operasional per departure/branch
-- =============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  departure_id UUID REFERENCES departures(id) ON DELETE SET NULL,
  category     TEXT NOT NULL,
  description  TEXT,
  amount       NUMERIC(20, 2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id    ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_departure_id ON expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status       ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date         ON expenses(expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_expenses"         ON expenses;
DROP POLICY IF EXISTS "finance_manage_expenses"       ON expenses;
DROP POLICY IF EXISTS "branch_manager_read_expenses"  ON expenses;

CREATE POLICY "staff_insert_expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational', 'finance')
    )
  );

CREATE POLICY "finance_manage_expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'finance')
    )
  );

CREATE POLICY "branch_manager_read_expenses" ON expenses
  FOR SELECT USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
  );

SELECT _create_updated_at_trigger('expenses');


-- =============================================================================
-- 11. MARKETING CAMPAIGNS — Kampanye marketing
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  channel     TEXT DEFAULT 'social_media'
    CHECK (channel IN ('social_media', 'whatsapp', 'email', 'sms', 'offline', 'referral', 'other')),
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  budget      NUMERIC(20, 2) DEFAULT 0,
  spent       NUMERIC(20, 2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks      BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_branch_id ON marketing_campaigns(branch_id);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_status    ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_created   ON marketing_campaigns(created_at DESC);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_campaigns"   ON marketing_campaigns;
DROP POLICY IF EXISTS "staff_read_campaigns"         ON marketing_campaigns;

CREATE POLICY "marketing_manage_campaigns" ON marketing_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'marketing')
    )
  );

CREATE POLICY "staff_read_campaigns" ON marketing_campaigns
  FOR SELECT USING (auth.role() = 'authenticated');

SELECT _create_updated_at_trigger('marketing_campaigns');


-- =============================================================================
-- 12. MARKETING METRICS — Metrik harian per kampanye
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketing_metrics (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions BIGINT DEFAULT 0,
  clicks      BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue     NUMERIC(20, 2) DEFAULT 0,
  cost        NUMERIC(20, 2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_mkt_metrics_campaign_id ON marketing_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mkt_metrics_date        ON marketing_metrics(metric_date DESC);

ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_metrics" ON marketing_metrics;

CREATE POLICY "marketing_manage_metrics" ON marketing_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'marketing')
    )
  );


-- =============================================================================
-- 13. MARKETING CONVERSIONS — View konversi per kampanye (denormalized)
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketing_conversions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  campaign_name TEXT,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  conversions   INTEGER DEFAULT 1,
  revenue       NUMERIC(20, 2) DEFAULT 0,
  converted_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_conv_campaign_id ON marketing_conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mkt_conv_converted_at ON marketing_conversions(converted_at DESC);

ALTER TABLE marketing_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_conversions" ON marketing_conversions;

CREATE POLICY "marketing_manage_conversions" ON marketing_conversions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'marketing', 'sales')
    )
  );


-- =============================================================================
-- 14. EQUIPMENT — Inventaris perlengkapan (tabel baru, terpisah dari equipment_items)
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'in_use', 'maintenance', 'damaged', 'retired')),
  condition   TEXT NOT NULL DEFAULT 'good'
    CHECK (condition IN ('new', 'good', 'fair', 'damaged')),
  quantity    INTEGER NOT NULL DEFAULT 1,
  serial_no   TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(15, 2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_branch_id ON equipment(branch_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status    ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category  ON equipment(category);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment" ON equipment;
DROP POLICY IF EXISTS "staff_read_equipment"   ON equipment;

CREATE POLICY "staff_manage_equipment" ON equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

CREATE POLICY "staff_read_equipment" ON equipment
  FOR SELECT USING (auth.role() = 'authenticated');

SELECT _create_updated_at_trigger('equipment');


-- =============================================================================
-- 15. EQUIPMENT MAINTENANCE — Jadwal & riwayat pemeliharaan alat
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id     UUID REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name   TEXT,
  maintenance_type TEXT NOT NULL
    CHECK (maintenance_type IN ('preventive', 'corrective', 'calibration', 'inspection', 'other')),
  maintenance_date DATE NOT NULL,
  performed_by     TEXT,
  cost             NUMERIC(15, 2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes            TEXT,
  next_maintenance_date DATE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_maint_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_maint_status       ON equipment_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_equip_maint_date         ON equipment_maintenance(maintenance_date DESC);

ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment_maintenance" ON equipment_maintenance;

CREATE POLICY "staff_manage_equipment_maintenance" ON equipment_maintenance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

SELECT _create_updated_at_trigger('equipment_maintenance');


-- =============================================================================
-- 16. EQUIPMENT DAMAGE — Laporan kerusakan alat
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment_damage (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id    UUID REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name  TEXT,
  reported_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  damage_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status          TEXT NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported', 'in_progress', 'repaired', 'written_off')),
  repair_cost     NUMERIC(15, 2),
  repaired_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_damage_equipment_id ON equipment_damage(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_damage_status       ON equipment_damage(status);
CREATE INDEX IF NOT EXISTS idx_equip_damage_severity     ON equipment_damage(severity);

ALTER TABLE equipment_damage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment_damage" ON equipment_damage;

CREATE POLICY "staff_manage_equipment_damage" ON equipment_damage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

SELECT _create_updated_at_trigger('equipment_damage');


-- =============================================================================
-- 17. SALES TARGETS — Target penjualan per user per periode
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales_targets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  role            TEXT,
  period_type     TEXT NOT NULL DEFAULT 'monthly'
    CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  target_amount   NUMERIC(20, 2) NOT NULL DEFAULT 0,
  target_bookings INTEGER DEFAULT 0,
  target_leads    INTEGER DEFAULT 0,
  achieved_amount NUMERIC(20, 2) DEFAULT 0,
  achieved_bookings INTEGER DEFAULT 0,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id     ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_branch_id   ON sales_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period      ON sales_targets(period_start DESC);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_sales_targets"       ON sales_targets;
DROP POLICY IF EXISTS "staff_read_own_sales_targets"     ON sales_targets;
DROP POLICY IF EXISTS "branch_manager_read_branch_targets" ON sales_targets;

-- Admin & owner bisa kelola semua target
CREATE POLICY "admin_manage_sales_targets" ON sales_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

-- Staff bisa lihat target milik sendiri
CREATE POLICY "staff_read_own_sales_targets" ON sales_targets
  FOR SELECT USING (user_id = auth.uid());

-- Branch manager bisa lihat target cabang sendiri
CREATE POLICY "branch_manager_read_branch_targets" ON sales_targets
  FOR ALL USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
  );

SELECT _create_updated_at_trigger('sales_targets');


-- =============================================================================
-- 18. TRIP TIMELINE — Timeline perjalanan per departure
-- =============================================================================
CREATE TABLE IF NOT EXISTS trip_timeline (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_date   DATE,
  event_time   TEXT,
  location     TEXT,
  type         TEXT DEFAULT 'info'
    CHECK (type IN ('info', 'flight', 'hotel', 'activity', 'ceremony', 'warning', 'milestone')),
  sort_order   INTEGER DEFAULT 0,
  is_public    BOOLEAN DEFAULT TRUE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_timeline_departure_id ON trip_timeline(departure_id);
CREATE INDEX IF NOT EXISTS idx_trip_timeline_event_date   ON trip_timeline(event_date);
CREATE INDEX IF NOT EXISTS idx_trip_timeline_sort_order   ON trip_timeline(departure_id, sort_order);

ALTER TABLE trip_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_trip_timeline"    ON trip_timeline;
DROP POLICY IF EXISTS "customer_read_trip_timeline"   ON trip_timeline;

CREATE POLICY "staff_manage_trip_timeline" ON trip_timeline
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

-- Jamaah bisa lihat timeline departure yang mereka ikuti
CREATE POLICY "customer_read_trip_timeline" ON trip_timeline
  FOR SELECT USING (
    is_public = TRUE
    AND departure_id IN (
      SELECT DISTINCT b.departure_id
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

SELECT _create_updated_at_trigger('trip_timeline');


-- =============================================================================
-- 19. BOOKING DOCUMENT LOGS — Log dokumen yang di-generate per booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_document_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  doc_type     TEXT NOT NULL,
  doc_label    TEXT,
  file_url     TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_booking_id   ON booking_document_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_customer_id  ON booking_document_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_generated_at ON booking_document_logs(generated_at DESC);

ALTER TABLE booking_document_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_booking_doc_logs"    ON booking_document_logs;
DROP POLICY IF EXISTS "customer_read_own_doc_logs"       ON booking_document_logs;

CREATE POLICY "staff_manage_booking_doc_logs" ON booking_document_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational', 'finance')
    )
  );

CREATE POLICY "customer_read_own_doc_logs" ON booking_document_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 20. NOTIFICATION TEMPLATES — Template notifikasi sistem
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'push'
    CHECK (channel IN ('push', 'whatsapp', 'email', 'sms', 'in_app')),
  title       TEXT,
  body        TEXT NOT NULL,
  variables   TEXT[] DEFAULT '{}',
  trigger_event TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_templates_code    ON notification_templates(code);
CREATE INDEX IF NOT EXISTS idx_notif_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notif_templates_active  ON notification_templates(is_active);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_notif_templates" ON notification_templates;
DROP POLICY IF EXISTS "staff_read_notif_templates"   ON notification_templates;

CREATE POLICY "admin_manage_notif_templates" ON notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

CREATE POLICY "staff_read_notif_templates" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

SELECT _create_updated_at_trigger('notification_templates');

-- Seed template notifikasi dasar
INSERT INTO notification_templates (code, name, channel, title, body, variables, trigger_event) VALUES
  ('booking_confirmed',    'Booking Dikonfirmasi',    'push',      'Booking Dikonfirmasi ✅', 'Booking {{booking_code}} Anda telah dikonfirmasi. Selamat bergabung!', ARRAY['booking_code'], 'booking.confirmed'),
  ('payment_received',     'Pembayaran Diterima',     'push',      'Pembayaran Diterima 💰',  'Kami telah menerima pembayaran Anda sebesar Rp {{amount}}.', ARRAY['amount'], 'payment.received'),
  ('visa_status_changed',  'Status Visa Berubah',     'push',      'Update Status Visa 🛂',   'Status visa Anda berubah menjadi: {{status}}.', ARRAY['status'], 'visa.status_changed'),
  ('sos_received',         'SOS Diterima',            'in_app',    'SOS ALERT 🆘',            'Alert darurat dari jamaah {{customer_name}}: {{message}}', ARRAY['customer_name','message'], 'sos.received'),
  ('departure_reminder',   'Pengingat Keberangkatan', 'push',      'Pengingat Keberangkatan ✈️', 'Keberangkatan Anda {{days}} hari lagi. Pastikan dokumen sudah lengkap.', ARRAY['days'], 'departure.reminder'),
  ('approval_needed',      'Persetujuan Dibutuhkan',  'in_app',    'Menunggu Persetujuan Anda', 'Ada {{type}} senilai Rp {{amount}} yang membutuhkan persetujuan Anda.', ARRAY['type','amount'], 'approval.created'),
  ('manasik_reminder',     'Pengingat Manasik',       'push',      'Jadwal Manasik Besok 📿', 'Jangan lupa manasik besok: {{title}} pukul {{time}} di {{location}}.', ARRAY['title','time','location'], 'manasik.reminder')
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- SEED: Menu Items untuk modul baru
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('sos-alerts',         'SOS Alerts',           '/admin/sos-alerts',         'AlertTriangle',  'Operasional', 310, 'sos-alerts',         true),
  ('approval-requests',  'Approval Workflow',    '/admin/approvals',          'CheckSquare',    'Keuangan',    410, 'approval-requests',  true),
  ('visa-status-logs',   'Log Status Visa',      '/admin/visa-logs',          'FileSearch',     'Operasional', 320, 'visa-status-logs',   true),
  ('expenses',           'Pengeluaran',          '/admin/expenses',           'Receipt',        'Keuangan',    420, 'expenses',           true),
  ('transactions',       'Transaksi',            '/admin/transactions',       'ArrowLeftRight', 'Keuangan',    430, 'transactions',       true),
  ('marketing-campaigns','Kampanye Marketing',   '/admin/marketing/campaigns','Megaphone',      'Marketing',   510, 'marketing-campaigns',true),
  ('equipment',          'Inventaris Alat',      '/admin/equipment',          'Package',        'Operasional', 330, 'equipment',          true),
  ('sales-targets',      'Target Penjualan',     '/admin/sales-targets',      'Target',         'Penjualan',   220, 'sales-targets',      true),
  ('dashboard-config',   'Konfigurasi Dashboard','/admin/dashboard-config',   'Settings2',      'Sistem',      910, 'dashboard-config',   true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;


-- =============================================================================
-- SEED: Role permissions untuk menu baru
-- =============================================================================
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES
  ('super_admin'),('owner'),('admin')
) AS r(role)
CROSS JOIN (VALUES
  ('sos-alerts'),('approval-requests'),('visa-status-logs'),('expenses'),
  ('transactions'),('marketing-campaigns'),('equipment'),('sales-targets'),
  ('dashboard-config')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('branch_manager')) AS r(role)
CROSS JOIN (VALUES
  ('sos-alerts'),('approval-requests'),('visa-status-logs'),('expenses'),
  ('equipment'),('sales-targets')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('finance')) AS r(role)
CROSS JOIN (VALUES
  ('approval-requests'),('expenses'),('transactions')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('operational')) AS r(role)
CROSS JOIN (VALUES
  ('sos-alerts'),('visa-status-logs'),('equipment')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('marketing')) AS r(role)
CROSS JOIN (VALUES
  ('marketing-campaigns')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('sales')) AS r(role)
CROSS JOIN (VALUES
  ('sales-targets'),('approval-requests')
) AS p(perm)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- CLEANUP helper function (tidak perlu di-expose ke public)
-- =============================================================================
DROP FUNCTION IF EXISTS _create_updated_at_trigger(TEXT);

-- =============================================================================
-- SELESAI — Fase 16 migration completed
-- =============================================================================
SELECT 'Fase 16 migration completed — all new tables created with RLS policies' AS result;


-- =============================================================================
-- BAGIAN 5: FASE 17 — Remaining Tables (documents, testimonials, etc.)
-- =============================================================================

-- =============================================================================
-- MIGRASI FASE 17 — Tabel Pendukung Fitur Lanjutan
-- Vinstour Travel Portal
-- Meliputi: vendor_contracts, departure_budgets, training_modules/quizzes/progress,
--           media_gallery, siskohat_sync_logs, approval_configs,
--           agent_override_commissions, baggage_reference_items
-- Jalankan setelah fase16_new_tables.sql
-- =============================================================================

-- Helper updated_at (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. VENDOR CONTRACTS — Kontrak per vendor + reminder expired
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  service_type    TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           NUMERIC(15, 2),
  currency        TEXT DEFAULT 'IDR',
  payment_terms   TEXT,
  auto_renew      BOOLEAN DEFAULT FALSE,
  document_url    TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id  ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end_date   ON vendor_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status     ON vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_branch_id  ON vendor_contracts(branch_id);

ALTER TABLE vendor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_vendor_contracts"        ON vendor_contracts;
DROP POLICY IF EXISTS "branch_manager_read_vendor_contracts" ON vendor_contracts;

CREATE POLICY "admin_manage_vendor_contracts" ON vendor_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','operational'))
  );

CREATE POLICY "branch_manager_read_vendor_contracts" ON vendor_contracts
  FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendor_contracts_updated_at'
    AND tgrelid='vendor_contracts'::regclass) THEN
    CREATE TRIGGER set_vendor_contracts_updated_at BEFORE UPDATE ON vendor_contracts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. DEPARTURE BUDGETS — Perencanaan anggaran per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_budgets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id     UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category         TEXT NOT NULL
    CHECK (category IN ('hotel','tiket','visa','katering','transportasi','handling',
                        'manasik','perlengkapan','lainnya')),
  description      TEXT,
  budgeted_amount  NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pax_count        INTEGER,
  per_pax_amount   NUMERIC(15, 2),
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, category)
);

CREATE INDEX IF NOT EXISTS idx_departure_budgets_departure_id ON departure_budgets(departure_id);

ALTER TABLE departure_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_budgets"       ON departure_budgets;
DROP POLICY IF EXISTS "branch_manager_read_dep_budgets"      ON departure_budgets;

CREATE POLICY "staff_manage_departure_budgets" ON departure_budgets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance','operational'))
  );

CREATE POLICY "branch_manager_read_dep_budgets" ON departure_budgets
  FOR SELECT USING (
    departure_id IN (
      SELECT d.id FROM departures d
      JOIN packages p ON p.id = d.package_id
      JOIN branches b ON b.id = p.branch_id
      WHERE b.manager_user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_budgets_updated_at'
    AND tgrelid='departure_budgets'::regclass) THEN
    CREATE TRIGGER set_departure_budgets_updated_at BEFORE UPDATE ON departure_budgets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 3. TRAINING MODULES — Modul pelatihan produk untuk agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_modules (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL
    CHECK (category IN ('product_knowledge','script_penjualan','sop','regulasi','lainnya')),
  content_type     TEXT NOT NULL
    CHECK (content_type IN ('text','video','pdf','mixed')),
  content_url      TEXT,
  content_text     TEXT,
  thumbnail_url    TEXT,
  duration_minutes INTEGER,
  is_mandatory     BOOLEAN DEFAULT FALSE,
  order_index      INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_category   ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_active     ON training_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_training_modules_order      ON training_modules(order_index);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_modules" ON training_modules;
DROP POLICY IF EXISTS "agent_read_training_modules"   ON training_modules;

CREATE POLICY "admin_manage_training_modules" ON training_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_modules" ON training_modules
  FOR SELECT USING (
    is_active = TRUE AND auth.role() = 'authenticated'
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_training_modules_updated_at'
    AND tgrelid='training_modules'::regclass) THEN
    CREATE TRIGGER set_training_modules_updated_at BEFORE UPDATE ON training_modules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. TRAINING QUIZZES — Soal kuis per modul
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_quizzes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_module_id ON training_quizzes(module_id);

ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_quizzes" ON training_quizzes;
DROP POLICY IF EXISTS "agent_read_training_quizzes"   ON training_quizzes;

CREATE POLICY "admin_manage_training_quizzes" ON training_quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_quizzes" ON training_quizzes
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 5. AGENT TRAINING PROGRESS — Progress belajar per agen per modul
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_training_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id     UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed','failed')),
  quiz_score   INTEGER,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_training_agent_id   ON agent_training_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_module_id  ON agent_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_status     ON agent_training_progress(status);

ALTER TABLE agent_training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_training"     ON agent_training_progress;
DROP POLICY IF EXISTS "admin_read_all_training"       ON agent_training_progress;

CREATE POLICY "agent_manage_own_training" ON agent_training_progress
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_read_all_training" ON agent_training_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agent_training_updated_at'
    AND tgrelid='agent_training_progress'::regclass) THEN
    CREATE TRIGGER set_agent_training_updated_at BEFORE UPDATE ON agent_training_progress
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 6. MEDIA GALLERY — Video testimoni, virtual tour 360°, foto hotel
-- =============================================================================
CREATE TABLE IF NOT EXISTS media_gallery (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type             TEXT NOT NULL
    CHECK (type IN ('video_testimonial','virtual_tour','hotel_photo')),
  title            TEXT,
  description      TEXT,
  media_url        TEXT NOT NULL,
  thumbnail_url    TEXT,
  hotel_id         UUID REFERENCES hotels(id) ON DELETE SET NULL,
  package_id       UUID REFERENCES packages(id) ON DELETE SET NULL,
  jamaah_name      TEXT,
  departure_year   INTEGER,
  duration_seconds INTEGER,
  is_active        BOOLEAN DEFAULT TRUE,
  order_index      INTEGER DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_gallery_type       ON media_gallery(type);
CREATE INDEX IF NOT EXISTS idx_media_gallery_hotel_id   ON media_gallery(hotel_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_package_id ON media_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_active     ON media_gallery(is_active);
CREATE INDEX IF NOT EXISTS idx_media_gallery_order      ON media_gallery(order_index);

ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_media_gallery" ON media_gallery;
DROP POLICY IF EXISTS "public_read_media_gallery"  ON media_gallery;

CREATE POLICY "admin_manage_media_gallery" ON media_gallery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing'))
  );

CREATE POLICY "public_read_media_gallery" ON media_gallery
  FOR SELECT USING (is_active = TRUE);


-- =============================================================================
-- 7. SISKOHAT SYNC LOGS — Riwayat ekspor data jamaah haji ke format Kemenag
-- =============================================================================
CREATE TABLE IF NOT EXISTS siskohat_sync_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type      TEXT NOT NULL CHECK (sync_type IN ('export','manual_input','validation')),
  record_count   INTEGER,
  status         TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success','partial','failed')),
  error_message  TEXT,
  file_url       TEXT,
  exported_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_created_at ON siskohat_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_status     ON siskohat_sync_logs(status);

ALTER TABLE siskohat_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_siskohat_logs" ON siskohat_sync_logs;

CREATE POLICY "admin_manage_siskohat_logs" ON siskohat_sync_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );


-- =============================================================================
-- 8. APPROVAL CONFIGS — Aturan level approval per tipe & threshold
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_configs (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type                 TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  level                SMALLINT NOT NULL DEFAULT 1,
  required_role        TEXT NOT NULL,
  amount_threshold     NUMERIC(15, 2),
  percentage_threshold NUMERIC(5, 2),
  auto_approve_below   NUMERIC(15, 2),
  is_active            BOOLEAN DEFAULT TRUE,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, level, required_role)
);

ALTER TABLE approval_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_approval_configs" ON approval_configs;
DROP POLICY IF EXISTS "staff_read_approval_configs"   ON approval_configs;

CREATE POLICY "admin_manage_approval_configs" ON approval_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner'))
  );

CREATE POLICY "staff_read_approval_configs" ON approval_configs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seed konfigurasi default
INSERT INTO approval_configs (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',          1, 'branch_manager', 5000000,  NULL, 500000),
  ('refund',          2, 'admin',          50000000, NULL, 5000000),
  ('refund',          3, 'owner',          NULL,     NULL, NULL),
  ('discount',        1, 'branch_manager', NULL,     10.0, NULL),
  ('discount',        2, 'admin',          NULL,     30.0, NULL),
  ('cancellation',    1, 'branch_manager', NULL,     NULL, NULL),
  ('cancellation',    2, 'admin',          NULL,     NULL, NULL),
  ('vendor_invoice',  1, 'finance',        10000000, NULL, 1000000),
  ('vendor_invoice',  2, 'owner',          NULL,     NULL, 10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;


-- =============================================================================
-- 9. AGENT OVERRIDE COMMISSIONS — Komisi bertingkat dari booking sub-agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_override_commissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sub_agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  override_percentage NUMERIC(5, 2) NOT NULL,
  override_amount     NUMERIC(15, 2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_override_agent_id     ON agent_override_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_sub_agent_id ON agent_override_commissions(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_booking_id   ON agent_override_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_status       ON agent_override_commissions(status);

ALTER TABLE agent_override_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_read_own_override"   ON agent_override_commissions;
DROP POLICY IF EXISTS "admin_manage_override"      ON agent_override_commissions;

CREATE POLICY "agent_read_own_override" ON agent_override_commissions
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_manage_override" ON agent_override_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );


-- =============================================================================
-- 10. BAGGAGE REFERENCE ITEMS — Referensi berat barang bawaan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS baggage_reference_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  estimated_weight_kg NUMERIC(5, 2) NOT NULL,
  is_mandatory        BOOLEAN DEFAULT FALSE,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_baggage_reference_category ON baggage_reference_items(category);

ALTER TABLE baggage_reference_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_baggage_reference"  ON baggage_reference_items;
DROP POLICY IF EXISTS "admin_manage_baggage_reference" ON baggage_reference_items;

CREATE POLICY "public_read_baggage_reference" ON baggage_reference_items
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_manage_baggage_reference" ON baggage_reference_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

-- Seed referensi berat barang umum
INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory)
VALUES
  ('Koper besar (kosong)',     'koper',     3.50, TRUE),
  ('Koper kabin (kosong)',     'koper',     2.00, FALSE),
  ('Tas ransel',               'tas',       0.80, FALSE),
  ('Baju ihram pria (2 lembar)','pakaian',  0.80, TRUE),
  ('Mukena',                   'pakaian',   0.40, FALSE),
  ('Baju ganti (per pasang)',  'pakaian',   0.50, FALSE),
  ('Sandal',                   'alas_kaki', 0.40, TRUE),
  ('Sepatu',                   'alas_kaki', 0.70, FALSE),
  ('Al-Quran',                 'ibadah',    0.50, FALSE),
  ('Sajadah travel',           'ibadah',    0.30, FALSE),
  ('Tasbih',                   'ibadah',    0.10, FALSE),
  ('Payung',                   'aksesoris', 0.30, FALSE),
  ('Obat-obatan pribadi',      'kesehatan', 0.50, FALSE),
  ('Masker (kotak)',           'kesehatan', 0.20, TRUE),
  ('Sunscreen & skincare',     'kesehatan', 0.40, FALSE),
  ('Charger & kabel',          'elektronik',0.30, FALSE),
  ('Power bank',               'elektronik',0.25, FALSE),
  ('Kamera',                   'elektronik',0.50, FALSE),
  ('Bantal leher',             'kenyamanan',0.25, FALSE),
  ('Makanan ringan/bekal',     'makanan',   0.50, FALSE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 11. KOLOM TAMBAHAN — di tabel yang sudah ada
-- =============================================================================

-- Kolom SISKOHAT di customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nomor_porsi_haji     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS embarkasi_kode        TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS estimasi_keberangkatan_haji INTEGER;

-- Kuota bagasi per booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bagasi_kg_allowed INTEGER DEFAULT 23;

-- Kolom SOS tambahan
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS assigned_muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Sub-agen / jaringan multi-level
ALTER TABLE agents ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- =============================================================================
-- 12. MENU ITEMS untuk fitur baru
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('vendor-contracts',  'Kontrak Vendor',      '/admin/vendor-contracts',  'FilePen',      'Operasional',  340, 'vendor-contracts',  true),
  ('training',          'Pelatihan Agen',       '/admin/training',          'GraduationCap','SDM',          610, 'training',          true),
  ('siskohat',          'SISKOHAT Kemenag',     '/admin/siskohat',          'Landmark',     'Operasional',  350, 'siskohat',          true),
  ('media-gallery',     'Galeri Media',         '/admin/media-gallery',     'Film',         'Marketing',    520, 'media-gallery',     true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- Role permissions
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('super_admin'),('owner'),('admin')) AS r(role)
CROSS JOIN (VALUES
  ('vendor-contracts'),('training'),('siskohat'),('media-gallery')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', p FROM (VALUES ('vendor-contracts'),('training'),('siskohat')) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
VALUES ('marketing', 'media-gallery'), ('operational', 'siskohat')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Fase 17 migration completed
-- =============================================================================
SELECT 'Fase 17 migration completed — all remaining tables created' AS result;


-- =============================================================================
-- BAGIAN 6: FASE 18 — Core Settings (company_settings, bank_accounts, website_settings)
-- =============================================================================

-- =============================================================================
-- MIGRASI FASE 18 — Tabel Inti: company_settings, bank_accounts,
--                               website_settings, contact_page_content
-- Vinstour Travel Portal
-- Tabel-tabel ini digunakan di seluruh app tapi belum ada di migration manapun.
-- Jalankan setelah fase17_remaining_tables.sql
-- =============================================================================

-- Helper trigger (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. COMPANY SETTINGS — key-value store konfigurasi perusahaan
--    Digunakan oleh: AdminSettings, AdminKPIDashboard (KPI targets),
--                    useCompanySettings, useCompanyInfo
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type  TEXT NOT NULL DEFAULT 'string'
    CHECK (setting_type IN ('string','number','boolean','json','color','url')),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_key ON company_settings(setting_key);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_company_settings" ON company_settings;
DROP POLICY IF EXISTS "public_read_company_settings"  ON company_settings;

CREATE POLICY "admin_manage_company_settings" ON company_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "public_read_company_settings" ON company_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_company_settings_updated_at'
    AND tgrelid = 'company_settings'::regclass) THEN
    CREATE TRIGGER set_company_settings_updated_at
      BEFORE UPDATE ON company_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed: nilai default konfigurasi perusahaan
INSERT INTO company_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('company_name',         '"Vinstour Travel"',            'string',  'Nama resmi perusahaan'),
  ('company_tagline',      '"Perjalanan Suci Anda"',       'string',  'Tagline perusahaan'),
  ('company_phone',        '"021-1234567"',                'string',  'Nomor telepon utama'),
  ('company_email',        '"info@vinstour.com"',          'string',  'Email utama perusahaan'),
  ('company_address',      '"Jakarta, Indonesia"',         'string',  'Alamat kantor pusat'),
  ('company_logo_url',     'null',                         'url',     'URL logo perusahaan'),
  ('company_wa_number',    '"628111234567"',               'string',  'Nomor WhatsApp utama (format 62xxx)'),
  ('kpi_targets_monthly',  '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}',
                                                           'json',    'Target KPI bulanan — bookings, revenue, leads, conversion'),
  ('fonnte_api_key',       'null',                         'string',  'API key Fonnte untuk kirim WhatsApp'),
  ('siskohat_api_key',     'null',                         'string',  'API key SISKOHAT Kemenag'),
  ('max_booking_dp_pct',   '30',                           'number',  'Persentase minimal DP booking (%)'),
  ('booking_expiry_hours', '24',                           'number',  'Jam sebelum booking pending kadaluarsa')
ON CONFLICT (setting_key) DO NOTHING;


-- =============================================================================
-- 2. BANK ACCOUNTS — rekening bank untuk pembayaran jamaah
--    Digunakan oleh: AdminSettings, useCompanySettings, useCompanyInfo,
--                    invoice, payment upload
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name   TEXT NOT NULL,
  branch_name    TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active  ON bank_accounts(is_active)  WHERE is_active  = TRUE;

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_bank_accounts"  ON bank_accounts;
DROP POLICY IF EXISTS "public_read_bank_accounts"   ON bank_accounts;

CREATE POLICY "admin_manage_bank_accounts" ON bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "public_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_bank_accounts_updated_at'
    AND tgrelid = 'bank_accounts'::regclass) THEN
    CREATE TRIGGER set_bank_accounts_updated_at
      BEFORE UPDATE ON bank_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed: contoh rekening (ganti sesuai rekening nyata)
INSERT INTO bank_accounts (bank_name, account_number, account_name, branch_name, is_primary, is_active)
VALUES
  ('Bank BCA',  '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat', TRUE,  TRUE),
  ('Bank Mandiri','0987654321','PT Vinstour Wisata Utama', 'KC Jakarta Selatan', FALSE, TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 3. WEBSITE SETTINGS — tema & konfigurasi tampilan per agent/cabang/pusat
--    Digunakan oleh: AdminAppearance, useWebsiteSettings, AgentWebsite, BranchWebsite
-- =============================================================================
CREATE TABLE IF NOT EXISTS website_settings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id         UUID REFERENCES agents(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name     TEXT,
  logo_url         TEXT,
  favicon_url      TEXT,
  active_theme     TEXT NOT NULL DEFAULT 'default',
  primary_color    TEXT,
  accent_color     TEXT,
  foreground_color TEXT,
  background_color TEXT,
  body_font        TEXT,
  heading_font     TEXT,
  footer_description TEXT,
  footer_address   TEXT,
  footer_phone     TEXT,
  footer_email     TEXT,
  footer_whatsapp  TEXT,
  footer_bottom_text TEXT,
  footer_links     JSONB,
  custom_sections  JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_agent   ON website_settings(agent_id)  WHERE agent_id  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_branch  ON website_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_global  ON website_settings((1)) WHERE agent_id IS NULL AND branch_id IS NULL;

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_website_settings"         ON website_settings;
DROP POLICY IF EXISTS "agent_manage_own_website_settings"     ON website_settings;
DROP POLICY IF EXISTS "branch_manage_own_website_settings"    ON website_settings;
DROP POLICY IF EXISTS "public_read_website_settings"          ON website_settings;

CREATE POLICY "admin_manage_website_settings" ON website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "agent_manage_own_website_settings" ON website_settings
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "branch_manage_own_website_settings" ON website_settings
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );

CREATE POLICY "public_read_website_settings" ON website_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_website_settings_updated_at'
    AND tgrelid = 'website_settings'::regclass) THEN
    CREATE TRIGGER set_website_settings_updated_at
      BEFORE UPDATE ON website_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed: setting global default
INSERT INTO website_settings (company_name, active_theme, primary_color, accent_color,
  footer_description, footer_bottom_text)
VALUES (
  'Vinstour Travel',
  'default',
  '#16a34a',
  '#0d9488',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.'
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 4. CONTACT PAGE CONTENT — konten halaman kontak di website publik
--    Digunakan oleh: useContactPageContent, halaman /contact
-- =============================================================================
CREATE TABLE IF NOT EXISTS contact_page_content (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id     UUID REFERENCES website_settings(id) ON DELETE CASCADE,
  hero_title      TEXT,
  hero_subtitle   TEXT,
  form_title      TEXT,
  map_url         TEXT,
  operating_hours JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_contact_content"  ON contact_page_content;
DROP POLICY IF EXISTS "public_read_contact_content"   ON contact_page_content;

CREATE POLICY "admin_manage_contact_content" ON contact_page_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "public_read_contact_content" ON contact_page_content
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_contact_page_updated_at'
    AND tgrelid = 'contact_page_content'::regclass) THEN
    CREATE TRIGGER set_contact_page_updated_at
      BEFORE UPDATE ON contact_page_content
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed: konten default halaman kontak
INSERT INTO contact_page_content (hero_title, hero_subtitle, form_title, operating_hours)
VALUES (
  'Hubungi Kami',
  'Tim kami siap membantu Anda merencanakan perjalanan ibadah terbaik.',
  'Kirim Pesan',
  '{"senin_jumat":"08.00 - 17.00 WIB","sabtu":"08.00 - 13.00 WIB","minggu":"Tutup"}'::jsonb
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- SELESAI
-- =============================================================================
SELECT 'Fase 18 migration completed — company_settings, bank_accounts, website_settings, contact_page_content created' AS result;


-- =============================================================================
-- BAGIAN 7: FASE 19 — Branch KPI Targets
-- =============================================================================

-- =============================================================================
-- MIGRASI FASE 19 — branch_monthly_targets
-- Target KPI bulanan per cabang, bisa diatur mandiri oleh branch_manager
-- Jalankan setelah fase18_core_settings.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS branch_monthly_targets (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id            UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  month_key            TEXT NOT NULL,                  -- format: "yyyy-MM"
  bookings_target      INTEGER NOT NULL DEFAULT 50,    -- booking terkonfirmasi
  revenue_target       NUMERIC(18, 2) NOT NULL DEFAULT 500000000, -- Rp
  new_customers_target INTEGER NOT NULL DEFAULT 100,   -- customer baru
  agents_booking_target INTEGER NOT NULL DEFAULT 30,   -- agen aktif booking
  conversion_target    NUMERIC(5, 2) NOT NULL DEFAULT 25, -- % lead → booking
  notes                TEXT,
  set_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_bmt_branch_id  ON branch_monthly_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_bmt_month_key  ON branch_monthly_targets(month_key);

ALTER TABLE branch_monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_branch_targets"        ON branch_monthly_targets;
DROP POLICY IF EXISTS "branch_manager_manage_own_targets"  ON branch_monthly_targets;
DROP POLICY IF EXISTS "branch_manager_read_own_targets"    ON branch_monthly_targets;

CREATE POLICY "admin_manage_branch_targets" ON branch_monthly_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "branch_manager_manage_own_targets" ON branch_monthly_targets
  FOR ALL USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_bmt_updated_at'
    AND tgrelid = 'branch_monthly_targets'::regclass) THEN
    CREATE TRIGGER set_bmt_updated_at
      BEFORE UPDATE ON branch_monthly_targets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'Fase 19 migration completed — branch_monthly_targets created' AS result;


-- =============================================================================
-- BAGIAN 8: FASE 20a — Chat Bubble Color (website_settings column)
-- =============================================================================

-- =============================================================================
-- MIGRASI FASE 20 — Tambah kolom chat_bubble_color di website_settings
-- Kolom ini menyimpan key preset warna bubble chat per agen/cabang
-- Jalankan setelah fase19_branch_kpi_targets.sql
-- =============================================================================

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS chat_bubble_color TEXT NOT NULL DEFAULT 'violet';

COMMENT ON COLUMN website_settings.chat_bubble_color IS
  'Preset warna chat bubble: violet | emerald | blue | rose | amber | cyan | fuchsia | slate';

SELECT 'Fase 20 migration completed — chat_bubble_color column added to website_settings' AS result;


-- =============================================================================
-- BAGIAN 9: FASE 20b — Webhooks & Push Subscriptions
-- =============================================================================

-- =============================================================================
-- MIGRASI FASE 20 — Webhook Configs, Webhook Logs, Push Subscriptions
-- Vinstour Travel Portal
-- Jalankan setelah fase19_branch_kpi_targets.sql
-- =============================================================================

-- Helper trigger (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. WEBHOOK CONFIGS — Konfigurasi webhook outgoing
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhook_configs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  secret        TEXT NOT NULL DEFAULT '',
  events        TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  success_count INTEGER NOT NULL DEFAULT 0,
  fail_count    INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_status   TEXT CHECK (last_status IN ('success', 'failed', 'pending')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_is_active ON webhook_configs(is_active);

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_webhook_configs" ON webhook_configs;

CREATE POLICY "admin_manage_webhook_configs" ON webhook_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_webhook_configs_updated_at'
    AND tgrelid = 'webhook_configs'::regclass) THEN
    CREATE TRIGGER set_webhook_configs_updated_at
      BEFORE UPDATE ON webhook_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. WEBHOOK LOGS — Riwayat pengiriman per webhook
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id  UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  status_code INTEGER,
  duration_ms INTEGER,
  error_msg   TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id  ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at  ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status      ON webhook_logs(status);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_webhook_logs" ON webhook_logs;

CREATE POLICY "admin_manage_webhook_logs" ON webhook_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );


-- =============================================================================
-- 3. PUSH SUBSCRIPTIONS — Subscription browser push per customer
-- =============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth_key     TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_customer_id ON push_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint    ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_manage_own_push_sub" ON push_subscriptions;
DROP POLICY IF EXISTS "admin_read_push_subs"          ON push_subscriptions;

-- Jamaah bisa daftar/hapus subscription sendiri
CREATE POLICY "customer_manage_own_push_sub" ON push_subscriptions
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR customer_id IS NULL
  );

-- Admin bisa baca semua (untuk kirim broadcast)
CREATE POLICY "admin_read_push_subs" ON push_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_push_subs_updated_at'
    AND tgrelid = 'push_subscriptions'::regclass) THEN
    CREATE TRIGGER set_push_subs_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- SELESAI — Fase 20 migration completed
-- =============================================================================
SELECT 'Fase 20 migration completed — webhook_configs, webhook_logs, push_subscriptions created' AS result;


-- =============================================================================
-- BAGIAN 10: FASE 21 — Integration Fixes
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 21 — Integration Fixes
-- Gap integrasi yang ditemukan dari analisis menyeluruh Mei 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabel customer_notifications ─────────────────────────────────────────
-- Digunakan oleh useNotifications.ts dan useVisaStatusUpdate.ts
CREATE TABLE IF NOT EXISTS customer_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_unread   ON customer_notifications(customer_id, is_read) WHERE is_read = FALSE;

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah baca notif sendiri" ON customer_notifications;
CREATE POLICY "jamaah baca notif sendiri" ON customer_notifications
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "jamaah update notif sendiri" ON customer_notifications;
CREATE POLICY "jamaah update notif sendiri" ON customer_notifications
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin insert notif" ON customer_notifications;
CREATE POLICY "admin insert notif" ON customer_notifications
  FOR INSERT WITH CHECK (TRUE);

-- ─── 2. Tabel jamaah_checklist ────────────────────────────────────────────────
-- Checklist persiapan jamaah — persistent ke DB, sinkron antar perangkat
CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  is_checked  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_jamaah_checklist_customer ON jamaah_checklist(customer_id);

ALTER TABLE jamaah_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah baca checklist sendiri" ON jamaah_checklist;
CREATE POLICY "jamaah baca checklist sendiri" ON jamaah_checklist
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "jamaah upsert checklist sendiri" ON jamaah_checklist;
CREATE POLICY "jamaah upsert checklist sendiri" ON jamaah_checklist
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin baca semua checklist" ON jamaah_checklist;
CREATE POLICY "admin baca semua checklist" ON jamaah_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

-- ─── 3. Tabel attendance (Muthawif) ──────────────────────────────────────────
-- Digunakan oleh MuthawifDashboard untuk pencatatan kehadiran jamaah per sesi
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID REFERENCES departures(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
  session_type    TEXT NOT NULL DEFAULT 'lainnya',
  session_label   TEXT,
  status          TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir','absen','terlambat','izin')),
  notes           TEXT,
  recorded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_departure  ON attendance(departure_id);
CREATE INDEX IF NOT EXISTS idx_attendance_customer   ON attendance(customer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session    ON attendance(departure_id, session_type, recorded_at);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawif bisa insert attendance" ON attendance;
CREATE POLICY "muthawif bisa insert attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "muthawif bisa baca attendance" ON attendance;
CREATE POLICY "muthawif bisa baca attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "muthawif bisa update attendance" ON attendance;
CREATE POLICY "muthawif bisa update attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

-- ─── 4. Tabel visa_status_logs ────────────────────────────────────────────────
-- Log perubahan status visa (digunakan oleh useVisaStatusUpdate.ts)
CREATE TABLE IF NOT EXISTS visa_status_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT NOT NULL,
  notes        TEXT,
  changed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visa_logs_customer ON visa_status_logs(customer_id);

ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin kelola visa logs" ON visa_status_logs;
CREATE POLICY "admin kelola visa logs" ON visa_status_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "jamaah baca visa log sendiri" ON visa_status_logs;
CREATE POLICY "jamaah baca visa log sendiri" ON visa_status_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ─── 5. Tabel room_occupants ──────────────────────────────────────────────────
-- Digunakan oleh RoomingListPageImproved untuk data penghuni kamar
CREATE TABLE IF NOT EXISTS room_occupants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_assignment_id  UUID NOT NULL REFERENCES room_assignments(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bed_number          INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_assignment_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_room_occupants_room     ON room_occupants(room_assignment_id);
CREATE INDEX IF NOT EXISTS idx_room_occupants_customer ON room_occupants(customer_id);

ALTER TABLE room_occupants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin kelola room_occupants" ON room_occupants;
CREATE POLICY "admin kelola room_occupants" ON room_occupants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "jamaah baca kamar sendiri" ON room_occupants;
CREATE POLICY "jamaah baca kamar sendiri" ON room_occupants
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ─── 6. Kolom room_number di bookings ────────────────────────────────────────
-- Simpan nomor kamar langsung di booking untuk lookup cepat dari portal jamaah
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'room_number'
  ) THEN
    ALTER TABLE bookings ADD COLUMN room_number TEXT;
  END IF;
END $$;

-- ─── 7. Tabel feedback ────────────────────────────────────────────────────────
-- View alias dari testimonials agar AdminSentimenFeedback bisa pakai kedua nama
-- (sudah difix di kode untuk baca dari testimonials langsung)
-- Tabel feedback ini untuk catatan pengembang jika ada kebutuhan terpisah masa depan
CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  aspects      JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_customer  ON feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_booking   ON feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created   ON feedback(created_at);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah insert feedback sendiri" ON feedback;
CREATE POLICY "jamaah insert feedback sendiri" ON feedback
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "semua baca feedback" ON feedback;
CREATE POLICY "semua baca feedback" ON feedback
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "admin kelola feedback" ON feedback;
CREATE POLICY "admin kelola feedback" ON feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager')
    )
  );

-- ─── 8. Kolom di testimonials ─────────────────────────────────────────────────
-- Tambah kolom booking_id agar testimonials bisa di-join ke bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'testimonials' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE testimonials ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 9. Tabel notifications (untuk admin channel) ────────────────────────────
-- Digunakan oleh useAdminNotifications.ts via realtime channel
-- Jika sudah ada dari fase0, hanya tambahkan kolom yang kurang
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATATAN: Jalankan file ini setelah fase0_foundation.sql
-- Urutan: fase0 → fase16 → fase17 → fase18 → fase19 → fase20 → fase21
-- ═══════════════════════════════════════════════════════════════════════════


-- =============================================================================
-- BAGIAN 11: FASE 22 — Muthawif Jamaah Evaluations
-- =============================================================================

-- Fase 22: Tabel penilaian jamaah oleh muthawif
-- Muthawif dapat memberi rating & catatan per jamaah selama keberangkatan

CREATE TABLE IF NOT EXISTS muthawif_jamaah_evaluations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  muthawif_id   uuid        NOT NULL REFERENCES muthawifs(id) ON DELETE CASCADE,
  departure_id  uuid        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  customer_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id    uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  rating        smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  kategori      text        NOT NULL DEFAULT 'umum'
                            CHECK (kategori IN ('umum','ibadah','kesehatan','disiplin','sosial')),
  catatan       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (muthawif_id, departure_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mje_departure  ON muthawif_jamaah_evaluations (departure_id);
CREATE INDEX IF NOT EXISTS idx_mje_muthawif   ON muthawif_jamaah_evaluations (muthawif_id);
CREATE INDEX IF NOT EXISTS idx_mje_customer   ON muthawif_jamaah_evaluations (customer_id);

-- RLS
ALTER TABLE muthawif_jamaah_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "muthawif_eval_select" ON muthawif_jamaah_evaluations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "muthawif_eval_insert" ON muthawif_jamaah_evaluations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "muthawif_eval_update" ON muthawif_jamaah_evaluations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "muthawif_eval_delete" ON muthawif_jamaah_evaluations
  FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_mje_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mje_updated_at
  BEFORE UPDATE ON muthawif_jamaah_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_mje_updated_at();

COMMENT ON TABLE muthawif_jamaah_evaluations IS
  'Penilaian muthawif per jamaah per keberangkatan — rating 1-5 + catatan per kategori';


-- =============================================================================
-- BAGIAN 12: FASE 23 — Payments transaction_id & payment_type
-- =============================================================================

-- Fase 23: Tambah kolom transaction_id dan payment_type di tabel payments
-- Digunakan untuk menyimpan Midtrans transaction_id pada pembayaran QRIS/online
-- dan jenis pembayaran (dp, cicilan, pelunasan)

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_type   TEXT;

-- Index untuk pencarian cepat berdasarkan transaction_id
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);

COMMENT ON COLUMN payments.transaction_id IS 'Midtrans transaction_id untuk pembayaran online (QRIS, VA, GoPay)';
COMMENT ON COLUMN payments.payment_type   IS 'Jenis pembayaran: dp | cicilan | pelunasan';


-- =============================================================================
-- BAGIAN 13: STORE E-COMMERCE (categories, products, orders, shipments)
-- =============================================================================

-- =============================================================================
-- MIGRASI STORE / TOKO E-COMMERCE — Vinstour Travel Portal
-- Meliputi: store_categories, store_products, store_orders, store_order_items, store_shipments
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. KATEGORI PRODUK TOKO
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_active ON store_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_store_categories_slug   ON store_categories(slug);

ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_store_categories" ON store_categories;
DROP POLICY IF EXISTS "public_read_store_categories"  ON store_categories;
CREATE POLICY "admin_manage_store_categories" ON store_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','marketing')));
CREATE POLICY "public_read_store_categories" ON store_categories
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_categories_updated_at' AND tgrelid='store_categories'::regclass) THEN
  CREATE TRIGGER set_store_categories_updated_at BEFORE UPDATE ON store_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

INSERT INTO store_categories (name, slug, description, sort_order) VALUES
  ('Perlengkapan Ibadah', 'perlengkapan-ibadah', 'Peralatan sholat, Al-Quran, tasbih dan lainnya', 1),
  ('Pakaian Ihram',       'pakaian-ihram',       'Kain ihram pria dan mukena wanita berkualitas', 2),
  ('Koper & Tas',         'koper-tas',            'Koper, tas kabin, dan tas ransel untuk perjalanan', 3),
  ('Kesehatan & Vitamin', 'kesehatan-vitamin',    'Suplemen, obat-obatan, dan kebutuhan kesehatan jamaah', 4),
  ('Buku & Panduan',      'buku-panduan',         'Buku doa, panduan manasik, dan literatur islami', 5),
  ('Souvenir',            'souvenir',             'Oleh-oleh dan souvenir dari Tanah Suci', 6)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 2. PRODUK TOKO
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_products (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id    UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  price          NUMERIC(15,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(15,2),
  stock          INTEGER NOT NULL DEFAULT 0,
  weight_gram    INTEGER DEFAULT 0,
  images         JSONB DEFAULT '[]',
  is_active      BOOLEAN DEFAULT TRUE,
  is_featured    BOOLEAN DEFAULT FALSE,
  sold_count     INTEGER DEFAULT 0,
  sku            TEXT,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_category  ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_active    ON store_products(is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_featured  ON store_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_store_products_slug      ON store_products(slug);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_store_products" ON store_products;
DROP POLICY IF EXISTS "public_read_store_products"  ON store_products;
CREATE POLICY "admin_manage_store_products" ON store_products
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','marketing','operational')));
CREATE POLICY "public_read_store_products" ON store_products
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_products_updated_at' AND tgrelid='store_products'::regclass) THEN
  CREATE TRIGGER set_store_products_updated_at BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

-- =============================================================================
-- 3. PESANAN TOKO
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_orders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number     TEXT NOT NULL UNIQUE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded')),
  subtotal         NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_cost    NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_name    TEXT,
  shipping_phone   TEXT,
  shipping_address TEXT,
  shipping_city    TEXT,
  shipping_province TEXT,
  shipping_postal  TEXT,
  notes            TEXT,
  payment_proof_url TEXT,
  paid_at          TIMESTAMPTZ,
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_customer_id    ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status         ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_status ON store_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_order_number   ON store_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at     ON store_orders(created_at DESC);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_store_orders"   ON store_orders;
DROP POLICY IF EXISTS "customer_insert_store_orders"     ON store_orders;
DROP POLICY IF EXISTS "customer_update_own_store_orders" ON store_orders;
DROP POLICY IF EXISTS "admin_manage_store_orders"        ON store_orders;

CREATE POLICY "customer_read_own_store_orders" ON store_orders
  FOR SELECT USING (user_id = auth.uid() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "customer_insert_store_orders" ON store_orders
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "customer_update_own_store_orders" ON store_orders
  FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "admin_manage_store_orders" ON store_orders
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational','finance')));

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_orders_updated_at' AND tgrelid='store_orders'::regclass) THEN
  CREATE TRIGGER set_store_orders_updated_at BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

-- Function generate order number
CREATE OR REPLACE FUNCTION generate_store_order_number()
RETURNS TEXT AS $$
DECLARE v_number TEXT;
BEGIN
  v_number := 'TK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
  WHILE EXISTS (SELECT 1 FROM store_orders WHERE order_number = v_number) LOOP
    v_number := 'TK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. ITEM PESANAN
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_order_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(15,2) NOT NULL,
  subtotal    NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id   ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product_id ON store_order_items(product_id);

ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_order_items" ON store_order_items;
DROP POLICY IF EXISTS "customer_insert_order_items"   ON store_order_items;
DROP POLICY IF EXISTS "admin_manage_order_items"      ON store_order_items;

CREATE POLICY "customer_read_own_order_items" ON store_order_items
  FOR SELECT USING (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())));
CREATE POLICY "customer_insert_order_items" ON store_order_items
  FOR INSERT WITH CHECK (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_order_items" ON store_order_items
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational','finance')));

-- =============================================================================
-- 5. PENGIRIMAN / TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_shipments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE UNIQUE,
  courier_name    TEXT NOT NULL,
  courier_service TEXT,
  tracking_number TEXT,
  shipped_at      TIMESTAMPTZ,
  estimated_arrival DATE,
  delivered_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing','picked_up','in_transit','out_for_delivery','delivered','failed','returned')),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_shipments_order_id        ON store_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_store_shipments_tracking_number ON store_shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_store_shipments_status          ON store_shipments(status);

ALTER TABLE store_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_shipment" ON store_shipments;
DROP POLICY IF EXISTS "admin_manage_shipments"     ON store_shipments;

CREATE POLICY "customer_read_own_shipment" ON store_shipments
  FOR SELECT USING (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())));
CREATE POLICY "admin_manage_shipments" ON store_shipments
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational')));

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_shipments_updated_at' AND tgrelid='store_shipments'::regclass) THEN
  CREATE TRIGGER set_store_shipments_updated_at BEFORE UPDATE ON store_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

-- =============================================================================
-- 6. MENU ITEMS untuk Toko
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible) VALUES
  ('store',            'Toko Online',      '/admin/store',            'ShoppingBag',  'Penjualan', 210, 'store',            true),
  ('store-products',   'Produk Toko',      '/admin/store/products',   'Package',      'Penjualan', 211, 'store-products',   true),
  ('store-orders',     'Pesanan Toko',     '/admin/store/orders',     'ShoppingCart', 'Penjualan', 212, 'store-orders',     true),
  ('store-categories', 'Kategori Produk',  '/admin/store/categories', 'Tag',          'Penjualan', 213, 'store-categories', true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, path = EXCLUDED.path, icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission, is_visible = EXCLUDED.is_visible;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('super_admin'),('owner'),('admin'),('marketing'),('operational')) AS r(role)
CROSS JOIN (VALUES ('store'),('store-products'),('store-orders'),('store-categories')) AS p(perm)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Store E-Commerce migration completed
-- =============================================================================
SELECT 'Store E-Commerce migration completed' AS result;


-- =============================================================================
-- BAGIAN 14: STORE PRODUCT REVIEWS
-- =============================================================================

-- =============================================================================
-- MIGRASI: store_product_reviews — Ulasan & Rating Produk Toko
-- Jamaah dapat memberikan ulasan per produk setelah pesanan berstatus 'delivered'
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS store_product_reviews (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  admin_reply  TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id, product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spr_product_id  ON store_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_spr_order_id    ON store_product_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_spr_user_id     ON store_product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_spr_is_published ON store_product_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_spr_rating      ON store_product_reviews(rating);

ALTER TABLE store_product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_update_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_read_own_review" ON store_product_reviews;
DROP POLICY IF EXISTS "public_read_reviews"      ON store_product_reviews;
DROP POLICY IF EXISTS "admin_manage_reviews"     ON store_product_reviews;

-- Jamaah bisa submit ulasan untuk pesanan miliknya
CREATE POLICY "customer_insert_review" ON store_product_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Jamaah bisa edit ulasan miliknya sendiri
CREATE POLICY "customer_update_review" ON store_product_reviews
  FOR UPDATE USING (user_id = auth.uid());

-- Jamaah bisa baca ulasan miliknya
CREATE POLICY "customer_read_own_review" ON store_product_reviews
  FOR SELECT USING (user_id = auth.uid());

-- Publik bisa baca ulasan yang dipublish
CREATE POLICY "public_read_reviews" ON store_product_reviews
  FOR SELECT USING (is_published = TRUE);

-- Admin bisa kelola semua ulasan (moderasi, balas, sembunyikan)
CREATE POLICY "admin_manage_reviews" ON store_product_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'marketing')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_spr_updated_at'
      AND tgrelid = 'store_product_reviews'::regclass
  ) THEN
    CREATE TRIGGER set_spr_updated_at
      BEFORE UPDATE ON store_product_reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'store_product_reviews migration completed' AS result;


-- =============================================================================
-- BAGIAN 15: TIMESTAMP MIGRATIONS (Sprint fixes, security patches, new features)
-- =============================================================================

-- --- 20260511000842_e411d2d6-c513-4f52-a215-d253fa3ae010.sql ---
-- C2: Auto-attribute royalty commission to parent agent
CREATE OR REPLACE FUNCTION public.attribute_commission_to_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_royalty_rate numeric := 0.10; -- 10% of child commission goes to parent
  v_royalty_amount numeric;
BEGIN
  -- Skip if this row is itself a royalty entry (avoid cascading)
  IF NEW.notes IS NOT NULL AND NEW.notes ILIKE '%Royalti Sub Agen%' THEN
    RETURN NEW;
  END IF;

  SELECT parent_agent_id INTO v_parent_id
  FROM public.agents
  WHERE id = NEW.agent_id;

  IF v_parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_royalty_amount := ROUND(COALESCE(NEW.commission_amount, 0) * v_royalty_rate, 2);
  IF v_royalty_amount <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.agent_commissions (
    agent_id, booking_id, commission_amount, status, notes
  ) VALUES (
    v_parent_id,
    NEW.booking_id,
    v_royalty_amount,
    'pending',
    'Royalti Sub Agen ' || COALESCE(NEW.agent_id::text, '')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attribute_commission_to_parent ON public.agent_commissions;
CREATE TRIGGER trg_attribute_commission_to_parent
AFTER INSERT ON public.agent_commissions
FOR EACH ROW
EXECUTE FUNCTION public.attribute_commission_to_parent();
-- --- 20260511005638_a74d5d05-5410-4a7b-82db-d8c507a1ad88.sql ---

CREATE TABLE public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active categories" ON public.store_categories FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage categories" ON public.store_categories FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  stock INTEGER NOT NULL DEFAULT 0,
  weight_gram INTEGER NOT NULL DEFAULT 0,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sold_count INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_products_category ON public.store_products(category_id);
CREATE INDEX idx_store_products_branch ON public.store_products(branch_id);
CREATE INDEX idx_store_products_active ON public.store_products(is_active);
CREATE POLICY "Public can view active products" ON public.store_products FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage products" ON public.store_products FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_postal TEXT,
  notes TEXT,
  payment_proof_url TEXT,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_orders_user ON public.store_orders(user_id);
CREATE INDEX idx_store_orders_status ON public.store_orders(status);
CREATE POLICY "Users can view own orders" ON public.store_orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can create own orders" ON public.store_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending orders" ON public.store_orders FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins manage all orders" ON public.store_orders FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.store_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);
CREATE POLICY "View order items via parent" ON public.store_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Insert order items via own order" ON public.store_order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.store_order_items FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  courier_name TEXT NOT NULL,
  courier_service TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'preparing',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_shipments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_shipments_order ON public.store_shipments(order_id);
CREATE POLICY "View shipments via parent" ON public.store_shipments FOR SELECT USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Admins manage shipments" ON public.store_shipments FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_carts (
  user_id UUID PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.store_carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.store_order_counters (
  date_key TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.store_order_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read counters" ON public.store_order_counters FOR SELECT USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.generate_store_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_key TEXT := to_char(now(), 'YYMMDD');
  v_seq INTEGER;
BEGIN
  INSERT INTO public.store_order_counters(date_key, last_seq)
  VALUES (v_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET last_seq = store_order_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN 'ORD' || v_date_key || lpad(v_seq::text, 4, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_store_order_number() TO authenticated;

CREATE TRIGGER trg_store_categories_updated BEFORE UPDATE ON public.store_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_store_products_updated BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_store_orders_updated BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_store_shipments_updated BEFORE UPDATE ON public.store_shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- 20260511013137_3bc297d2-069e-4766-932e-d34bef33e1a7.sql ---

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer ON public.push_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'branch_manager'::app_role)
  );

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --- 20260511014225_688bca84-8c8c-4680-8978-f7bdecf765f4.sql ---

CREATE TABLE IF NOT EXISTS public.ibadah_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ibadah_type TEXT NOT NULL,
  ibadah_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  target INTEGER,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ibadah_type, ibadah_date)
);

CREATE INDEX IF NOT EXISTS idx_ibadah_progress_user_date ON public.ibadah_progress(user_id, ibadah_date DESC);

ALTER TABLE public.ibadah_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ibadah progress"
  ON public.ibadah_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ibadah_progress_updated_at
  BEFORE UPDATE ON public.ibadah_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --- 20260511031434_916b4c99-5ffc-4aea-90b5-901a8c8f1a49.sql ---

-- ============ PUSH OUTBOX ============
CREATE TABLE IF NOT EXISTS public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ids uuid[] NOT NULL DEFAULT '{}',
  customer_ids uuid[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  url text,
  status text NOT NULL DEFAULT 'pending', -- pending|processing|sent|failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_pending
  ON public.push_outbox (status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage push_outbox" ON public.push_outbox;
CREATE POLICY "Admins manage push_outbox"
ON public.push_outbox
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============ HELPER: enqueue ============
CREATE OR REPLACE FUNCTION public.enqueue_push(
  _user_ids uuid[],
  _title text,
  _body text,
  _type text DEFAULT 'info',
  _url text DEFAULT NULL,
  _customer_ids uuid[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF (COALESCE(array_length(_user_ids,1),0) = 0
      AND COALESCE(array_length(_customer_ids,1),0) = 0) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.push_outbox(user_ids, customer_ids, title, body, type, url)
  VALUES (COALESCE(_user_ids,'{}'), COALESCE(_customer_ids,'{}'), _title, _body, _type, _url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============ TRIGGER: bookings status change ============
CREATE OR REPLACE FUNCTION public.tg_push_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_title text;
  v_body text;
  v_type text := 'info';
BEGIN
  IF NEW.booking_status IS NOT DISTINCT FROM OLD.booking_status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  v_title := 'Status Booking Diperbarui';
  v_body := 'Booking ' || NEW.booking_code || ' kini berstatus: ' || NEW.booking_status;

  IF NEW.booking_status::text = 'confirmed' THEN v_type := 'success';
  ELSIF NEW.booking_status::text IN ('cancelled','refunded') THEN v_type := 'warning';
  END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id], v_title, v_body, v_type,
    '/jamaah/booking/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_booking_status_change ON public.bookings;
CREATE TRIGGER push_booking_status_change
AFTER UPDATE OF booking_status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_push_booking_status();

-- ============ TRIGGER: payments paid ============
CREATE OR REPLACE FUNCTION public.tg_push_payment_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_booking_code text;
BEGIN
  IF NEW.status::text <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'paid' THEN RETURN NEW; END IF;

  SELECT c.user_id, b.booking_code
    INTO v_user_id, v_booking_code
  FROM public.bookings b
  JOIN public.customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id],
    'Pembayaran Diterima',
    'Pembayaran Rp ' || to_char(NEW.amount, 'FM999,999,999')
       || ' untuk booking ' || COALESCE(v_booking_code,'') || ' telah diverifikasi.',
    'success',
    '/jamaah/pembayaran'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_payment_paid ON public.payments;
CREATE TRIGGER push_payment_paid
AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_push_payment_paid();

-- ============ TRIGGER: store_orders shipped ============
CREATE OR REPLACE FUNCTION public.tg_push_store_order_shipped()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.status <> 'shipped' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'shipped' THEN RETURN NEW; END IF;

  v_user_id := NEW.user_id;
  IF v_user_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id],
    'Pesanan Dikirim',
    'Pesanan ' || NEW.order_number || ' telah dikirim. Pantau status pengiriman di portal.',
    'success',
    '/jamaah/orders/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_store_order_shipped ON public.store_orders;
CREATE TRIGGER push_store_order_shipped
AFTER UPDATE OF status ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_push_store_order_shipped();

-- ============ H-1 DEPARTURE REMINDER ============
CREATE OR REPLACE FUNCTION public.enqueue_h_minus_one_push()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
  v_user_ids uuid[];
BEGIN
  FOR r IN
    SELECT d.id, d.departure_date, p.name AS package_name
    FROM public.departures d
    LEFT JOIN public.packages p ON p.id = d.package_id
    WHERE d.departure_date = (CURRENT_DATE + INTERVAL '1 day')::date
      AND COALESCE(d.status::text,'open') NOT IN ('cancelled','closed')
  LOOP
    SELECT COALESCE(array_agg(DISTINCT c.user_id) FILTER (WHERE c.user_id IS NOT NULL), '{}')
      INTO v_user_ids
    FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.departure_id = r.id
      AND b.booking_status::text NOT IN ('cancelled','refunded');

    IF COALESCE(array_length(v_user_ids,1),0) > 0 THEN
      PERFORM public.enqueue_push(
        v_user_ids,
        'Keberangkatan Besok!',
        'Keberangkatan ' || COALESCE(r.package_name,'Anda')
          || ' dijadwalkan besok (' || to_char(r.departure_date,'DD Mon YYYY')
          || '). Pastikan dokumen & perlengkapan siap.',
        'warning',
        '/jamaah/jadwal'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- --- 20260511033505_dcb564bf-eead-49e8-afdb-5b368cc38dc6.sql ---

-- 1. Tighten audit_logs insert policy
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. Revoke EXECUTE from public/anon on ALL public schema SECURITY DEFINER functions,
--    re-grant to authenticated. Anon retains only login-flow helpers.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.schema_name, r.func_name, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;

-- 3. Re-grant anon access for pre-login functions
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_failed_attempts(text) TO anon;

-- --- 20260511033624_5a1f0502-657c-4a7b-bc10-629af2c092c9.sql ---

-- Revoke EXECUTE on all trigger-returning functions in public schema (these
-- should never be called via API/RPC; they are fired by triggers internally).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public'
      AND t.typname = 'trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;

-- --- 20260511034756_85990413-54bd-4699-a937-f9922dbe50d0.sql ---

-- ============================================================
-- 1) customer_mahrams
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_mahrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  mahram_name text NOT NULL,
  mahram_relation text NOT NULL CHECK (mahram_relation IN ('suami','istri','ayah','ibu','anak','saudara','paman','kakek','nenek','cucu')),
  mahram_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_mahrams_customer_id_idx ON public.customer_mahrams(customer_id);
CREATE INDEX IF NOT EXISTS customer_mahrams_mahram_customer_id_idx ON public.customer_mahrams(mahram_customer_id);

ALTER TABLE public.customer_mahrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage customer mahrams"
  ON public.customer_mahrams FOR ALL
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
    OR public.has_role(auth.uid(),'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
    OR public.has_role(auth.uid(),'sales')
  );

CREATE POLICY "Customers can view own mahrams"
  ON public.customer_mahrams FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Customers can manage own mahrams"
  ON public.customer_mahrams FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Customers can update own mahrams"
  ON public.customer_mahrams FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Customers can delete own mahrams"
  ON public.customer_mahrams FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE TRIGGER update_customer_mahrams_updated_at
  BEFORE UPDATE ON public.customer_mahrams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) customers: district, village
-- ============================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS village text;

-- ============================================================
-- 3) store_product_reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_published boolean NOT NULL DEFAULT true,
  admin_reply text,
  admin_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id, user_id)
);
CREATE INDEX IF NOT EXISTS store_product_reviews_product_id_idx ON public.store_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS store_product_reviews_published_idx ON public.store_product_reviews(is_published);

ALTER TABLE public.store_product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published reviews"
  ON public.store_product_reviews FOR SELECT
  USING (is_published = true);

CREATE POLICY "Owner can view own reviews"
  ON public.store_product_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own review"
  ON public.store_product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own review"
  ON public.store_product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can manage all reviews"
  ON public.store_product_reviews FOR ALL
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
  );

CREATE TRIGGER update_store_product_reviews_updated_at
  BEFORE UPDATE ON public.store_product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- 20260511040151_ee6ab98a-7b60-4b5d-b433-eb976f1ab403.sql ---
DROP POLICY IF EXISTS "Authenticated users manage referral_codes" ON public.referral_codes;

DROP POLICY IF EXISTS "Authenticated users manage referral_usages" ON public.referral_usages;

CREATE POLICY "Admins manage referral_usages"
ON public.referral_usages
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view ticket responses" ON public.ticket_responses;

CREATE POLICY "Users can view own ticket responses"
ON public.ticket_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_responses.ticket_id
      AND t.user_id = auth.uid()
  )
);

-- --- 20260511040450_0931417e-c9ac-4f95-a214-65187d636527.sql ---
-- Tighten storage uploads
DROP POLICY IF EXISTS "Staff and agents can upload customer documents" ON storage.objects;
CREATE POLICY "Staff and agents can upload customer documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-documents'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operational'::public.app_role)
    OR public.has_role(auth.uid(), 'sales'::public.app_role)
    OR public.has_role(auth.uid(), 'agent'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);

DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
CREATE POLICY "Users can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operational'::public.app_role)
    OR public.has_role(auth.uid(), 'sales'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);

-- Restrict referral_codes public listing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view referral codes for validation" ON public.referral_codes;
CREATE POLICY "Authenticated users can validate referral codes"
ON public.referral_codes
FOR SELECT
TO authenticated
USING (is_active = true);

-- --- 20260511053018_7ec5b9d8-7b02-47db-bab8-463eb7e1df91.sql ---
-- Add layout/overrides to website_settings
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS layout_variant jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_overrides jsonb DEFAULT '{}'::jsonb;

-- Add layout & mood metadata to theme_presets
ALTER TABLE public.theme_presets
  ADD COLUMN IF NOT EXISTS mood text DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS accent_gold text,
  ADD COLUMN IF NOT EXISTS surface_color text,
  ADD COLUMN IF NOT EXISTS radius_style text DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS density text DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS hero_variant text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS cta_variant text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS card_style text DEFAULT 'elevated',
  ADD COLUMN IF NOT EXISTS ornament text DEFAULT 'none';

-- Seed 7 themes (idempotent)
INSERT INTO public.theme_presets (slug, name, description, primary_color, secondary_color, accent_color, background_color, foreground_color, heading_font, body_font, mood, accent_gold, surface_color, radius_style, density, hero_variant, cta_variant, card_style, ornament, is_default)
VALUES
  ('classic',    'Classic Professional',  'Layout korporat dengan hero besar, statistik, dan section standar.',                   '142 70% 38%', '45 90% 50%',  '160 65% 32%', '0 0% 100%',  '142 25% 12%', 'Plus Jakarta Sans', 'Inter',                'light', NULL,           '0 0% 98%',     'soft',   'comfortable', 'classic',    'classic',    'elevated', 'none',           true),
  ('modern',     'Modern Minimalist',     'Hero split, layout horizontal lega, CTA card-style bergradasi.',                       '215 90% 50%', '215 30% 25%', '195 90% 45%', '0 0% 100%',  '220 25% 10%', 'Space Grotesk',     'Inter',                'light', NULL,           '215 30% 97%',  'sharp',  'spacious',    'split',      'gradient',   'flat',     'none',           false),
  ('luxury',     'Elegant Luxury',        'Tipografi serif, aksen emas halus, layout asimetris untuk segmen premium.',            '160 50% 22%', '40 75% 55%',  '40 65% 45%',  '40 30% 97%', '160 25% 12%', 'Playfair Display',  'Cormorant Garamond',   'sepia', '40 80% 55%',   '40 25% 94%',   'soft',   'spacious',    'asymmetric', 'serif',      'bordered', 'serif-divider',  false),
  ('islamic',    'Islamic Contemporary',  'Sentuhan ornamen Islami, search widget menonjol, layout dinamis.',
   '162 80% 28%', '45 92% 52%', '162 60% 38%', '0 0% 99%',  '162 30% 12%', 'Amiri',             'Plus Jakarta Sans',    'light', '45 92% 52%',  '162 30% 96%',  'soft',   'comfortable', 'asymmetric', 'islamic',    'glass',    'islamic',        false),
  ('futuristic', 'Futuristic Dark',       'Dark UI elegan dengan aksen neon dan elemen digital.',                                  '180 90% 55%', '280 80% 60%', '160 90% 50%', '230 25% 6%', '0 0% 96%',    'Space Grotesk',     'Inter',                'dark',  '180 90% 55%', '230 20% 10%',  'sharp',  'compact',     'neon',       'neon',       'glass',    'neon',           false),
  ('nature',     'Nature Serenity',       'Palet alam, tipografi serif lembut, bentuk organik menenangkan.',                      '152 35% 30%', '40 35% 60%',  '152 30% 45%', '60 25% 97%', '152 20% 15%', 'Playfair Display',  'Lora',                 'sepia', NULL,           '60 30% 94%',   'pill',   'spacious',    'serene',     'organic',    'flat',     'leaf',           false),
  ('royal',      'Royal Gold',            'Background gelap mewah dengan aksen emas eksklusif untuk layanan VVIP.',                '42 95% 52%',  '0 0% 8%',     '42 80% 45%',  '0 0% 4%',    '42 30% 92%',  'Cinzel',            'Cormorant Garamond',   'dark',  '42 95% 52%',   '0 0% 8%',     'soft',   'spacious',    'royal',      'gold',       'bordered', 'gold-foil',      false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  background_color = EXCLUDED.background_color,
  foreground_color = EXCLUDED.foreground_color,
  heading_font = EXCLUDED.heading_font,
  body_font = EXCLUDED.body_font,
  mood = EXCLUDED.mood,
  accent_gold = EXCLUDED.accent_gold,
  surface_color = EXCLUDED.surface_color,
  radius_style = EXCLUDED.radius_style,
  density = EXCLUDED.density,
  hero_variant = EXCLUDED.hero_variant,
  cta_variant = EXCLUDED.cta_variant,
  card_style = EXCLUDED.card_style,
  ornament = EXCLUDED.ornament;
-- --- 20260513104019_e8ed0e59-b3a8-4aa0-b673-ae676bb61065.sql ---
-- Sprint 8 P6: Custom package labels/tags
-- Master table of labels (per branch, optional NULL = global) + junction table to packages

CREATE TABLE IF NOT EXISTS public.package_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  slug varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  color varchar(20) NOT NULL DEFAULT 'primary',
  icon varchar(50),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_labels_branch_slug_unique UNIQUE (branch_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_package_labels_branch ON public.package_labels(branch_id);
CREATE INDEX IF NOT EXISTS idx_package_labels_active ON public.package_labels(is_active);

CREATE TABLE IF NOT EXISTS public.package_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.package_labels(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_label_assignments_unique UNIQUE (package_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_package_label_assign_package ON public.package_label_assignments(package_id);
CREATE INDEX IF NOT EXISTS idx_package_label_assign_label ON public.package_label_assignments(label_id);

-- Trigger: updated_at
CREATE TRIGGER trg_package_labels_updated_at
  BEFORE UPDATE ON public.package_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.package_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_label_assignments ENABLE ROW LEVEL SECURITY;

-- Public read (labels visible on public package listings)
CREATE POLICY "Anyone can view active package labels"
  ON public.package_labels FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Anyone can view label assignments"
  ON public.package_label_assignments FOR SELECT
  USING (true);

-- Admin manage (branch-scoped via existing helpers)
CREATE POLICY "Admins manage package labels in their branch"
  ON public.package_labels FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'owner')
    OR (public.is_admin(auth.uid()) AND (branch_id IS NULL OR public.user_belongs_to_branch(auth.uid(), branch_id)))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'owner')
    OR (public.is_admin(auth.uid()) AND (branch_id IS NULL OR public.user_belongs_to_branch(auth.uid(), branch_id)))
  );

CREATE POLICY "Admins manage package label assignments"
  ON public.package_label_assignments FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed beberapa label global default
INSERT INTO public.package_labels (branch_id, slug, name, color, sort_order)
VALUES
  (NULL, 'best_seller', 'Best Seller', 'amber', 1),
  (NULL, 'early_bird', 'Early Bird', 'emerald', 2),
  (NULL, 'flash_sale', 'Flash Sale', 'red', 3),
  (NULL, 'new', 'Baru', 'blue', 4),
  (NULL, 'limited', 'Terbatas', 'purple', 5)
ON CONFLICT (branch_id, slug) DO NOTHING;
-- --- 20260513111158_6897f5ed-beb4-4b88-b2a2-36c033bbd1d6.sql ---
-- TAB-FIX2: Locked price untuk lindungi customer dari kenaikan harga paket
ALTER TABLE public.savings_plans
  ADD COLUMN IF NOT EXISTS locked_price numeric(15,2),
  ADD COLUMN IF NOT EXISTS price_lock_date timestamptz DEFAULT now();

-- Backfill locked_price dari target_amount untuk plan yang sudah ada
UPDATE public.savings_plans SET locked_price = target_amount WHERE locked_price IS NULL;

-- TAB-FIX3: Tabel jadwal cicilan otomatis
CREATE TABLE IF NOT EXISTS public.savings_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_plan_id uuid NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  paid_amount numeric(15,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (savings_plan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_savings_schedules_plan ON public.savings_schedules(savings_plan_id);
CREATE INDEX IF NOT EXISTS idx_savings_schedules_due ON public.savings_schedules(due_date) WHERE status IN ('pending','partial','overdue');

ALTER TABLE public.savings_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own savings schedules"
  ON public.savings_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.savings_plans sp
    JOIN public.customers c ON c.id = sp.customer_id
    WHERE sp.id = savings_schedules.savings_plan_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage savings schedules"
  ON public.savings_schedules FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Customers can insert own savings schedules"
  ON public.savings_schedules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.savings_plans sp
    JOIN public.customers c ON c.id = sp.customer_id
    WHERE sp.id = savings_schedules.savings_plan_id AND c.user_id = auth.uid()
  ));

CREATE TRIGGER update_savings_schedules_updated_at
  BEFORE UPDATE ON public.savings_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generator otomatis jadwal cicilan saat savings_plan dibuat
CREATE OR REPLACE FUNCTION public.generate_savings_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  v_due date;
BEGIN
  IF NEW.tenor_months IS NULL OR NEW.tenor_months <= 0 THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.savings_schedules WHERE savings_plan_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  FOR i IN 1..NEW.tenor_months LOOP
    v_due := (COALESCE(NEW.start_date, CURRENT_DATE) + (i || ' months')::interval)::date;
    INSERT INTO public.savings_schedules (savings_plan_id, installment_number, due_date, amount)
    VALUES (NEW.id, i, v_due, NEW.monthly_amount);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_generate_savings_schedule ON public.savings_plans;
CREATE TRIGGER tr_generate_savings_schedule
  AFTER INSERT ON public.savings_plans
  FOR EACH ROW EXECUTE FUNCTION public.generate_savings_schedule();

-- Auto-update jadwal saat savings_payment tercatat
CREATE OR REPLACE FUNCTION public.apply_payment_to_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining numeric;
  v_plan_id uuid;
  r record;
BEGIN
  IF NEW.status::text NOT IN ('paid','verified','approved') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  v_plan_id := NEW.savings_plan_id;
  v_remaining := NEW.amount;
  FOR r IN SELECT id, amount, paid_amount FROM public.savings_schedules
           WHERE savings_plan_id = v_plan_id AND status IN ('pending','partial','overdue')
           ORDER BY installment_number ASC LOOP
    EXIT WHEN v_remaining <= 0;
    DECLARE
      v_due numeric := r.amount - COALESCE(r.paid_amount,0);
      v_apply numeric := LEAST(v_remaining, v_due);
      v_new_paid numeric := COALESCE(r.paid_amount,0) + v_apply;
      v_status text := CASE WHEN v_new_paid >= r.amount THEN 'paid' ELSE 'partial' END;
    BEGIN
      UPDATE public.savings_schedules
      SET paid_amount = v_new_paid, status = v_status, paid_at = CASE WHEN v_status='paid' THEN now() ELSE paid_at END
      WHERE id = r.id;
      v_remaining := v_remaining - v_apply;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_apply_payment_to_schedule ON public.savings_payments;
CREATE TRIGGER tr_apply_payment_to_schedule
  AFTER INSERT OR UPDATE ON public.savings_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_payment_to_schedule();

-- TAB-FIX1: RPC konversi tabungan → booking
CREATE OR REPLACE FUNCTION public.convert_savings_to_booking(
  _savings_plan_id uuid,
  _departure_id uuid,
  _room_type text DEFAULT 'quad'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_departure record;
  v_pkg record;
  v_booking_id uuid;
  v_booking_code text;
  v_room_price numeric;
  v_user_id uuid;
BEGIN
  SELECT sp.*, c.user_id, c.full_name INTO v_plan
  FROM public.savings_plans sp
  JOIN public.customers c ON c.id = sp.customer_id
  WHERE sp.id = _savings_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tabungan tidak ditemukan';
  END IF;
  IF v_plan.status::text = 'converted' THEN
    RAISE EXCEPTION 'Tabungan sudah dikonversi ke booking';
  END IF;
  IF v_plan.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  SELECT d.*, p.code AS package_code INTO v_departure
  FROM public.departures d
  JOIN public.packages p ON p.id = d.package_id
  WHERE d.id = _departure_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Keberangkatan tidak ditemukan'; END IF;

  v_room_price := CASE _room_type
    WHEN 'triple' THEN v_departure.price_triple
    WHEN 'double' THEN v_departure.price_double
    WHEN 'single' THEN v_departure.price_single
    ELSE v_departure.price_quad
  END;

  v_booking_code := public.generate_booking_code(v_departure.package_code, v_departure.departure_date);

  INSERT INTO public.bookings (
    booking_code, departure_id, customer_id, room_type,
    total_pax, adult_count, base_price, total_price, paid_amount,
    notes
  ) VALUES (
    v_booking_code, _departure_id, v_plan.customer_id, _room_type,
    1, 1, v_room_price, v_room_price, COALESCE(v_plan.paid_amount, 0),
    'Konversi otomatis dari tabungan #' || _savings_plan_id::text
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_passengers (booking_id, customer_id, is_main_passenger, passenger_type, room_preference)
  VALUES (v_booking_id, v_plan.customer_id, true, 'adult', _room_type);

  UPDATE public.savings_plans
  SET status = 'converted', converted_booking_id = v_booking_id, updated_at = now()
  WHERE id = _savings_plan_id;

  RETURN v_booking_id;
END;
$$;
-- --- 20260513114043_30604cc7-99b5-4f94-84f8-8a15b21dfa83.sql ---

-- ============================================================
-- LOY-FIX3: Tabel jamaah_badges + 5 trigger badge otomatis
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jamaah_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_jamaah_badges_user ON public.jamaah_badges(user_id);

ALTER TABLE public.jamaah_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own badges" ON public.jamaah_badges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own badges" ON public.jamaah_badges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage badges" ON public.jamaah_badges
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Helper function: award badge with notification
CREATE OR REPLACE FUNCTION public.award_badge(
  _user_id uuid, _badge_id text, _badge_name text,
  _xp integer DEFAULT 50, _source text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted boolean := false;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.jamaah_badges (user_id, badge_id, source)
  VALUES (_user_id, _badge_id, _source)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_user_id,
      '🏆 Badge Baru: ' || _badge_name,
      'Selamat! Anda mendapat badge "' || _badge_name || '" (+' || _xp || ' XP).',
      'success', '/jamaah/badges');
  END IF;
  RETURN v_inserted;
END $$;

-- Trigger 1: First payment -> badge "umroh_pertama" (when first payment paid)
CREATE OR REPLACE FUNCTION public.tg_badge_first_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_count int;
BEGIN
  IF NEW.status::text <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'paid' THEN RETURN NEW; END IF;
  SELECT c.user_id INTO v_user_id
  FROM bookings b JOIN customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.award_badge(v_user_id, 'umroh_pertama', 'Umroh Perdana', 500, 'first_payment');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_first_payment ON public.payments;
CREATE TRIGGER trg_badge_first_payment
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_first_payment();

-- Trigger 2: Loyalty tier reached
CREATE OR REPLACE FUNCTION public.tg_badge_loyalty_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.tier_level IS NULL OR NEW.tier_level = OLD.tier_level THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.tier_level = 'gold' THEN
    PERFORM public.award_badge(v_user_id, 'tier_gold', 'Tier Gold', 100, 'loyalty_tier');
  ELSIF NEW.tier_level = 'platinum' THEN
    PERFORM public.award_badge(v_user_id, 'tier_platinum', 'Tier Platinum', 250, 'loyalty_tier');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_loyalty_tier ON public.loyalty_points;
CREATE TRIGGER trg_badge_loyalty_tier
  AFTER UPDATE OF tier_level ON public.loyalty_points
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_loyalty_tier();

-- Trigger 3: Savings plan created -> badge "tabungan_aktif"
CREATE OR REPLACE FUNCTION public.tg_badge_savings_started()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.award_badge(v_user_id, 'tabungan_aktif', 'Penabung Setia', 75, 'savings_plan');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_savings_started ON public.savings_plans;
CREATE TRIGGER trg_badge_savings_started
  AFTER INSERT ON public.savings_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_savings_started();

-- Trigger 4: Booking confirmed -> badge "booking_confirmed"
CREATE OR REPLACE FUNCTION public.tg_badge_booking_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.booking_status::text <> 'confirmed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.booking_status::text = 'confirmed' THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.award_badge(v_user_id, 'booking_confirmed', 'Booking Terkonfirmasi', 150, 'booking');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_booking_confirmed ON public.bookings;
CREATE TRIGGER trg_badge_booking_confirmed
  AFTER INSERT OR UPDATE OF booking_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_booking_confirmed();

-- Trigger 5: Document verified -> badge "dokumen_lengkap"
CREATE OR REPLACE FUNCTION public.tg_badge_document_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_verified_count int;
BEGIN
  IF NEW.status::text <> 'verified' THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_verified_count
  FROM customer_documents
  WHERE customer_id = NEW.customer_id AND status::text = 'verified';
  IF v_verified_count >= 2 THEN
    PERFORM public.award_badge(v_user_id, 'dokumen_lengkap', 'Dokumen Lengkap', 100, 'documents');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_document_verified ON public.customer_documents;
CREATE TRIGGER trg_badge_document_verified
  AFTER UPDATE OF status ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_document_verified();

-- --- 20260513115449_195f75c8-b979-4e48-865e-ed4e86a128aa.sql ---

-- Training Modules
CREATE TABLE IF NOT EXISTS public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'lainnya',
  content_type text NOT NULL DEFAULT 'text',  -- video | pdf | text
  content_url text,
  content_text text,
  order_index int NOT NULL DEFAULT 0,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,  -- [{text, is_correct}]
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_module ON public.training_quizzes(module_id);

CREATE TABLE IF NOT EXISTS public.agent_training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | completed | failed
  quiz_score int,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_training_progress_agent ON public.agent_training_progress(agent_id);

-- updated_at trigger reuse
DROP TRIGGER IF EXISTS trg_training_modules_updated ON public.training_modules;
CREATE TRIGGER trg_training_modules_updated BEFORE UPDATE ON public.training_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_agent_training_progress_updated ON public.agent_training_progress;
CREATE TRIGGER trg_agent_training_progress_updated BEFORE UPDATE ON public.agent_training_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_training_progress ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can read active modules + their quizzes.
CREATE POLICY "auth read active modules" ON public.training_modules
FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "auth read quizzes" ON public.training_quizzes
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.training_modules m
    WHERE m.id = training_quizzes.module_id AND (m.is_active OR public.has_role(auth.uid(),'super_admin')))
);

-- Manage: super_admin / owner / branch_manager
CREATE POLICY "admin manage modules" ON public.training_modules
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'));

CREATE POLICY "admin manage quizzes" ON public.training_quizzes
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'));

-- Progress: agent can read/write own; admins can read all.
CREATE POLICY "agent read own progress" ON public.agent_training_progress
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
  OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager')
);

CREATE POLICY "agent insert own progress" ON public.agent_training_progress
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
);

CREATE POLICY "agent update own progress" ON public.agent_training_progress
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
);

-- Seed
INSERT INTO public.training_modules (title, description, category, content_type, content_text, order_index, is_mandatory)
VALUES
  ('Product Knowledge Umroh', 'Pengenalan produk paket Umroh: tipe paket, hotel, fasilitas, dan komponen harga.', 'product_knowledge', 'text',
   'Modul ini membahas struktur paket Umroh: durasi, hotel di Makkah/Madinah, maskapai, perlengkapan, manasik, dan komponen biaya. Pelajari perbedaan paket Hemat, Reguler, dan VIP serta cara menjelaskan keunggulan tiap paket kepada calon jamaah.',
   1, true),
  ('Script Penjualan Profesional', 'Teknik komunikasi & closing untuk calon jamaah.', 'script_penjualan', 'text',
   '1) Pembukaan: salam + identifikasi kebutuhan. 2) Discovery: tanyakan tanggal target, budget, dan komposisi keluarga. 3) Presentasi paket sesuai profile. 4) Handling objection harga, jadwal, dokumen. 5) Closing dengan urgency (kuota terbatas, harga naik). 6) Follow-up via WhatsApp dalam 24 jam.',
   2, true),
  ('SOP Pendaftaran Jamaah', 'Standard Operating Procedure registrasi & dokumen.', 'sop', 'text',
   'Alur: Pendaftaran → Booking → DP → Upload KTP & Paspor → Validasi dokumen → Pelunasan → Manasik → Keberangkatan. Pastikan paspor berlaku ≥ 6 bulan dari tanggal keberangkatan. Upload KTP dan paspor sebelum H-45.',
   3, false)
ON CONFLICT DO NOTHING;

-- Seed quiz for module 1 (Product Knowledge)
INSERT INTO public.training_quizzes (module_id, question, options, order_index)
SELECT m.id,
       'Berapa lama validitas paspor minimum sebelum tanggal keberangkatan Umroh?',
       '[{"text":"3 bulan","is_correct":false},{"text":"6 bulan","is_correct":true},{"text":"1 tahun","is_correct":false},{"text":"Tidak ada syarat","is_correct":false}]'::jsonb,
       1
FROM public.training_modules m WHERE m.title = 'Product Knowledge Umroh'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_quizzes (module_id, question, options, order_index)
SELECT m.id,
       'Komponen yang TIDAK termasuk dalam paket Umroh standar adalah:',
       '[{"text":"Tiket pesawat PP","is_correct":false},{"text":"Hotel di Makkah & Madinah","is_correct":false},{"text":"Pengurusan visa","is_correct":false},{"text":"Oleh-oleh pribadi","is_correct":true}]'::jsonb,
       2
FROM public.training_modules m WHERE m.title = 'Product Knowledge Umroh'
ON CONFLICT DO NOTHING;

-- --- 20260513121035_4ec556b0-0d5b-4591-96be-2f1d6562c67c.sql ---
-- Enable realtime for website_settings (CSS-FIX-3) and user_roles/user_permissions (RBAC-F4)
ALTER TABLE public.website_settings REPLICA IDENTITY FULL;
ALTER TABLE public.user_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.website_settings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
-- --- 20260513121224_d1eabedd-cfd5-4ce9-928b-2b866c3f7304.sql ---
ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
-- --- 20260513121719_d8c71ee7-8a40-4e55-9169-45e5f71c425d.sql ---

-- ============================================
-- CAB-ADD1: Branch-scoped RLS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_branch_manager_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'branch_manager')
    AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('super_admin','owner'));
$$;

-- Bookings: restrict branch_manager
DROP POLICY IF EXISTS "Branch managers see only own branch bookings" ON public.bookings;
CREATE POLICY "Branch managers see only own branch bookings"
ON public.bookings FOR SELECT TO authenticated
USING (
  NOT is_branch_manager_only(auth.uid())
  OR branch_id = get_user_branch_id(auth.uid())
  OR customer_id IN (SELECT id FROM customers WHERE branch_id = get_user_branch_id(auth.uid()))
);

-- Customers: restrict branch_manager
DROP POLICY IF EXISTS "Branch managers see only own branch customers" ON public.customers;
CREATE POLICY "Branch managers see only own branch customers"
ON public.customers FOR SELECT TO authenticated
USING (
  NOT is_branch_manager_only(auth.uid())
  OR branch_id = get_user_branch_id(auth.uid())
  OR branch_id IS NULL
);

-- Payments: restrict via booking branch
DROP POLICY IF EXISTS "Branch managers see only own branch payments" ON public.payments;
CREATE POLICY "Branch managers see only own branch payments"
ON public.payments FOR SELECT TO authenticated
USING (
  NOT is_branch_manager_only(auth.uid())
  OR booking_id IN (
    SELECT id FROM bookings
    WHERE branch_id = get_user_branch_id(auth.uid())
       OR customer_id IN (SELECT id FROM customers WHERE branch_id = get_user_branch_id(auth.uid()))
  )
);

-- ============================================
-- CAB-ADD5: Branch Manager Notifications
-- ============================================
CREATE OR REPLACE FUNCTION public.tg_notify_branch_manager_new_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id uuid;
  v_user_ids uuid[];
  v_customer_name text;
BEGIN
  v_branch_id := COALESCE(NEW.branch_id, (SELECT branch_id FROM customers WHERE id = NEW.customer_id));
  IF v_branch_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(array_agg(user_id), '{}') INTO v_user_ids
  FROM user_roles WHERE role = 'branch_manager' AND branch_id = v_branch_id;

  IF COALESCE(array_length(v_user_ids,1),0) = 0 THEN RETURN NEW; END IF;

  SELECT full_name INTO v_customer_name FROM customers WHERE id = NEW.customer_id;

  PERFORM enqueue_push(
    v_user_ids,
    'Booking Baru di Cabang Anda',
    'Booking ' || NEW.booking_code || ' dari ' || COALESCE(v_customer_name, 'jamaah') || ' menunggu konfirmasi.',
    'info',
    '/cabang/bookings'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_branch_mgr_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_branch_mgr_new_booking
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_branch_manager_new_booking();

CREATE OR REPLACE FUNCTION public.tg_notify_branch_manager_payment_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id uuid;
  v_user_ids uuid[];
BEGIN
  IF NEW.status::text NOT IN ('pending','partial') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.proof_url IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(b.branch_id, c.branch_id) INTO v_branch_id
  FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;
  IF v_branch_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(array_agg(user_id), '{}') INTO v_user_ids
  FROM user_roles WHERE role = 'branch_manager' AND branch_id = v_branch_id;
  IF COALESCE(array_length(v_user_ids,1),0) = 0 THEN RETURN NEW; END IF;

  PERFORM enqueue_push(
    v_user_ids,
    'Pembayaran Menunggu Persetujuan',
    'Pembayaran Rp ' || to_char(NEW.amount, 'FM999,999,999') || ' menunggu verifikasi.',
    'warning',
    '/cabang/approvals'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_branch_mgr_payment_pending ON public.payments;
CREATE TRIGGER trg_notify_branch_mgr_payment_pending
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_branch_manager_payment_pending();

-- ============================================
-- LOY-FIX2: Tier Benefits
-- ============================================
CREATE TABLE IF NOT EXISTS public.tier_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level text NOT NULL UNIQUE CHECK (tier_level IN ('silver','gold','platinum')),
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  free_upgrades int NOT NULL DEFAULT 0,
  priority_support boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tier_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tier benefits" ON public.tier_benefits;
CREATE POLICY "Anyone can view tier benefits" ON public.tier_benefits FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage tier benefits" ON public.tier_benefits;
CREATE POLICY "Admins manage tier benefits" ON public.tier_benefits
FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.tier_benefits (tier_level, discount_percent, free_upgrades, priority_support, description) VALUES
  ('silver', 0, 0, false, 'Tier dasar — tanpa diskon'),
  ('gold', 2.5, 1, true, 'Diskon 2.5% + 1 upgrade kamar gratis + prioritas dukungan'),
  ('platinum', 5.0, 2, true, 'Diskon 5% + 2 upgrade kamar gratis + prioritas dukungan')
ON CONFLICT (tier_level) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_tier_discount(_customer_id uuid, _base_amount numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tier text;
  v_pct numeric := 0;
  v_disc numeric;
BEGIN
  SELECT tier_level INTO v_tier FROM loyalty_points WHERE customer_id = _customer_id;
  IF v_tier IS NULL THEN v_tier := 'silver'; END IF;
  SELECT discount_percent INTO v_pct FROM tier_benefits WHERE tier_level = v_tier;
  v_pct := COALESCE(v_pct, 0);
  v_disc := ROUND(_base_amount * v_pct / 100, 0);
  RETURN jsonb_build_object(
    'tier', v_tier,
    'discount_percent', v_pct,
    'discount_amount', v_disc,
    'final_amount', _base_amount - v_disc
  );
END $$;

-- ============================================
-- KEP-FIX5: Daily Attendance in Holy Land
-- ============================================
CREATE TABLE IF NOT EXISTS public.jamaah_daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir','sakit','izin','hilang')),
  location text,
  notes text,
  photo_url text,
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(departure_id, customer_id, attendance_date)
);
CREATE INDEX IF NOT EXISTS jdaily_dep_date_idx ON public.jamaah_daily_attendance(departure_id, attendance_date);
ALTER TABLE public.jamaah_daily_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage daily attendance" ON public.jamaah_daily_attendance;
CREATE POLICY "Admins manage daily attendance" ON public.jamaah_daily_attendance
FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Operational manage daily attendance" ON public.jamaah_daily_attendance;
CREATE POLICY "Operational manage daily attendance" ON public.jamaah_daily_attendance
FOR ALL TO authenticated USING (has_role(auth.uid(), 'operational'::app_role))
WITH CHECK (has_role(auth.uid(), 'operational'::app_role));

DROP POLICY IF EXISTS "Customers see own attendance" ON public.jamaah_daily_attendance;
CREATE POLICY "Customers see own attendance" ON public.jamaah_daily_attendance
FOR SELECT TO authenticated USING (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

-- --- 20260513123505_6536670f-a7d0-4bf4-85e6-f57fd00afffe.sql ---

-- ============ PWA install events ============
CREATE TABLE IF NOT EXISTS public.pwa_install_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  platform text,
  user_agent text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pwa_install_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_insert_install_event" ON public.pwa_install_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_install_events" ON public.pwa_install_events
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============ Baggage policies ============
CREATE TABLE IF NOT EXISTS public.baggage_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id uuid REFERENCES public.airlines(id) ON DELETE CASCADE,
  cabin_kg numeric NOT NULL DEFAULT 7,
  checked_kg numeric NOT NULL DEFAULT 23,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.baggage_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_baggage" ON public.baggage_policies FOR SELECT USING (true);
CREATE POLICY "admin_manage_baggage" ON public.baggage_policies
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Departure surveys ============
CREATE TABLE IF NOT EXISTS public.departure_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  rating_overall int CHECK (rating_overall BETWEEN 1 AND 5),
  rating_hotel int CHECK (rating_hotel BETWEEN 1 AND 5),
  rating_food int CHECK (rating_food BETWEEN 1 AND 5),
  rating_muthawif int CHECK (rating_muthawif BETWEEN 1 AND 5),
  comment text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departure_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_submit_survey" ON public.departure_surveys
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "customer_read_own_survey" ON public.departure_surveys
  FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_survey" ON public.departure_surveys
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Loyalty point expiry ============
CREATE TABLE IF NOT EXISTS public.loyalty_point_expiry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  points int NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','consumed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_point_expiry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_read_own_expiry" ON public.loyalty_point_expiry
  FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_expiry" ON public.loyalty_point_expiry
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Booking transfers ============
CREATE TABLE IF NOT EXISTS public.booking_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_branch_id uuid,
  to_branch_id uuid,
  requested_by uuid,
  approved_by uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_transfers" ON public.booking_transfers
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Auto-upgrade agent membership ============
CREATE OR REPLACE FUNCTION public.tg_auto_upgrade_agent_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric;
  v_new_tier text;
BEGIN
  IF NEW.status::text <> 'paid' THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(commission_amount),0) INTO v_total
  FROM agent_commissions
  WHERE agent_id = NEW.agent_id
    AND status::text = 'paid'
    AND created_at >= date_trunc('year', now());
  v_new_tier := CASE
    WHEN v_total >= 100000000 THEN 'platinum'
    WHEN v_total >= 25000000 THEN 'gold'
    WHEN v_total >= 5000000 THEN 'silver'
    ELSE 'bronze'
  END;
  UPDATE agents SET membership_tier = v_new_tier, updated_at = now()
  WHERE id = NEW.agent_id AND COALESCE(membership_tier,'bronze') <> v_new_tier;
  RETURN NEW;
END $$;

-- attach if column exists; harmless if not
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agents' AND column_name='membership_tier') THEN
    DROP TRIGGER IF EXISTS tr_auto_upgrade_agent_membership ON public.agent_commissions;
    CREATE TRIGGER tr_auto_upgrade_agent_membership
      AFTER INSERT OR UPDATE ON public.agent_commissions
      FOR EACH ROW EXECUTE FUNCTION public.tg_auto_upgrade_agent_membership();
  END IF;
END $$;

-- ============ PWA Settings permission ============
INSERT INTO public.permissions_list (key, label, group_name)
VALUES ('pwa-settings', 'Pengaturan PWA', 'Pengaturan')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT r::app_role, 'pwa-settings', true
FROM unnest(ARRAY['super_admin','owner']::text[]) r
ON CONFLICT (role, permission_key) DO NOTHING;

-- --- 20260513130746_2d3e4cf1-e483-4919-82da-514d8ed4ecd0.sql ---

-- Sprint 10: Multi-currency Booking Wizard + Adaptive Booking Mode

-- 1. Add currency snapshot fields to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_price_original numeric,
  ADD COLUMN IF NOT EXISTS total_price_idr numeric;

-- Backfill: existing bookings (assume IDR)
UPDATE public.bookings
SET total_price_original = COALESCE(total_price_original, total_price),
    total_price_idr = COALESCE(total_price_idr, total_price),
    exchange_rate = COALESCE(exchange_rate, 1)
WHERE total_price_original IS NULL OR total_price_idr IS NULL;

-- 2. Booking mode on packages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='packages' AND column_name='booking_mode'
  ) THEN
    ALTER TABLE public.packages ADD COLUMN booking_mode text NOT NULL DEFAULT 'umroh';
    ALTER TABLE public.packages ADD CONSTRAINT packages_booking_mode_check
      CHECK (booking_mode IN ('umroh','haji','wisata'));
  END IF;
END $$;

-- Backfill booking_mode from package_type when possible
UPDATE public.packages
SET booking_mode = CASE
  WHEN package_type::text ILIKE '%haji%' THEN 'haji'
  WHEN package_type::text ILIKE '%wisata%' OR package_type::text ILIKE '%tour%' THEN 'wisata'
  ELSE 'umroh'
END
WHERE booking_mode = 'umroh';

-- 3. exchange_rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from text NOT NULL,
  currency_to text NOT NULL DEFAULT 'IDR',
  rate numeric NOT NULL CHECK (rate > 0),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_active
  ON public.exchange_rates (currency_from, currency_to, is_active, fetched_at DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active rates" ON public.exchange_rates;
CREATE POLICY "Anyone can read active rates"
  ON public.exchange_rates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage rates" ON public.exchange_rates;
CREATE POLICY "Admins can manage rates"
  ON public.exchange_rates FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Helper: get latest active rate
CREATE OR REPLACE FUNCTION public.get_active_exchange_rate(_currency_from text, _currency_to text DEFAULT 'IDR')
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN UPPER(_currency_from) = UPPER(_currency_to) THEN 1
    ELSE COALESCE((
      SELECT rate FROM public.exchange_rates
      WHERE UPPER(currency_from) = UPPER(_currency_from)
        AND UPPER(currency_to) = UPPER(_currency_to)
        AND is_active = true
      ORDER BY fetched_at DESC
      LIMIT 1
    ), 1)
  END;
$$;

-- 5. Seed default rates (initial values; admin updates in UI)
INSERT INTO public.exchange_rates (currency_from, currency_to, rate, source, notes)
VALUES
  ('USD','IDR', 16500, 'seed', 'Default seed rate — please update'),
  ('SAR','IDR', 4400,  'seed', 'Default seed rate — please update'),
  ('EUR','IDR', 17800, 'seed', 'Default seed rate — please update'),
  ('MYR','IDR', 3500,  'seed', 'Default seed rate — please update')
ON CONFLICT DO NOTHING;

-- --- 20260513131651_4575cd92-f6a4-40ac-8e17-59828d2948fd.sql ---

ALTER TABLE public.departures
  ADD COLUMN IF NOT EXISTS price_adult numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_child numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_infant numeric DEFAULT 0;

-- --- 20260513132826_d761930f-0807-413e-b524-8bf1ae810e5a.sql ---

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS dp_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS savings_plan_id uuid REFERENCES public.savings_plans(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_mode_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_mode_check CHECK (payment_mode IN ('full','dp','savings'));

-- --- 20260513134512_7988bcaa-2f8a-493d-b489-9376959b45fd.sql ---
-- Seat hold system (BOOK-FIX3)
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  pax_count integer NOT NULL DEFAULT 1 CHECK (pax_count > 0),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_departure_active
  ON public.seat_holds (departure_id) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_seat_holds_session ON public.seat_holds (session_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON public.seat_holds (expires_at) WHERE released_at IS NULL;

ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read seat holds count"
  ON public.seat_holds FOR SELECT USING (true);

CREATE POLICY "Anyone can create seat hold"
  ON public.seat_holds FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner can release own seat hold"
  ON public.seat_holds FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Function: get active (non-expired, non-released) hold count
CREATE OR REPLACE FUNCTION public.get_active_seat_holds(_departure_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(pax_count), 0)::int
  FROM public.seat_holds
  WHERE departure_id = _departure_id
    AND released_at IS NULL
    AND expires_at > now();
$$;

-- Function: create or refresh a hold
CREATE OR REPLACE FUNCTION public.hold_departure_seats(
  _departure_id uuid,
  _session_id text,
  _pax_count integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_quota integer;
  v_booked integer;
  v_active_holds integer;
  v_available integer;
  v_existing_id uuid;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  IF _pax_count IS NULL OR _pax_count < 1 THEN _pax_count := 1; END IF;

  SELECT quota, COALESCE(booked_count, 0) INTO v_quota, v_booked
    FROM public.departures WHERE id = _departure_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'departure_not_found');
  END IF;

  -- Refresh existing hold for this session (TTL extended)
  SELECT id INTO v_existing_id FROM public.seat_holds
    WHERE departure_id = _departure_id AND session_id = _session_id
      AND released_at IS NULL AND expires_at > now()
    LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.seat_holds
      SET expires_at = now() + interval '15 minutes',
          pax_count = _pax_count,
          user_id = COALESCE(user_id, auth.uid())
      WHERE id = v_existing_id
      RETURNING id, expires_at INTO v_id, v_expires;
    RETURN jsonb_build_object('ok', true, 'hold_id', v_id, 'expires_at', v_expires, 'refreshed', true);
  END IF;

  -- Check capacity: quota - booked - other active holds >= requested
  SELECT COALESCE(SUM(pax_count), 0)::int INTO v_active_holds
    FROM public.seat_holds
    WHERE departure_id = _departure_id
      AND released_at IS NULL
      AND expires_at > now()
      AND session_id <> _session_id;

  v_available := v_quota - v_booked - v_active_holds;
  IF v_available < _pax_count THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_capacity',
      'available', v_available, 'requested', _pax_count);
  END IF;

  INSERT INTO public.seat_holds (departure_id, session_id, user_id, pax_count)
  VALUES (_departure_id, _session_id, auth.uid(), _pax_count)
  RETURNING id, expires_at INTO v_id, v_expires;

  RETURN jsonb_build_object('ok', true, 'hold_id', v_id, 'expires_at', v_expires);
END;
$$;

-- Function: release hold by session
CREATE OR REPLACE FUNCTION public.release_seat_hold(_session_id text, _departure_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.seat_holds
    SET released_at = now()
    WHERE session_id = _session_id
      AND (_departure_id IS NULL OR departure_id = _departure_id)
      AND released_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Cleanup function (can be cronned)
CREATE OR REPLACE FUNCTION public.cleanup_expired_seat_holds()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.seat_holds
    SET released_at = now()
    WHERE released_at IS NULL AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Booking access tokens for guest checkout recovery (BOOK-FIX7)
CREATE TABLE IF NOT EXISTS public.booking_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text,
  phone text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_booking ON public.booking_access_tokens (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_expires ON public.booking_access_tokens (expires_at);

ALTER TABLE public.booking_access_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens are sensitive: only service_role / admins manage; redemption goes through edge function
CREATE POLICY "Admins manage booking access tokens"
  ON public.booking_access_tokens FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RPC to validate & mark token used (called by recovery edge function with service_role)
CREATE OR REPLACE FUNCTION public.redeem_booking_access_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_row public.booking_access_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.booking_access_tokens
    WHERE token = _token AND expires_at > now()
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  END IF;
  UPDATE public.booking_access_tokens
    SET used_count = used_count + 1, last_used_at = now()
    WHERE id = v_row.id;
  RETURN jsonb_build_object('ok', true, 'booking_id', v_row.booking_id);
END;
$$;

-- Midtrans webhook log table (BOOK-FIX6)
CREATE TABLE IF NOT EXISTS public.midtrans_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  transaction_status text,
  fraud_status text,
  payment_type text,
  gross_amount numeric,
  signature_valid boolean NOT NULL DEFAULT false,
  payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_midtrans_webhook_order_id ON public.midtrans_webhook_logs (order_id);

ALTER TABLE public.midtrans_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook logs"
  ON public.midtrans_webhook_logs FOR SELECT
  USING (public.is_admin(auth.uid()));
-- --- 20260513143441_978c0550-16f1-481b-b837-e4da41d45f81.sql ---

-- ============================================================
-- STORE: Procurement + Inventory Tracking
-- ============================================================

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS public.store_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  npwp TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_suppliers ENABLE ROW LEVEL SECURITY;

-- 2. PO Counters (monthly bucket)
CREATE TABLE IF NOT EXISTS public.store_po_counters (
  bucket TEXT PRIMARY KEY,        -- format YYMM
  last_seq INT NOT NULL DEFAULT 0
);

ALTER TABLE public.store_po_counters ENABLE ROW LEVEL SECURITY;

-- 3. Purchase Orders
DO $$ BEGIN
  CREATE TYPE public.po_status AS ENUM ('draft','ordered','partial','received','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.store_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.store_suppliers(id) ON DELETE RESTRICT,
  status public.po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.store_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.store_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON public.store_purchase_orders(order_date DESC);

-- 4. PO Items
CREATE TABLE IF NOT EXISTS public.store_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.store_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  qty_ordered INT NOT NULL CHECK (qty_ordered > 0),
  qty_received INT NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_poi_po ON public.store_purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON public.store_purchase_order_items(product_id);

-- 5. Stock Movements
DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM ('purchase_in','sale_out','adjustment','return_in','return_out','opname');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.store_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  type public.stock_movement_type NOT NULL,
  qty INT NOT NULL,                           -- signed (positive = in, negative = out)
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ref_table TEXT,
  ref_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_movement_product ON public.store_stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_type ON public.store_stock_movements(type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_movement_ref
  ON public.store_stock_movements(ref_table, ref_id, type)
  WHERE ref_table IS NOT NULL AND ref_id IS NOT NULL;

-- 6. Add columns to store_products
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS current_stock INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock INT NOT NULL DEFAULT 0;

-- 7. Trigger: update product stock & avg_cost on movement
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_stock INT;
  v_old_cost NUMERIC(14,2);
  v_new_stock INT;
  v_new_cost NUMERIC(14,2);
BEGIN
  SELECT current_stock, avg_cost INTO v_old_stock, v_old_cost
    FROM public.store_products WHERE id = NEW.product_id FOR UPDATE;

  v_new_stock := COALESCE(v_old_stock,0) + NEW.qty;

  -- Weighted-avg cost only on inbound purchases
  IF NEW.type = 'purchase_in' AND NEW.qty > 0 AND NEW.unit_cost > 0 THEN
    v_new_cost := ((COALESCE(v_old_stock,0) * COALESCE(v_old_cost,0)) + (NEW.qty * NEW.unit_cost))
                  / NULLIF(v_new_stock,0);
  ELSE
    v_new_cost := v_old_cost;
  END IF;

  UPDATE public.store_products
    SET current_stock = v_new_stock,
        avg_cost = COALESCE(v_new_cost,0),
        updated_at = now()
    WHERE id = NEW.product_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.store_stock_movements;
CREATE TRIGGER trg_apply_stock_movement
AFTER INSERT ON public.store_stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- 8. Generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bucket TEXT := to_char(now(), 'YYMM');
  v_seq INT;
BEGIN
  INSERT INTO public.store_po_counters(bucket, last_seq) VALUES (v_bucket, 1)
    ON CONFLICT (bucket) DO UPDATE SET last_seq = store_po_counters.last_seq + 1
    RETURNING last_seq INTO v_seq;
  RETURN 'PO-' || v_bucket || '-' || lpad(v_seq::text, 4, '0');
END $$;

-- 9. Receive PO RPC: takes po_id and array of {item_id, qty} JSON
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  _po_id UUID,
  _items JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec JSONB;
  v_item RECORD;
  v_recv INT;
  v_total_ordered INT;
  v_total_received INT;
  v_user UUID := auth.uid();
BEGIN
  -- AuthZ
  IF NOT (public.has_role(v_user,'super_admin') OR public.has_role(v_user,'owner') OR public.has_role(v_user,'branch_manager')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO v_item FROM public.store_purchase_order_items
      WHERE id = (rec->>'item_id')::uuid AND po_id = _po_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_recv := GREATEST(0, (rec->>'qty')::int);
    IF v_recv = 0 THEN CONTINUE; END IF;
    IF v_item.qty_received + v_recv > v_item.qty_ordered THEN
      RAISE EXCEPTION 'qty diterima melebihi qty pesan untuk item %', v_item.id;
    END IF;

    INSERT INTO public.store_stock_movements(product_id, type, qty, unit_cost, ref_table, ref_id, notes, created_by)
      VALUES (v_item.product_id, 'purchase_in', v_recv, v_item.unit_cost, 'store_purchase_order_items', v_item.id, 'Penerimaan PO', v_user);

    UPDATE public.store_purchase_order_items
      SET qty_received = qty_received + v_recv
      WHERE id = v_item.id;
  END LOOP;

  -- Update PO status
  SELECT COALESCE(SUM(qty_ordered),0), COALESCE(SUM(qty_received),0)
    INTO v_total_ordered, v_total_received
    FROM public.store_purchase_order_items WHERE po_id = _po_id;

  UPDATE public.store_purchase_orders
    SET status = CASE
          WHEN v_total_received = 0 THEN status
          WHEN v_total_received >= v_total_ordered THEN 'received'::public.po_status
          ELSE 'partial'::public.po_status
        END,
        received_date = CASE WHEN v_total_received >= v_total_ordered THEN CURRENT_DATE ELSE received_date END,
        updated_at = now()
    WHERE id = _po_id;
END $$;

-- 10. Sale-out trigger when store_orders marked shipped/completed (idempotent)
CREATE OR REPLACE FUNCTION public.apply_store_order_sale_out()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF NEW.status IN ('shipped','completed','delivered')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR v_item IN
      SELECT product_id, quantity, price
        FROM public.store_order_items
        WHERE order_id = NEW.id
    LOOP
      -- Idempotent via uq_movement_ref
      INSERT INTO public.store_stock_movements(product_id, type, qty, unit_cost, ref_table, ref_id, notes, created_by)
        SELECT v_item.product_id, 'sale_out', -v_item.quantity, COALESCE(p.avg_cost,0), 'store_orders', NEW.id, 'Pengiriman order', NEW.updated_by
          FROM public.store_products p WHERE p.id = v_item.product_id
      ON CONFLICT (ref_table, ref_id, type) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

-- Drop & re-create only if updated_by column exists; otherwise fall back
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='store_orders' AND column_name='status') THEN
    DROP TRIGGER IF EXISTS trg_store_order_sale_out ON public.store_orders;
    CREATE TRIGGER trg_store_order_sale_out
      AFTER UPDATE ON public.store_orders
      FOR EACH ROW EXECUTE FUNCTION public.apply_store_order_sale_out();
  END IF;
END $$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Helper: admin check
CREATE OR REPLACE FUNCTION public.is_store_admin(_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'super_admin')
      OR public.has_role(_uid,'owner')
      OR public.has_role(_uid,'branch_manager');
$$;

-- store_suppliers
DROP POLICY IF EXISTS "suppliers_admin_all" ON public.store_suppliers;
CREATE POLICY "suppliers_admin_all" ON public.store_suppliers
  FOR ALL TO authenticated
  USING (public.is_store_admin(auth.uid()))
  WITH CHECK (public.is_store_admin(auth.uid()));

-- store_purchase_orders
DROP POLICY IF EXISTS "po_admin_all" ON public.store_purchase_orders;
CREATE POLICY "po_admin_all" ON public.store_purchase_orders
  FOR ALL TO authenticated
  USING (public.is_store_admin(auth.uid()))
  WITH CHECK (public.is_store_admin(auth.uid()));

-- store_purchase_order_items
DROP POLICY IF EXISTS "poi_admin_all" ON public.store_purchase_order_items;
CREATE POLICY "poi_admin_all" ON public.store_purchase_order_items
  FOR ALL TO authenticated
  USING (public.is_store_admin(auth.uid()))
  WITH CHECK (public.is_store_admin(auth.uid()));

-- store_po_counters (read-only via RPC)
DROP POLICY IF EXISTS "po_counters_admin_read" ON public.store_po_counters;
CREATE POLICY "po_counters_admin_read" ON public.store_po_counters
  FOR SELECT TO authenticated
  USING (public.is_store_admin(auth.uid()));

-- store_stock_movements: admins read+insert; only super_admin delete; no update
DROP POLICY IF EXISTS "movements_admin_select" ON public.store_stock_movements;
CREATE POLICY "movements_admin_select" ON public.store_stock_movements
  FOR SELECT TO authenticated
  USING (public.is_store_admin(auth.uid()));

DROP POLICY IF EXISTS "movements_admin_insert" ON public.store_stock_movements;
CREATE POLICY "movements_admin_insert" ON public.store_stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_store_admin(auth.uid()));

DROP POLICY IF EXISTS "movements_super_delete" ON public.store_stock_movements;
CREATE POLICY "movements_super_delete" ON public.store_stock_movements
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- Updated-at trigger reuse
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='set_updated_at_now') THEN
    CREATE FUNCTION public.set_updated_at_now() RETURNS TRIGGER
      LANGUAGE plpgsql AS $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.store_suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.store_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

DROP TRIGGER IF EXISTS trg_po_updated ON public.store_purchase_orders;
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.store_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- --- 20260513143542_b6675e12-220c-45eb-aad8-6d71ad7fcc5d.sql ---

REVOKE ALL ON FUNCTION public.receive_purchase_order(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_po_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_po_number() TO authenticated;

REVOKE ALL ON FUNCTION public.is_store_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.apply_stock_movement() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_store_order_sale_out() FROM PUBLIC, anon;

-- --- 20260513152135_9fd1b871-8089-4d23-ac2c-b49309921872.sql ---

-- ============================================================
-- 1. STOCK OPNAME APPROVAL WORKFLOW
-- ============================================================

CREATE TYPE public.opname_status AS ENUM ('draft','submitted','approved','rejected');

CREATE TABLE public.store_opname_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status public.opname_status NOT NULL DEFAULT 'draft',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewer_notes text,
  applied_movement_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.store_opname_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.store_opname_sessions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  system_qty int NOT NULL,
  physical_qty int NOT NULL,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  line_notes text,
  applied boolean NOT NULL DEFAULT false,
  movement_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, product_id)
);

CREATE INDEX idx_opname_lines_session ON public.store_opname_lines(session_id);
CREATE INDEX idx_opname_sessions_status ON public.store_opname_sessions(status);

ALTER TABLE public.store_opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_opname_lines    ENABLE ROW LEVEL SECURITY;

-- Sessions: store admins can read; branch_manager limited to own branch
CREATE POLICY opname_sessions_select ON public.store_opname_sessions
  FOR SELECT USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR (public.has_role(auth.uid(),'branch_manager')
        AND (branch_id IS NULL OR branch_id = public.get_user_branch_id(auth.uid())))
  );
CREATE POLICY opname_sessions_insert ON public.store_opname_sessions
  FOR INSERT WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY opname_sessions_update ON public.store_opname_sessions
  FOR UPDATE USING (public.is_store_admin(auth.uid()));
CREATE POLICY opname_sessions_delete ON public.store_opname_sessions
  FOR DELETE USING (
    public.is_store_admin(auth.uid()) AND status IN ('draft','rejected')
  );

CREATE POLICY opname_lines_select ON public.store_opname_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.store_opname_sessions s
      WHERE s.id = session_id
        AND (public.has_role(auth.uid(),'super_admin')
          OR public.has_role(auth.uid(),'owner')
          OR (public.has_role(auth.uid(),'branch_manager')
              AND (s.branch_id IS NULL OR s.branch_id = public.get_user_branch_id(auth.uid()))))
    )
  );
CREATE POLICY opname_lines_write ON public.store_opname_lines
  FOR ALL USING (
    public.is_store_admin(auth.uid())
    AND EXISTS (SELECT 1 FROM public.store_opname_sessions s
                WHERE s.id = session_id AND s.status IN ('draft','submitted'))
  ) WITH CHECK (public.is_store_admin(auth.uid()));

CREATE TRIGGER trg_opname_sessions_uat
  BEFORE UPDATE ON public.store_opname_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Code generator
CREATE OR REPLACE FUNCTION public.generate_opname_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_code text; v_exists boolean;
BEGIN
  LOOP
    v_code := 'OPN-' || to_char(now(),'YYMMDD') || '-' || upper(substring(md5(random()::text),1,4));
    SELECT EXISTS(SELECT 1 FROM public.store_opname_sessions WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END $$;

-- Submit
CREATE OR REPLACE FUNCTION public.submit_opname_session(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status opname_status; v_count int;
BEGIN
  IF NOT public.is_store_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status INTO v_status FROM public.store_opname_sessions WHERE id = _session_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'invalid_state: % (must be draft/rejected)', v_status;
  END IF;
  SELECT count(*) INTO v_count FROM public.store_opname_lines WHERE session_id = _session_id;
  IF v_count = 0 THEN RAISE EXCEPTION 'no_lines'; END IF;

  UPDATE public.store_opname_sessions
    SET status = 'submitted', submitted_at = now(),
        reviewed_by = NULL, reviewed_at = NULL, reviewer_notes = NULL
    WHERE id = _session_id;
END $$;

-- Approve & apply adjustments
CREATE OR REPLACE FUNCTION public.approve_opname_session(_session_id uuid, _reviewer_notes text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status opname_status;
  v_line RECORD;
  v_diff int;
  v_movement_id uuid;
  v_count int := 0;
BEGIN
  IF NOT public.is_store_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status INTO v_status FROM public.store_opname_sessions WHERE id = _session_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_status <> 'submitted' THEN RAISE EXCEPTION 'invalid_state: %', v_status; END IF;

  FOR v_line IN
    SELECT l.*, p.current_stock AS live_stock, p.avg_cost
    FROM public.store_opname_lines l
    JOIN public.store_products p ON p.id = l.product_id
    WHERE l.session_id = _session_id AND l.applied = false
  LOOP
    v_diff := v_line.physical_qty - COALESCE(v_line.live_stock,0);
    IF v_diff <> 0 THEN
      INSERT INTO public.store_stock_movements
        (product_id, type, qty, unit_cost, ref_table, ref_id, notes, created_by)
      VALUES
        (v_line.product_id, 'adjustment', v_diff,
         COALESCE(v_line.avg_cost,0),
         'store_opname_lines', v_line.id,
         'Opname approval — fisik ' || v_line.physical_qty || ' vs sistem ' || COALESCE(v_line.live_stock,0),
         auth.uid())
      RETURNING id INTO v_movement_id;

      UPDATE public.store_opname_lines
        SET applied = true, movement_id = v_movement_id
        WHERE id = v_line.id;
      v_count := v_count + 1;
    ELSE
      UPDATE public.store_opname_lines SET applied = true WHERE id = v_line.id;
    END IF;
  END LOOP;

  UPDATE public.store_opname_sessions
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
        reviewer_notes = _reviewer_notes, applied_movement_count = v_count
    WHERE id = _session_id;

  RETURN v_count;
END $$;

-- Reject
CREATE OR REPLACE FUNCTION public.reject_opname_session(_session_id uuid, _reviewer_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status opname_status;
BEGIN
  IF NOT public.is_store_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reviewer_notes IS NULL OR length(trim(_reviewer_notes)) = 0 THEN
    RAISE EXCEPTION 'reviewer_notes_required';
  END IF;
  SELECT status INTO v_status FROM public.store_opname_sessions WHERE id = _session_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_status <> 'submitted' THEN RAISE EXCEPTION 'invalid_state: %', v_status; END IF;

  UPDATE public.store_opname_sessions
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
        reviewer_notes = _reviewer_notes
    WHERE id = _session_id;
END $$;

-- ============================================================
-- 2. LOW-STOCK ALERTS
-- ============================================================

CREATE TABLE public.store_low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('low','out')),
  current_stock int NOT NULL,
  min_stock int NOT NULL,
  branch_id uuid,
  resolved_at timestamptz,
  resolved_stock int,
  channels jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_low_stock_unresolved
  ON public.store_low_stock_alerts(product_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_low_stock_created ON public.store_low_stock_alerts(created_at DESC);

ALTER TABLE public.store_low_stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY low_stock_alerts_select ON public.store_low_stock_alerts
  FOR SELECT USING (public.is_store_admin(auth.uid()));
CREATE POLICY low_stock_alerts_admin_write ON public.store_low_stock_alerts
  FOR ALL USING (public.is_store_admin(auth.uid())) WITH CHECK (true);

-- Trigger function: detects threshold crossings on store_products
CREATE OR REPLACE FUNCTION public.tg_store_product_low_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_below boolean;
  v_new_below boolean;
  v_alert_type text;
  v_admin_user_ids uuid[];
  v_admin_phones text[];
  v_admin_user_emails RECORD;
  v_alert_id uuid;
  v_msg text;
  v_email_count int := 0;
  v_wa_count int := 0;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN RETURN NEW; END IF;
  IF COALESCE(NEW.min_stock,0) <= 0 THEN RETURN NEW; END IF;

  v_old_below := COALESCE(OLD.current_stock,0) <= COALESCE(OLD.min_stock,0)
                 AND COALESCE(OLD.min_stock,0) > 0;
  v_new_below := COALESCE(NEW.current_stock,0) <= COALESCE(NEW.min_stock,0);

  -- Resolve open alerts when stock back above min
  IF NOT v_new_below AND v_old_below THEN
    UPDATE public.store_low_stock_alerts
      SET resolved_at = now(), resolved_stock = NEW.current_stock
      WHERE product_id = NEW.id AND resolved_at IS NULL;
    RETURN NEW;
  END IF;

  -- Only fire on a fresh crossing (was OK, now below) to avoid spam
  IF NOT v_new_below OR v_old_below THEN RETURN NEW; END IF;

  v_alert_type := CASE WHEN NEW.current_stock <= 0 THEN 'out' ELSE 'low' END;

  INSERT INTO public.store_low_stock_alerts
    (product_id, alert_type, current_stock, min_stock, branch_id)
  VALUES (NEW.id, v_alert_type, NEW.current_stock, COALESCE(NEW.min_stock,0), NEW.branch_id)
  RETURNING id INTO v_alert_id;

  -- Recipient admin user_ids: super_admin + owner + branch_manager (scoped if branch known)
  SELECT COALESCE(array_agg(DISTINCT ur.user_id), '{}') INTO v_admin_user_ids
  FROM public.user_roles ur
  WHERE ur.role IN ('super_admin','owner')
     OR (ur.role = 'branch_manager'
         AND (NEW.branch_id IS NULL OR ur.branch_id IS NULL OR ur.branch_id = NEW.branch_id));

  v_msg := CASE WHEN v_alert_type = 'out'
    THEN '🚨 Stok HABIS: ' || NEW.name || ' (sisa ' || NEW.current_stock || ', min ' || NEW.min_stock || ')'
    ELSE '⚠️ Stok menipis: ' || NEW.name || ' (sisa ' || NEW.current_stock || ', min ' || NEW.min_stock || ')'
  END;

  -- In-app + browser push
  IF COALESCE(array_length(v_admin_user_ids,1),0) > 0 THEN
    PERFORM public.enqueue_push(
      v_admin_user_ids,
      CASE WHEN v_alert_type='out' THEN 'Stok Produk Habis' ELSE 'Stok Produk Menipis' END,
      v_msg, CASE WHEN v_alert_type='out' THEN 'error' ELSE 'warning' END,
      '/admin/store/low-stock'
    );
  END IF;

  -- WhatsApp queue (one row per admin with phone)
  INSERT INTO public.whatsapp_logs (recipient_phone, message_content, status)
  SELECT p.phone, v_msg || E'\n\nKelola di panel admin > Toko > Stok Menipis.', 'pending'
  FROM public.profiles p
  WHERE p.user_id = ANY(v_admin_user_ids)
    AND p.phone IS NOT NULL
    AND length(trim(p.phone)) >= 8;
  GET DIAGNOSTICS v_wa_count = ROW_COUNT;

  -- Email queue (one row per admin with email)
  INSERT INTO public.email_logs
    (recipient_email, recipient_name, subject, body_html, template_type, reference_type, reference_id, status, metadata)
  SELECT
    u.email, p.full_name,
    CASE WHEN v_alert_type='out' THEN '[Stok Habis] ' ELSE '[Stok Menipis] ' END || NEW.name,
    '<p>' || v_msg || '</p><p>SKU: ' || COALESCE(NEW.sku,'-') ||
       '</p><p>Silakan buka panel admin untuk membuat Purchase Order.</p>',
    'low_stock_alert', 'store_low_stock_alerts', v_alert_id, 'pending',
    jsonb_build_object('product_id', NEW.id, 'alert_type', v_alert_type)
  FROM public.profiles p
  JOIN public.list_users_with_emails() u ON u.id = p.user_id
  WHERE p.user_id = ANY(v_admin_user_ids) AND u.email IS NOT NULL;
  GET DIAGNOSTICS v_email_count = ROW_COUNT;

  UPDATE public.store_low_stock_alerts
    SET channels = jsonb_build_object(
      'push', COALESCE(array_length(v_admin_user_ids,1),0),
      'whatsapp_queued', v_wa_count,
      'email_queued', v_email_count
    )
    WHERE id = v_alert_id;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_store_product_low_stock
  AFTER UPDATE OF current_stock, min_stock, is_active ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_store_product_low_stock();

-- --- 20260513223955_2b02318f-e799-489e-b332-b9860460484e.sql ---
-- Fix: deleting a departure failed because related operational tables had no ON DELETE rule.
-- equipment_distributions & manasik_schedules belong to a departure -> CASCADE.
-- support_tickets keep history -> SET NULL.
-- bookings remain RESTRICT on purpose (prevent losing customer/payment data).

ALTER TABLE public.equipment_distributions
  DROP CONSTRAINT IF EXISTS equipment_distributions_departure_id_fkey,
  ADD  CONSTRAINT equipment_distributions_departure_id_fkey
       FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;

ALTER TABLE public.manasik_schedules
  DROP CONSTRAINT IF EXISTS manasik_schedules_departure_id_fkey,
  ADD  CONSTRAINT manasik_schedules_departure_id_fkey
       FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_departure_id_fkey,
  ADD  CONSTRAINT support_tickets_departure_id_fkey
       FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE SET NULL;
-- --- 20260513224928_1b3311e2-263f-48b9-9186-a384cc4fd5d.sql ---
-- [FILE NOT FOUND: supabase/migrations/20260513224928_1b3311e2-263f-48b9-9186-a384cc4fd5d.sql]

-- --- 20260513225013_2b4c98b8-7c7f-4ebf-9b31-062103be236b.sql ---
REVOKE EXECUTE ON FUNCTION public.delete_departure_safely(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_departure_safely(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_departure_safely(uuid) TO authenticated;
-- --- 20260513230115_fddd400b-e462-489b-8257-9ffe0435285d.sql ---
-- Recreate delete_departure_safely to guarantee it exists in live DB
CREATE OR REPLACE FUNCTION public.delete_departure_safely(_departure_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_count int := 0;
  v_deleted int := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF _departure_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_departure_id');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.departures WHERE id = _departure_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'departure_not_found');
  END IF;

  SELECT COUNT(*) INTO v_booking_count
  FROM public.bookings
  WHERE departure_id = _departure_id
    AND COALESCE(booking_status::text, '') NOT IN ('cancelled', 'refunded');

  IF v_booking_count > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'departure_has_bookings',
      'booking_count', v_booking_count
    );
  END IF;

  -- Cascading cleanup of dependent data
  DELETE FROM public.equipment_distributions WHERE departure_id = _departure_id;
  DELETE FROM public.manasik_schedules WHERE departure_id = _departure_id;

  -- Optional dependents (ignore if table missing)
  BEGIN DELETE FROM public.attendance WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.bus_assignments WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.departure_hotels WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.itineraries WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.surveys WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.luggage WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.manifests WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.room_assignments WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.seat_holds WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.vendor_costs WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Nullable references (preserve data)
  BEGIN UPDATE public.support_tickets SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.visa_applications SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.jamaah_live_locations SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.room_assignment_audit SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  DELETE FROM public.departures WHERE id = _departure_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'deleted_count', v_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_departure_safely(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_departure_safely(uuid) TO authenticated;

-- Force PostgREST schema cache reload so RPC is immediately discoverable
NOTIFY pgrst, 'reload schema';
-- --- 20260513230859_41afb4ce-2a07-46a7-a1f2-23be52d8eb46.sql ---
-- Auto-reload PostgREST schema cache after any DDL change
CREATE OR REPLACE FUNCTION public.pgrst_watch_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

DROP EVENT TRIGGER IF EXISTS pgrst_watch_ddl_end;
CREATE EVENT TRIGGER pgrst_watch_ddl_end
  ON ddl_command_end
  EXECUTE FUNCTION public.pgrst_watch_ddl();

DROP EVENT TRIGGER IF EXISTS pgrst_watch_drop;
CREATE EVENT TRIGGER pgrst_watch_drop
  ON sql_drop
  EXECUTE FUNCTION public.pgrst_watch_ddl();

-- Initial reload to pick up current state
NOTIFY pgrst, 'reload schema';
-- --- 20260514030830_68f8f4df-8d55-4ce2-bf5f-8d87fdb1ff64.sql ---
CREATE TABLE IF NOT EXISTS public.web_vitals_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL CHECK (metric_name IN ('LCP','CLS','INP','FCP','TTFB')),
  metric_value numeric NOT NULL CHECK (metric_value >= 0 AND metric_value < 1000000),
  rating text CHECK (rating IN ('good','needs-improvement','poor')),
  metric_id text,
  navigation_type text,
  route text NOT NULL,
  device_type text CHECK (device_type IN ('mobile','tablet','desktop')),
  user_agent text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  release_version text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wvm_metric_time ON public.web_vitals_metrics(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wvm_route ON public.web_vitals_metrics(route);
CREATE INDEX IF NOT EXISTS idx_wvm_branch ON public.web_vitals_metrics(branch_id);
CREATE INDEX IF NOT EXISTS idx_wvm_release ON public.web_vitals_metrics(release_version);
CREATE INDEX IF NOT EXISTS idx_wvm_device ON public.web_vitals_metrics(device_type);

ALTER TABLE public.web_vitals_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert web vitals" ON public.web_vitals_metrics;
CREATE POLICY "Anyone can insert web vitals"
ON public.web_vitals_metrics
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin owner read web vitals" ON public.web_vitals_metrics;
CREATE POLICY "Admin owner read web vitals"
ON public.web_vitals_metrics
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);

DROP POLICY IF EXISTS "Branch manager read own branch web vitals" ON public.web_vitals_metrics;
CREATE POLICY "Branch manager read own branch web vitals"
ON public.web_vitals_metrics
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'branch_manager'::app_role)
  AND branch_id IN (
    SELECT ur.branch_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.branch_id IS NOT NULL
  )
);

-- =============================================================================
-- SELESAI — migration_fresh.sql generated successfully
-- =============================================================================
