-- =============================================================================
-- MASTER MIGRATION — Vinstour Travel Portal
-- File ini menggabungkan SEMUA fase (fase0–fase32, store, doc_sprint2,
-- consolidated_all, dan numbered migrations) menjadi satu file yang benar
-- dengan urutan dependensi FK yang tepat.
--
-- Root cause error "column branch_id does not exist":
--   store_products punya FK ke branches, tapi branches belum dibuat.
--   Solusi: urutan tabel mengikuti topologi FK secara ketat.
--
-- Idempotent: aman dijalankan berkali-kali (IF NOT EXISTS, ON CONFLICT, DROP POLICY IF EXISTS)
-- =============================================================================

-- =============================================================================
-- TAHAP 1: EXTENSIONS & HELPER FUNCTIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fungsi auto-update updated_at (digunakan oleh semua trigger)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fungsi slugify teks
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

-- Helper macro membuat trigger updated_at (idempotent)
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
-- TAHAP 2: TABEL STANDALONE (tidak bergantung pada tabel custom lain)
-- =============================================================================

-- ─── 2.1 PROFILES — ekstensi auth.users ──────────────────────────────────────
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
DROP POLICY IF EXISTS "profiles_own"              ON profiles;
DROP POLICY IF EXISTS "staff_read_profiles"       ON profiles;
DROP POLICY IF EXISTS "admin_read_profiles_for_status" ON profiles;

CREATE POLICY "profiles_own" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "staff_read_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

SELECT _create_updated_at_trigger('profiles');

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


-- ─── 2.2 USER_ROLES — RBAC ────────────────────────────────────────────────────
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
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin'))
  );
CREATE POLICY "user_roles_read_own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());


-- ─── 2.3 ROLE_PERMISSIONS ─────────────────────────────────────────────────────
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
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "role_perms_staff_read" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');


-- ─── 2.4 HOTELS ───────────────────────────────────────────────────────────────
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

CREATE POLICY "hotels_admin_manage" ON hotels FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational')));
CREATE POLICY "hotels_public_read" ON hotels FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('hotels');


-- ─── 2.5 VENDORS ──────────────────────────────────────────────────────────────
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

CREATE POLICY "vendors_admin_manage" ON vendors FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','finance','operational')));
CREATE POLICY "vendors_staff_read" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');
SELECT _create_updated_at_trigger('vendors');


-- ─── 2.6 AIRLINES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airlines (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT,
  logo_url   TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airlines_is_active ON airlines(is_active);
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "airlines_admin_manage" ON airlines;
DROP POLICY IF EXISTS "airlines_public_read"  ON airlines;

CREATE POLICY "airlines_admin_manage" ON airlines FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational')));
CREATE POLICY "airlines_public_read" ON airlines FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('airlines');


-- ─── 2.7 MENU_ITEMS ───────────────────────────────────────────────────────────
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

CREATE POLICY "menu_items_admin_manage" ON menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "menu_items_staff_read" ON menu_items
  FOR SELECT USING (auth.role() = 'authenticated');


-- ─── 2.8 COMPANY_SETTINGS ─────────────────────────────────────────────────────
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

CREATE POLICY "admin_manage_company_settings" ON company_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "public_read_company_settings" ON company_settings FOR SELECT USING (TRUE);
SELECT _create_updated_at_trigger('company_settings');


-- ─── 2.9 BANK_ACCOUNTS ────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active  ON bank_accounts(is_active)  WHERE is_active = TRUE;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "public_read_bank_accounts"  ON bank_accounts;

CREATE POLICY "admin_manage_bank_accounts" ON bank_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','finance')));
CREATE POLICY "public_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('bank_accounts');


-- ─── 2.10 STORE_CATEGORIES ────────────────────────────────────────────────────
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

CREATE POLICY "admin_manage_store_categories" ON store_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','marketing')));
CREATE POLICY "public_read_store_categories" ON store_categories
  FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('store_categories');


-- ─── 2.11 TRAINING_MODULES ────────────────────────────────────────────────────
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

CREATE POLICY "admin_manage_training_modules" ON training_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
CREATE POLICY "agent_read_training_modules" ON training_modules
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');
SELECT _create_updated_at_trigger('training_modules');


-- ─── 2.12 TRAINING_QUIZZES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_quizzes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  answer      TEXT,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_module_id ON training_quizzes(module_id);
ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_training_quizzes" ON training_quizzes;
DROP POLICY IF EXISTS "agent_read_training_quizzes"   ON training_quizzes;

CREATE POLICY "admin_manage_training_quizzes" ON training_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
CREATE POLICY "agent_read_training_quizzes" ON training_quizzes
  FOR SELECT USING (auth.role() = 'authenticated');


-- ─── 2.13 INVOICE_TEMPLATES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'booking'
    CHECK (type IN ('booking','store','custom')),
  header_html     TEXT,
  footer_html     TEXT,
  body_template   TEXT,
  variables       JSONB DEFAULT '[]',
  is_default      BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_invoice_templates" ON invoice_templates;
DROP POLICY IF EXISTS "staff_read_invoice_templates"   ON invoice_templates;

CREATE POLICY "staff_manage_invoice_templates" ON invoice_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','finance','operational')));
CREATE POLICY "staff_read_invoice_templates" ON invoice_templates
  FOR SELECT USING (auth.role() = 'authenticated');
SELECT _create_updated_at_trigger('invoice_templates');


-- ─── 2.14 BAGGAGE_REFERENCE_ITEMS ─────────────────────────────────────────────
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
CREATE POLICY "admin_manage_baggage_reference" ON baggage_reference_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));


-- ─── 2.15 MEMBERSHIP_PLANS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS membership_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  plan_type      TEXT NOT NULL CHECK (plan_type IN ('agent','branch')),
  price_yearly   NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_sub_agents INTEGER DEFAULT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  description    TEXT,
  features       JSONB DEFAULT '[]',
  is_active      BOOLEAN DEFAULT TRUE,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_membership_plans"  ON membership_plans;
DROP POLICY IF EXISTS "admin_manage_membership_plans" ON membership_plans;

CREATE POLICY "public_read_membership_plans" ON membership_plans
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "admin_manage_membership_plans" ON membership_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner')));
SELECT _create_updated_at_trigger('membership_plans');


-- ─── 2.16 EMAIL_TEMPLATES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  variables  TEXT[] DEFAULT '{}',
  trigger    TEXT DEFAULT 'manual',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_email_templates"   ON email_templates;
DROP POLICY IF EXISTS "staff_manage_email_templates" ON email_templates;

CREATE POLICY "staff_read_email_templates" ON email_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "staff_manage_email_templates" ON email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','branch_manager','marketing')));
SELECT _create_updated_at_trigger('email_templates');


-- ─── 2.17 APP_SETTINGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_admin"  ON app_settings;
DROP POLICY IF EXISTS "app_settings_public" ON app_settings;

CREATE POLICY "app_settings_admin" ON app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "app_settings_public" ON app_settings FOR SELECT USING (TRUE);


-- ─── 2.18 APPROVAL_CONFIGS ────────────────────────────────────────────────────
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

CREATE POLICY "admin_manage_approval_configs" ON approval_configs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner')));
CREATE POLICY "staff_read_approval_configs" ON approval_configs
  FOR SELECT USING (auth.role() = 'authenticated');


-- ─── 2.19 DOCUMENT_TYPES ──────────────────────────────────────────────────────
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

CREATE POLICY "document_types_admin_manage" ON document_types FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "document_types_public_read" ON document_types FOR SELECT USING (TRUE);


-- ─── 2.20 COUPONS ─────────────────────────────────────────────────────────────
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

CREATE POLICY "coupons_admin_manage" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','marketing')));
CREATE POLICY "coupons_public_read" ON coupons FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('coupons');


-- ─── 2.21 WA_FEATURE_ROADMAP ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_feature_roadmap (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase       INTEGER NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'planned'
               CHECK (status IN ('done','in_progress','planned','cancelled')),
  target_date DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wa_feature_roadmap ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_roadmap_read"  ON wa_feature_roadmap;
DROP POLICY IF EXISTS "wa_roadmap_write" ON wa_feature_roadmap;

CREATE POLICY "wa_roadmap_read" ON wa_feature_roadmap FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "wa_roadmap_write" ON wa_feature_roadmap FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','it')));
SELECT _create_updated_at_trigger('wa_feature_roadmap');


-- =============================================================================
-- TAHAP 3: BRANCHES (pivot utama, semua tabel organisasi bergantung padanya)
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
  -- Branch branding (Sprint DOC-2)
  signature_url         TEXT,
  stamp_url             TEXT,
  logo_url              TEXT,
  letterhead_data       JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_code      ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_slug      ON branches(slug);
CREATE INDEX IF NOT EXISTS branches_manager_user_id_idx ON branches(manager_user_id);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_admin_manage"       ON branches;
DROP POLICY IF EXISTS "branches_manager_manage_own" ON branches;
DROP POLICY IF EXISTS "branches_public_read"        ON branches;

CREATE POLICY "branches_admin_manage" ON branches FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "branches_manager_manage_own" ON branches
  FOR ALL USING (manager_user_id = auth.uid());
CREATE POLICY "branches_public_read" ON branches FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('branches');

-- Trigger slug otomatis untuk branches
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
-- TAHAP 4: ENTITIES BERGANTUNG PADA BRANCHES
-- =============================================================================

-- ─── 4.1 AGENTS ───────────────────────────────────────────────────────────────
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

CREATE POLICY "agents_admin_manage" ON agents FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
CREATE POLICY "agents_own_manage" ON agents FOR ALL USING (user_id = auth.uid());
CREATE POLICY "agents_public_read" ON agents FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('agents');

-- Trigger slug otomatis untuk agents
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


-- ─── 4.2 MUTHAWIFS ────────────────────────────────────────────────────────────
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

CREATE POLICY "muthawifs_admin_manage" ON muthawifs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
CREATE POLICY "muthawifs_public_read" ON muthawifs FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('muthawifs');


-- ─── 4.3 EMPLOYEES ────────────────────────────────────────────────────────────
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

CREATE POLICY "employees_admin_manage" ON employees FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','hr')));
CREATE POLICY "employees_hr_manage" ON employees FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('branch_manager')));
CREATE POLICY "employees_own_read" ON employees FOR SELECT USING (user_id = auth.uid());
SELECT _create_updated_at_trigger('employees');


