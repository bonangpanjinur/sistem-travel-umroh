-- =============================================================================
-- v2_P10 — WhatsApp, CRM/Leads, Dokumen, Notifikasi
-- Modul : Komunikasi & Dokumen
-- Aman  : CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. WHATSAPP CONFIG
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id      UUID    REFERENCES branches(id) ON DELETE SET NULL,
  provider       TEXT    NOT NULL DEFAULT 'fonnte'
                         CHECK (provider IN ('fonnte','wablas','wapbiz')),
  api_token      TEXT,
  device_number  TEXT,
  webhook_url    TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_config_admin" ON whatsapp_config;
CREATE POLICY "wa_config_admin" ON whatsapp_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

-- ---------------------------------------------------------------------------
-- 2. WHATSAPP_TEMPLATES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT    NOT NULL,
  trigger_event   TEXT    NOT NULL,
  template_body   TEXT    NOT NULL,
  variables       TEXT[],
  is_active       BOOLEAN DEFAULT TRUE,
  branch_id       UUID    REFERENCES branches(id) ON DELETE SET NULL,
  delay_hours     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wt_trigger_event ON whatsapp_templates(trigger_event);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wt_admin_manage" ON whatsapp_templates;
CREATE POLICY "wt_admin_manage" ON whatsapp_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wt_updated_at'
    AND tgrelid='whatsapp_templates'::regclass) THEN
    CREATE TRIGGER set_wt_updated_at
      BEFORE UPDATE ON whatsapp_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. WA_TEMPLATE_BROADCASTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_template_broadcasts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id     UUID    REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  departure_id    UUID    REFERENCES departures(id) ON DELETE SET NULL,
  name            TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','sending','done','failed')),
  recipient_type  TEXT    DEFAULT 'all_departure'
                          CHECK (recipient_type IN ('all_departure','confirmed','paid','custom')),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wtb_departure_id ON wa_template_broadcasts(departure_id);

ALTER TABLE wa_template_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wtb_manage" ON wa_template_broadcasts;
CREATE POLICY "wtb_manage" ON wa_template_broadcasts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

