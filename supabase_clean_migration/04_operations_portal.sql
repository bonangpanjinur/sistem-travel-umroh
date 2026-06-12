-- =============================================================================
-- FILE 04 — Operations & Customer Portal
-- Meliputi: customer portal, notifikasi, WhatsApp, SOS, Visa,
--           approval, jamaah digital, membership, email
-- Jalankan setelah 03_customers_bookings.sql
-- =============================================================================

-- =============================================================================
-- 1. CUSTOMER_ACCOUNTS — Akun portal jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  referred_by_agent_id  UUID REFERENCES agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_slug            TEXT,
  branch_slug           TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_user_id     ON customer_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_agent_id    ON customer_accounts(referred_by_agent_id);

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_accounts_own" ON customer_accounts;
CREATE POLICY "customer_accounts_own" ON customer_accounts
  FOR ALL USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_accounts_updated_at'
    AND tgrelid='customer_accounts'::regclass) THEN
    CREATE TRIGGER set_customer_accounts_updated_at
      BEFORE UPDATE ON customer_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. CUSTOMER_NOTIFICATIONS — Notifikasi per jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error','urgent')),
  link        TEXT,
  icon        TEXT,
  is_read     BOOLEAN DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_is_read     ON customer_notifications(is_read);

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_notif_own"        ON customer_notifications;
DROP POLICY IF EXISTS "customer_notif_update"     ON customer_notifications;
DROP POLICY IF EXISTS "staff_manage_notifications" ON customer_notifications;

CREATE POLICY "customer_notif_own" ON customer_notifications
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "customer_notif_update" ON customer_notifications
  FOR UPDATE USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "staff_manage_notifications" ON customer_notifications
  FOR ALL USING (auth.role() = 'authenticated');


-- =============================================================================
-- 3. BOOKING_FEEDBACK — Ulasan & rating booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  review       TEXT,
  aspects      JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_feedback_booking_id  ON booking_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_feedback_customer_id ON booking_feedback(customer_id);

ALTER TABLE booking_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_feedback_own"   ON booking_feedback;
DROP POLICY IF EXISTS "admin_read_feedback"    ON booking_feedback;

CREATE POLICY "booking_feedback_own" ON booking_feedback
  FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "admin_read_feedback" ON booking_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_booking_feedback_updated_at'
    AND tgrelid='booking_feedback'::regclass) THEN
    CREATE TRIGGER set_booking_feedback_updated_at
      BEFORE UPDATE ON booking_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. EMAIL_TEMPLATES — Template email
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  variables  TEXT[] DEFAULT '{}',
  trigger    TEXT DEFAULT 'manual',
  is_active  BOOLEAN DEFAULT true,
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','branch_manager','marketing'))
  );


-- =============================================================================
-- 5. EMAIL_LOGS — Log pengiriman email
-- =============================================================================
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

CREATE POLICY "staff_read_email_logs"   ON email_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "staff_insert_email_logs" ON email_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- =============================================================================
-- 6. NOTIFICATIONS — Notifikasi sistem ke user
-- =============================================================================
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
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );


-- =============================================================================
-- 7. SUPPORT_TICKETS — Tiket dukungan jamaah
-- =============================================================================
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

CREATE POLICY "support_tickets_staff_manage" ON support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "support_tickets_own_manage" ON support_tickets
  FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_support_tickets_updated_at'
    AND tgrelid='support_tickets'::regclass) THEN
    CREATE TRIGGER set_support_tickets_updated_at
      BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 8. ANNOUNCEMENTS — Pengumuman internal
-- =============================================================================
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

CREATE POLICY "announcements_admin_manage" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "announcements_staff_read" ON announcements
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_announcements_updated_at'
    AND tgrelid='announcements'::regclass) THEN
    CREATE TRIGGER set_announcements_updated_at
      BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 9. BANNERS — Banner promosi website
-- =============================================================================
CREATE TABLE IF NOT EXISTS banners (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  image_url  TEXT,
  link_url   TEXT,
  link_text  TEXT,
  position   TEXT DEFAULT 'home'
    CHECK (position IN ('home','packages','about','contact')),
  is_active  BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_position  ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_branch_id ON banners(branch_id);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_admin_manage" ON banners;
DROP POLICY IF EXISTS "banners_public_read"  ON banners;

CREATE POLICY "banners_admin_manage" ON banners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

CREATE POLICY "banners_public_read" ON banners
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_banners_updated_at'
    AND tgrelid='banners'::regclass) THEN
    CREATE TRIGGER set_banners_updated_at
      BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 10. COUPONS — Kupon diskon
-- =============================================================================
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

CREATE POLICY "coupons_admin_manage" ON coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