-- ─── 4.4 CUSTOMERS ────────────────────────────────────────────────────────────
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
DROP POLICY IF EXISTS "customers_admin_manage"      ON customers;
DROP POLICY IF EXISTS "customers_own_read"          ON customers;
DROP POLICY IF EXISTS "customers_public_read_check" ON customers;

CREATE POLICY "customers_admin_manage" ON customers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance')));
CREATE POLICY "customers_own_read" ON customers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "customers_public_read_check" ON customers FOR SELECT USING (TRUE);
SELECT _create_updated_at_trigger('customers');


-- =============================================================================
-- TAHAP 5: PACKAGES & STORE_PRODUCTS (bergantung branches)
-- =============================================================================

-- ─── 5.1 PACKAGES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id            UUID REFERENCES branches(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  type                 TEXT NOT NULL DEFAULT 'umroh'
    CHECK (type IN ('umroh','haji','haji_plus','wisata')),
  description          TEXT,
  highlights           TEXT,
  price                NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_double         NUMERIC(15,2),
  price_triple         NUMERIC(15,2),
  price_quad           NUMERIC(15,2),
  duration_days        INTEGER DEFAULT 9,
  departure_city       TEXT,
  airline              TEXT,
  hotel_mecca          TEXT,
  hotel_medina         TEXT,
  includes             JSONB DEFAULT '[]',
  excludes             JSONB DEFAULT '[]',
  terms                TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  photo_url            TEXT,
  gallery_urls         JSONB DEFAULT '[]',
  quota                INTEGER DEFAULT 45,
  fee_branch           NUMERIC(5,2) DEFAULT 0,
  child_price_percent  NUMERIC DEFAULT 75,
  infant_price_percent NUMERIC DEFAULT 10,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_branch_id ON packages(branch_id);
CREATE INDEX IF NOT EXISTS idx_packages_type      ON packages(type);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "packages_admin_manage" ON packages;
DROP POLICY IF EXISTS "packages_public_read"  ON packages;

CREATE POLICY "packages_admin_manage" ON packages FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
CREATE POLICY "packages_public_read" ON packages FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('packages');


-- ─── 5.2 STORE_PRODUCTS (bergantung store_categories + branches) ──────────────
-- Ini yang sebelumnya error — store_products dibuat sebelum branches di COMPLETE_SETUP.sql
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
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,  -- ← branches SUDAH ada di tahap 3
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_active   ON store_products(is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_featured ON store_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_store_products_slug     ON store_products(slug);
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_store_products" ON store_products;
DROP POLICY IF EXISTS "public_read_store_products"  ON store_products;

CREATE POLICY "admin_manage_store_products" ON store_products FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','marketing','operational')));
CREATE POLICY "public_read_store_products" ON store_products
  FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('store_products');


-- =============================================================================
-- TAHAP 6: DEPARTURES & WEBSITE SETTINGS
-- =============================================================================

-- ─── 6.1 DEPARTURES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departures (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id           UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  departure_date       DATE NOT NULL,
  return_date          DATE,
  quota                INTEGER DEFAULT 45,
  available_seats      INTEGER DEFAULT 45,
  status               TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','full','cancelled')),
  notes                TEXT,
  price_adult          NUMERIC DEFAULT 0,
  price_child          NUMERIC DEFAULT 0,
  price_infant         NUMERIC DEFAULT 0,
  child_price_percent  NUMERIC DEFAULT 75,
  infant_price_percent NUMERIC DEFAULT 10,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departures_package_id     ON departures(package_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_date ON departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_departures_status         ON departures(status);
ALTER TABLE departures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departures_admin_manage" ON departures;
DROP POLICY IF EXISTS "departures_public_read"  ON departures;

CREATE POLICY "departures_admin_manage" ON departures FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
CREATE POLICY "departures_public_read" ON departures
  FOR SELECT USING (status IN ('open','full'));
SELECT _create_updated_at_trigger('departures');


-- ─── 6.2 DEPARTURE_HOTELS (multi-hotel per kota per keberangkatan) ────────────
CREATE TABLE IF NOT EXISTS departure_hotels (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  hotel_id       UUID REFERENCES hotels(id) ON DELETE SET NULL,
  airline_id     UUID REFERENCES airlines(id) ON DELETE SET NULL,
  city           TEXT NOT NULL,
  hotel_name     TEXT,
  check_in_date  DATE,
  check_out_date DATE,
  nights         INTEGER DEFAULT 0,
  room_type      TEXT DEFAULT 'quad',
  sort_order     INTEGER DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_hotels_departure_id ON departure_hotels(departure_id);
ALTER TABLE departure_hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_departure_hotels" ON departure_hotels;
DROP POLICY IF EXISTS "public_read_departure_hotels"  ON departure_hotels;

CREATE POLICY "staff_manage_departure_hotels" ON departure_hotels FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
CREATE POLICY "public_read_departure_hotels" ON departure_hotels FOR SELECT USING (TRUE);


-- ─── 6.3 WEBSITE_SETTINGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_settings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id           UUID REFERENCES agents(id) ON DELETE CASCADE,
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name       TEXT,
  logo_url           TEXT,
  favicon_url        TEXT,
  active_theme       TEXT NOT NULL DEFAULT 'default',
  primary_color      TEXT,
  accent_color       TEXT,
  foreground_color   TEXT,
  background_color   TEXT,
  body_font          TEXT,
  heading_font       TEXT,
  footer_description TEXT,
  footer_address     TEXT,
  footer_phone       TEXT,
  footer_email       TEXT,
  footer_whatsapp    TEXT,
  footer_bottom_text TEXT,
  footer_links       JSONB,
  custom_sections    JSONB,
  profile_photo_url  TEXT,
  banner_url         TEXT,
  bio                TEXT,
  testimonials       JSONB DEFAULT '[]',
  gallery_urls       JSONB DEFAULT '[]',
  seo_title          TEXT,
  seo_description    TEXT,
  view_count         INTEGER DEFAULT 0,
  social_youtube     TEXT,
  social_tiktok      TEXT,
  maps_embed_url     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
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

CREATE POLICY "admin_manage_website_settings" ON website_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "agent_manage_own_website_settings" ON website_settings
  FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "branch_manage_own_website_settings" ON website_settings
  FOR ALL USING (branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));
CREATE POLICY "public_read_website_settings" ON website_settings FOR SELECT USING (TRUE);
SELECT _create_updated_at_trigger('website_settings');


-- ─── 6.4 WHATSAPP_CONFIG ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider        TEXT NOT NULL DEFAULT 'fonnte'
    CHECK (provider IN ('fonnte','wablas','whacenter','maytapi','custom')),
  api_key         TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN DEFAULT FALSE,
  display_name    TEXT,
  provider_config JSONB NOT NULL DEFAULT '{}',
  webhook_secret  TEXT,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_full_access_wa_config"  ON whatsapp_config;
DROP POLICY IF EXISTS "wa_config_read_all"            ON whatsapp_config;
DROP POLICY IF EXISTS "wa_config_write_privileged"    ON whatsapp_config;

CREATE POLICY "wa_config_read_all" ON whatsapp_config
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "wa_config_write_privileged" ON whatsapp_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','it')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','it')));
SELECT _create_updated_at_trigger('whatsapp_config');


-- ─── 6.5 WHATSAPP_MESSAGE_TEMPLATES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  content     TEXT NOT NULL,
  variables   TEXT[] DEFAULT '{}',
  category    TEXT DEFAULT 'general',
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_wa_templates" ON whatsapp_message_templates;
DROP POLICY IF EXISTS "staff_read_wa_templates"   ON whatsapp_message_templates;

CREATE POLICY "staff_manage_wa_templates" ON whatsapp_message_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational','marketing')));
CREATE POLICY "staff_read_wa_templates" ON whatsapp_message_templates
  FOR SELECT USING (auth.role() = 'authenticated');
SELECT _create_updated_at_trigger('whatsapp_message_templates');


-- ─── 6.6 VENDOR_CONTRACTS ─────────────────────────────────────────────────────
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
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end_date  ON vendor_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status    ON vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_branch_id ON vendor_contracts(branch_id);
ALTER TABLE vendor_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_vendor_contracts"        ON vendor_contracts;
DROP POLICY IF EXISTS "branch_manager_read_vendor_contracts" ON vendor_contracts;

CREATE POLICY "admin_manage_vendor_contracts" ON vendor_contracts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','finance','operational')));
CREATE POLICY "branch_manager_read_vendor_contracts" ON vendor_contracts
  FOR SELECT USING (branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));
SELECT _create_updated_at_trigger('vendor_contracts');


-- ─── 6.7 DOCUMENT_TEMPLATES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type      TEXT        NOT NULL,
  branch_id     UUID        REFERENCES branches(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  is_default    BOOLEAN     NOT NULL DEFAULT FALSE,
  settings_json JSONB       NOT NULL DEFAULT '{}',
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_tpl_doc_type   ON document_templates(doc_type);
CREATE INDEX IF NOT EXISTS idx_doc_tpl_branch_id  ON document_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_doc_tpl_is_default ON document_templates(is_default);
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_doc_templates"  ON document_templates;
DROP POLICY IF EXISTS "admin_manage_doc_templates" ON document_templates;

CREATE POLICY "staff_read_doc_templates" ON document_templates
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "admin_manage_doc_templates" ON document_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')));
SELECT _create_updated_at_trigger('document_templates');


-- ─── 6.8 MEDIA_GALLERY ────────────────────────────────────────────────────────
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
ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_media_gallery" ON media_gallery;
DROP POLICY IF EXISTS "public_read_media_gallery"  ON media_gallery;

CREATE POLICY "admin_manage_media_gallery" ON media_gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','marketing')));
CREATE POLICY "public_read_media_gallery" ON media_gallery
  FOR SELECT USING (is_active = TRUE);


-- ─── 6.9 BANNERS ──────────────────────────────────────────────────────────────
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

CREATE POLICY "banners_admin_manage" ON banners FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','marketing')));
CREATE POLICY "banners_public_read" ON banners FOR SELECT USING (is_active = TRUE);
SELECT _create_updated_at_trigger('banners');


-- ─── 6.10 ANNOUNCEMENTS ───────────────────────────────────────────────────────
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

CREATE POLICY "announcements_admin_manage" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
CREATE POLICY "announcements_staff_read" ON announcements
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');
SELECT _create_updated_at_trigger('announcements');


-- ─── 6.11 LEADS ───────────────────────────────────────────────────────────────
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

CREATE POLICY "leads_staff_manage" ON leads FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing')));
CREATE POLICY "leads_agent_own_manage" ON leads FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
SELECT _create_updated_at_trigger('leads');


-- ─── 6.12 NOTIFICATIONS ───────────────────────────────────────────────────────
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
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));


