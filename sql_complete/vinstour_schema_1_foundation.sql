-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — SCHEMA LENGKAP BAGIAN 1: TABEL FONDASI
-- Meliputi semua tabel inti (Fase 0 + tambahan dari migrasi individu)
-- Urutan eksekusi: File ini PERTAMA, sebelum _2_extended dan _3_store
-- =============================================================================

-- =============================================================================
-- BAGIAN 0: HELPER FUNCTIONS
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
-- 1. PROFILES — Ekstensi dari auth.users (profil pengguna)
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

DROP POLICY IF EXISTS "profiles_own"        ON profiles;
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
  created_at     TIMESTAMPTZ DEFAULT NOW(),
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

CREATE INDEX IF NOT EXISTS idx_branches_code         ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active    ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_slug         ON branches(slug);
CREATE INDEX IF NOT EXISTS idx_branches_manager      ON branches(manager_user_id);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_admin_manage"       ON branches;
DROP POLICY IF EXISTS "branches_manager_manage_own" ON branches;
DROP POLICY IF EXISTS "branches_public_read"        ON branches;

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
-- 7. AGENTS — Agen perjalanan (mendukung multi-level / sub-agen)
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id            UUID REFERENCES branches(id) ON DELETE SET NULL,
  parent_agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  company_name         TEXT NOT NULL,
  agent_code           TEXT NOT NULL UNIQUE,
  contact_name         TEXT,
  phone                TEXT,
  email                TEXT,
  address              TEXT,
  commission_rate      NUMERIC(5,2) DEFAULT 0,
  is_active            BOOLEAN DEFAULT TRUE,
  slug                 TEXT UNIQUE,
  featured_package_ids JSONB DEFAULT '[]',
  website_bio          TEXT,
  level                INTEGER DEFAULT 1,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
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

-- Trigger auto-slug agen
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

-- Trigger auto-slug cabang
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
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id      UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  departure_date  DATE NOT NULL,
  return_date     DATE,
  quota           INTEGER DEFAULT 45,
  available_seats INTEGER DEFAULT 45,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','full','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
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
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  specialization TEXT,
  languages      TEXT[] DEFAULT '{}',
  is_active      BOOLEAN DEFAULT TRUE,
  photo_url      TEXT,
  bio            TEXT,
  rating         NUMERIC(3,2) DEFAULT 0,
  total_reviews  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
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
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name           TEXT NOT NULL,
  employee_code       TEXT UNIQUE,
  position            TEXT,
  department          TEXT,
  phone               TEXT,
  email               TEXT,
  join_date           DATE,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','resigned')),
  salary              NUMERIC(15,2) DEFAULT 0,
  basic_salary        NUMERIC(15,2) DEFAULT 0,
  allowances          JSONB DEFAULT '{}',
  bank_name           TEXT,
  bank_account_number TEXT,
  bank_account_name   TEXT,
  tax_id              TEXT,
  bpjs_kes_number     TEXT,
  bpjs_tk_number      TEXT,
  photo_url           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
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
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id                   UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name                   TEXT NOT NULL,
  nik                         TEXT,
  gender                      TEXT CHECK (gender IN ('L','P')),
  phone                       TEXT,
  email                       TEXT,
  address                     TEXT,
  city                        TEXT,
  province                    TEXT,
  district                    TEXT,
  village                     TEXT,
  postal_code                 TEXT,
  birth_date                  DATE,
  birth_place                 TEXT,
  passport_number             TEXT,
  passport_expiry             DATE,
  passport_issued             TEXT,
  photo_url                   TEXT,
  is_active                   BOOLEAN DEFAULT TRUE,
  nomor_porsi_haji            TEXT,
  embarkasi_kode              TEXT,
  estimasi_keberangkatan_haji INTEGER,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
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
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  departure_id      UUID REFERENCES departures(id) ON DELETE SET NULL,
  agent_id          UUID REFERENCES agents(id) ON DELETE SET NULL,
  booking_code      TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed')),
  total_price       NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid')),
  room_type         TEXT DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  room_number       TEXT,
  notes             TEXT,
  referral_source   TEXT DEFAULT 'direct'
    CHECK (referral_source IN ('direct','agent_website','branch_website','referral','whatsapp','instagram','facebook','other')),
  bagasi_kg_allowed INTEGER DEFAULT 23,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id   ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code   ON bookings(booking_code);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_admin_manage" ON bookings;