CREATE POLICY "coupons_public_read" ON coupons
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_coupons_updated_at'
    AND tgrelid='coupons'::regclass) THEN
    CREATE TRIGGER set_coupons_updated_at
      BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 11. VISA_APPLICATIONS — Permohonan visa jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS visa_applications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  visa_type       TEXT NOT NULL DEFAULT 'umroh'
    CHECK (visa_type IN ('umroh','haji','visit')),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','approved','rejected','cancelled')),
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  expiry_date     DATE,
  visa_number     TEXT,
  rejection_notes TEXT,
  notes           TEXT,
  processed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_applications_customer_id ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_booking_id  ON visa_applications(booking_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_status      ON visa_applications(status);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_visa_applications" ON visa_applications;
DROP POLICY IF EXISTS "customer_view_own_visas"        ON visa_applications;

CREATE POLICY "staff_manage_visa_applications" ON visa_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer'))
  );

CREATE POLICY "customer_view_own_visas" ON visa_applications
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_visa_applications_updated_at'
    AND tgrelid='visa_applications'::regclass) THEN
    CREATE TRIGGER set_visa_applications_updated_at
      BEFORE UPDATE ON visa_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 12. SOS_ALERTS — Darurat jamaah (termasuk kolom fase17)
-- =============================================================================
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
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_manage_sos" ON sos_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sos_alerts_updated_at'
    AND tgrelid='sos_alerts'::regclass) THEN
    CREATE TRIGGER set_sos_alerts_updated_at
      BEFORE UPDATE ON sos_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 13. WHATSAPP_CONFIG — Konfigurasi provider WA (termasuk kolom fase31)
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider        TEXT NOT NULL DEFAULT 'fonnte'
    CHECK (provider IN ('fonnte','wablas','wapanels','maytapi','other')),
  api_key         TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
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

DROP POLICY IF EXISTS "wa_config_read_all"         ON whatsapp_config;
DROP POLICY IF EXISTS "wa_config_write_privileged"  ON whatsapp_config;

CREATE POLICY "wa_config_read_all" ON whatsapp_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wa_config_write_privileged" ON whatsapp_config
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','it'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_whatsapp_config_updated_at'
    AND tgrelid='whatsapp_config'::regclass) THEN
    CREATE TRIGGER set_whatsapp_config_updated_at
      BEFORE UPDATE ON whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 14. WHATSAPP_TEMPLATES — Template pesan WhatsApp
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  message      TEXT NOT NULL,
  variables    TEXT[] DEFAULT '{}',
  category     TEXT DEFAULT 'general'
    CHECK (category IN ('general','booking','payment','reminder','promo','other')),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_templates_code      ON whatsapp_templates(code);
CREATE INDEX IF NOT EXISTS idx_wa_templates_is_active ON whatsapp_templates(is_active);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_wa_templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "staff_read_wa_templates"   ON whatsapp_templates;

CREATE POLICY "staff_manage_wa_templates" ON whatsapp_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational','marketing'))
  );

CREATE POLICY "staff_read_wa_templates" ON whatsapp_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_templates_updated_at'
    AND tgrelid='whatsapp_templates'::regclass) THEN
    CREATE TRIGGER set_wa_templates_updated_at
      BEFORE UPDATE ON whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 15. WHATSAPP_LOGS — Log pengiriman WA
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL,
  template_code TEXT,
  status        TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','delivered')),
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  provider      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_booking_id  ON whatsapp_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_customer_id ON whatsapp_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status      ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_logs_created_at  ON whatsapp_logs(created_at DESC);

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_wa_logs" ON whatsapp_logs;
CREATE POLICY "staff_manage_wa_logs" ON whatsapp_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational','marketing','it'))
  );


-- =============================================================================
-- 16. WA_BROADCAST_CAMPAIGNS — Kampanye broadcast WA tersegmentasi (fase32)
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_broadcast_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  segment_filters  JSONB NOT NULL DEFAULT '{}',
  message_template TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sending','done','cancelled')),
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  total_recipients INT,
  success_count    INT NOT NULL DEFAULT 0,
  fail_count       INT NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_campaigns_status ON wa_broadcast_campaigns(status);

ALTER TABLE wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_broadcast_campaigns_select" ON wa_broadcast_campaigns;
DROP POLICY IF EXISTS "wa_broadcast_campaigns_write"  ON wa_broadcast_campaigns;

CREATE POLICY "wa_broadcast_campaigns_select" ON wa_broadcast_campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing','sales'))
  );

CREATE POLICY "wa_broadcast_campaigns_write" ON wa_broadcast_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_broadcast_campaigns_updated_at'
    AND tgrelid='wa_broadcast_campaigns'::regclass) THEN
    CREATE TRIGGER set_wa_broadcast_campaigns_updated_at
      BEFORE UPDATE ON wa_broadcast_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 17. WA_BROADCAST_LOGS — Log per penerima broadcast
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_broadcast_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES wa_broadcast_campaigns(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id),
  phone       TEXT,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'queued'
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
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing','sales'))
  );

CREATE POLICY "wa_broadcast_logs_insert" ON wa_broadcast_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing'))
  );


