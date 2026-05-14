-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — SCHEMA LENGKAP BAGIAN 2: TABEL LANJUTAN
-- Meliputi: Website Settings, Portal Jamaah, Email, HR, CRM, Keuangan,
--           Marketing, Pelatihan, Webhook, dan semua fitur Fase 1-23
-- Prasyarat: Jalankan vinstour_schema_1_foundation.sql LEBIH DAHULU
-- =============================================================================

-- =============================================================================
-- BAGIAN 1: WEBSITE SETTINGS & PUBLIC PORTAL
-- =============================================================================

CREATE TABLE IF NOT EXISTS website_settings (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          UUID REFERENCES agents(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name      TEXT,
  logo_url          TEXT,
  favicon_url       TEXT,
  active_theme      TEXT NOT NULL DEFAULT 'default',
  primary_color     TEXT,
  accent_color      TEXT,
  foreground_color  TEXT,
  background_color  TEXT,
  body_font         TEXT,
  heading_font      TEXT,
  footer_description  TEXT,
  footer_address      TEXT,
  footer_phone        TEXT,
  footer_email        TEXT,
  footer_whatsapp     TEXT,
  footer_bottom_text  TEXT,
  footer_links        JSONB,
  custom_sections     JSONB,
  profile_photo_url   TEXT,
  banner_url          TEXT,
  bio                 TEXT,
  testimonials        JSONB DEFAULT '[]',
  gallery_urls        JSONB DEFAULT '[]',
  seo_title           TEXT,
  seo_description     TEXT,
  view_count          INTEGER DEFAULT 0,
  social_youtube      TEXT,
  social_tiktok       TEXT,
  maps_embed_url      TEXT,
  layout_variant      JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
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

-- Seed: setting global default Vinstour
INSERT INTO website_settings (company_name, active_theme, primary_color, accent_color,
  footer_description, footer_bottom_text)
VALUES (
  'Vinstour Travel', 'default', '#16a34a', '#0d9488',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.'
)
ON CONFLICT DO NOTHING;

-- Function increment view count website
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


-- =============================================================================
-- BAGIAN 2: MEMBERSHIP PLANS & KOMISI
-- =============================================================================

CREATE TABLE IF NOT EXISTS membership_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  plan_type       TEXT NOT NULL CHECK (plan_type IN ('agent','branch')),
  price_yearly    NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_sub_agents  INTEGER DEFAULT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  description     TEXT,
  features        JSONB DEFAULT '[]',
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order) VALUES
  ('Silver',   'agent',  500000,  5,    2, 'Paket dasar untuk agen baru',
   '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%"]', 1),
  ('Gold',     'agent',  1500000, 20,   3, 'Paket menengah dengan fitur lengkap',
   '["Dashboard portal agen","Website agen lengkap","Digital kit promosi","Laporan komisi","Maksimal 20 sub agen","Komisi 3%"]', 2),
  ('Platinum', 'agent',  3000000, NULL, 4, 'Paket premium tanpa batas sub agen',
   '["Semua fitur Gold","Sub agen tidak terbatas","Priority support","Leaderboard","Komisi 4%"]', 3),
  ('Reguler',  'branch', 5000000, 50,   1, 'Paket cabang standar',
   '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%"]', 1),
  ('Premium',  'branch', 12000000,NULL, 2, 'Paket cabang premium',
   '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","Komisi cabang 2%"]', 2)
ON CONFLICT DO NOTHING;

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
CREATE INDEX IF NOT EXISTS idx_branch_memberships_status    ON branch_memberships(status);

CREATE TABLE IF NOT EXISTS branch_commissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  commission_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','rejected')),
  notes              TEXT,
  approved_by        UUID REFERENCES auth.users(id),
  approved_at        TIMESTAMPTZ,
  paid_at            TIMESTAMPTZ,
  payment_reference  TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_commissions_branch_id ON branch_commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_commissions_status    ON branch_commissions(status);


-- =============================================================================
-- BAGIAN 3: CUSTOMER PORTAL — Akun & Notifikasi Jamaah
-- =============================================================================

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
CREATE INDEX IF NOT EXISTS idx_customer_accounts_agent_id    ON customer_accounts(referred_by_agent_id);

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_accounts_own" ON customer_accounts;
CREATE POLICY "customer_accounts_own" ON customer_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Function untuk membuat / mengupdate customer_account
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

CREATE TABLE IF NOT EXISTS customer_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'general',
  link        TEXT,
  icon        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer    ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_unread      ON customer_notifications(customer_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_customer_notif_is_read     ON customer_notifications(is_read);

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_notif_own"           ON customer_notifications;
DROP POLICY IF EXISTS "customer_notif_update"        ON customer_notifications;
DROP POLICY IF EXISTS "staff_manage_notifications"   ON customer_notifications;
DROP POLICY IF EXISTS "jamaah baca notif sendiri"    ON customer_notifications;
DROP POLICY IF EXISTS "jamaah update notif sendiri"  ON customer_notifications;
DROP POLICY IF EXISTS "admin insert notif"           ON customer_notifications;

CREATE POLICY "customer_notif_own" ON customer_notifications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "customer_notif_update" ON customer_notifications
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_manage_notifications" ON customer_notifications
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS booking_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  review       TEXT,
  aspects      JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_feedback_customer_id ON booking_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_feedback_booking_id  ON booking_feedback(booking_id);

ALTER TABLE booking_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_feedback_own" ON booking_feedback;
CREATE POLICY "booking_feedback_own" ON booking_feedback
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- BAGIAN 4: EMAIL TEMPLATES & LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  variables   TEXT[] DEFAULT '{}',
  trigger     TEXT DEFAULT 'manual',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
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


-- =============================================================================
-- BAGIAN 5: APP SETTINGS & VIRTUAL ACCOUNTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS virtual_accounts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bank_code   TEXT NOT NULL,
  va_number   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id, bank_code)
);

