-- =============================================================================
-- FILE 02 — Core Entities
-- Urutan: profiles → user_roles → airlines/hotels/vendors →
--         branches → agents → muthawifs → employees →
--         packages → departures → document_types → menu_items
-- Jalankan setelah 01_extensions_helpers.sql
-- =============================================================================

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

DROP POLICY IF EXISTS "profiles_own"             ON profiles;
DROP POLICY IF EXISTS "staff_read_profiles"       ON profiles;
DROP POLICY IF EXISTS "admin_read_profiles_for_status" ON profiles;

CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "staff_read_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
-- NOTE: "admin_read_profiles_for_status" policy is added AFTER user_roles table
-- is created below, because it references the user_roles table.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_profiles_updated_at'
    AND tgrelid='profiles'::regclass) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Auto-create profile saat user baru register
-- PENTING: dibungkus BEGIN/EXCEPTION agar error DB tidak pernah membatalkan auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, full_name, email, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: gagal buat profil untuk %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- 2. USER_ROLES — RBAC: role per user (termasuk 'it' dari fase31)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN (
    'super_admin','owner','admin','branch_manager','finance',
    'operational','sales','marketing','hr','equipment',
    'agent','sub_agent','customer','jamaah','visa_officer','it'
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

-- Add profile policy that references user_roles (deferred to here so user_roles exists)
CREATE POLICY "admin_read_profiles_for_status" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
  );


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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "role_perms_staff_read" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 4. PERMISSIONS_LIST — Daftar semua izin yang tersedia
-- =============================================================================
CREATE TABLE IF NOT EXISTS permissions_list (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  group_name  TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permissions_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_permissions_list"   ON permissions_list;
DROP POLICY IF EXISTS "admin_manage_permissions_list" ON permissions_list;

CREATE POLICY "staff_read_permissions_list" ON permissions_list
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_permissions_list" ON permissions_list
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner'))
  );


-- =============================================================================
-- 5. AIRLINES — Data maskapai penerbangan
-- =============================================================================
CREATE TABLE IF NOT EXISTS airlines (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  iata_code  TEXT UNIQUE,
  logo_url   TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airlines_is_active ON airlines(is_active);

ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airlines_admin_manage" ON airlines;
DROP POLICY IF EXISTS "airlines_public_read"  ON airlines;

CREATE POLICY "airlines_admin_manage" ON airlines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational'))
  );

CREATE POLICY "airlines_public_read" ON airlines
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_airlines_updated_at'
    AND tgrelid='airlines'::regclass) THEN
    CREATE TRIGGER set_airlines_updated_at
      BEFORE UPDATE ON airlines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 6. HOTELS — Data hotel mitra
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational'))
  );

CREATE POLICY "hotels_public_read" ON hotels
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_hotels_updated_at'
    AND tgrelid='hotels'::regclass) THEN
    CREATE TRIGGER set_hotels_updated_at
      BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 7. VENDORS — Mitra/vendor eksternal
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance','operational'))
  );

CREATE POLICY "vendors_staff_read" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendors_updated_at'
    AND tgrelid='vendors'::regclass) THEN
    CREATE TRIGGER set_vendors_updated_at
      BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 8. BRANCHES — Kantor cabang
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

CREATE INDEX IF NOT EXISTS idx_branches_code               ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active          ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_slug               ON branches(slug);
CREATE INDEX IF NOT EXISTS branches_manager_user_id_idx    ON branches(manager_user_id);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_admin_manage"       ON branches;
DROP POLICY IF EXISTS "branches_manager_manage_own" ON branches;
DROP POLICY IF EXISTS "branches_public_read"        ON branches;

CREATE POLICY "branches_admin_manage" ON branches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "branches_manager_manage_own" ON branches
  FOR ALL USING (manager_user_id = auth.uid());

