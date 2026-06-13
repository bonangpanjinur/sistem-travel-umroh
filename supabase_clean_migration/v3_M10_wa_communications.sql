-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M10: WhatsApp & Communications — Config, Templates, Logs,
--           Broadcast Campaigns, Roadmap (fase31 + fase32)
-- Depends on: M01–M06
-- =============================================================================

-- =============================================================================
-- 1. WHATSAPP_CONFIG — Konfigurasi provider WA (multi-provider, fase31)
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider        TEXT NOT NULL DEFAULT 'fonnte'
    CHECK (provider IN ('fonnte','wablas','wapanels','whacenter','maytapi','meta_cloud','custom')),
  display_name    TEXT NOT NULL DEFAULT 'WhatsApp Default',
  sender_number   TEXT,
  api_key         TEXT,
  provider_config JSONB DEFAULT '{}'::JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  test_error      TEXT,
  updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_provider  ON whatsapp_config(provider);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_is_active ON whatsapp_config(is_active);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_config_admin_manage" ON whatsapp_config;
DROP POLICY IF EXISTS "wa_config_staff_read"   ON whatsapp_config;

CREATE POLICY "wa_config_admin_manage" ON whatsapp_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

CREATE POLICY "wa_config_staff_read" ON whatsapp_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','marketing','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_whatsapp_config_updated_at'
    AND tgrelid='whatsapp_config'::regclass) THEN
    CREATE TRIGGER set_whatsapp_config_updated_at
      BEFORE UPDATE ON whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON whatsapp_config TO authenticated;

-- ALTER TABLE guards — kolom fase31 (multi-provider)
SELECT _add_column_if_not_exists('whatsapp_config','provider',        'TEXT',        'NOT NULL DEFAULT ''fonnte''');
SELECT _add_column_if_not_exists('whatsapp_config','display_name',    'TEXT',        'NOT NULL DEFAULT ''WhatsApp Default''');
SELECT _add_column_if_not_exists('whatsapp_config','provider_config', 'JSONB',       'DEFAULT ''{}''::JSONB');
SELECT _add_column_if_not_exists('whatsapp_config','last_tested_at',  'TIMESTAMPTZ', '');
SELECT _add_column_if_not_exists('whatsapp_config','last_test_ok',    'BOOLEAN',     '');
SELECT _add_column_if_not_exists('whatsapp_config','test_error',      'TEXT',        '');
SELECT _add_column_if_not_exists('whatsapp_config','updated_by',      'UUID',        '');


-- =============================================================================
-- 2. WA_TEMPLATES — Template pesan WhatsApp
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_templates (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'notification'
    CHECK (category IN ('notification','marketing','reminder','booking','payment','visa','departure','other')),
  body         TEXT NOT NULL,
  variables    TEXT[] DEFAULT '{}',
  sample       TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_templates_code      ON wa_templates(code);
CREATE INDEX IF NOT EXISTS idx_wa_templates_category  ON wa_templates(category);
CREATE INDEX IF NOT EXISTS idx_wa_templates_is_active ON wa_templates(is_active);

ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_templates_staff_manage" ON wa_templates;
DROP POLICY IF EXISTS "wa_templates_auth_read"    ON wa_templates;

CREATE POLICY "wa_templates_staff_manage" ON wa_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','operational','it'))
  );

CREATE POLICY "wa_templates_auth_read" ON wa_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_templates_updated_at'
    AND tgrelid='wa_templates'::regclass) THEN
    CREATE TRIGGER set_wa_templates_updated_at
      BEFORE UPDATE ON wa_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON wa_templates TO authenticated;


-- =============================================================================
-- 3. WA_SEND_LOGS — Log pengiriman pesan WA
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_send_logs (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id      UUID REFERENCES whatsapp_config(id) ON DELETE SET NULL,
  template_code  TEXT,
  phone          TEXT NOT NULL,
  message        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  provider_ref   TEXT,
  error_message  TEXT,
  sent_at        TIMESTAMPTZ,
  reference_id   UUID,
  reference_type TEXT,
  sent_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_send_logs_phone          ON wa_send_logs(phone);
CREATE INDEX IF NOT EXISTS idx_wa_send_logs_status         ON wa_send_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_send_logs_reference_id   ON wa_send_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_wa_send_logs_created_at     ON wa_send_logs(created_at DESC);

ALTER TABLE wa_send_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_send_logs_staff_manage" ON wa_send_logs;
DROP POLICY IF EXISTS "wa_send_logs_auth_read"    ON wa_send_logs;

CREATE POLICY "wa_send_logs_staff_manage" ON wa_send_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','marketing','it'))
  );

