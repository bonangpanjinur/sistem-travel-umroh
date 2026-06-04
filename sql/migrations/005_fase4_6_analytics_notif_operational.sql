-- ============================================================
-- FASE 4-6: Analytics, Notifikasi & Komunikasi, Operational Excellence
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ─── FASE 4: Analytics — Tidak perlu tabel baru ───────────────────────────
-- AdminAgentCommissionReport menggunakan tabel agent_commissions yang sudah ada


-- ─── FASE 5: Template Email ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  variables  text[] DEFAULT '{}',
  trigger    text DEFAULT 'manual',
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_email_templates" ON email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "staff_manage_email_templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'branch_manager', 'marketing')
    )
  );


-- ─── FASE 5: Email Send Logs ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_logs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_code    text,
  recipient_email  text NOT NULL,
  recipient_name   text,
  subject          text,
  status           text DEFAULT 'pending', -- pending, sent, failed
  error_message    text,
  sent_at          timestamptz,
  booking_id       uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_email_logs" ON email_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "staff_insert_email_logs" ON email_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- ─── FASE 5: Push Notifikasi Jamaah ───────────────────────────────────────
-- (Sudah dibuat di fase3-customer-portal.sql, pastikan tabel ini ada)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_notifications') THEN
    CREATE TABLE customer_notifications (
      id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      title       text NOT NULL,
      message     text NOT NULL,
      type        text DEFAULT 'info',  -- info, warning, success, urgent
      is_read     boolean DEFAULT false,
      read_at     timestamptz,
      created_at  timestamptz DEFAULT now()
    );

    ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "customer_read_own_notifications" ON customer_notifications
      FOR SELECT USING (
        customer_id IN (
          SELECT id FROM customers WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "customer_update_own_notifications" ON customer_notifications
      FOR UPDATE USING (
        customer_id IN (
          SELECT id FROM customers WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "staff_manage_notifications" ON customer_notifications
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Add 'type' column if missing
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS type text DEFAULT 'info';


-- ─── FASE 6: SOS Alerts ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sos_alerts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  booking_code    text,
  emergency_type  text NOT NULL,  -- medical, lost, security, other
  message         text,
  latitude        float8,
  longitude       float8,
  accuracy        float8,
  status          text DEFAULT 'active',  -- active, responding, resolved
  response_notes  text,
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_insert_sos" ON sos_alerts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customer_read_own_sos" ON sos_alerts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "staff_manage_sos" ON sos_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_sos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sos_updated_at ON sos_alerts;
CREATE TRIGGER trg_sos_updated_at
  BEFORE UPDATE ON sos_alerts
  FOR EACH ROW EXECUTE FUNCTION update_sos_updated_at();


-- ─── FASE 6: Visa Applications (pastikan sudah ada) ───────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visa_applications') THEN
    CREATE TABLE visa_applications (
      id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_id       uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      departure_id      uuid REFERENCES departures(id) ON DELETE SET NULL,
      visa_type         text DEFAULT 'umrah',  -- umrah, haji, transit
      passport_number   text,
      passport_expiry   date,
      status            text DEFAULT 'pending',
      visa_number       text,
      visa_expiry       date,
      submitted_at      timestamptz,
      approved_at       timestamptz,
      rejected_at       timestamptz,
      rejection_reason  text,
      notes             text,
      created_at        timestamptz DEFAULT now(),
      updated_at        timestamptz DEFAULT now()
    );

    ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "staff_manage_visas" ON visa_applications
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;


-- ─── FASE 6: Departure Tracking — Checkin Status ──────────────────────────

ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_status text DEFAULT 'not_checked';
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_time timestamptz;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS checkin_notes text;


-- ─── Indexes untuk performa ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_email_logs_customer_id     ON email_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status          ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_customer_notif_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_is_read     ON customer_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status          ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_customer_id     ON sos_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_customer_id      ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_status           ON visa_applications(status);

SELECT 'Fase 4-6 migration completed successfully' AS result;