CREATE POLICY "branches_public_read" ON branches
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_branches_updated_at'
    AND tgrelid='branches'::regclass) THEN
    CREATE TRIGGER set_branches_updated_at
      BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 9. AGENTS — Agen perjalanan (termasuk kolom fase2 & fase17)
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agents_own_manage" ON agents
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "agents_public_read" ON agents
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agents_updated_at'
    AND tgrelid='agents'::regclass) THEN
    CREATE TRIGGER set_agents_updated_at
      BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "muthawifs_public_read" ON muthawifs
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_muthawifs_updated_at'
    AND tgrelid='muthawifs'::regclass) THEN
    CREATE TRIGGER set_muthawifs_updated_at
      BEFORE UPDATE ON muthawifs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 11. EMPLOYEES — Data karyawan (termasuk kolom HR dari fase10)
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
  photo_url           TEXT,
  basic_salary        NUMERIC(15,2) DEFAULT 0,
  allowances          JSONB DEFAULT '{}',
  bank_name           TEXT,
  bank_account_number TEXT,
  bank_account_name   TEXT,
  tax_id              TEXT,
  bpjs_kes_number     TEXT,
  bpjs_tk_number      TEXT,
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','hr'))
  );

CREATE POLICY "employees_hr_manage" ON employees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('branch_manager'))
  );

CREATE POLICY "employees_own_read" ON employees
  FOR SELECT USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_employees_updated_at'
    AND tgrelid='employees'::regclass) THEN
    CREATE TRIGGER set_employees_updated_at
      BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 12. PACKAGES — Paket umroh/haji (termasuk fee_branch dari fase1)
-- =============================================================================
CREATE TABLE IF NOT EXISTS packages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  code           TEXT,
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "packages_public_read" ON packages
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_packages_updated_at'
    AND tgrelid='packages'::regclass) THEN
    CREATE TRIGGER set_packages_updated_at
      BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 13. DEPARTURES — Jadwal keberangkatan
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "departures_public_read" ON departures
  FOR SELECT USING (status IN ('open','full'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departures_updated_at'
    AND tgrelid='departures'::regclass) THEN
    CREATE TRIGGER set_departures_updated_at
      BEFORE UPDATE ON departures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 14. DOCUMENT_TYPES — Jenis dokumen jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS document_types (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom jika tabel sudah ada dari migrasi lama tanpa kolom ini
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS code        TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT FALSE;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS sort_order  INTEGER DEFAULT 0;

-- Pastikan constraint UNIQUE pada code ada
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_types_code_key'
      AND conrelid = 'document_types'::regclass
  ) THEN
    ALTER TABLE document_types ADD CONSTRAINT document_types_code_key UNIQUE (code);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_types_admin_manage" ON document_types;
DROP POLICY IF EXISTS "document_types_staff_read"   ON document_types;

CREATE POLICY "document_types_admin_manage" ON document_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "document_types_staff_read" ON document_types
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO document_types (name, code, is_required, sort_order) VALUES
  ('Paspor',              'passport',       TRUE,  1),
  ('KTP',                 'ktp',            TRUE,  2),
  ('Kartu Keluarga',      'kk',             FALSE, 3),
  ('Foto 3x4',            'foto',           TRUE,  4),
  ('Akta Kelahiran',      'akta',           FALSE, 5),
  ('Buku Nikah',          'buku_nikah',     FALSE, 6),
  ('Surat Keterangan Sehat', 'surat_sehat', FALSE, 7),
  ('Vaksin Meningitis',   'vaksin',         TRUE,  8)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- 15. MENU_ITEMS — Konfigurasi menu sidebar admin
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

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_staff_read"   ON menu_items;
DROP POLICY IF EXISTS "menu_items_admin_manage" ON menu_items;

CREATE POLICY "menu_items_staff_read" ON menu_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "menu_items_admin_manage" ON menu_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner'))
  );

-- =============================================================================
-- SELESAI — File 02: Core Entities
-- =============================================================================
SELECT 'File 02 — Core Entities: OK' AS result;