CREATE INDEX IF NOT EXISTS idx_va_customer ON virtual_accounts(customer_id);

ALTER TABLE virtual_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "va_admin"         ON virtual_accounts;
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


-- =============================================================================
-- BAGIAN 6: JAMAAH DIGITAL FEATURES (Doa, Jurnal, Ibadah, Badge)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_monthly_targets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  month_key         TEXT NOT NULL,
  booking_target    INT NOT NULL DEFAULT 10,
  commission_target BIGINT NOT NULL DEFAULT 10000000,
  jamaah_target     INT NOT NULL DEFAULT 10,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_amt_agent_month ON agent_monthly_targets(agent_id, month_key);

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
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jds_user ON jamaah_doa_sessions(user_id);

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jj_user ON jamaah_jurnal(user_id);
CREATE INDEX IF NOT EXISTS idx_jj_date ON jamaah_jurnal(user_id, date);

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
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jit_user ON jamaah_ibadah_targets(user_id);

ALTER TABLE jamaah_ibadah_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jit_own" ON jamaah_ibadah_targets;
CREATE POLICY "jit_own" ON jamaah_ibadah_targets FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_ibadah_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id  UUID NOT NULL REFERENCES jamaah_ibadah_targets(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL,
  count      INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (target_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_jil_user_date ON jamaah_ibadah_logs(user_id, log_date);

ALTER TABLE jamaah_ibadah_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jil_own" ON jamaah_ibadah_logs;
CREATE POLICY "jil_own" ON jamaah_ibadah_logs FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_badges (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_jb_user ON jamaah_badges(user_id);

ALTER TABLE jamaah_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jb_own" ON jamaah_badges;
CREATE POLICY "jb_own" ON jamaah_badges FOR ALL USING (user_id = auth.uid());

-- Ibadah progress (tracking modul)
CREATE TABLE IF NOT EXISTS ibadah_progress (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id   TEXT NOT NULL,
  progress    NUMERIC(5,2) DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, module_id)
);

ALTER TABLE ibadah_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ibadah_progress_own" ON ibadah_progress;
CREATE POLICY "ibadah_progress_own" ON ibadah_progress FOR ALL USING (user_id = auth.uid());


-- =============================================================================
-- BAGIAN 7: HR — PAYROLL, CUTI, PENILAIAN KINERJA
-- =============================================================================

CREATE TABLE IF NOT EXISTS payroll_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year         INTEGER NOT NULL,
  period_month        INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary        NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances          NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay        NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus               NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions          NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employee   NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employer   NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employee    NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employer    NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_pph21           NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary          NUMERIC(15,2) NOT NULL DEFAULT 0,
  working_days        INTEGER DEFAULT 0,
  present_days        INTEGER DEFAULT 0,
  absent_days         INTEGER DEFAULT 0,
  late_days           INTEGER DEFAULT 0,
  overtime_hours      NUMERIC(5,2) DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','paid')),
  notes               TEXT,
  paid_at             TIMESTAMPTZ,
  approved_by         UUID REFERENCES auth.users(id),
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
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

DROP POLICY IF EXISTS "employee_can_view_own_leaves" ON leave_requests;
DROP POLICY IF EXISTS "employee_can_create_leave"    ON leave_requests;
DROP POLICY IF EXISTS "hr_can_manage_leaves"         ON leave_requests;

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
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  annual_quota INTEGER NOT NULL DEFAULT 12,
  annual_used  INTEGER NOT NULL DEFAULT 0,
  sick_used    INTEGER NOT NULL DEFAULT 0,
  carry_over   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
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
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id         UUID REFERENCES auth.users(id),
  review_period       TEXT NOT NULL,
  review_type         TEXT NOT NULL DEFAULT 'quarterly'
    CHECK (review_type IN ('monthly','quarterly','semi_annual','annual')),
  score_quality       NUMERIC(3,1) CHECK (score_quality BETWEEN 1 AND 5),
  score_productivity  NUMERIC(3,1) CHECK (score_productivity BETWEEN 1 AND 5),
  score_initiative    NUMERIC(3,1) CHECK (score_initiative BETWEEN 1 AND 5),
  score_teamwork      NUMERIC(3,1) CHECK (score_teamwork BETWEEN 1 AND 5),
  score_attendance    NUMERIC(3,1) CHECK (score_attendance BETWEEN 1 AND 5),
  overall_score       NUMERIC(3,1) GENERATED ALWAYS AS (
    (COALESCE(score_quality,0) + COALESCE(score_productivity,0) +
     COALESCE(score_initiative,0) + COALESCE(score_teamwork,0) +
     COALESCE(score_attendance,0)) / 5.0
  ) STORED,
  grade               TEXT,
  strengths           TEXT,
  improvements        TEXT,
  goals               TEXT,
  comments            TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','acknowledged')),
  acknowledged_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_period      ON performance_reviews(review_period);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_performance"    ON performance_reviews;
DROP POLICY IF EXISTS "employee_can_view_own_review" ON performance_reviews;

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
-- BAGIAN 8: PERMISSIONS LIST (Inventaris izin tersedia)
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
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_manage_permissions_list" ON permissions_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin','owner')
    )
  );

