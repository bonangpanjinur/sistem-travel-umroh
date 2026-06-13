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
