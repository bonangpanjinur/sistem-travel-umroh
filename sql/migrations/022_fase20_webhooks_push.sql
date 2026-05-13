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