-- ─── 6.13 PUSH_SUBSCRIPTIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_sub_own" ON push_subscriptions;

CREATE POLICY "push_sub_own" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());


-- ─── 6.14 WEBHOOKS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  events     TEXT[] DEFAULT '{}',
  secret     TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_webhooks" ON webhooks;

CREATE POLICY "admin_manage_webhooks" ON webhooks FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','it')));
SELECT _create_updated_at_trigger('webhooks');

CREATE TABLE IF NOT EXISTS webhook_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id  UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event       TEXT,
  payload     JSONB,
  response    TEXT,
  status_code INTEGER,
  success     BOOLEAN,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_webhook_logs" ON webhook_logs;

CREATE POLICY "admin_read_webhook_logs" ON webhook_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','it')));


-- ─── 6.15 SISKOHAT_SYNC_LOGS ──────────────────────────────────────────────────
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

CREATE POLICY "admin_manage_siskohat_logs" ON siskohat_sync_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational')));


-- ─── 6.16 SALES_TARGETS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_targets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  target_bookings INTEGER DEFAULT 0,
  target_revenue  NUMERIC(15,2) DEFAULT 0,
  actual_bookings INTEGER DEFAULT 0,
  actual_revenue  NUMERIC(15,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id  ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_branch_id ON sales_targets(branch_id);
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_sales_targets" ON sales_targets;

CREATE POLICY "staff_manage_sales_targets" ON sales_targets FOR ALL USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
SELECT _create_updated_at_trigger('sales_targets');


-- =============================================================================
-- TAHAP 7: BOOKINGS (bergantung customers, departures, agents)
-- =============================================================================

-- ─── 7.1 SEAT_HOLDS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seat_holds (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id   TEXT,
  seats_held   INTEGER NOT NULL DEFAULT 1,
  held_until   TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','released','converted')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_departure_id ON seat_holds(departure_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_status       ON seat_holds(status);
CREATE INDEX IF NOT EXISTS idx_seat_holds_held_until   ON seat_holds(held_until);
ALTER TABLE seat_holds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_seat_holds" ON seat_holds;

CREATE POLICY "staff_manage_seat_holds" ON seat_holds FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','sales'))
  OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));


-- ─── 7.2 BOOKINGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  departure_id     UUID REFERENCES departures(id) ON DELETE SET NULL,
  agent_id         UUID REFERENCES agents(id) ON DELETE SET NULL,
  booking_code     TEXT NOT NULL UNIQUE,
  booking_status   TEXT NOT NULL DEFAULT 'pending'
    CHECK (booking_status IN ('pending','confirmed','cancelled','completed')),
  -- alias untuk backward compat
  status           TEXT GENERATED ALWAYS AS (booking_status) STORED,
  total_price      NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  total_pax        INTEGER NOT NULL DEFAULT 1,
  room_type        TEXT DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  booking_type     TEXT DEFAULT 'full'
    CHECK (booking_type IN ('full','dp','savings')),
  dp_amount        NUMERIC(15,2) DEFAULT 0,
  dp_percentage    NUMERIC(5,2) DEFAULT 0,
  savings_mode     BOOLEAN DEFAULT FALSE,
  payment_deadline DATE,
  notes            TEXT,
  referral_source  TEXT DEFAULT 'direct'
    CHECK (referral_source IN ('direct','agent_website','branch_website','referral',
                               'whatsapp','instagram','facebook','other')),
  bagasi_kg_allowed INTEGER DEFAULT 23,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id   ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code   ON bookings(booking_code);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_admin_manage" ON bookings;
DROP POLICY IF EXISTS "bookings_own_read"     ON bookings;
DROP POLICY IF EXISTS "bookings_agent_read"   ON bookings;

CREATE POLICY "bookings_admin_manage" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')));
CREATE POLICY "bookings_own_read" ON bookings
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "bookings_agent_read" ON bookings
  FOR SELECT USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
SELECT _create_updated_at_trigger('bookings');

-- Function generate kode booking
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TEXT AS $$
DECLARE v_code TEXT;
BEGIN
  v_code := 'VT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
  WHILE EXISTS (SELECT 1 FROM bookings WHERE booking_code = v_code) LOOP
    v_code := 'VT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TAHAP 8: SUB-TABEL BOOKINGS
-- =============================================================================

-- ─── 8.1 BOOKING_PASSENGERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_passengers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  is_main_passenger BOOLEAN DEFAULT FALSE,
  passenger_type    TEXT DEFAULT 'dewasa'
    CHECK (passenger_type IN ('dewasa','lansia','anak','balita','mahram')),
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
CREATE INDEX IF NOT EXISTS idx_booking_passengers_family_group
  ON booking_passengers(family_group_id) WHERE family_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_passengers_room_group
  ON booking_passengers(room_group_id) WHERE room_group_id IS NOT NULL;
ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booking_passengers_admin_manage" ON booking_passengers;
DROP POLICY IF EXISTS "booking_passengers_own_read"     ON booking_passengers;

CREATE POLICY "booking_passengers_admin_manage" ON booking_passengers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')));
CREATE POLICY "booking_passengers_own_read" ON booking_passengers
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));


-- ─── 8.2 BOOKING_LINE_ITEMS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_line_items (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id   UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID,
  item_type    TEXT        NOT NULL DEFAULT 'service',
  description  TEXT        NOT NULL DEFAULT '',
  quantity     NUMERIC     NOT NULL DEFAULT 1,
  unit_price   NUMERIC     NOT NULL DEFAULT 0,
  total_price  NUMERIC     NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id   ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_line_items_passenger_id ON booking_line_items(passenger_id);
ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_manage_booking_line_items" ON booking_line_items;

CREATE POLICY "authenticated_manage_booking_line_items" ON booking_line_items
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);


-- ─── 8.3 BOOKING_STATUS_HISTORY ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_status_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_booking_status_history" ON booking_status_history;
DROP POLICY IF EXISTS "auth_read_booking_status_history"    ON booking_status_history;

CREATE POLICY "staff_manage_booking_status_history" ON booking_status_history FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','finance')));
CREATE POLICY "auth_read_booking_status_history" ON booking_status_history
  FOR SELECT TO authenticated USING (TRUE);


-- ─── 8.4 PAYMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount             NUMERIC(15,2) NOT NULL,
  payment_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method     TEXT DEFAULT 'transfer'
    CHECK (payment_method IN ('transfer','cash','card','qris','virtual_account','other')),
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','verified','rejected','refunded')),
  proof_url          TEXT,
  transaction_id     TEXT,
  notes              TEXT,
  verified_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at        TIMESTAMPTZ,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id    ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date  ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_staff_manage"  ON payments;
DROP POLICY IF EXISTS "payments_own_read"      ON payments;
DROP POLICY IF EXISTS "payments_own_insert"    ON payments;

CREATE POLICY "payments_staff_manage" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','finance','operational')));
CREATE POLICY "payments_own_read" ON payments
  FOR SELECT USING (booking_id IN (
    SELECT b.id FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE c.user_id = auth.uid()));
CREATE POLICY "payments_own_insert" ON payments
  FOR INSERT WITH CHECK (booking_id IN (
    SELECT b.id FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE c.user_id = auth.uid()));
SELECT _create_updated_at_trigger('payments');


-- ─── 8.5 PAYMENT_DEADLINE_REMINDERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_deadline_reminders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code     TEXT,
  phone            TEXT,
  full_name        TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC(15,2),
  days_before      INTEGER NOT NULL DEFAULT 3,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','cancelled')),
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payment_deadline_reminders_booking_days_key UNIQUE (booking_id, days_before)
);

CREATE INDEX IF NOT EXISTS idx_pdr_booking_days ON payment_deadline_reminders(booking_id, days_before);
CREATE INDEX IF NOT EXISTS idx_pdr_status       ON payment_deadline_reminders(status);
ALTER TABLE payment_deadline_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_payment_reminders" ON payment_deadline_reminders;

CREATE POLICY "staff_manage_payment_reminders" ON payment_deadline_reminders FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','finance')));
SELECT _create_updated_at_trigger('payment_deadline_reminders');