INSERT INTO permissions_list (key, label, group_name, description) VALUES
  ('dashboard',        'Dashboard',            'Overview',          'Halaman utama dashboard'),
  ('analytics',        'Analytics',            'Overview',          'Laporan analitik'),
  ('leads',            'Leads & Prospek',      'Penjualan',         'Manajemen lead calon jamaah'),
  ('bookings',         'Booking',              'Penjualan',         'Manajemen pemesanan paket'),
  ('packages',         'Paket Umroh & Haji',   'Penjualan',         'Manajemen paket wisata'),
  ('coupons',          'Kupon & Promo',        'Penjualan',         'Kode diskon & promosi'),
  ('departures',       'Jadwal Keberangkatan', 'Keberangkatan',     'Manajemen jadwal keberangkatan'),
  ('room-assignments', 'Kamar & Rooming',      'Keberangkatan',     'Penempatan kamar jamaah'),
  ('manasik',          'Manasik',              'Keberangkatan',     'Jadwal dan materi manasik'),
  ('equipment',        'Perlengkapan',         'Keberangkatan',     'Distribusi perlengkapan jamaah'),
  ('payments',         'Pembayaran',           'Keuangan',          'Verifikasi & rekap pembayaran'),
  ('reports',          'Laporan',              'Keuangan',          'Laporan keuangan dan operasional'),
  ('expenses',         'Pengeluaran',          'Keuangan',          'Manajemen pengeluaran'),
  ('transactions',     'Transaksi',            'Keuangan',          'Rekap transaksi keuangan'),
  ('employees',        'Karyawan',             'SDM',               'Manajemen data karyawan'),
  ('training',         'Pelatihan Agen',       'SDM',               'Modul pelatihan produk agen'),
  ('vendors',          'Vendor',               'Operasional',       'Manajemen vendor & mitra'),
  ('hotels',           'Hotel',                'Operasional',       'Manajemen data hotel'),
  ('muthawifs',        'Muthawif',             'Operasional',       'Data pembimbing ibadah'),
  ('visa',             'Visa',                 'Operasional',       'Pengajuan & tracking visa'),
  ('siskohat',         'SISKOHAT Kemenag',     'Operasional',       'Sinkronisasi data haji ke SISKOHAT'),
  ('branches',         'Cabang',               'Sistem',            'Manajemen kantor cabang'),
  ('users',            'Manajemen User',       'Sistem',            'Kelola akun pengguna'),
  ('settings',         'Pengaturan',           'Sistem',            'Konfigurasi sistem'),
  ('website-settings', 'Pengaturan Website',   'Sistem',            'Tampilan website publik'),
  ('sos-alerts',       'SOS Alerts',           'Operasional',       'Darurat jamaah di lapangan'),
  ('marketing-campaigns','Kampanye Marketing', 'Marketing',         'Manajemen kampanye iklan'),
  ('media-gallery',    'Galeri Media',         'Marketing',         'Video testimoni & foto hotel'),
  ('sales-targets',    'Target Penjualan',     'Penjualan',         'Target booking per periode'),
  ('chat-leads',       'Leads Chat Widget',    'Penjualan',         'Lead dari chat widget website'),
  ('vendor-contracts', 'Kontrak Vendor',       'Operasional',       'Manajemen kontrak vendor'),
  ('approval-requests','Approval Workflow',    'Keuangan',          'Alur persetujuan refund/diskon'),
  ('dashboard-config', 'Konfigurasi Dashboard','Sistem',            'Konfigurasi widget dashboard'),
  ('store',            'Toko Online',          'Penjualan',         'Toko perlengkapan ibadah'),
  ('store-products',   'Produk Toko',          'Penjualan',         'Manajemen produk toko'),
  ('store-orders',     'Pesanan Toko',         'Penjualan',         'Manajemen pesanan toko'),
  ('store-categories', 'Kategori Produk',      'Penjualan',         'Kategori produk toko')
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- BAGIAN 9: PAYMENT DEADLINE REMINDERS & ROOM GROUP AUDIT
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_deadline_reminders (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  due_date    DATE NOT NULL,
  reminder_sent_at TIMESTAMPTZ,
  is_sent     BOOLEAN DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdr_booking_id ON payment_deadline_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_pdr_due_date   ON payment_deadline_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_pdr_is_sent    ON payment_deadline_reminders(is_sent);

ALTER TABLE payment_deadline_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_pdr" ON payment_deadline_reminders;
CREATE POLICY "staff_manage_pdr" ON payment_deadline_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance','operational')
    )
  );

CREATE TABLE IF NOT EXISTS room_group_audit (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  changed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details       JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rga_departure_id ON room_group_audit(departure_id);

ALTER TABLE room_group_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_room_group_audit" ON room_group_audit;
CREATE POLICY "staff_manage_room_group_audit" ON room_group_audit
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );


-- =============================================================================
-- BAGIAN 10: WHATSAPP INTEGRATION (Fonnte)
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  api_key     TEXT NOT NULL DEFAULT '',
  device_id   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  webhook_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id)
);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_wa_config" ON whatsapp_config;
CREATE POLICY "admin_manage_wa_config" ON whatsapp_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_config_updated_at'
    AND tgrelid='whatsapp_config'::regclass) THEN
    CREATE TRIGGER set_wa_config_updated_at
      BEFORE UPDATE ON whatsapp_config
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  variables  TEXT[] DEFAULT '{}',
  category   TEXT NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional','marketing','reminder','notification')),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_wa_templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "staff_read_wa_templates"   ON whatsapp_templates;

CREATE POLICY "admin_manage_wa_templates" ON whatsapp_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