DROP POLICY IF EXISTS "bookings_own_read"     ON bookings;
DROP POLICY IF EXISTS "bookings_agent_read"   ON bookings;

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
-- 14. PAYMENTS — Pembayaran booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method   TEXT NOT NULL DEFAULT 'transfer'
    CHECK (payment_method IN ('transfer','cash','midtrans','qris','va','gopay','shopeepay','ovo','lainnya')),
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','cancelled')),
  proof_url        TEXT,
  notes            TEXT,
  verified_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  transaction_id   TEXT,
  payment_type     TEXT,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id     ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status         ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date   ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_admin_manage" ON payments;
DROP POLICY IF EXISTS "payments_own_read"     ON payments;

CREATE POLICY "payments_admin_manage" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "payments_own_read" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_payments_updated_at'
    AND tgrelid='payments'::regclass) THEN
    CREATE TRIGGER set_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 15. BOOKING_PASSENGERS — Daftar penumpang per booking
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

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking_id    ON booking_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_customer_id   ON booking_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_family_group  ON booking_passengers(family_group_id) WHERE family_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_passengers_room_group    ON booking_passengers(room_group_id)   WHERE room_group_id  IS NOT NULL;

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
-- 16. ROOM_ASSIGNMENTS — Penugasan kamar hotel
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
-- 17. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan jamaah
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
-- 18. SAVINGS_PLANS — Tabungan perjalanan
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
-- 19. SAVINGS_DEPOSITS — Setoran tabungan
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
-- 20. LEADS — Data calon jamaah/prospek
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  source           TEXT DEFAULT 'direct'
    CHECK (source IN ('direct','whatsapp','instagram','facebook','referral','website','lainnya')),
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id         UUID REFERENCES agents(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost')),
  notes            TEXT,
  package_interest TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
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
-- 21. NOTIFICATIONS — Notifikasi sistem (admin channel)
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
-- 22. SUPPORT_TICKETS — Tiket dukungan jamaah
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

DROP POLICY IF EXISTS "support_tickets_staff_manage" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_own_manage"   ON support_tickets;

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
-- 23. ANNOUNCEMENTS — Pengumuman internal
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

DROP POLICY IF EXISTS "announcements_admin_manage" ON announcements;
DROP POLICY IF EXISTS "announcements_staff_read"   ON announcements;

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
-- 24. BANNERS — Banner promosi website
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
-- 25. COUPONS — Kupon diskon
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

DROP POLICY IF EXISTS "coupons_admin_manage" ON coupons;
DROP POLICY IF EXISTS "coupons_public_read"  ON coupons;

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
-- 26. DOCUMENT_TYPES — Jenis dokumen yang diperlukan
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
-- 27. CUSTOMER_DOCUMENTS — Dokumen jamaah yang diunggah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_documents (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  file_url         TEXT NOT NULL,
  file_type        TEXT,
  file_size        INTEGER,
  expires_at       DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','expired')),
  notes            TEXT,
  verified_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_docs_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_docs_status      ON customer_documents(status);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_docs_staff_manage" ON customer_documents;
DROP POLICY IF EXISTS "customer_docs_own_manage"   ON customer_documents;

CREATE POLICY "customer_docs_staff_manage" ON customer_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')
    )
  );

CREATE POLICY "customer_docs_own_manage" ON customer_documents
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_docs_updated_at'
    AND tgrelid='customer_documents'::regclass) THEN
    CREATE TRIGGER set_customer_docs_updated_at
      BEFORE UPDATE ON customer_documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 28. CUSTOMER_MAHRAMS — Data mahram jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_mahrams (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mahram_name         TEXT NOT NULL,
  mahram_relation     TEXT NOT NULL
    CHECK (mahram_relation IN ('suami','istri','ayah','ibu','anak','saudara','paman','kakek','nenek','cucu')),
  relation_category   TEXT DEFAULT 'lainnya'
    CHECK (relation_category IN ('suami','istri','anak','ayah','ibu','saudara','kakek','nenek','cucu','lainnya')),
  mahram_customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_mahrams_customer_id        ON customer_mahrams(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_mahrams_mahram_customer_id ON customer_mahrams(mahram_customer_id);

ALTER TABLE customer_mahrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_mahrams_staff_manage"      ON customer_mahrams;
DROP POLICY IF EXISTS "customer_mahrams_own_read"          ON customer_mahrams;
DROP POLICY IF EXISTS "customer_mahrams_own_insert"        ON customer_mahrams;
DROP POLICY IF EXISTS "customer_mahrams_own_update"        ON customer_mahrams;
DROP POLICY IF EXISTS "customer_mahrams_own_delete"        ON customer_mahrams;

CREATE POLICY "customer_mahrams_staff_manage" ON customer_mahrams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','sales')
    )
  );

