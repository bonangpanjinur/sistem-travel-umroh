-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M04: Organizations & Agents — Branches, Agents, Muthawifs, Employees
-- Depends on: M01, M02, M03
-- =============================================================================

-- =============================================================================
-- 1. BRANCHES — Cabang perusahaan
-- =============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  code              TEXT UNIQUE,
  slug              TEXT UNIQUE,
  address           TEXT,
  city              TEXT,
  province          TEXT,
  phone             TEXT,
  email             TEXT,
  logo_url          TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  manager_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  membership_plan   TEXT DEFAULT 'reguler',
  membership_expiry DATE,
  subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active','expired','suspended','trial')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_code      ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_slug      ON branches(slug);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_auth_read"    ON branches;
DROP POLICY IF EXISTS "branches_admin_write"  ON branches;
DROP POLICY IF EXISTS "branches_manager_own"  ON branches;

CREATE POLICY "branches_auth_read" ON branches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "branches_admin_write" ON branches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

CREATE POLICY "branches_manager_own" ON branches
  FOR UPDATE USING (manager_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_branches_updated_at'
    AND tgrelid='branches'::regclass) THEN
    CREATE TRIGGER set_branches_updated_at
      BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON branches TO authenticated, anon;


-- =============================================================================
-- 2. AGENTS — Agen mitra
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_code        TEXT UNIQUE,
  slug              TEXT UNIQUE,
  company_name      TEXT,
  pic_name          TEXT,
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  city              TEXT,
  logo_url          TEXT,
  commission_rate   NUMERIC(5,2) DEFAULT 2.00,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  membership_plan   TEXT DEFAULT 'silver',
  membership_expiry DATE,
  subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active','expired','suspended','trial')),
  parent_agent_id   UUID REFERENCES agents(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id    ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_branch_id  ON agents(branch_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug       ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_agent_code ON agents(agent_code);
CREATE INDEX IF NOT EXISTS idx_agents_is_active  ON agents(is_active);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_public_read"   ON agents;
DROP POLICY IF EXISTS "agents_auth_read"     ON agents;
DROP POLICY IF EXISTS "agents_own_manage"    ON agents;
DROP POLICY IF EXISTS "agents_admin_write"   ON agents;

CREATE POLICY "agents_public_read" ON agents
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "agents_auth_read" ON agents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "agents_own_manage" ON agents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "agents_admin_write" ON agents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agents_updated_at'
    AND tgrelid='agents'::regclass) THEN
    CREATE TRIGGER set_agents_updated_at
      BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON agents TO anon, authenticated;


-- =============================================================================
-- 3. MUTHAWIFS — Data muthawif/pembimbing jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS muthawifs (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  photo_url       TEXT,
  certification   TEXT,
  years_exp       INTEGER DEFAULT 0,
  languages       TEXT[] DEFAULT ARRAY['id'],
  specialization  TEXT[] DEFAULT ARRAY['umroh'],
  bio             TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muthawifs_branch_id    ON muthawifs(branch_id);
CREATE INDEX IF NOT EXISTS idx_muthawifs_is_available ON muthawifs(is_available);

ALTER TABLE muthawifs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawifs_auth_read"   ON muthawifs;
DROP POLICY IF EXISTS "muthawifs_staff_write" ON muthawifs;

CREATE POLICY "muthawifs_auth_read" ON muthawifs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "muthawifs_staff_write" ON muthawifs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','hr','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_muthawifs_updated_at'
    AND tgrelid='muthawifs'::regclass) THEN
    CREATE TRIGGER set_muthawifs_updated_at
      BEFORE UPDATE ON muthawifs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON muthawifs TO authenticated;


-- =============================================================================
-- 4. EMPLOYEES — Data karyawan internal
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  employee_code   TEXT UNIQUE,
  full_name       TEXT NOT NULL,
  position        TEXT,
  department      TEXT,
  phone           TEXT,
  email           TEXT,
  nik             TEXT UNIQUE,
  join_date       DATE,
  end_date        DATE,
  employment_type TEXT DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time','part_time','contract','intern','freelance')),
  base_salary     NUMERIC(15,2),
  bank_name       TEXT,
  bank_account    TEXT,
  bank_account_name TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id   ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_hr_manage"   ON employees;
DROP POLICY IF EXISTS "employees_own_read"    ON employees;

CREATE POLICY "employees_hr_manage" ON employees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','hr','it'))
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

GRANT SELECT ON employees TO authenticated;


-- =============================================================================
-- 5. WEBSITE_SETTINGS — Pengaturan website publik per agen/cabang/global
-- =============================================================================
CREATE TABLE IF NOT EXISTS website_settings (
  id                          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id                    UUID REFERENCES agents(id) ON DELETE CASCADE,
  branch_id                   UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name                TEXT,
  active_theme                TEXT DEFAULT 'classic',
  template                    TEXT DEFAULT 'classic',
  primary_color               TEXT DEFAULT '160 84% 25%',
  secondary_color             TEXT DEFAULT '160 20% 96%',
  accent_color                TEXT DEFAULT '45 93% 47%',
  background_color            TEXT DEFAULT '0 0% 100%',
  foreground_color            TEXT DEFAULT '160 50% 5%',
  heading_font                TEXT DEFAULT 'Plus Jakarta Sans',
  body_font                   TEXT DEFAULT 'Inter',
  tagline                     TEXT,
  footer_description          TEXT,
  footer_bottom_text          TEXT,
  meta_title                  TEXT,
  meta_description            TEXT,
  hero_title                  TEXT,
  hero_subtitle               TEXT,
  hero_cta_text               TEXT DEFAULT 'Pesan Sekarang',
  hero_cta_link               TEXT DEFAULT '/packages',
  hero_display_mode           TEXT DEFAULT 'both',
  featured_packages_count     INTEGER DEFAULT 6,
  package_card_layout         TEXT DEFAULT 'modern',
  package_card_image_ratio    TEXT DEFAULT '16/10',
  package_card_show_airline   BOOLEAN DEFAULT TRUE,
  package_card_show_hotel     BOOLEAN DEFAULT TRUE,
  package_card_show_duration  BOOLEAN DEFAULT TRUE,
  package_card_show_departure BOOLEAN DEFAULT TRUE,
  custom_css                  TEXT,
  custom_js                   TEXT,
  google_analytics_id         TEXT,
  facebook_pixel_id           TEXT,
  whatsapp_number             TEXT,
  social_instagram            TEXT,
  social_facebook             TEXT,
  social_youtube              TEXT,
  view_count                  INTEGER NOT NULL DEFAULT 0,
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_settings_agent_id  ON website_settings(agent_id);
CREATE INDEX IF NOT EXISTS idx_website_settings_branch_id ON website_settings(branch_id);

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_settings_anon_read"   ON website_settings;
DROP POLICY IF EXISTS "website_settings_auth_read"   ON website_settings;
DROP POLICY IF EXISTS "website_settings_owner_write" ON website_settings;
DROP POLICY IF EXISTS "website_settings_admin_all"   ON website_settings;

CREATE POLICY "website_settings_anon_read" ON website_settings
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "website_settings_owner_write" ON website_settings
  FOR ALL USING (
    agent_id  IN (SELECT id FROM agents  WHERE user_id = auth.uid()) OR
    branch_id IN (SELECT id FROM branches WHERE manager_id = auth.uid())
  );

CREATE POLICY "website_settings_admin_all" ON website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_website_settings_updated_at'
    AND tgrelid='website_settings'::regclass) THEN
    CREATE TRIGGER set_website_settings_updated_at
      BEFORE UPDATE ON website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON website_settings TO anon, authenticated;


-- =============================================================================
-- 6. MEMBERSHIP_PLANS — Paket berlangganan agen/cabang
-- =============================================================================
CREATE TABLE IF NOT EXISTS membership_plans (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  plan_type        TEXT NOT NULL DEFAULT 'agent'
    CHECK (plan_type IN ('agent','branch','corporate')),
  price_monthly    NUMERIC(15,2),
  price_yearly     NUMERIC(15,2),
  max_sub_agents   INTEGER,
  commission_rate  NUMERIC(5,2) DEFAULT 0,
  storage_gb       INTEGER DEFAULT 1,
  description      TEXT,
  features         JSONB DEFAULT '[]'::JSONB,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_plans_read_all"    ON membership_plans;
DROP POLICY IF EXISTS "membership_plans_admin_write" ON membership_plans;

CREATE POLICY "membership_plans_read_all" ON membership_plans
  FOR SELECT USING (TRUE);

CREATE POLICY "membership_plans_admin_write" ON membership_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_membership_plans_updated_at'
    AND tgrelid='membership_plans'::regclass) THEN
    CREATE TRIGGER set_membership_plans_updated_at
      BEFORE UPDATE ON membership_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON membership_plans TO anon, authenticated;


-- =============================================================================
-- SELESAI — File M04: Orgs & Agents
-- =============================================================================
SELECT 'v3_M04_orgs_agents: OK' AS result;