CREATE POLICY "wa_send_logs_auth_read" ON wa_send_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','marketing','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_send_logs_updated_at'
    AND tgrelid='wa_send_logs'::regclass) THEN
    CREATE TRIGGER set_wa_send_logs_updated_at
      BEFORE UPDATE ON wa_send_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT, INSERT ON wa_send_logs TO authenticated;


-- =============================================================================
-- 4. WA_BROADCAST_CAMPAIGNS — Kampanye broadcast WA tersegmentasi (fase32)
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_broadcast_campaigns (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  template_code     TEXT,
  message_body      TEXT NOT NULL,
  filter_type       TEXT NOT NULL DEFAULT 'all'
    CHECK (filter_type IN ('all','by_departure','by_package','by_payment_status','by_booking_status','custom')),
  filter_config     JSONB DEFAULT '{}'::JSONB,
  config_id         UUID REFERENCES whatsapp_config(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','running','completed','cancelled','failed')),
  scheduled_at      TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  total_recipients  INTEGER NOT NULL DEFAULT 0,
  sent_count        INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  delivered_count   INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_campaigns_status     ON wa_broadcast_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_wa_broadcast_campaigns_created_at ON wa_broadcast_campaigns(created_at DESC);

ALTER TABLE wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_broadcast_campaigns_staff_manage" ON wa_broadcast_campaigns;
DROP POLICY IF EXISTS "wa_broadcast_campaigns_staff_read"   ON wa_broadcast_campaigns;

CREATE POLICY "wa_broadcast_campaigns_staff_manage" ON wa_broadcast_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','it'))
  );

CREATE POLICY "wa_broadcast_campaigns_staff_read" ON wa_broadcast_campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_broadcast_campaigns_updated_at'
    AND tgrelid='wa_broadcast_campaigns'::regclass) THEN
    CREATE TRIGGER set_wa_broadcast_campaigns_updated_at
      BEFORE UPDATE ON wa_broadcast_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON wa_broadcast_campaigns TO authenticated;


-- =============================================================================
-- 5. WA_BROADCAST_LOGS — Log per-penerima kampanye broadcast (fase32)
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_broadcast_logs (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID NOT NULL REFERENCES wa_broadcast_campaigns(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,
  full_name     TEXT,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  message_sent  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  provider_ref  TEXT,
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_campaign_id ON wa_broadcast_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_phone       ON wa_broadcast_logs(phone);
CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_status      ON wa_broadcast_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_customer_id ON wa_broadcast_logs(customer_id);

ALTER TABLE wa_broadcast_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_broadcast_logs_staff_manage" ON wa_broadcast_logs;
DROP POLICY IF EXISTS "wa_broadcast_logs_staff_read"   ON wa_broadcast_logs;

CREATE POLICY "wa_broadcast_logs_staff_manage" ON wa_broadcast_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','it'))
  );

CREATE POLICY "wa_broadcast_logs_staff_read" ON wa_broadcast_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','operational','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_broadcast_logs_updated_at'
    AND tgrelid='wa_broadcast_logs'::regclass) THEN
    CREATE TRIGGER set_wa_broadcast_logs_updated_at
      BEFORE UPDATE ON wa_broadcast_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON wa_broadcast_logs TO authenticated;


-- =============================================================================
-- 6. WA_FEATURE_ROADMAP — Roadmap fitur WA (fase31)
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_feature_roadmap (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase       INTEGER NOT NULL DEFAULT 1,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','done','cancelled')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_feature_roadmap_phase  ON wa_feature_roadmap(phase);
CREATE INDEX IF NOT EXISTS idx_wa_feature_roadmap_status ON wa_feature_roadmap(status);

ALTER TABLE wa_feature_roadmap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_feature_roadmap_auth_read"    ON wa_feature_roadmap;
DROP POLICY IF EXISTS "wa_feature_roadmap_admin_write"  ON wa_feature_roadmap;

CREATE POLICY "wa_feature_roadmap_auth_read" ON wa_feature_roadmap
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "wa_feature_roadmap_admin_write" ON wa_feature_roadmap
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_feature_roadmap_updated_at'
    AND tgrelid='wa_feature_roadmap'::regclass) THEN
    CREATE TRIGGER set_wa_feature_roadmap_updated_at
      BEFORE UPDATE ON wa_feature_roadmap FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON wa_feature_roadmap TO authenticated;


-- =============================================================================
-- SELESAI — File M10: WhatsApp & Communications
-- =============================================================================
SELECT 'v3_M10_wa_communications: OK' AS result;