-- ─── 8.6 VISA_APPLICATIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visa_applications (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id     UUID REFERENCES departures(id) ON DELETE SET NULL,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  visa_type        TEXT DEFAULT 'umroh',
  passport_number  TEXT,
  passport_expiry  DATE,
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','processing','approved','rejected','expired')),
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
DROP POLICY IF EXISTS "staff_manage_visas"     ON visa_applications;
DROP POLICY IF EXISTS "customer_view_own_visas" ON visa_applications;

CREATE POLICY "staff_manage_visas" ON visa_applications FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')));
CREATE POLICY "customer_view_own_visas" ON visa_applications
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
SELECT _create_updated_at_trigger('visa_applications');


-- ─── 8.7 EMAIL_LOGS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_code   TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  subject         TEXT,
  status          TEXT DEFAULT 'pending',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
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


-- ─── 8.8 BOOKING_FEEDBACK ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  review       TEXT,
  aspects      JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booking_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booking_feedback_own"     ON booking_feedback;
DROP POLICY IF EXISTS "admin_read_booking_feedback" ON booking_feedback;

CREATE POLICY "booking_feedback_own" ON booking_feedback FOR ALL USING (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "admin_read_booking_feedback" ON booking_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','marketing')));
SELECT _create_updated_at_trigger('booking_feedback');


-- =============================================================================
-- TAHAP 9: OPERASIONAL KEBERANGKATAN
-- =============================================================================

-- ─── 9.1 ROOM_ASSIGNMENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_assignments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID REFERENCES departures(id) ON DELETE CASCADE,
  room_number    TEXT NOT NULL,
  room_type      TEXT NOT NULL DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  floor          INTEGER,
  capacity       INTEGER DEFAULT 4,
  hotel_name     TEXT,
  hotel_location TEXT DEFAULT 'mecca',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_departure_id ON room_assignments(departure_id);
ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "room_assignments_staff_manage" ON room_assignments;

CREATE POLICY "room_assignments_staff_manage" ON room_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
SELECT _create_updated_at_trigger('room_assignments');


-- ─── 9.2 MANASIK_SESSIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manasik_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time   TIME,
  end_time     TIME,
  location     TEXT,
  speaker      TEXT,
  topic        TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manasik_sessions_departure_id ON manasik_sessions(departure_id);
CREATE INDEX IF NOT EXISTS idx_manasik_sessions_date         ON manasik_sessions(session_date);
ALTER TABLE manasik_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_manasik_sessions"    ON manasik_sessions;
DROP POLICY IF EXISTS "customer_read_manasik_sessions"   ON manasik_sessions;

CREATE POLICY "staff_manage_manasik_sessions" ON manasik_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
CREATE POLICY "customer_read_manasik_sessions" ON manasik_sessions
  FOR SELECT USING (auth.role() = 'authenticated');
SELECT _create_updated_at_trigger('manasik_sessions');


-- ─── 9.3 MANASIK_ATTENDANCES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manasik_attendances (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          UUID NOT NULL REFERENCES manasik_sessions(id) ON DELETE CASCADE,
  booking_passenger_id UUID REFERENCES booking_passengers(id) ON DELETE SET NULL,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'absent'
    CHECK (status IN ('present','absent','excused')),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manasik_attendances_session_id ON manasik_attendances(session_id);
ALTER TABLE manasik_attendances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_manasik_attendances" ON manasik_attendances;

CREATE POLICY "staff_manage_manasik_attendances" ON manasik_attendances FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));


-- ─── 9.4 DEPARTURE_COST_ITEMS (HPP per item) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL DEFAULT 'other',
  sub_category    TEXT,
  location        TEXT,
  hotel_id        UUID         REFERENCES hotels(id) ON DELETE SET NULL,
  nights          INTEGER,
  room_type       TEXT,
  check_in_date   DATE,
  check_out_date  DATE,
  airline_id      UUID         REFERENCES airlines(id) ON DELETE SET NULL,
  flight_route    TEXT,
  flight_class    TEXT,
  description     TEXT        NOT NULL DEFAULT '',
  unit            TEXT        NOT NULL DEFAULT 'per_pax',
  quantity        NUMERIC     NOT NULL DEFAULT 1,
  unit_cost       NUMERIC     NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC     NOT NULL DEFAULT 1,
  total_cost_idr  NUMERIC     GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  notes           TEXT,
  reference_id    UUID,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_cost_items_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_category     ON departure_cost_items(category);
ALTER TABLE departure_cost_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_departure_cost_items" ON departure_cost_items;

CREATE POLICY "staff_manage_departure_cost_items" ON departure_cost_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')));
SELECT _create_updated_at_trigger('departure_cost_items');


-- ─── 9.5 DEPARTURE_EXPENSES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departure_expenses (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  expense_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  location        TEXT,
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
ALTER TABLE departure_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_departure_expenses" ON departure_expenses;

CREATE POLICY "staff_manage_departure_expenses" ON departure_expenses FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')));
SELECT _create_updated_at_trigger('departure_expenses');


-- ─── 9.6 DEPARTURE_OTHER_REVENUES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT        NOT NULL DEFAULT 'other',
  location        TEXT,
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

CREATE POLICY "staff_manage_departure_other_revenues" ON departure_other_revenues FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')));
SELECT _create_updated_at_trigger('departure_other_revenues');


-- ─── 9.7 DEPARTURE_FINANCIAL_SUMMARY ─────────────────────────────────────────
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
                            revenue_gross + other_revenue_total - hpp_total - expense_total) STORED,
  gross_margin_pct        NUMERIC GENERATED ALWAYS AS (
                            CASE WHEN revenue_gross > 0
                              THEN ROUND(((revenue_gross - hpp_total) / revenue_gross) * 100, 2)
                              ELSE 0 END) STORED,
  last_calculated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE departure_financial_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_departure_financial_summary"  ON departure_financial_summary;
DROP POLICY IF EXISTS "staff_write_departure_financial_summary" ON departure_financial_summary;

CREATE POLICY "staff_read_departure_financial_summary" ON departure_financial_summary
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')));
CREATE POLICY "staff_write_departure_financial_summary" ON departure_financial_summary FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','branch_manager','operational')));


-- ─── 9.8 DEPARTURE_BUDGETS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departure_budgets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id     UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category         TEXT NOT NULL
    CHECK (category IN ('hotel','tiket','visa','katering','transportasi','handling',
                        'manasik','perlengkapan','lainnya')),
  description      TEXT,
  budgeted_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  pax_count        INTEGER,
  per_pax_amount   NUMERIC(15,2),
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, category)
);

CREATE INDEX IF NOT EXISTS idx_departure_budgets_departure_id ON departure_budgets(departure_id);
ALTER TABLE departure_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_departure_budgets" ON departure_budgets;

CREATE POLICY "staff_manage_departure_budgets" ON departure_budgets FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','finance','operational')));
SELECT _create_updated_at_trigger('departure_budgets');


-- ─── 9.9 PACKAGE_HPP_TEMPLATES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_hpp_templates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  description  TEXT,
  unit         TEXT NOT NULL DEFAULT 'per_pax',
  unit_cost    NUMERIC NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'IDR',
  sort_order   INTEGER DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_hpp_templates_package_id ON package_hpp_templates(package_id);
ALTER TABLE package_hpp_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_package_hpp_templates" ON package_hpp_templates;

CREATE POLICY "staff_manage_package_hpp_templates" ON package_hpp_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
SELECT _create_updated_at_trigger('package_hpp_templates');


-- =============================================================================
-- TAHAP 10: CUSTOMER SUPPORT TABLES
-- =============================================================================

-- ─── 10.1 CUSTOMER_DOCUMENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_documents (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_name     TEXT,
  file_size     INTEGER,
  status        TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected')),
  notes         TEXT,
  verified_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_customer_documents"  ON customer_documents;
DROP POLICY IF EXISTS "staff_write_customer_documents" ON customer_documents;

CREATE POLICY "staff_read_customer_documents" ON customer_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent'))
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "staff_write_customer_documents" ON customer_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent'))
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent'))
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
SELECT _create_updated_at_trigger('customer_documents');


-- ─── 10.2 CUSTOMER_MAHRAMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_mahrams (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  relationship  TEXT NOT NULL,
  nik           TEXT,
  passport_number TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_mahrams_customer_id ON customer_mahrams(customer_id);
ALTER TABLE customer_mahrams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_customer_mahrams"  ON customer_mahrams;
DROP POLICY IF EXISTS "staff_write_customer_mahrams" ON customer_mahrams;

CREATE POLICY "staff_read_customer_mahrams" ON customer_mahrams
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent'))
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "staff_write_customer_mahrams" ON customer_mahrams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent'))
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent'))
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
SELECT _create_updated_at_trigger('customer_mahrams');


-- ─── 10.3 LOYALTY_POINTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_points (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL DEFAULT 0,
  action      TEXT NOT NULL,
  reference_id UUID,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_id ON loyalty_points(customer_id);
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_points_own_read"  ON loyalty_points;
DROP POLICY IF EXISTS "staff_manage_loyalty"     ON loyalty_points;

CREATE POLICY "loyalty_points_own_read" ON loyalty_points
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "staff_manage_loyalty" ON loyalty_points FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));


-- ─── 10.4 CUSTOMER_BADGES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_badges (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  badge_name  TEXT NOT NULL,
  badge_type  TEXT NOT NULL,
  icon_url    TEXT,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_customer_badges_customer_id ON customer_badges(customer_id);
ALTER TABLE customer_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_badges_own_read"  ON customer_badges;
DROP POLICY IF EXISTS "staff_manage_badges"       ON customer_badges;

CREATE POLICY "customer_badges_own_read" ON customer_badges
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "staff_manage_badges" ON customer_badges FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational')));


-- ─── 10.5 SOS_ALERTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sos_alerts (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_code         TEXT,
  emergency_type       TEXT NOT NULL
    CHECK (emergency_type IN ('medical','lost','security','other')),
  message              TEXT,
  latitude             FLOAT8,
  longitude            FLOAT8,
  accuracy             FLOAT8,
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','responding','resolved')),
  response_notes       TEXT,
  resolved_at          TIMESTAMPTZ,
  resolved_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id            UUID REFERENCES branches(id) ON DELETE SET NULL,
  assigned_muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL,
  responded_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
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
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "staff_manage_sos" ON sos_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
SELECT _create_updated_at_trigger('sos_alerts');


-- ─── 10.6 VISA_STATUS_LOGS ────────────────────────────────────────────────────
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
ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_insert_visa_log"      ON visa_status_logs;
DROP POLICY IF EXISTS "staff_read_visa_logs"       ON visa_status_logs;
DROP POLICY IF EXISTS "customer_read_own_visa_logs" ON visa_status_logs;

CREATE POLICY "staff_insert_visa_log" ON visa_status_logs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')));
CREATE POLICY "staff_read_visa_logs" ON visa_status_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')));
CREATE POLICY "customer_read_own_visa_logs" ON visa_status_logs
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));


-- ─── 10.7 EQUIPMENT_DISTRIBUTIONS ────────────────────────────────────────────
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

CREATE POLICY "equip_dist_staff_manage" ON equipment_distributions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
CREATE POLICY "equip_dist_own_read" ON equipment_distributions
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));


-- ─── 10.8 SAVINGS_PLANS ───────────────────────────────────────────────────────
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
ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "savings_plans_admin_manage" ON savings_plans;
DROP POLICY IF EXISTS "savings_plans_own_manage"   ON savings_plans;