-- =============================================================================
-- 18. WA_FEATURE_ROADMAP — Roadmap fitur WhatsApp (fase31)
-- =============================================================================
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

CREATE POLICY "wa_roadmap_read" ON wa_feature_roadmap
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wa_roadmap_write" ON wa_feature_roadmap
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','it')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','it')));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_feature_roadmap_updated_at'
    AND tgrelid='wa_feature_roadmap'::regclass) THEN
    CREATE TRIGGER set_wa_feature_roadmap_updated_at
      BEFORE UPDATE ON wa_feature_roadmap FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 19. APP_SETTINGS — Setting key-value sistem
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 20. VIRTUAL_ACCOUNTS — Nomor VA per customer
-- =============================================================================
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

DROP POLICY IF EXISTS "va_admin"        ON virtual_accounts;
DROP POLICY IF EXISTS "va_customer_read" ON virtual_accounts;

CREATE POLICY "va_admin" ON virtual_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "va_customer_read" ON virtual_accounts
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));


-- =============================================================================
-- 21. AGENT_MONTHLY_TARGETS — Target bulanan agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_monthly_targets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  month_key         TEXT NOT NULL,
  booking_target    INT NOT NULL DEFAULT 10,
  commission_target BIGINT NOT NULL DEFAULT 10000000,
  jamaah_target     INT NOT NULL DEFAULT 10,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, month_key)
);

CREATE INDEX IF NOT EXISTS amt_agent_month_idx ON agent_monthly_targets(agent_id, month_key);

ALTER TABLE agent_monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amt_agent_own" ON agent_monthly_targets;
CREATE POLICY "amt_agent_own" ON agent_monthly_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = agent_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 22. JAMAAH DIGITAL — Doa, Jurnal, Ibadah, Badge
-- =============================================================================
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
-- 23. APPROVAL_REQUESTS & APPROVAL_ACTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  reference_id  UUID,
  amount        NUMERIC(15,2),
  percentage    NUMERIC(5,2),
  requested_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_level SMALLINT NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  notes         TEXT,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type   ON approval_requests(type);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_approval_requests" ON approval_requests;
CREATE POLICY "staff_manage_approval_requests" ON approval_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance'))
    OR requested_by = auth.uid()
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_approval_requests_updated_at'
    AND tgrelid='approval_requests'::regclass) THEN
    CREATE TRIGGER set_approval_requests_updated_at
      BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS approval_actions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level       SMALLINT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('approved','rejected')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(request_id);

ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_approval_actions" ON approval_actions;
CREATE POLICY "staff_manage_approval_actions" ON approval_actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance'))
  );


-- =============================================================================
-- 24. NOTIFICATION_TEMPLATES — Template notifikasi multi-channel
-- =============================================================================
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "staff_read_notif_templates" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_notification_templates_updated_at'
    AND tgrelid='notification_templates'::regclass) THEN
    CREATE TRIGGER set_notification_templates_updated_at
      BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed: template notifikasi default
INSERT INTO notification_templates (code, name, channel, title, body, variables, trigger_event) VALUES
  ('booking_confirmed',   'Booking Dikonfirmasi',    'push',   'Booking Dikonfirmasi ✅',      'Booking {{booking_code}} Anda telah dikonfirmasi.', ARRAY['booking_code'], 'booking.confirmed'),
  ('payment_received',    'Pembayaran Diterima',     'push',   'Pembayaran Diterima 💰',       'Kami telah menerima pembayaran Anda sebesar Rp {{amount}}.', ARRAY['amount'], 'payment.received'),
  ('visa_status_changed', 'Status Visa Berubah',     'push',   'Update Status Visa 🛂',        'Status visa Anda berubah menjadi: {{status}}.', ARRAY['status'], 'visa.status_changed'),
  ('sos_received',        'SOS Diterima',            'in_app', 'SOS ALERT 🆘',                 'Alert darurat dari jamaah {{customer_name}}: {{message}}', ARRAY['customer_name','message'], 'sos.received'),
  ('departure_reminder',  'Pengingat Keberangkatan', 'push',   'Pengingat Keberangkatan ✈️',  'Keberangkatan Anda {{days}} hari lagi. Pastikan dokumen sudah lengkap.', ARRAY['days'], 'departure.reminder'),
  ('approval_needed',     'Persetujuan Dibutuhkan',  'in_app', 'Menunggu Persetujuan Anda',    'Ada {{type}} senilai Rp {{amount}} yang membutuhkan persetujuan Anda.', ARRAY['type','amount'], 'approval.created'),
  ('manasik_reminder',    'Pengingat Manasik',       'push',   'Jadwal Manasik Besok 📿',      'Jangan lupa manasik besok: {{title}} pukul {{time}} di {{location}}.', ARRAY['title','time','location'], 'manasik.reminder')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- SELESAI — File 04: Operations & Customer Portal
-- =============================================================================
SELECT 'File 04 — Operations & Customer Portal: OK' AS result;