CREATE POLICY "customer_mahrams_own_read" ON customer_mahrams
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "customer_mahrams_own_insert" ON customer_mahrams
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "customer_mahrams_own_update" ON customer_mahrams
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "customer_mahrams_own_delete" ON customer_mahrams
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_customer_mahrams_updated_at'
    AND tgrelid='customer_mahrams'::regclass) THEN
    CREATE TRIGGER update_customer_mahrams_updated_at
      BEFORE UPDATE ON customer_mahrams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 29. TESTIMONIALS — Ulasan & testimoni jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS testimonials (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  package_id   UUID REFERENCES packages(id) ON DELETE SET NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review       TEXT NOT NULL,
  photo_url    TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured  BOOLEAN DEFAULT FALSE,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_customer_id  ON testimonials(customer_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_published ON testimonials(is_published);
CREATE INDEX IF NOT EXISTS idx_testimonials_branch_id    ON testimonials(branch_id);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials_admin_manage"   ON testimonials;
DROP POLICY IF EXISTS "testimonials_own_insert"     ON testimonials;
DROP POLICY IF EXISTS "testimonials_public_read"    ON testimonials;

CREATE POLICY "testimonials_admin_manage" ON testimonials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

CREATE POLICY "testimonials_own_insert" ON testimonials
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "testimonials_public_read" ON testimonials
  FOR SELECT USING (is_published = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_testimonials_updated_at'
    AND tgrelid='testimonials'::regclass) THEN
    CREATE TRIGGER set_testimonials_updated_at
      BEFORE UPDATE ON testimonials
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 30. MENU_ITEMS — Navigasi menu dashboard
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
-- 31. VISA_APPLICATIONS — Pengajuan visa jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS visa_applications (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  departure_id     UUID REFERENCES departures(id) ON DELETE SET NULL,
  visa_type        TEXT DEFAULT 'umroh',
  passport_number  TEXT,
  passport_expiry  DATE,
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','processing','approved','rejected','expired')),
  visa_number      TEXT,
  visa_expiry      DATE,
  applied_date     DATE,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_apps_customer_id ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_booking_id  ON visa_applications(booking_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_departure   ON visa_applications(departure_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_status      ON visa_applications(status);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visa_apps_staff_manage"      ON visa_applications;
DROP POLICY IF EXISTS "visa_apps_own_read"          ON visa_applications;

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
-- 32. SOS_ALERTS — Sinyal darurat jamaah di lapangan
-- =============================================================================
CREATE TABLE IF NOT EXISTS sos_alerts (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_code         TEXT,
  departure_id         UUID REFERENCES departures(id) ON DELETE SET NULL,
  emergency_type       TEXT NOT NULL DEFAULT 'other'
    CHECK (emergency_type IN ('medical','lost','security','other')),
  message              TEXT,
  location             TEXT,
  latitude             NUMERIC(10,6),
  longitude            NUMERIC(10,6),
  accuracy             FLOAT8,
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','responding','resolved','pending','responded')),
  response_notes       TEXT,
  resolved_at          TIMESTAMPTZ,
  resolved_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL,
  responded_at         TIMESTAMPTZ,
  branch_id            UUID REFERENCES branches(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_customer_id  ON sos_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_departure_id ON sos_alerts(departure_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status       ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_branch_id    ON sos_alerts(branch_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at   ON sos_alerts(created_at DESC);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sos_alerts_staff_manage"  ON sos_alerts;
DROP POLICY IF EXISTS "sos_alerts_own_insert"    ON sos_alerts;
DROP POLICY IF EXISTS "sos_alerts_own_read"      ON sos_alerts;
DROP POLICY IF EXISTS "customer_insert_sos"      ON sos_alerts;
DROP POLICY IF EXISTS "customer_read_own_sos"    ON sos_alerts;
DROP POLICY IF EXISTS "staff_manage_sos"         ON sos_alerts;

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
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "sos_alerts_own_read" ON sos_alerts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
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
-- SEED: DOCUMENT TYPES
-- =============================================================================
INSERT INTO document_types (name, description, is_required, category) VALUES
  ('KTP/NIK', 'Kartu Tanda Penduduk', TRUE, 'identitas'),
  ('Kartu Keluarga', 'Kartu Keluarga', FALSE, 'identitas'),
  ('Paspor', 'Paspor yang masih berlaku', TRUE, 'perjalanan'),
  ('Foto 3x4', 'Foto terbaru berlatar putih 3x4', TRUE, 'identitas'),
  ('Foto 4x6', 'Foto terbaru berlatar putih 4x6', FALSE, 'identitas'),
  ('Sertifikat Vaksin', 'Sertifikat vaksin meningitis & COVID-19', TRUE, 'kesehatan'),
  ('Buku Nikah', 'Buku nikah (untuk mahram suami/istri)', FALSE, 'identitas'),
  ('Akta Kelahiran', 'Akta kelahiran (untuk anak)', FALSE, 'identitas'),
  ('Bukti Pembayaran DP', 'Bukti transfer uang muka', TRUE, 'keuangan'),
  ('BPJS Kesehatan', 'Kartu BPJS Kesehatan', FALSE, 'kesehatan')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED: MENU ITEMS (semua fitur)
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  -- Umum
  ('dashboard',           'Dashboard',              '/admin',                       'LayoutDashboard', 'Umum',        1,   'dashboard',           true),
  -- Operasional
  ('bookings',            'Pemesanan',              '/admin/bookings',              'BookOpen',        'Operasional', 10,  'bookings',            true),
  ('customers',           'Data Jamaah',            '/admin/customers',             'Users',           'Operasional', 20,  'customers',           true),
  ('packages',            'Paket Perjalanan',       '/admin/packages',              'Package',         'Operasional', 30,  'packages',            true),
  ('departures',          'Keberangkatan',          '/admin/departures',            'Plane',           'Operasional', 40,  'departures',          true),
  ('vendors',             'Vendor',                 '/admin/vendors',               'Store',           'Operasional', 50,  'vendors',             true),
  ('hotels',              'Hotel',                  '/admin/hotels',                'Hotel',           'Operasional', 60,  'hotels',              true),
  ('muthawifs',           'Muthawif',               '/admin/muthawifs',             'User',            'Operasional', 70,  'muthawifs',           true),
  ('visa',                'Visa',                   '/admin/visa',                  'FileText',        'Operasional', 80,  'visa',                true),
  ('sos-alerts',          'SOS Alerts',             '/admin/sos-alerts',            'AlertTriangle',   'Operasional', 90,  'sos-alerts',          true),
  ('vendor-contracts',    'Kontrak Vendor',         '/admin/vendor-contracts',      'FilePen',         'Operasional', 95,  'vendor-contracts',    true),
  ('siskohat',            'SISKOHAT Kemenag',       '/admin/siskohat',              'Landmark',        'Operasional', 96,  'siskohat',            true),
  ('visa-status-logs',    'Log Status Visa',        '/admin/visa-logs',             'FileSearch',      'Operasional', 97,  'visa-status-logs',    true),
  ('equipment',           'Inventaris Alat',        '/admin/equipment',             'Package',         'Operasional', 98,  'equipment',           true),
  -- Keuangan
  ('payments',            'Pembayaran',             '/admin/payments',              'CreditCard',      'Keuangan',    100, 'payments',            true),
  ('reports',             'Laporan',                '/admin/reports',               'BarChart2',       'Keuangan',    110, 'reports',             true),
  ('expenses',            'Pengeluaran',            '/admin/expenses',              'Receipt',         'Keuangan',    120, 'expenses',            true),
  ('transactions',        'Transaksi',              '/admin/transactions',          'ArrowLeftRight',  'Keuangan',    130, 'transactions',        true),
  ('approval-requests',   'Approval Workflow',      '/admin/approvals',             'CheckSquare',     'Keuangan',    140, 'approval-requests',   true),
  -- Penjualan
  ('agents',              'Agen',                   '/admin/agents',                'UserCheck',       'Penjualan',   200, 'agents',              true),
  ('leads',               'Prospek',                '/admin/leads',                 'Target',          'Penjualan',   205, 'leads',               true),
  ('chat-leads',          'Leads Chat Widget',      '/admin/chat-leads',            'MessageCircle',   'Penjualan',   206, 'chat-leads',          true),
  ('sales-targets',       'Target Penjualan',       '/admin/sales-targets',         'Target',          'Penjualan',   207, 'sales-targets',       true),
  ('store',               'Toko Online',            '/admin/store',                 'ShoppingBag',     'Penjualan',   210, 'store',               true),
  ('store-products',      'Produk Toko',            '/admin/store/products',        'Package',         'Penjualan',   211, 'store-products',      true),
  ('store-orders',        'Pesanan Toko',           '/admin/store/orders',          'ShoppingCart',    'Penjualan',   212, 'store-orders',        true),
  ('store-categories',    'Kategori Produk',        '/admin/store/categories',      'Tag',             'Penjualan',   213, 'store-categories',    true),
  -- SDM
  ('employees',           'Karyawan',               '/admin/employees',             'Briefcase',       'SDM',         300, 'employees',           true),
  ('training',            'Pelatihan Agen',         '/admin/training',              'GraduationCap',   'SDM',         310, 'training',            true),
  -- Marketing
  ('marketing-campaigns', 'Kampanye Marketing',     '/admin/marketing/campaigns',   'Megaphone',       'Marketing',   400, 'marketing-campaigns', true),
  ('media-gallery',       'Galeri Media',           '/admin/media-gallery',         'Film',            'Marketing',   410, 'media-gallery',       true),
  -- Sistem
  ('branches',            'Cabang',                 '/admin/branches',              'Building2',       'Sistem',      800, 'branches',            true),
  ('users',               'Manajemen User',         '/admin/users',                 'UserCog',         'Sistem',      810, 'users',               true),
  ('notifications',       'Notifikasi',             '/admin/notifications',         'Bell',            'Sistem',      820, 'notifications',       true),
  ('settings',            'Pengaturan',             '/admin/settings',              'Settings',        'Sistem',      900, 'settings',            true),
  ('website-settings',    'Pengaturan Website',     '/admin/website-settings',      'Globe',           'Sistem',      905, 'website-settings',    true),
  ('dashboard-config',    'Konfigurasi Dashboard',  '/admin/dashboard-config',      'Settings2',       'Sistem',      910, 'dashboard-config',    true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- =============================================================================
-- SEED: ROLE PERMISSIONS
-- =============================================================================
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('super_admin'),('owner'),('admin')) AS r(role)
CROSS JOIN (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('reports'),('agents'),('leads'),('employees'),
  ('branches'),('users'),('settings'),('website-settings'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),('notifications'),
  ('sos-alerts'),('approval-requests'),('visa-status-logs'),('expenses'),
  ('transactions'),('marketing-campaigns'),('equipment'),('sales-targets'),
  ('dashboard-config'),('vendor-contracts'),('training'),('siskohat'),
  ('media-gallery'),('chat-leads'),
  ('store'),('store-products'),('store-orders'),('store-categories')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('reports'),('agents'),('leads'),('employees'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),('notifications'),
  ('sos-alerts'),('approval-requests'),('visa-status-logs'),('expenses'),
  ('equipment'),('sales-targets'),('vendor-contracts'),('training'),('siskohat'),
  ('chat-leads'),('store-orders')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'operational', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('departures'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),
  ('sos-alerts'),('visa-status-logs'),('equipment'),('siskohat'),
  ('store-orders')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'finance', p FROM (VALUES
  ('dashboard'),('bookings'),('payments'),('reports'),
  ('approval-requests'),('expenses'),('transactions')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'sales', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('leads'),('agents'),
  ('approval-requests'),('chat-leads'),('sales-targets')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'marketing', p FROM (VALUES
  ('dashboard'),('leads'),('packages'),('marketing-campaigns'),('media-gallery'),
  ('store-products'),('store-categories')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'agent', p FROM (VALUES
  ('dashboard'),('bookings'),('customers')
) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'hr', p FROM (VALUES
  ('dashboard'),('employees')
) AS t(p)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Schema Fondasi Vinstour (Bagian 1)
-- Lanjutkan dengan menjalankan vinstour_schema_2_extended.sql
-- =============================================================================
SELECT 'Vinstour Schema Bagian 1 (Fondasi) — selesai dibuat.' AS result;