CREATE POLICY "savings_plans_admin_manage" ON savings_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','finance')));
CREATE POLICY "savings_plans_own_manage" ON savings_plans FOR ALL USING (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
SELECT _create_updated_at_trigger('savings_plans');

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

CREATE POLICY "savings_deposits_admin_manage" ON savings_deposits FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','finance')));
CREATE POLICY "savings_deposits_own_read" ON savings_deposits
  FOR SELECT USING (plan_id IN (
    SELECT sp.id FROM savings_plans sp JOIN customers c ON c.id = sp.customer_id
    WHERE c.user_id = auth.uid()));


-- ─── 10.9 SUPPORT_TICKETS ─────────────────────────────────────────────────────
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

CREATE POLICY "support_tickets_staff_manage" ON support_tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));
CREATE POLICY "support_tickets_own_manage" ON support_tickets FOR ALL USING (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
SELECT _create_updated_at_trigger('support_tickets');


-- ─── 10.10 CUSTOMER_ACCOUNTS & CUSTOMER_NOTIFICATIONS ────────────────────────
CREATE TABLE IF NOT EXISTS customer_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  referred_by_agent_id  UUID REFERENCES agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_slug            TEXT,
  branch_slug           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_user_id     ON customer_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_accounts_own" ON customer_accounts;
CREATE POLICY "customer_accounts_own" ON customer_accounts FOR ALL USING (auth.uid() = user_id);
SELECT _create_updated_at_trigger('customer_accounts');

CREATE TABLE IF NOT EXISTS customer_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error','urgent')),
  link        TEXT,
  icon        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_is_read     ON customer_notifications(is_read);
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_notif_own"       ON customer_notifications;
DROP POLICY IF EXISTS "customer_notif_update"    ON customer_notifications;
DROP POLICY IF EXISTS "staff_manage_notifications" ON customer_notifications;

CREATE POLICY "customer_notif_own" ON customer_notifications
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "customer_notif_update" ON customer_notifications
  FOR UPDATE USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "staff_manage_notifications" ON customer_notifications
  FOR ALL USING (auth.role() = 'authenticated');


-- =============================================================================
-- TAHAP 11: TOKO E-COMMERCE (LANJUTAN)
-- =============================================================================

-- ─── 11.1 STORE_ORDERS ────────────────────────────────────────────────────────
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
CREATE POLICY "admin_manage_store_orders" ON store_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational','finance')));
SELECT _create_updated_at_trigger('store_orders');

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


-- ─── 11.2 STORE_ORDER_ITEMS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_order_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
  product_name  TEXT NOT NULL,
  product_image TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(15,2) NOT NULL,
  subtotal      NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id   ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product_id ON store_order_items(product_id);
ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_order_items" ON store_order_items;
DROP POLICY IF EXISTS "customer_insert_order_items"   ON store_order_items;
DROP POLICY IF EXISTS "admin_manage_order_items"      ON store_order_items;

CREATE POLICY "customer_read_own_order_items" ON store_order_items
  FOR SELECT USING (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid()
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())));
CREATE POLICY "customer_insert_order_items" ON store_order_items
  FOR INSERT WITH CHECK (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_order_items" ON store_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational','finance')));


-- ─── 11.3 STORE_SHIPMENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_shipments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE UNIQUE,
  courier_name      TEXT NOT NULL,
  courier_service   TEXT,
  tracking_number   TEXT,
  shipped_at        TIMESTAMPTZ,
  estimated_arrival DATE,
  delivered_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing','picked_up','in_transit','out_for_delivery','delivered','failed','returned')),
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_shipments_order_id        ON store_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_store_shipments_tracking_number ON store_shipments(tracking_number);
ALTER TABLE store_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_shipment" ON store_shipments;
DROP POLICY IF EXISTS "admin_manage_shipments"     ON store_shipments;

CREATE POLICY "customer_read_own_shipment" ON store_shipments
  FOR SELECT USING (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid()
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())));
CREATE POLICY "admin_manage_shipments" ON store_shipments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational')));
SELECT _create_updated_at_trigger('store_shipments');


-- ─── 11.4 STORE_PRODUCT_REVIEWS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_product_reviews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  admin_reply     TEXT,
  admin_reply_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id, product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spr_product_id   ON store_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_spr_order_id     ON store_product_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_spr_user_id      ON store_product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_spr_is_published ON store_product_reviews(is_published);
ALTER TABLE store_product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_insert_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_update_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_read_own_review" ON store_product_reviews;
DROP POLICY IF EXISTS "public_read_reviews"      ON store_product_reviews;
DROP POLICY IF EXISTS "admin_manage_reviews"     ON store_product_reviews;

CREATE POLICY "customer_insert_review" ON store_product_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "customer_update_review" ON store_product_reviews
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "customer_read_own_review" ON store_product_reviews
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "public_read_reviews" ON store_product_reviews
  FOR SELECT USING (is_published = TRUE);
CREATE POLICY "admin_manage_reviews" ON store_product_reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','marketing')));
SELECT _create_updated_at_trigger('store_product_reviews');


