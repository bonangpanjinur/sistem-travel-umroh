-- ============================================================
-- FASE 6: Tabel baru untuk menggantikan localStorage
-- Meliputi: app_settings, virtual_accounts, agent_monthly_targets,
--           jamaah_doa_sessions, jamaah_jurnal,
--           jamaah_ibadah_targets, jamaah_ibadah_logs
-- ============================================================

-- -------------------------------------------------------
-- app_settings — key-value store untuk konfigurasi app
-- (Midtrans config, WA otomatis trigger states, WA templates)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- virtual_accounts — nomor VA per customer per bank
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS virtual_accounts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_code   TEXT NOT NULL,
  va_number   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (customer_id, bank_code)
);
CREATE INDEX IF NOT EXISTS va_customer_idx ON virtual_accounts(customer_id);

-- -------------------------------------------------------
-- agent_monthly_targets — target bulanan per agen
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_monthly_targets (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id           UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  month_key          TEXT NOT NULL,  -- format: "yyyy-MM"
  booking_target     INT  NOT NULL DEFAULT 10,
  commission_target  BIGINT NOT NULL DEFAULT 10000000,
  jamaah_target      INT  NOT NULL DEFAULT 10,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, month_key)
);
CREATE INDEX IF NOT EXISTS amt_agent_month_idx ON agent_monthly_targets(agent_id, month_key);

-- -------------------------------------------------------
-- jamaah_doa_sessions — sesi dzikir/doa counter jamaah
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jamaah_doa_sessions (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

-- -------------------------------------------------------
-- jamaah_jurnal — jurnal ibadah harian jamaah
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jamaah_jurnal (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  mood       TEXT,
  location   TEXT,
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jj_user_idx ON jamaah_jurnal(user_id);
CREATE INDEX IF NOT EXISTS jj_date_idx  ON jamaah_jurnal(user_id, date);

-- -------------------------------------------------------
-- jamaah_ibadah_targets — target ibadah harian jamaah
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jamaah_ibadah_targets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  icon         TEXT,
  unit         TEXT NOT NULL DEFAULT 'kali',
  daily_target INT NOT NULL DEFAULT 1,
  category     TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jit_user_idx ON jamaah_ibadah_targets(user_id);

-- -------------------------------------------------------
-- jamaah_ibadah_logs — log capaian ibadah harian
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jamaah_ibadah_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id  UUID NOT NULL REFERENCES jamaah_ibadah_targets(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL,
  count      INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (target_id, log_date)
);
CREATE INDEX IF NOT EXISTS jil_user_date_idx ON jamaah_ibadah_logs(user_id, log_date);

-- -------------------------------------------------------
-- jamaah_badges — sudah ada di migrations sebelumnya,
-- pastikan kolom ini ada
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jamaah_badges (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS jb_user_idx ON jamaah_badges(user_id);

-- RLS policies (opsional, aktifkan sesuai kebutuhan)
ALTER TABLE app_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaah_doa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaah_jurnal       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaah_ibadah_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaah_ibadah_logs  ENABLE ROW LEVEL SECURITY;

-- app_settings: admin bisa baca/tulis semua
CREATE POLICY IF NOT EXISTS "app_settings_admin" ON app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','branch_admin'))
  );

-- virtual_accounts: admin bisa semua, customer baca milik sendiri
CREATE POLICY IF NOT EXISTS "va_admin" ON virtual_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','branch_admin'))
  );
CREATE POLICY IF NOT EXISTS "va_customer_read" ON virtual_accounts
  FOR SELECT USING (customer_id = auth.uid());

-- agent_monthly_targets: agen baca/tulis milik sendiri, admin semua
CREATE POLICY IF NOT EXISTS "amt_agent_own" ON agent_monthly_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = agent_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','branch_admin'))
  );

-- jamaah tables: user hanya akses data milik sendiri
CREATE POLICY IF NOT EXISTS "jds_own" ON jamaah_doa_sessions  FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "jj_own"  ON jamaah_jurnal         FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "jit_own" ON jamaah_ibadah_targets FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "jil_own" ON jamaah_ibadah_logs    FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "jb_own"  ON jamaah_badges         FOR ALL USING (user_id = auth.uid());