CREATE POLICY "staff_read_wa_templates" ON whatsapp_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL,
  template_code TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','delivered')),
  response_data JSONB,
  sent_at       TIMESTAMPTZ,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_phone      ON whatsapp_logs(phone);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status     ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_logs_created_at ON whatsapp_logs(created_at DESC);

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_wa_logs" ON whatsapp_logs;
CREATE POLICY "staff_manage_wa_logs" ON whatsapp_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','marketing')
    )
  );


-- =============================================================================
-- BAGIAN 11: CRM — AGENT LEADS, DISCOUNT REQUESTS, CHAT LEADS
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_leads (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  package_interest  TEXT,
  status            TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost')),
  notes             TEXT,
  follow_up_date    DATE,
  source            TEXT DEFAULT 'direct',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_leads_agent_id ON agent_leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_leads_status   ON agent_leads(status);

ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_leads" ON agent_leads;
DROP POLICY IF EXISTS "admin_read_all_leads"   ON agent_leads;

CREATE POLICY "agent_manage_own_leads" ON agent_leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_read_all_leads" ON agent_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','sales')
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
  booking_id      UUID REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
  requested_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_type   TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage','fixed')),
  discount_value  NUMERIC(15,2) NOT NULL,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  rejection_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_requests_status ON discount_requests(status);

ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_discount_requests" ON discount_requests;
DROP POLICY IF EXISTS "agent_create_discount_request"  ON discount_requests;

CREATE POLICY "staff_manage_discount_requests" ON discount_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance','sales')
    )
  );

CREATE POLICY "agent_create_discount_request" ON discount_requests
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS chat_leads (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  message    TEXT,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  agent_id   UUID REFERENCES agents(id) ON DELETE SET NULL,
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  source     TEXT DEFAULT 'website_chat',
  status     TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','converted','lost')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_leads_branch_id ON chat_leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_chat_leads_status    ON chat_leads(status);

ALTER TABLE chat_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_chat_leads" ON chat_leads;
DROP POLICY IF EXISTS "public_insert_chat_lead"  ON chat_leads;

CREATE POLICY "staff_manage_chat_leads" ON chat_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing')
    )
  );

CREATE POLICY "public_insert_chat_lead" ON chat_leads
  FOR INSERT WITH CHECK (TRUE);