-- ─── 11.5 STORE_PROCUREMENT_ORDERS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_procurement_orders (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number   TEXT NOT NULL UNIQUE,
  vendor_id      UUID REFERENCES vendors(id) ON DELETE SET NULL,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ordered','received','cancelled')),
  total_amount   NUMERIC(15,2) DEFAULT 0,
  notes          TEXT,
  ordered_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ordered_at     TIMESTAMPTZ,
  received_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_procurement_orders_branch_id ON store_procurement_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_store_procurement_orders_status    ON store_procurement_orders(status);
ALTER TABLE store_procurement_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_procurement_orders" ON store_procurement_orders;

CREATE POLICY "staff_manage_procurement_orders" ON store_procurement_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational','finance')));
SELECT _create_updated_at_trigger('store_procurement_orders');

CREATE TABLE IF NOT EXISTS store_procurement_items (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  procurement_id UUID NOT NULL REFERENCES store_procurement_orders(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES store_products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_cost      NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal       NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_procurement_items_procurement_id ON store_procurement_items(procurement_id);
ALTER TABLE store_procurement_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_procurement_items" ON store_procurement_items;

CREATE POLICY "staff_manage_procurement_items" ON store_procurement_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational','finance')));


-- ─── 11.6 STORE_STOCK_OPNAME ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_stock_opname (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  opname_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','completed','cancelled')),
  notes        TEXT,
  conducted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE store_stock_opname ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_stock_opname" ON store_stock_opname;

CREATE POLICY "staff_manage_stock_opname" ON store_stock_opname FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational')));
SELECT _create_updated_at_trigger('store_stock_opname');

CREATE TABLE IF NOT EXISTS store_stock_opname_items (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opname_id      UUID NOT NULL REFERENCES store_stock_opname(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES store_products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  system_stock   INTEGER NOT NULL DEFAULT 0,
  physical_stock INTEGER NOT NULL DEFAULT 0,
  difference     INTEGER GENERATED ALWAYS AS (physical_stock - system_stock) STORED,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_stock_opname_items_opname_id ON store_stock_opname_items(opname_id);
ALTER TABLE store_stock_opname_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_stock_opname_items" ON store_stock_opname_items;

CREATE POLICY "staff_manage_stock_opname_items" ON store_stock_opname_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational')));


-- =============================================================================
-- TAHAP 12: AGEN, APPROVAL, HR
-- =============================================================================

-- ─── 12.1 AGENT_TRAINING_PROGRESS ─────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_agent_training_agent_id  ON agent_training_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_module_id ON agent_training_progress(module_id);
ALTER TABLE agent_training_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_manage_own_training" ON agent_training_progress;
DROP POLICY IF EXISTS "admin_read_all_training"   ON agent_training_progress;

CREATE POLICY "agent_manage_own_training" ON agent_training_progress FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "admin_read_all_training" ON agent_training_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
SELECT _create_updated_at_trigger('agent_training_progress');


-- ─── 12.2 AGENT_OVERRIDE_COMMISSIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_override_commissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sub_agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
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
ALTER TABLE agent_override_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_read_own_override" ON agent_override_commissions;
DROP POLICY IF EXISTS "admin_manage_override"   ON agent_override_commissions;

CREATE POLICY "agent_read_own_override" ON agent_override_commissions
  FOR SELECT USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_override" ON agent_override_commissions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','finance')));


-- ─── 12.3 WITHDRAWAL_REQUESTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount          NUMERIC(15,2) NOT NULL,
  bank_name       TEXT,
  account_number  TEXT,
  account_name    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','rejected')),
  notes           TEXT,
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_agent_id ON withdrawal_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status   ON withdrawal_requests(status);
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_own_withdrawal"   ON withdrawal_requests;
DROP POLICY IF EXISTS "admin_manage_withdrawal" ON withdrawal_requests;

CREATE POLICY "agent_own_withdrawal" ON withdrawal_requests FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_withdrawal" ON withdrawal_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','finance')));
SELECT _create_updated_at_trigger('withdrawal_requests');


-- ─── 12.4 APPROVAL_REQUESTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type            TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  reference_id    UUID,
  reference_code  TEXT,
  requester_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_role  TEXT NOT NULL,
  amount          NUMERIC(15,2),
  percentage      NUMERIC(5,2),
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','escalated','cancelled')),
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
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_insert_approval_request"  ON approval_requests;
DROP POLICY IF EXISTS "requester_read_own_requests"    ON approval_requests;
DROP POLICY IF EXISTS "admin_manage_all_requests"      ON approval_requests;

CREATE POLICY "staff_insert_approval_request" ON approval_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND requester_id = auth.uid());
CREATE POLICY "requester_read_own_requests" ON approval_requests
  FOR SELECT USING (requester_id = auth.uid());
CREATE POLICY "admin_manage_all_requests" ON approval_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
SELECT _create_updated_at_trigger('approval_requests');

CREATE TABLE IF NOT EXISTS approval_actions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id     UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  level          SMALLINT NOT NULL,
  action         TEXT NOT NULL CHECK (action IN ('approved','rejected','escalated')),
  actor_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role     TEXT NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(request_id);
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_approval_actions"  ON approval_actions;
DROP POLICY IF EXISTS "requester_read_own_actions"     ON approval_actions;

CREATE POLICY "admin_manage_approval_actions" ON approval_actions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager')));
CREATE POLICY "requester_read_own_actions" ON approval_actions
  FOR SELECT USING (request_id IN (
    SELECT id FROM approval_requests WHERE requester_id = auth.uid()));


-- ─── 12.5 MUTHAWIF_EVALUATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS muthawif_evaluations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  muthawif_id  UUID NOT NULL REFERENCES muthawifs(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  departure_id UUID REFERENCES departures(id) ON DELETE SET NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating       NUMERIC(3,2) NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muthawif_evals_muthawif_id ON muthawif_evaluations(muthawif_id);
ALTER TABLE muthawif_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_insert_eval"  ON muthawif_evaluations;
DROP POLICY IF EXISTS "staff_read_all_evals"  ON muthawif_evaluations;

CREATE POLICY "customer_insert_eval" ON muthawif_evaluations
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "staff_read_all_evals" ON muthawif_evaluations FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','branch_manager','operational')));


-- ─── 12.6 AGENT_MEMBERSHIPS & BRANCH_MEMBERSHIPS & BRANCH_COMMISSIONS ────────
CREATE TABLE IF NOT EXISTS agent_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES membership_plans(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date        DATE,
  end_date          DATE,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memberships_agent_id ON agent_memberships(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memberships_status   ON agent_memberships(status);
ALTER TABLE agent_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_own_membership"   ON agent_memberships;
DROP POLICY IF EXISTS "admin_manage_membership" ON agent_memberships;

CREATE POLICY "agent_own_membership" ON agent_memberships FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_membership" ON agent_memberships FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
SELECT _create_updated_at_trigger('agent_memberships');

CREATE TABLE IF NOT EXISTS branch_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES membership_plans(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date        DATE,
  end_date          DATE,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branch_memberships_branch_id ON branch_memberships(branch_id);
ALTER TABLE branch_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_branch_membership" ON branch_memberships;

CREATE POLICY "admin_manage_branch_membership" ON branch_memberships FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin'))
  OR branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));
SELECT _create_updated_at_trigger('branch_memberships');

CREATE TABLE IF NOT EXISTS branch_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  commission_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','rejected')),
  notes             TEXT,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  payment_reference TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_commissions_branch_id ON branch_commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_commissions_status    ON branch_commissions(status);
ALTER TABLE branch_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_branch_commissions" ON branch_commissions;

CREATE POLICY "admin_manage_branch_commissions" ON branch_commissions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','finance'))
  OR branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));
SELECT _create_updated_at_trigger('branch_commissions');


-- =============================================================================
-- TAHAP 13: WA BROADCAST & KOMUNIKASI LANJUT
-- =============================================================================

-- ─── 13.1 WHATSAPP_SEND_LOGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_send_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id     UUID REFERENCES whatsapp_config(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed')),
  provider      TEXT,
  response      TEXT,
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_send_logs_booking_id  ON whatsapp_send_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_wa_send_logs_status      ON whatsapp_send_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_send_logs_created_at  ON whatsapp_send_logs(created_at DESC);
ALTER TABLE whatsapp_send_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_wa_logs" ON whatsapp_send_logs;
DROP POLICY IF EXISTS "staff_insert_wa_logs" ON whatsapp_send_logs;

CREATE POLICY "staff_manage_wa_logs" ON whatsapp_send_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin','operational','marketing')));
CREATE POLICY "staff_insert_wa_logs" ON whatsapp_send_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- ─── 13.2 WA_BROADCAST_CAMPAIGNS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_broadcast_campaigns (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  segment_filters  JSONB       NOT NULL DEFAULT '{}',
  message_template TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','scheduled','sending','done','cancelled')),
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  total_recipients INT,
  success_count    INT         NOT NULL DEFAULT 0,
  fail_count       INT         NOT NULL DEFAULT 0,
  created_by       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_campaigns_status ON wa_broadcast_campaigns(status);
ALTER TABLE wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_broadcast_campaigns_select" ON wa_broadcast_campaigns;
DROP POLICY IF EXISTS "wa_broadcast_campaigns_write"  ON wa_broadcast_campaigns;

CREATE POLICY "wa_broadcast_campaigns_select" ON wa_broadcast_campaigns
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','it','operational','marketing','sales')));
CREATE POLICY "wa_broadcast_campaigns_write" ON wa_broadcast_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','it','operational','marketing')));
SELECT _create_updated_at_trigger('wa_broadcast_campaigns');


-- ─── 13.3 WA_BROADCAST_LOGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_broadcast_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES wa_broadcast_campaigns(id) ON DELETE CASCADE,
  booking_id  UUID        REFERENCES bookings(id),
  phone       TEXT,
  message     TEXT,
  status      TEXT        NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','sent','failed')),
  sent_at     TIMESTAMPTZ,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_campaign ON wa_broadcast_logs(campaign_id);
ALTER TABLE wa_broadcast_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_broadcast_logs_select" ON wa_broadcast_logs;
DROP POLICY IF EXISTS "wa_broadcast_logs_insert" ON wa_broadcast_logs;

CREATE POLICY "wa_broadcast_logs_select" ON wa_broadcast_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','it','operational','marketing','sales')));
CREATE POLICY "wa_broadcast_logs_insert" ON wa_broadcast_logs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin','owner','it','operational','marketing')));


-- =============================================================================
-- TAHAP 14: DASHBOARD & KEUANGAN LANJUT
-- =============================================================================

-- ─── 14.1 DASHBOARD_ACCESS_CONFIG ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_access_config (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role       TEXT NOT NULL UNIQUE,
  widgets    JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dashboard_access_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_dashboard_config" ON dashboard_access_config;
DROP POLICY IF EXISTS "staff_read_dashboard_config"   ON dashboard_access_config;

CREATE POLICY "admin_manage_dashboard_config" ON dashboard_access_config FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','admin')));
CREATE POLICY "staff_read_dashboard_config" ON dashboard_access_config
  FOR SELECT USING (auth.role() = 'authenticated');
SELECT _create_updated_at_trigger('dashboard_access_config');


-- ─── 14.2 WEB_VITALS_METRICS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS web_vitals_metrics (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  value      NUMERIC NOT NULL,
  page_url   TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_name       ON web_vitals_metrics(name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON web_vitals_metrics(created_at DESC);
ALTER TABLE web_vitals_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_insert_web_vitals" ON web_vitals_metrics;
DROP POLICY IF EXISTS "admin_read_web_vitals"    ON web_vitals_metrics;

CREATE POLICY "public_insert_web_vitals" ON web_vitals_metrics
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "admin_read_web_vitals" ON web_vitals_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','owner','it')));


-- =============================================================================
-- TAHAP 15: KOLOM TAMBAHAN (ALTER TABLE — semua sudah dimasukkan inline di atas,
--           ini untuk yang mungkin dibutuhkan jika ada tabel lama tanpa kolom tsb)
-- =============================================================================

-- Pastikan kolom ini ada (idempotent)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'pending'
  CHECK (booking_status IN ('pending','confirmed','cancelled','completed'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_pax INTEGER DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'full'
  CHECK (booking_type IN ('full','dp','savings'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dp_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dp_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS savings_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_deadline DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bagasi_kg_allowed INTEGER DEFAULT 23;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT 'direct';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS nomor_porsi_haji TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS embarkasi_kode TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS estimasi_keberangkatan_haji INTEGER;

ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_adult NUMERIC DEFAULT 0;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_child NUMERIC DEFAULT 0;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_infant NUMERIC DEFAULT 0;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS child_price_percent NUMERIC DEFAULT 75;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS infant_price_percent NUMERIC DEFAULT 10;

ALTER TABLE packages ADD COLUMN IF NOT EXISTS child_price_percent NUMERIC DEFAULT 75;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS infant_price_percent NUMERIC DEFAULT 10;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS fee_branch NUMERIC(5,2) DEFAULT 0;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS website_bio TEXT;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_description TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_banner_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_gallery JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_testimonials JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS stamp_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS letterhead_data JSONB DEFAULT '{}';

ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_status TEXT DEFAULT 'not_checked';
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_time TIMESTAMPTZ;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_notes TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS family_group_id UUID;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS room_group_id UUID;

ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS assigned_muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}';
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS last_test_ok BOOLEAN;

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

-- user_roles CHECK constraint sudah mencakup 'it' dan semua role
-- Jika ada tabel lama dengan constraint lebih kecil, update:
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN (
  'super_admin','owner','admin','branch_manager','finance',
  'operational','sales','marketing','hr','equipment',
  'agent','sub_agent','customer','jamaah','visa_officer','it'
));


-- =============================================================================
-- TAHAP 16: FUNCTIONS & TRIGGERS
-- =============================================================================

-- ─── Sync booking paid_amount / remaining_amount / payment_status ─────────────
CREATE OR REPLACE FUNCTION sync_booking_payment_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_booking_id   UUID;
  v_total_price  NUMERIC;
  v_paid_amount  NUMERIC;
  v_remaining    NUMERIC;
  v_pay_status   TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_booking_id := OLD.booking_id;
  ELSE
    v_booking_id := NEW.booking_id;
  END IF;

  IF v_booking_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT total_price INTO v_total_price FROM bookings WHERE id = v_booking_id;
  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
  FROM payments WHERE booking_id = v_booking_id AND status IN ('paid','verified');

  v_remaining := GREATEST(0, v_total_price - v_paid_amount);
  v_pay_status := CASE
    WHEN v_paid_amount >= v_total_price AND v_total_price > 0 THEN 'paid'
    WHEN v_paid_amount > 0 THEN 'partial'
    ELSE 'unpaid'
  END;

  UPDATE bookings SET
    paid_amount      = v_paid_amount,
    remaining_amount = v_remaining,
    payment_status   = v_pay_status
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_payment_totals ON payments;
CREATE TRIGGER trg_sync_booking_payment_totals
  AFTER INSERT OR UPDATE OF amount, status OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_booking_payment_totals();


-- ─── Recalculate departure financial summary ──────────────────────────────────
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
  SELECT COALESCE(quota, 0) INTO v_quota FROM departures WHERE id = p_departure_id;

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


-- ─── Preview auto-schedule reminders ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION preview_auto_schedule_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (
  days_before     INTEGER,
  booking_id      UUID,
  booking_code    TEXT,
  full_name       TEXT,
  phone           TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC,
  already_exists  BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_day INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    RETURN QUERY
      SELECT
        v_day,
        b.id,
        b.booking_code,
        c.full_name,
        c.phone,
        b.payment_deadline,
        b.remaining_amount,
        EXISTS (
          SELECT 1 FROM payment_deadline_reminders pdr
          WHERE pdr.booking_id = b.id AND pdr.days_before = v_day
            AND pdr.status IN ('pending','sent')
        )
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.booking_status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
      ORDER BY b.payment_deadline ASC;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_auto_schedule_reminders(INTEGER[]) TO authenticated;


-- ─── Auto-schedule payment reminders ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_schedule_payment_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (created_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day      INTEGER;
  v_created  INTEGER := 0;
  v_skipped  INTEGER := 0;
  v_row      RECORD;
  v_inserted INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    FOR v_row IN
      SELECT b.id AS booking_id, b.booking_code, b.payment_deadline,
             b.remaining_amount, c.phone, c.full_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.booking_status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
    LOOP
      INSERT INTO payment_deadline_reminders (
        booking_id, booking_code, phone, full_name,
        payment_deadline, remaining_amount, days_before, status
      ) VALUES (
        v_row.booking_id, v_row.booking_code, v_row.phone, v_row.full_name,
        v_row.payment_deadline, v_row.remaining_amount, v_day, 'pending'
      )
      ON CONFLICT (booking_id, days_before) DO UPDATE
        SET remaining_amount = EXCLUDED.remaining_amount,
            phone            = EXCLUDED.phone,
            full_name        = EXCLUDED.full_name,
            payment_deadline = EXCLUDED.payment_deadline,
            status           = CASE
              WHEN payment_deadline_reminders.status = 'cancelled' THEN 'pending'
              ELSE payment_deadline_reminders.status
            END,
            updated_at       = NOW()
        WHERE payment_deadline_reminders.status = 'cancelled';

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted > 0 THEN v_created := v_created + 1;
      ELSE v_skipped := v_skipped + 1; END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_schedule_payment_reminders(INTEGER[]) TO authenticated;


-- ─── Get WA config safe (tanpa api_key) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_wa_config_safe()
RETURNS TABLE (
  id              UUID,
  provider        TEXT,
  display_name    TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN,
  provider_config JSONB,
  api_key_set     BOOLEAN,
  api_key_hint    TEXT,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      wc.id, wc.provider, wc.display_name, wc.sender_number, wc.is_active,
      wc.provider_config - 'api_token' - 'token' - 'api_key' - 'access_token'
                         - 'auth_header' - 'webhook_secret',
      (wc.api_key IS NOT NULL AND wc.api_key <> ''),
      CASE WHEN wc.api_key IS NULL OR wc.api_key = '' THEN NULL
           ELSE '••••' || RIGHT(wc.api_key, 4) END,
      wc.last_tested_at, wc.last_test_ok, wc.updated_by, wc.updated_at
    FROM whatsapp_config wc;
END;
$$;

GRANT EXECUTE ON FUNCTION get_wa_config_safe() TO authenticated;


-- ─── Increment website view count ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_website_view(
  p_agent_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_agent_id IS NOT NULL THEN
    UPDATE website_settings SET view_count = COALESCE(view_count, 0) + 1 WHERE agent_id = p_agent_id;
  ELSIF p_branch_id IS NOT NULL THEN
    UPDATE website_settings SET view_count = COALESCE(view_count, 0) + 1 WHERE branch_id = p_branch_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── Create customer account RPC ─────────────────────────────────────────────
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
    updated_at  = NOW()
  RETURNING id INTO v_account_id;
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- TAHAP 17: SEED DATA
-- =============================================================================

-- ─── Company Settings ────────────────────────────────────────────────────────
INSERT INTO company_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('company_name',         '"Vinstour Travel"',            'string',  'Nama resmi perusahaan'),
  ('company_tagline',      '"Perjalanan Suci Anda"',       'string',  'Tagline perusahaan'),
  ('company_phone',        '"021-1234567"',                'string',  'Nomor telepon utama'),
  ('company_email',        '"info@vinstour.com"',          'string',  'Email utama perusahaan'),
  ('company_address',      '"Jakarta, Indonesia"',         'string',  'Alamat kantor pusat'),
  ('company_logo_url',     'null',                         'url',     'URL logo perusahaan'),
  ('company_wa_number',    '"628111234567"',               'string',  'Nomor WhatsApp utama'),
  ('kpi_targets_monthly',  '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}',
                                                           'json',    'Target KPI bulanan'),
  ('fonnte_api_key',       'null',                         'string',  'API key Fonnte'),
  ('siskohat_api_key',     'null',                         'string',  'API key SISKOHAT'),
  ('max_booking_dp_pct',   '30',                           'number',  'Persentase minimal DP booking (%)'),
  ('booking_expiry_hours', '24',                           'number',  'Jam sebelum booking pending kadaluarsa')
ON CONFLICT (setting_key) DO NOTHING;

-- ─── Bank Accounts ───────────────────────────────────────────────────────────
INSERT INTO bank_accounts (bank_name, account_number, account_name, branch_name, is_primary, is_active)
VALUES
  ('Bank BCA',    '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat',   TRUE,  TRUE),
  ('Bank Mandiri','0987654321', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan',  FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- ─── Store Categories ────────────────────────────────────────────────────────
INSERT INTO store_categories (name, slug, description, sort_order)
VALUES
  ('Perlengkapan Ibadah', 'perlengkapan-ibadah', 'Peralatan sholat, Al-Quran, tasbih dan lainnya', 1),
  ('Pakaian Ihram',       'pakaian-ihram',       'Kain ihram pria dan mukena wanita berkualitas',   2),
  ('Koper & Tas',         'koper-tas',            'Koper, tas kabin, dan tas ransel',               3),
  ('Kesehatan & Vitamin', 'kesehatan-vitamin',    'Suplemen, obat-obatan, kebutuhan kesehatan',     4),
  ('Buku & Panduan',      'buku-panduan',         'Buku doa, panduan manasik, literatur islami',    5),
  ('Souvenir',            'souvenir',             'Oleh-oleh dan souvenir dari Tanah Suci',         6)
ON CONFLICT (slug) DO NOTHING;

-- ─── Approval Configs ────────────────────────────────────────────────────────
INSERT INTO approval_configs (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',         1, 'branch_manager', 5000000,  NULL, 500000),
  ('refund',         2, 'admin',          50000000, NULL, 5000000),
  ('refund',         3, 'owner',          NULL,     NULL, NULL),
  ('discount',       1, 'branch_manager', NULL,     10.0, NULL),
  ('discount',       2, 'admin',          NULL,     30.0, NULL),
  ('cancellation',   1, 'branch_manager', NULL,     NULL, NULL),
  ('cancellation',   2, 'admin',          NULL,     NULL, NULL),
  ('vendor_invoice', 1, 'finance',        10000000, NULL, 1000000),
  ('vendor_invoice', 2, 'owner',          NULL,     NULL, 10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;

-- ─── Baggage Reference Items ──────────────────────────────────────────────────
INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory)
VALUES
  ('Koper besar (kosong)',      'koper',     3.50, TRUE),
  ('Koper kabin (kosong)',      'koper',     2.00, FALSE),
  ('Baju ihram pria (2 lembar)','pakaian',  0.80, TRUE),
  ('Sandal',                    'alas_kaki', 0.40, TRUE),
  ('Al-Quran',                  'ibadah',    0.50, FALSE),
  ('Masker (kotak)',             'kesehatan', 0.20, TRUE),
  ('Obat-obatan pribadi',        'kesehatan', 0.50, FALSE)
ON CONFLICT DO NOTHING;

-- ─── Membership Plans ────────────────────────────────────────────────────────
INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, sort_order)
VALUES
  ('Silver',   'agent',  500000,  5,    2, 'Paket dasar untuk agen baru',          1),
  ('Gold',     'agent',  1500000, 20,   3, 'Paket menengah dengan fitur lengkap',  2),
  ('Platinum', 'agent',  3000000, NULL, 4, 'Paket premium tanpa batas sub agen',   3),
  ('Reguler',  'branch', 5000000, 50,   1, 'Paket cabang standar',                 1),
  ('Premium',  'branch', 12000000, NULL, 2, 'Paket cabang premium',               2)
ON CONFLICT DO NOTHING;

-- ─── Website Settings Global Default ─────────────────────────────────────────
INSERT INTO website_settings (company_name, active_theme, primary_color, accent_color,
  footer_description, footer_bottom_text)
VALUES (
  'Vinstour Travel', 'default', '#16a34a', '#0d9488',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.'
)
ON CONFLICT DO NOTHING;

-- ─── Menu Items ──────────────────────────────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('dashboard',          'Dashboard',          '/admin',                      'LayoutDashboard','Umum',        1,   'dashboard',          TRUE),
  ('bookings',           'Pemesanan',           '/admin/bookings',             'BookOpen',       'Operasional', 10,  'bookings',           TRUE),
  ('customers',          'Data Jamaah',         '/admin/customers',            'Users',          'Operasional', 20,  'customers',          TRUE),
  ('packages',           'Paket Perjalanan',    '/admin/packages',             'Package',        'Operasional', 30,  'packages',           TRUE),
  ('departures',         'Keberangkatan',       '/admin/departures',           'Plane',          'Operasional', 40,  'departures',         TRUE),
  ('payments',           'Pembayaran',          '/admin/payments',             'CreditCard',     'Keuangan',    100, 'payments',           TRUE),
  ('reports',            'Laporan',             '/admin/reports',              'BarChart2',      'Keuangan',    110, 'reports',            TRUE),
  ('pkg-financials',     'Keuangan Paket',      '/admin/package-financials',   'TrendingUp',     'Keuangan',    120, 'pkg-financials',     TRUE),
  ('agents',             'Agen',                '/admin/agents',               'UserCheck',      'Penjualan',   200, 'agents',             TRUE),
  ('leads',              'Prospek',             '/admin/leads',                'Target',         'Penjualan',   210, 'leads',              TRUE),
  ('store',              'Toko Online',         '/admin/store',                'ShoppingBag',    'Penjualan',   220, 'store',              TRUE),
  ('store-products',     'Produk Toko',         '/admin/store/products',       'Package',        'Penjualan',   221, 'store-products',     TRUE),
  ('store-orders',       'Pesanan Toko',        '/admin/store/orders',         'ShoppingCart',   'Penjualan',   222, 'store-orders',       TRUE),
  ('store-categories',   'Kategori Produk',     '/admin/store/categories',     'Tag',            'Penjualan',   223, 'store-categories',   TRUE),
  ('employees',          'Karyawan',            '/admin/employees',            'Briefcase',      'SDM',         300, 'employees',          TRUE),
  ('training',           'Pelatihan Agen',      '/admin/training',             'GraduationCap',  'SDM',         310, 'training',           TRUE),
  ('muthawifs',          'Pembimbing',          '/admin/muthawifs',            'Star',           'SDM',         320, 'muthawifs',          TRUE),
  ('vendors',            'Vendor/Mitra',        '/admin/vendors',              'Building',       'Operasional', 330, 'vendors',            TRUE),
  ('vendor-contracts',   'Kontrak Vendor',      '/admin/vendor-contracts',     'FilePen',        'Operasional', 340, 'vendor-contracts',   TRUE),
  ('siskohat',           'SISKOHAT Kemenag',    '/admin/siskohat',             'Landmark',       'Operasional', 350, 'siskohat',           TRUE),
  ('whatsapp',           'WhatsApp',            '/admin/whatsapp',             'MessageCircle',  'Komunikasi',  400, 'whatsapp',           TRUE),
  ('wa-broadcast',       'Broadcast WA',        '/admin/whatsapp/broadcast',   'Send',           'Komunikasi',  410, 'wa-broadcast',       TRUE),
  ('wa-provider',        'Provider WA',         '/admin/whatsapp/provider',    'Wifi',           'Komunikasi',  420, 'wa-provider',        TRUE),
  ('wa-roadmap',         'Roadmap WA',          '/admin/whatsapp/roadmap',     'Map',            'Komunikasi',  430, 'wa-roadmap',         TRUE),
  ('marketing',          'Marketing',           '/admin/marketing',            'Megaphone',      'Marketing',   500, 'marketing',          TRUE),
  ('media-gallery',      'Galeri Media',        '/admin/media-gallery',        'Film',           'Marketing',   510, 'media-gallery',      TRUE),
  ('document-templates', 'Template Dokumen',    '/admin/document-templates',   'FileStack',      'Dokumen',     600, 'document-templates', TRUE),
  ('branches',           'Cabang',              '/admin/branches',             'Building2',      'Sistem',      800, 'branches',           TRUE),
  ('users',              'Manajemen User',      '/admin/users',                'UserCog',        'Sistem',      810, 'users',              TRUE),
  ('settings',           'Pengaturan',          '/admin/settings',             'Settings',       'Sistem',      900, 'settings',           TRUE)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, path = EXCLUDED.path, icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission, is_visible = EXCLUDED.is_visible;

-- ─── Role Permissions ────────────────────────────────────────────────────────
-- Super Admin & Owner: semua permission
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, m.required_permission
FROM (VALUES ('super_admin'), ('owner')) AS r(role)
CROSS JOIN menu_items m
WHERE m.required_permission IS NOT NULL
ON CONFLICT DO NOTHING;

-- Admin: semua kecuali system management khusus
INSERT INTO role_permissions (role, permission_key)
SELECT 'admin', m.required_permission FROM menu_items m
WHERE m.required_permission IS NOT NULL
  AND m.required_permission NOT IN ('wa-provider')
ON CONFLICT DO NOTHING;

-- Branch Manager
INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', k FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('reports'),('pkg-financials'),('agents'),('leads'),
  ('store'),('store-products'),('store-orders'),('store-categories'),
  ('employees'),('muthawifs'),('vendors'),('vendor-contracts'),('siskohat'),
  ('whatsapp'),('wa-broadcast'),('wa-roadmap'),('marketing'),('media-gallery'),
  ('document-templates'),('settings')
) AS t(k) ON CONFLICT DO NOTHING;

-- Finance
INSERT INTO role_permissions (role, permission_key)
SELECT 'finance', k FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('payments'),('reports'),('pkg-financials'),
  ('store-orders'),('vendors'),('vendor-contracts'),('settings')
) AS t(k) ON CONFLICT DO NOTHING;

-- Operational
INSERT INTO role_permissions (role, permission_key)
SELECT 'operational', k FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('store'),('store-products'),('store-orders'),
  ('muthawifs'),('vendors'),('siskohat'),('whatsapp'),('wa-broadcast'),('wa-roadmap'),
  ('document-templates')
) AS t(k) ON CONFLICT DO NOTHING;

-- Sales & Marketing
INSERT INTO role_permissions (role, permission_key)
SELECT 'sales', k FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('leads'),('store'),('store-products'),('whatsapp'),('wa-broadcast')
) AS t(k) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'marketing', k FROM (VALUES
  ('dashboard'),('leads'),('marketing'),('media-gallery'),('packages'),
  ('store'),('store-products'),('store-categories'),('whatsapp'),('wa-broadcast'),('wa-roadmap'),
  ('store-orders')
) AS t(k) ON CONFLICT DO NOTHING;

-- IT
INSERT INTO role_permissions (role, permission_key)
SELECT 'it', k FROM (VALUES
  ('dashboard'),('settings'),('whatsapp'),('wa-provider'),('wa-broadcast'),
  ('wa-roadmap'),('users'),('branches')
) AS t(k) ON CONFLICT DO NOTHING;

-- Agent
INSERT INTO role_permissions (role, permission_key)
SELECT 'agent', k FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),('leads'),('training')
) AS t(k) ON CONFLICT DO NOTHING;

-- WA Broadcast additional
INSERT INTO role_permissions (role, permission_key)
VALUES
  ('super_admin', 'wa-broadcast'), ('owner', 'wa-broadcast'),
  ('it', 'wa-broadcast'), ('operational', 'wa-broadcast'),
  ('marketing', 'wa-broadcast')
ON CONFLICT DO NOTHING;

-- ─── WA Feature Roadmap Seed ──────────────────────────────────────────────────
INSERT INTO wa_feature_roadmap (phase, code, title, description, status, sort_order)
VALUES
  (1, 'WA_BASIC_SEND',        'Kirim WA via Fonnte',              'Kirim pesan single & bulk via Fonnte', 'done', 10),
  (1, 'WA_TEMPLATES_ENGINE',  'Template Pesan Dinamis',           'Variabel {nama}, {kode}, {tanggal}',   'done', 20),
  (1, 'WA_SEND_LOGS',         'Log Pengiriman WA',                'Riwayat setiap pesan',                 'done', 30),
  (1, 'WA_BLAST_DEPARTURE',   'Broadcast per Keberangkatan',      'Kirim massal ke jamaah satu departure','done', 40),
  (1, 'WA_BLAST_TAGIHAN',     'Broadcast Tagihan',                'Kirim reminder tagihan massal',        'done', 50),
  (1, 'WA_AUTO_BOOKING',      'Notif Otomatis Booking Baru',      'Auto-kirim WA saat booking dikonfirmasi','done', 60),
  (2, 'WA_MULTIPROVIDER',     'Multi-Provider',                   'Support banyak gateway WA',            'in_progress', 70),
  (2, 'WA_ADMIN_KEY_PANEL',   'Panel Kelola API Key',             'Admin simpan & ganti key dari UI',     'in_progress', 80),
  (2, 'WA_AUTO_REMINDER',     'Auto-Jadwal Reminder Pembayaran',  'Buat reminder H-7/H-3 otomatis',       'in_progress', 90),
  (3, 'WA_BROADCAST_SEGMENT', 'Broadcast Tersegmentasi',          'Filter by paket, departure, status',   'planned', 100),
  (3, 'WA_CAMPAIGN_MANAGER',  'Manajemen Kampanye Broadcast',     'Jadwal, statistik, A/B template',      'planned', 110),
  (4, 'WA_CHATBOT_KEYWORD',   'Auto-Reply Berbasis Kata Kunci',   'Balas otomatis by keyword',            'planned', 120),
  (5, 'WA_META_CLOUD',        'WhatsApp Cloud API (Meta/WABA)',   'Integrasi resmi Meta Business API',    'planned', 130)
ON CONFLICT (code) DO NOTHING;

-- ─── Document Templates Defaults ─────────────────────────────────────────────
INSERT INTO document_templates (doc_type, branch_id, name, is_default, settings_json)
VALUES
  ('invoice',         NULL, 'Template Invoice Default',            TRUE, '{"accent_color":"#16a34a","font":"helvetica","orientation":"portrait","show_agent":true,"show_stamp":true,"show_signature":true}'),
  ('eticket',         NULL, 'Template E-Ticket Default',           TRUE, '{"accent_color":"#0284c7","font":"helvetica","orientation":"portrait","show_stamp":false}'),
  ('certificate',     NULL, 'Template Sertifikat Default',         TRUE, '{"accent_color":"#d97706","font":"times","orientation":"landscape","show_stamp":true}'),
  ('jamaah_leave',    NULL, 'Template Surat Izin Jamaah Default',  TRUE, '{"accent_color":"#7c3aed","font":"helvetica","orientation":"portrait","show_stamp":true}'),
  ('passport_letter', NULL, 'Template Surat Paspor Default',       TRUE, '{"accent_color":"#0f172a","font":"helvetica","orientation":"portrait","show_stamp":true}'),
  ('general_letter',  NULL, 'Template Surat Umum Default',         TRUE, '{"accent_color":"#0f172a","font":"helvetica","orientation":"portrait","show_stamp":true}')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- VERIFIKASI AKHIR
-- =============================================================================
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  RAISE NOTICE '✅ MASTER_MIGRATION selesai. Jumlah tabel di schema public: %', v_count;
  RAISE NOTICE '✅ Semua tabel dibuat dengan urutan dependensi FK yang benar.';
  RAISE NOTICE '✅ Root cause "column branch_id does not exist" sudah diperbaiki:';
  RAISE NOTICE '   store_products dibuat SETELAH branches (bukan sebelumnya).';
END;
$$;

SELECT 'MASTER_MIGRATION selesai — Vinstour Travel Portal schema installed.' AS result;
