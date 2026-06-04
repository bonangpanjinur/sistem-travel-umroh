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