-- =============================================================================
-- BAGIAN 12: MANASIK & PAKET REVIEWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS manasik_schedules (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  session_date  DATE NOT NULL,
  start_time    TIME,
  end_time      TIME,
  location      TEXT,
  type          TEXT NOT NULL DEFAULT 'offline'
    CHECK (type IN ('offline','online','hybrid')),
  meeting_link  TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manasik_departure  ON manasik_schedules(departure_id);
CREATE INDEX IF NOT EXISTS idx_manasik_date       ON manasik_schedules(session_date);

ALTER TABLE manasik_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_manasik" ON manasik_schedules;
DROP POLICY IF EXISTS "customer_read_manasik" ON manasik_schedules;

CREATE POLICY "staff_manage_manasik" ON manasik_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "customer_read_manasik" ON manasik_schedules
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_manasik_updated_at'
    AND tgrelid='manasik_schedules'::regclass) THEN
    CREATE TRIGGER set_manasik_updated_at
      BEFORE UPDATE ON manasik_schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS manasik_attendance (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id      UUID NOT NULL REFERENCES manasik_schedules(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'hadir'
    CHECK (status IN ('hadir','absen','izin','terlambat')),
  notes            TEXT,
  recorded_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (schedule_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_ma_schedule   ON manasik_attendance(schedule_id);
CREATE INDEX IF NOT EXISTS idx_ma_customer   ON manasik_attendance(customer_id);

ALTER TABLE manasik_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_manasik_attendance" ON manasik_attendance;
CREATE POLICY "staff_manage_manasik_attendance" ON manasik_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE TABLE IF NOT EXISTS package_reviews (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review       TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (package_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_package_id ON package_reviews(package_id);
CREATE INDEX IF NOT EXISTS idx_pr_customer   ON package_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_pr_published  ON package_reviews(is_published);

ALTER TABLE package_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_package_review" ON package_reviews;
DROP POLICY IF EXISTS "public_read_package_reviews"    ON package_reviews;
DROP POLICY IF EXISTS "admin_manage_package_reviews"   ON package_reviews;

CREATE POLICY "customer_insert_package_review" ON package_reviews
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "public_read_package_reviews" ON package_reviews
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "admin_manage_package_reviews" ON package_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

CREATE TABLE IF NOT EXISTS departure_checklists (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  item           TEXT NOT NULL,
  is_completed   BOOLEAN DEFAULT FALSE,
  completed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  due_date       DATE,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dc_departure ON departure_checklists(departure_id);

ALTER TABLE departure_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_checklists" ON departure_checklists;
CREATE POLICY "staff_manage_departure_checklists" ON departure_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );


-- =============================================================================
-- BAGIAN 13: FASE 16 — FITUR LANJUTAN (Approval, Dashboard, Keuangan, Marketing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS visa_status_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  notes       TEXT,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_logs_customer ON visa_status_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_logs_created  ON visa_status_logs(created_at DESC);

ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_kelola_visa_logs"      ON visa_status_logs;
DROP POLICY IF EXISTS "jamaah_baca_visa_log_sendiri" ON visa_status_logs;

CREATE POLICY "admin_kelola_visa_logs" ON visa_status_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "jamaah_baca_visa_log_sendiri" ON visa_status_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS approval_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type             TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice','custom')),
  reference_id     UUID,
  reference_type   TEXT,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount           NUMERIC(15,2),
  percentage       NUMERIC(5,2),
  reason           TEXT NOT NULL,
  current_level    INTEGER NOT NULL DEFAULT 1,
  required_levels  INTEGER NOT NULL DEFAULT 2,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  final_notes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status    ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type      ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_booking   ON approval_requests(booking_id);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "requester_read_own_requests"    ON approval_requests;

CREATE POLICY "staff_manage_approval_requests" ON approval_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance','sales')
    )
  );

CREATE POLICY "requester_read_own_requests" ON approval_requests
  FOR SELECT USING (requested_by = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_approval_requests_updated_at'
    AND tgrelid='approval_requests'::regclass) THEN
    CREATE TRIGGER set_approval_requests_updated_at
      BEFORE UPDATE ON approval_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS approval_actions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  level               INTEGER NOT NULL,
  action              TEXT NOT NULL CHECK (action IN ('approved','rejected')),
  actioned_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role_at_action      TEXT,
  notes               TEXT,
  actioned_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions(approval_request_id);

ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_approval_actions" ON approval_actions;
CREATE POLICY "staff_manage_approval_actions" ON approval_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE TABLE IF NOT EXISTS dashboard_access_config (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role           TEXT NOT NULL UNIQUE,
  allowed_widgets TEXT[] DEFAULT '{}',
  denied_widgets  TEXT[] DEFAULT '{}',
  custom_layout   JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dashboard_access_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_dashboard_config" ON dashboard_access_config;
DROP POLICY IF EXISTS "staff_read_dashboard_config"   ON dashboard_access_config;

CREATE POLICY "admin_manage_dashboard_config" ON dashboard_access_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "staff_read_dashboard_config" ON dashboard_access_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS dashboard_access_audit_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daal_user_id    ON dashboard_access_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_daal_created_at ON dashboard_access_audit_log(created_at DESC);

ALTER TABLE dashboard_access_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_log" ON dashboard_access_audit_log;
CREATE POLICY "admin_read_audit_log" ON dashboard_access_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

CREATE TABLE IF NOT EXISTS financial_summary (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_year        INTEGER NOT NULL,
  period_month       INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  branch_id          UUID REFERENCES branches(id) ON DELETE SET NULL,
  total_revenue      NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_expenses     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_commissions  NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_profit         NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_bookings     INTEGER DEFAULT 0,
  total_customers    INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_year, period_month, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_fs_period   ON financial_summary(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_fs_branch   ON financial_summary(branch_id);

ALTER TABLE financial_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_summary" ON financial_summary;
CREATE POLICY "finance_manage_summary" ON financial_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE TABLE IF NOT EXISTS transactions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type             TEXT NOT NULL
    CHECK (type IN ('income','expense','commission','refund','adjustment')),
  amount           NUMERIC(15,2) NOT NULL,
  description      TEXT NOT NULL,
  category         TEXT,
  reference_number TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(transaction_date DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_transactions" ON transactions;
CREATE POLICY "finance_manage_transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE TABLE IF NOT EXISTS expenses (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  departure_id     UUID REFERENCES departures(id) ON DELETE SET NULL,
  category         TEXT NOT NULL
    CHECK (category IN ('hotel','tiket','visa','katering','transportasi','handling',
                        'gaji','komisi','pemasaran','operasional','lainnya')),
  description      TEXT NOT NULL,
  amount           NUMERIC(15,2) NOT NULL,
  vendor_id        UUID REFERENCES vendors(id) ON DELETE SET NULL,
  expense_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method   TEXT DEFAULT 'transfer',
  receipt_url      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','rejected')),
  approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status    ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_expenses" ON expenses;
DROP POLICY IF EXISTS "staff_read_expenses"     ON expenses;

CREATE POLICY "finance_manage_expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "staff_read_expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance','operational')
    )
  );


-- =============================================================================
-- BAGIAN 14: MARKETING — KAMPANYE, METRIK, KONVERSI
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL
    CHECK (type IN ('whatsapp_blast','instagram','facebook','google_ads','email','banner','offline','lainnya')),
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','cancelled')),
  budget         NUMERIC(15,2) DEFAULT 0,
  spent          NUMERIC(15,2) DEFAULT 0,
  target_leads   INTEGER DEFAULT 0,
  actual_leads   INTEGER DEFAULT 0,
  conversions    INTEGER DEFAULT 0,
  start_date     DATE,
  end_date       DATE,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  package_id     UUID REFERENCES packages(id) ON DELETE SET NULL,
  description    TEXT,
  content_url    TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mc_branch_id  ON marketing_campaigns(branch_id);
CREATE INDEX IF NOT EXISTS idx_mc_status     ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_mc_dates      ON marketing_campaigns(start_date, end_date);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_campaigns" ON marketing_campaigns;
CREATE POLICY "marketing_manage_campaigns" ON marketing_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','marketing')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_mc_updated_at'
    AND tgrelid='marketing_campaigns'::regclass) THEN
    CREATE TRIGGER set_mc_updated_at
      BEFORE UPDATE ON marketing_campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketing_metrics (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  metric_date   DATE NOT NULL,
  impressions   INTEGER DEFAULT 0,
  clicks        INTEGER DEFAULT 0,
  leads         INTEGER DEFAULT 0,
  conversions   INTEGER DEFAULT 0,
  cost          NUMERIC(15,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mm_campaign ON marketing_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mm_date     ON marketing_metrics(metric_date DESC);

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

CREATE TABLE IF NOT EXISTS marketing_conversions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  source        TEXT,
  conversion_value NUMERIC(15,2) DEFAULT 0,
  converted_at  TIMESTAMPTZ DEFAULT NOW(),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_conv_campaign ON marketing_conversions(campaign_id);

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


-- =============================================================================
-- BAGIAN 15: EQUIPMENT (INVENTARIS), SALES TARGETS, TRIP TIMELINE
-- =============================================================================

CREATE TABLE IF NOT EXISTS equipment (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  code            TEXT UNIQUE,
  category        TEXT NOT NULL
    CHECK (category IN ('koper','seragam','id_card','banner','sound','lainnya')),
  quantity_total  INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_damaged   INTEGER NOT NULL DEFAULT 0,
  condition       TEXT NOT NULL DEFAULT 'good'
    CHECK (condition IN ('good','fair','poor','damaged')),
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  purchase_date   DATE,
  purchase_price  NUMERIC(15,2),
  photo_url       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_branch_id ON equipment(branch_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category  ON equipment(category);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment" ON equipment;
CREATE POLICY "staff_manage_equipment" ON equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','equipment')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_equipment_updated_at'
    AND tgrelid='equipment'::regclass) THEN
    CREATE TRIGGER set_equipment_updated_at
      BEFORE UPDATE ON equipment
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id  UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('preventive','corrective','inspection')),
  description   TEXT NOT NULL,
  cost          NUMERIC(15,2) DEFAULT 0,
  performed_by  TEXT,
  performed_at  DATE NOT NULL,
  next_due_at   DATE,
  status        TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('scheduled','in_progress','completed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_em_equipment_id ON equipment_maintenance(equipment_id);

ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "staff_manage_equipment_maintenance" ON equipment_maintenance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','equipment')
    )
  );

CREATE TABLE IF NOT EXISTS equipment_damage (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id  UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  departure_id  UUID REFERENCES departures(id) ON DELETE SET NULL,
  description   TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor','moderate','severe','total_loss')),
  reported_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_at   TIMESTAMPTZ DEFAULT NOW(),
  repair_cost   NUMERIC(15,2) DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported','under_repair','repaired','written_off')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ed_equipment_id ON equipment_damage(equipment_id);

ALTER TABLE equipment_damage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_equipment_damage" ON equipment_damage;
CREATE POLICY "staff_manage_equipment_damage" ON equipment_damage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','equipment')
    )
  );

CREATE TABLE IF NOT EXISTS sales_targets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id          UUID REFERENCES agents(id) ON DELETE SET NULL,
  period_year       INTEGER NOT NULL,
  period_month      INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  target_bookings   INTEGER DEFAULT 0,
  target_revenue    NUMERIC(18,2) DEFAULT 0,
  target_leads      INTEGER DEFAULT 0,
  actual_bookings   INTEGER DEFAULT 0,
  actual_revenue    NUMERIC(18,2) DEFAULT 0,
  actual_leads      INTEGER DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, agent_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_st_branch_id ON sales_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_st_period    ON sales_targets(period_year, period_month);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_sales_targets" ON sales_targets;
CREATE POLICY "admin_manage_sales_targets" ON sales_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','sales')
    )
  );

CREATE TABLE IF NOT EXISTS trip_timeline (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  day_number    INTEGER NOT NULL,
  date          DATE,
  title         TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  activities    JSONB DEFAULT '[]',
  hotel_name    TEXT,
  meals         TEXT[] DEFAULT '{}',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tt_departure ON trip_timeline(departure_id);

ALTER TABLE trip_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_trip_timeline" ON trip_timeline;
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
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS booking_document_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('uploaded','verified','rejected','deleted')),
  notes       TEXT,
  actioned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdl_booking ON booking_document_logs(booking_id);

ALTER TABLE booking_document_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_booking_doc_logs" ON booking_document_logs;
CREATE POLICY "staff_manage_booking_doc_logs" ON booking_document_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer')
    )
  );

CREATE TABLE IF NOT EXISTS notification_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info','success','warning','error','urgent')),
  channel     TEXT[] DEFAULT '{}'
    CHECK (channel <@ ARRAY['email','whatsapp','push','in_app']::TEXT[]),
  variables   TEXT[] DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_notif_templates" ON notification_templates;
DROP POLICY IF EXISTS "staff_read_notif_templates"   ON notification_templates;

CREATE POLICY "admin_manage_notif_templates" ON notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "staff_read_notif_templates" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- BAGIAN 16: FASE 17 — VENDOR CONTRACTS, DEPARTURE BUDGETS, TRAINING, MEDIA
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
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vc_vendor_id  ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vc_end_date   ON vendor_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_vc_status     ON vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_vc_branch_id  ON vendor_contracts(branch_id);

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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vc_updated_at'
    AND tgrelid='vendor_contracts'::regclass) THEN
    CREATE TRIGGER set_vc_updated_at BEFORE UPDATE ON vendor_contracts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_db_departure_id ON departure_budgets(departure_id);

