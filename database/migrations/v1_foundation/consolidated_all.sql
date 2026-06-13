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