-- ---------------------------------------------------------------------------
-- 4. WA_TEMPLATE_BROADCAST_RECIPIENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_template_broadcast_recipients (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID    NOT NULL REFERENCES wa_template_broadcasts(id) ON DELETE CASCADE,
  customer_id  UUID    REFERENCES customers(id) ON DELETE SET NULL,
  phone        TEXT    NOT NULL,
  name         TEXT,
  message      TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','sent','failed','replied')),
  sent_at      TIMESTAMPTZ,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wtbr_broadcast_id ON wa_template_broadcast_recipients(broadcast_id);

-- ---------------------------------------------------------------------------
-- 5. WA_SCHEDULED_BROADCASTS & LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_scheduled_broadcasts (
  id                 UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id        UUID    REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  departure_id       UUID    REFERENCES departures(id) ON DELETE CASCADE,
  trigger_id         TEXT    NOT NULL,
  scheduled_for      TIMESTAMPTZ NOT NULL,
  status             TEXT    NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  total_recipients   INTEGER NOT NULL DEFAULT 0,
  sent_count         INTEGER NOT NULL DEFAULT 0,
  failed_count       INTEGER NOT NULL DEFAULT 0,
  processed_at       TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wsb_departure_id  ON wa_scheduled_broadcasts(departure_id);
CREATE INDEX IF NOT EXISTS idx_wsb_scheduled_for ON wa_scheduled_broadcasts(scheduled_for);

CREATE TABLE IF NOT EXISTS wa_scheduled_broadcast_logs (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id     UUID    NOT NULL REFERENCES wa_scheduled_broadcasts(id) ON DELETE CASCADE,
  customer_id      UUID    REFERENCES customers(id) ON DELETE SET NULL,
  phone            TEXT,
  message          TEXT,
  status           TEXT    DEFAULT 'pending',
  sent_at          TIMESTAMPTZ,
  error_msg        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wsbl_broadcast_id ON wa_scheduled_broadcast_logs(broadcast_id);

-- ---------------------------------------------------------------------------
-- 6. WA_CHATBOT_KEYWORDS & INCOMING_MESSAGES & CONTACTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_chatbot_keywords (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword      TEXT    NOT NULL,
  response     TEXT    NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  priority     INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_incoming_messages (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number  TEXT    NOT NULL,
  message      TEXT    NOT NULL,
  direction    TEXT    DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
  status       TEXT    DEFAULT 'unread' CHECK (status IN ('unread','read','replied')),
  customer_id  UUID    REFERENCES customers(id) ON DELETE SET NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wim_from_number ON wa_incoming_messages(from_number);

ALTER TABLE wa_incoming_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wim_staff_manage" ON wa_incoming_messages;
CREATE POLICY "wim_staff_manage" ON wa_incoming_messages
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS wa_contacts (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  phone        TEXT    NOT NULL UNIQUE,
  name         TEXT,
  customer_id  UUID    REFERENCES customers(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  tags         TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_bot_menu_items (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  key          TEXT    NOT NULL,
  label        TEXT    NOT NULL,
  description  TEXT,
  action_type  TEXT    DEFAULT 'text',
  action_value TEXT,
  parent_key   TEXT,
  sort_order   INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 7. NOTIFICATIONS & ANNOUNCEMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT    NOT NULL DEFAULT 'info',
  title           TEXT    NOT NULL,
  message         TEXT,
  link            TEXT,
  icon            TEXT,
  priority        TEXT    DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications(is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_own"           ON notifications;
DROP POLICY IF EXISTS "notif_staff_manage"  ON notifications;

CREATE POLICY "notif_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notif_staff_manage" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT    NOT NULL,
  content     TEXT    NOT NULL,
  type        TEXT    DEFAULT 'info' CHECK (type IN ('info','warning','success','urgent')),
  target_role TEXT,
  branch_id   UUID    REFERENCES branches(id) ON DELETE SET NULL,
  pinned      BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMPTZ,
  created_by  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ann_target_role ON announcements(target_role);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ann_admin_manage"  ON announcements;
DROP POLICY IF EXISTS "ann_staff_read"    ON announcements;

CREATE POLICY "ann_admin_manage" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "ann_staff_read" ON announcements
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 8. PUSH_SUBSCRIPTIONS & PUSH_OUTBOX
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT    NOT NULL UNIQUE,
  keys_auth   TEXT    NOT NULL,
  keys_p256dh TEXT    NOT NULL,
  branch_id   UUID    REFERENCES branches(id) ON DELETE SET NULL,
  agent_id    UUID    REFERENCES agents(id)   ON DELETE SET NULL,
  role        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psub_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "psub_own" ON push_subscriptions;
CREATE POLICY "psub_own" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS push_outbox (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type  TEXT    NOT NULL CHECK (target_type IN ('user','role','branch','all')),
  target_id    TEXT,
  title        TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  icon         TEXT,
  link         TEXT,
  data         JSONB   DEFAULT '{}',
  status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','sent','failed')),
  sent_count   INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_po_status     ON push_outbox(status);
CREATE INDEX IF NOT EXISTS idx_po_created_at ON push_outbox(created_at);

ALTER TABLE push_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_admin_manage" ON push_outbox;
CREATE POLICY "po_admin_manage" ON push_outbox
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

-- ---------------------------------------------------------------------------
-- 9. LEADS & AGENT_LEADS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT    NOT NULL,
  phone           TEXT,
  email           TEXT,
  source          TEXT    DEFAULT 'website'
                          CHECK (source IN ('website','whatsapp','referral','walk-in','social_media','other')),
  interest        TEXT,
  package_id      UUID    REFERENCES packages(id) ON DELETE SET NULL,
  departure_id    UUID    REFERENCES departures(id) ON DELETE SET NULL,
  status          TEXT    NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new','contacted','warm','hot','converted','lost')),
  assigned_to     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID    REFERENCES branches(id) ON DELETE SET NULL,
  agent_id        UUID    REFERENCES agents(id)   ON DELETE SET NULL,
  follow_up_at    TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  notes           TEXT,
  converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id   ON leads(branch_id);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_staff_manage" ON leads;
CREATE POLICY "leads_staff_manage" ON leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_leads_updated_at'
    AND tgrelid='leads'::regclass) THEN
    CREATE TRIGGER set_leads_updated_at
      BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 10. DOCUMENTS: document_types, generated_documents, audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_types (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  description  TEXT,
  template_url TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id     UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  customer_id    UUID    REFERENCES customers(id)  ON DELETE SET NULL,
  departure_id   UUID    REFERENCES departures(id) ON DELETE SET NULL,
  doc_type       TEXT    NOT NULL,
  doc_number     TEXT    UNIQUE,
  file_url       TEXT,
  file_name      TEXT,
  status         TEXT    NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','issued','revoked')),
  generated_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_at      TIMESTAMPTZ,
  expires_at     DATE,
  verify_token   TEXT    UNIQUE DEFAULT gen_random_uuid()::text,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gd_booking_id    ON generated_documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_gd_customer_id   ON generated_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_gd_departure_id  ON generated_documents(departure_id);
CREATE INDEX IF NOT EXISTS idx_gd_doc_type      ON generated_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_gd_verify_token  ON generated_documents(verify_token);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gd_staff_manage"  ON generated_documents;
DROP POLICY IF EXISTS "gd_own_read"      ON generated_documents;

CREATE POLICY "gd_staff_manage" ON generated_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "gd_own_read" ON generated_documents
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS document_audit_logs (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type       TEXT    NOT NULL,
  booking_id     UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  customer_id    UUID    REFERENCES customers(id)  ON DELETE SET NULL,
  departure_id   UUID    REFERENCES departures(id) ON DELETE SET NULL,
  customer_name  TEXT,
  event_type     TEXT    NOT NULL,
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dal_doc_type   ON document_audit_logs(doc_type);
CREATE INDEX IF NOT EXISTS idx_dal_created_at ON document_audit_logs(created_at DESC);

ALTER TABLE document_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dal_staff_manage"  ON document_audit_logs;
DROP POLICY IF EXISTS "dal_public_write"  ON document_audit_logs;

CREATE POLICY "dal_staff_manage" ON document_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );

CREATE POLICY "dal_public_write" ON document_audit_logs
  FOR INSERT WITH CHECK (TRUE);

CREATE TABLE IF NOT EXISTS document_numbering (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type     TEXT    NOT NULL,
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  last_number  INTEGER NOT NULL DEFAULT 0,
  prefix       TEXT,
  format       TEXT    DEFAULT '{PREFIX}/{YEAR}/{MONTH}/{SEQ}',
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doc_type, year, month, branch_id)
);

-- ---------------------------------------------------------------------------
-- 11. DISCOUNT_REQUESTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_requests (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id     UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  customer_id    UUID    REFERENCES customers(id)  ON DELETE SET NULL,
  requested_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  reason         TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
  approved_by    UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dr_booking_id ON discount_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_dr_status     ON discount_requests(status);

ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dreq_staff_manage" ON discount_requests;
CREATE POLICY "dreq_staff_manage" ON discount_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance','sales'))
  );