ALTER TABLE departure_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_budgets" ON departure_budgets;
CREATE POLICY "staff_manage_departure_budgets" ON departure_budgets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance','operational'))
  );

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

CREATE INDEX IF NOT EXISTS idx_tm_category   ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_tm_active     ON training_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_tm_order      ON training_modules(order_index);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_modules" ON training_modules;
DROP POLICY IF EXISTS "agent_read_training_modules"   ON training_modules;

CREATE POLICY "admin_manage_training_modules" ON training_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_modules" ON training_modules
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_tm_updated_at'
    AND tgrelid='training_modules'::regclass) THEN
    CREATE TRIGGER set_tm_updated_at BEFORE UPDATE ON training_modules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS training_quizzes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  correct_answer TEXT,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tq_module_id ON training_quizzes(module_id);

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

CREATE INDEX IF NOT EXISTS idx_atp_agent_id  ON agent_training_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_atp_module_id ON agent_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_atp_status    ON agent_training_progress(status);

ALTER TABLE agent_training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_training" ON agent_training_progress;
DROP POLICY IF EXISTS "admin_read_all_training"   ON agent_training_progress;

CREATE POLICY "agent_manage_own_training" ON agent_training_progress
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_read_all_training" ON agent_training_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

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

CREATE INDEX IF NOT EXISTS idx_mg_type       ON media_gallery(type);
CREATE INDEX IF NOT EXISTS idx_mg_hotel_id   ON media_gallery(hotel_id);
CREATE INDEX IF NOT EXISTS idx_mg_package_id ON media_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_mg_active     ON media_gallery(is_active);

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

CREATE INDEX IF NOT EXISTS idx_ssl_created_at ON siskohat_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ssl_status     ON siskohat_sync_logs(status);

ALTER TABLE siskohat_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_siskohat_logs" ON siskohat_sync_logs;
CREATE POLICY "admin_manage_siskohat_logs" ON siskohat_sync_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );


-- =============================================================================
-- BAGIAN 17: APPROVAL CONFIGS & AGENT OVERRIDE COMMISSIONS
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_aoc_agent_id     ON agent_override_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_aoc_sub_agent_id ON agent_override_commissions(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_aoc_booking_id   ON agent_override_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_aoc_status       ON agent_override_commissions(status);

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

CREATE INDEX IF NOT EXISTS idx_bri_category ON baggage_reference_items(category);

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


-- =============================================================================
-- BAGIAN 18: FASE 18 — COMPANY SETTINGS, BANK ACCOUNTS, CONTACT PAGE
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

CREATE INDEX IF NOT EXISTS idx_cs_key ON company_settings(setting_key);

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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_cs_updated_at'
    AND tgrelid='company_settings'::regclass) THEN
    CREATE TRIGGER set_cs_updated_at BEFORE UPDATE ON company_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO company_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name',        '"Vinstour Travel"',     'string', 'Nama resmi perusahaan'),
  ('company_tagline',     '"Perjalanan Suci Anda"','string', 'Tagline perusahaan'),
  ('company_phone',       '"021-1234567"',          'string', 'Nomor telepon utama'),
  ('company_email',       '"info@vinstour.com"',    'string', 'Email utama perusahaan'),
  ('company_address',     '"Jakarta, Indonesia"',   'string', 'Alamat kantor pusat'),
  ('company_logo_url',    'null',                   'url',    'URL logo perusahaan'),
  ('company_wa_number',   '"628111234567"',          'string', 'Nomor WhatsApp utama (format 62xxx)'),
  ('kpi_targets_monthly', '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}', 'json', 'Target KPI bulanan'),
  ('fonnte_api_key',      'null',                   'string', 'API key Fonnte untuk kirim WhatsApp'),
  ('siskohat_api_key',    'null',                   'string', 'API key SISKOHAT Kemenag'),
  ('max_booking_dp_pct',  '30',                     'number', 'Persentase minimal DP booking (%)'),
  ('booking_expiry_hours','24',                     'number', 'Jam sebelum booking pending kadaluarsa')
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

CREATE INDEX IF NOT EXISTS idx_ba_primary ON bank_accounts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_ba_active  ON bank_accounts(is_active)  WHERE is_active  = TRUE;

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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ba_updated_at'
    AND tgrelid='bank_accounts'::regclass) THEN
    CREATE TRIGGER set_ba_updated_at BEFORE UPDATE ON bank_accounts
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

INSERT INTO contact_page_content (hero_title, hero_subtitle, form_title, operating_hours)
VALUES (
  'Hubungi Kami',
  'Tim kami siap membantu Anda merencanakan perjalanan ibadah terbaik.',
  'Kirim Pesan',
  '{"senin_jumat":"08.00 - 17.00 WIB","sabtu":"08.00 - 13.00 WIB","minggu":"Tutup"}'::JSONB
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- BAGIAN 19: FASE 19 — BRANCH MONTHLY TARGETS
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

DROP POLICY IF EXISTS "admin_manage_branch_targets"         ON branch_monthly_targets;
DROP POLICY IF EXISTS "branch_manager_manage_own_targets"   ON branch_monthly_targets;

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
    CREATE TRIGGER set_bmt_updated_at BEFORE UPDATE ON branch_monthly_targets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- BAGIAN 20: FASE 20 — WEBHOOK CONFIGS, LOGS, PUSH SUBSCRIPTIONS
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

CREATE INDEX IF NOT EXISTS idx_wc_is_active ON webhook_configs(is_active);

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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wc_updated_at'
    AND tgrelid='webhook_configs'::regclass) THEN
    CREATE TRIGGER set_wc_updated_at BEFORE UPDATE ON webhook_configs
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

CREATE INDEX IF NOT EXISTS idx_wl_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_wl_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wl_status     ON webhook_logs(status);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_webhook_logs" ON webhook_logs;
CREATE POLICY "admin_manage_webhook_logs" ON webhook_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin')
    )
  );

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

CREATE INDEX IF NOT EXISTS idx_ps_customer_id ON push_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_ps_endpoint    ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_manage_own_push_sub" ON push_subscriptions;
DROP POLICY IF EXISTS "admin_read_push_subs"         ON push_subscriptions;

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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ps_updated_at'
    AND tgrelid='push_subscriptions'::regclass) THEN
    CREATE TRIGGER set_ps_updated_at BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Push outbox (antrian pengiriman push notification)
CREATE TABLE IF NOT EXISTS push_outbox (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  url         TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed')),
  attempt_count INTEGER DEFAULT 0,
  sent_at     TIMESTAMPTZ,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_customer_id ON push_outbox(customer_id);
CREATE INDEX IF NOT EXISTS idx_po_status      ON push_outbox(status);

ALTER TABLE push_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_push_outbox" ON push_outbox;
CREATE POLICY "admin_manage_push_outbox" ON push_outbox
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','operational')
    )
  );


-- =============================================================================
-- BAGIAN 21: FASE 21 — JAMAAH CHECKLIST, ATTENDANCE, ROOM OCCUPANTS, FEEDBACK
-- =============================================================================

CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  is_checked  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_jc_customer ON jamaah_checklist(customer_id);

ALTER TABLE jamaah_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah_baca_checklist_sendiri"   ON jamaah_checklist;
DROP POLICY IF EXISTS "jamaah_upsert_checklist_sendiri" ON jamaah_checklist;
DROP POLICY IF EXISTS "admin_baca_semua_checklist"      ON jamaah_checklist;

CREATE POLICY "jamaah_baca_checklist_sendiri" ON jamaah_checklist
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "jamaah_upsert_checklist_sendiri" ON jamaah_checklist
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_baca_semua_checklist" ON jamaah_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id  UUID REFERENCES departures(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
  session_type  TEXT NOT NULL DEFAULT 'lainnya',
  session_label TEXT,
  status        TEXT NOT NULL DEFAULT 'hadir'
    CHECK (status IN ('hadir','absen','terlambat','izin')),
  notes         TEXT,
  recorded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_departure  ON attendance(departure_id);
CREATE INDEX IF NOT EXISTS idx_att_customer   ON attendance(customer_id);
CREATE INDEX IF NOT EXISTS idx_att_session    ON attendance(departure_id, session_type, recorded_at);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawif_insert_attendance" ON attendance;
DROP POLICY IF EXISTS "muthawif_baca_attendance"   ON attendance;
DROP POLICY IF EXISTS "muthawif_update_attendance" ON attendance;

CREATE POLICY "muthawif_insert_attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "muthawif_baca_attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "muthawif_update_attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE TABLE IF NOT EXISTS room_occupants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_assignment_id UUID NOT NULL REFERENCES room_assignments(id) ON DELETE CASCADE,
  customer_id        UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bed_number         INT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_assignment_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_ro_room     ON room_occupants(room_assignment_id);
CREATE INDEX IF NOT EXISTS idx_ro_customer ON room_occupants(customer_id);

ALTER TABLE room_occupants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_kelola_room_occupants" ON room_occupants;
DROP POLICY IF EXISTS "jamaah_baca_kamar_sendiri"   ON room_occupants;

CREATE POLICY "admin_kelola_room_occupants" ON room_occupants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "jamaah_baca_kamar_sendiri" ON room_occupants
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  aspects     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_customer ON feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_fb_booking  ON feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_fb_created  ON feedback(created_at);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah_insert_feedback_sendiri" ON feedback;
DROP POLICY IF EXISTS "semua_baca_feedback"            ON feedback;
DROP POLICY IF EXISTS "admin_kelola_feedback"          ON feedback;

CREATE POLICY "jamaah_insert_feedback_sendiri" ON feedback
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "semua_baca_feedback" ON feedback
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_kelola_feedback" ON feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager')
    )
  );


-- =============================================================================
-- BAGIAN 22: FASE 22 — MUTHAWIF JAMAAH EVALUATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS muthawif_jamaah_evaluations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  muthawif_id  UUID        NOT NULL REFERENCES muthawifs(id) ON DELETE CASCADE,
  departure_id UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  customer_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id   UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  kategori     TEXT        NOT NULL DEFAULT 'umum'
    CHECK (kategori IN ('umum','ibadah','kesehatan','disiplin','sosial')),
  catatan      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (muthawif_id, departure_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_mje_departure  ON muthawif_jamaah_evaluations(departure_id);
CREATE INDEX IF NOT EXISTS idx_mje_muthawif   ON muthawif_jamaah_evaluations(muthawif_id);
CREATE INDEX IF NOT EXISTS idx_mje_customer   ON muthawif_jamaah_evaluations(customer_id);

ALTER TABLE muthawif_jamaah_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawif_eval_select" ON muthawif_jamaah_evaluations;
DROP POLICY IF EXISTS "muthawif_eval_insert" ON muthawif_jamaah_evaluations;
DROP POLICY IF EXISTS "muthawif_eval_update" ON muthawif_jamaah_evaluations;
DROP POLICY IF EXISTS "muthawif_eval_delete" ON muthawif_jamaah_evaluations;

CREATE POLICY "muthawif_eval_select" ON muthawif_jamaah_evaluations
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "muthawif_eval_insert" ON muthawif_jamaah_evaluations
  FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "muthawif_eval_update" ON muthawif_jamaah_evaluations
  FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "muthawif_eval_delete" ON muthawif_jamaah_evaluations
  FOR DELETE TO authenticated USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_mje_updated_at'
    AND tgrelid='muthawif_jamaah_evaluations'::regclass) THEN
    CREATE TRIGGER trg_mje_updated_at
      BEFORE UPDATE ON muthawif_jamaah_evaluations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE muthawif_jamaah_evaluations IS
  'Penilaian muthawif per jamaah per keberangkatan — rating 1-5 + catatan per kategori';


-- =============================================================================
-- SELESAI — Schema Extended Vinstour (Bagian 2)
-- Lanjutkan dengan menjalankan vinstour_schema_3_store.sql
-- =============================================================================
SELECT 'Vinstour Schema Bagian 2 (Extended) — selesai dibuat.' AS result;
