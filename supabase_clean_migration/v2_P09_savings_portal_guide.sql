-- =============================================================================
-- v2_P09 — Tabungan, Portal Jamaah, Guide System
-- Modul : Produk Digital Jamaah
-- Aman  : CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SAVINGS_PLANS & SAVINGS_DEPOSITS
--    ⚠️ Kode memakai 'savings_payments' — view alias ada di P12
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_plans (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL DEFAULT 'Tabungan Umroh',
  target_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  status         TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','completed','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_customer_id ON savings_plans(customer_id);

ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_staff_manage" ON savings_plans;
DROP POLICY IF EXISTS "sp_own_read"     ON savings_plans;

CREATE POLICY "sp_staff_manage" ON savings_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance','sales'))
  );

CREATE POLICY "sp_own_read" ON savings_plans
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sp_updated_at'
    AND tgrelid='savings_plans'::regclass) THEN
    CREATE TRIGGER set_sp_updated_at
      BEFORE UPDATE ON savings_plans
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS savings_deposits (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id      UUID    NOT NULL REFERENCES savings_plans(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  deposit_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sd_plan_id ON savings_deposits(plan_id);

ALTER TABLE savings_deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sd_staff_manage" ON savings_deposits;
DROP POLICY IF EXISTS "sd_own_read"     ON savings_deposits;

CREATE POLICY "sd_staff_manage" ON savings_deposits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance'))
  );

CREATE POLICY "sd_own_read" ON savings_deposits
  FOR SELECT USING (
    plan_id IN (
      SELECT id FROM savings_plans WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. PORTAL JAMAAH: checklist, ibadah, jurnal, badges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id       UUID    NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  departure_id      UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  has_passport      BOOLEAN DEFAULT FALSE,
  has_visa          BOOLEAN DEFAULT FALSE,
  has_ktp           BOOLEAN DEFAULT FALSE,
  has_kk            BOOLEAN DEFAULT FALSE,
  has_photo         BOOLEAN DEFAULT FALSE,
  has_vaccine_cert  BOOLEAN DEFAULT FALSE,
  has_meningitis    BOOLEAN DEFAULT FALSE,
  has_mahram_cert   BOOLEAN DEFAULT FALSE,
  has_marriage_cert BOOLEAN DEFAULT FALSE,
  has_birth_cert    BOOLEAN DEFAULT FALSE,
  has_paid_full     BOOLEAN DEFAULT FALSE,
  items_received    BOOLEAN DEFAULT FALSE,
  notes             TEXT,
  updated_by        UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jc_customer_id  ON jamaah_checklist(customer_id);
CREATE INDEX IF NOT EXISTS idx_jc_departure_id ON jamaah_checklist(departure_id);

ALTER TABLE jamaah_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jc_staff_manage"  ON jamaah_checklist;
DROP POLICY IF EXISTS "jc_own_read"      ON jamaah_checklist;

CREATE POLICY "jc_staff_manage" ON jamaah_checklist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "jc_own_read" ON jamaah_checklist
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS jamaah_ibadah_targets (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  icon         TEXT,
  unit         TEXT    NOT NULL DEFAULT 'kali',
  daily_target INTEGER NOT NULL DEFAULT 1,
  category     TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jit_user_id ON jamaah_ibadah_targets(user_id);

ALTER TABLE jamaah_ibadah_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jit_own" ON jamaah_ibadah_targets;
CREATE POLICY "jit_own" ON jamaah_ibadah_targets
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_ibadah_logs (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id  UUID    NOT NULL REFERENCES jamaah_ibadah_targets(id) ON DELETE CASCADE,
  log_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
  count      INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_jil_user_id ON jamaah_ibadah_logs(user_id);

ALTER TABLE jamaah_ibadah_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jil_own" ON jamaah_ibadah_logs;
CREATE POLICY "jil_own" ON jamaah_ibadah_logs FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_jurnal (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  title      TEXT,
  content    TEXT    NOT NULL,
  mood       TEXT,
  location   TEXT,
  tags       TEXT[],
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jj_user_id ON jamaah_jurnal(user_id);

ALTER TABLE jamaah_jurnal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jj_own" ON jamaah_jurnal;
CREATE POLICY "jj_own" ON jamaah_jurnal FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS jamaah_badges (
  id        UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  TEXT    NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE jamaah_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jb_own" ON jamaah_badges;
CREATE POLICY "jb_own" ON jamaah_badges FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS ibadah_progress (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ibadah_type TEXT    NOT NULL,
  ibadah_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  count       INTEGER NOT NULL DEFAULT 1,
  target      INTEGER DEFAULT 1,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ibadah_type, ibadah_date)
);
CREATE INDEX IF NOT EXISTS idx_ip_user_id ON ibadah_progress(user_id);

ALTER TABLE ibadah_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ip_own" ON ibadah_progress;
CREATE POLICY "ip_own" ON ibadah_progress FOR ALL USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. GUIDE SYSTEM (dari migration 075/077/074)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guide_channels (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL DEFAULT 'Seluruh Rombongan',
  channel_type TEXT    NOT NULL DEFAULT 'all'
                       CHECK (channel_type IN ('all','bus_1','bus_2','bus_3','custom')),
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gc_departure_id ON guide_channels(departure_id);

ALTER TABLE guide_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gc_staff_manage" ON guide_channels;
DROP POLICY IF EXISTS "gc_jamaah_read"  ON guide_channels;

CREATE POLICY "gc_staff_manage" ON guide_channels
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "gc_jamaah_read" ON guide_channels
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS guide_broadcasts (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id     UUID    NOT NULL REFERENCES guide_channels(id) ON DELETE CASCADE,
  departure_id   UUID    NOT NULL REFERENCES departures(id)    ON DELETE CASCADE,
  sender_user_id UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role    TEXT,
  message_type   TEXT    NOT NULL DEFAULT 'text'
                         CHECK (message_type IN ('text','image','audio','location','system')),
  content        TEXT    NOT NULL,
  media_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gb_channel_id   ON guide_broadcasts(channel_id);
CREATE INDEX IF NOT EXISTS idx_gb_departure_id ON guide_broadcasts(departure_id);
CREATE INDEX IF NOT EXISTS idx_gb_created_at   ON guide_broadcasts(created_at DESC);

ALTER TABLE guide_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gb_manage" ON guide_broadcasts;
CREATE POLICY "gb_manage" ON guide_broadcasts FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS guide_broadcast_reads (
  broadcast_id UUID NOT NULL REFERENCES guide_broadcasts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_id, user_id)
);

CREATE TABLE IF NOT EXISTS guide_sessions (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  session_type TEXT    NOT NULL DEFAULT 'custom'
                       CHECK (session_type IN
                         ('bus_boarding','sholat','ziarah','makan',
                          'hotel_checkin','airport','briefing','custom')),
  title        TEXT    NOT NULL,
  location     TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  qr_token     TEXT    UNIQUE,
  qr_expires_at TIMESTAMPTZ,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gs_departure_id ON guide_sessions(departure_id);

ALTER TABLE guide_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gs_manage" ON guide_sessions;
CREATE POLICY "gs_manage" ON guide_sessions FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS guide_session_attendance (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID    NOT NULL REFERENCES guide_sessions(id) ON DELETE CASCADE,
  customer_id UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status      TEXT    DEFAULT 'hadir' CHECK (status IN ('hadir','absen','terlambat')),
  notes       TEXT,
  UNIQUE (session_id, customer_id)
);

CREATE TABLE IF NOT EXISTS guide_subgroups (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  color        TEXT,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_subgroup_members (
  subgroup_id UUID NOT NULL REFERENCES guide_subgroups(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (subgroup_id, customer_id)
);

CREATE TABLE IF NOT EXISTS guide_locations (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  user_id      UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT,
  label        TEXT,
  latitude     NUMERIC(10,7) NOT NULL,
  longitude    NUMERIC(10,7) NOT NULL,
  accuracy_m   NUMERIC(8,2),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gl_departure_id ON guide_locations(departure_id);
CREATE INDEX IF NOT EXISTS idx_gl_recorded_at  ON guide_locations(recorded_at DESC);

ALTER TABLE guide_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gl_manage" ON guide_locations;
CREATE POLICY "gl_manage" ON guide_locations FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS guide_audio_sessions (
  id                      UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id            UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  title                   TEXT    NOT NULL,
  session_type            TEXT    NOT NULL DEFAULT 'murottal'
                                  CHECK (session_type IN ('murottal','tausyiah','briefing','custom')),
  status                  TEXT    NOT NULL DEFAULT 'idle'
                                  CHECK (status IN ('idle','live','ended')),
  current_speaker_user_id UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at              TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  recording_url           TEXT,
  created_by              UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gas_departure_id ON guide_audio_sessions(departure_id);

ALTER TABLE guide_audio_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gas_manage" ON guide_audio_sessions;
CREATE POLICY "gas_manage" ON guide_audio_sessions FOR ALL USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 4. SOS_ALERTS & SOS_ESCALATION_LOG
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sos_alerts (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id          UUID    NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  departure_id         UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  message              TEXT    NOT NULL,
  location             TEXT,
  latitude             NUMERIC(10,7),
  longitude            NUMERIC(10,7),
  status               TEXT    NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','responded','resolved','false_alarm')),
  assigned_muthawif_id UUID    REFERENCES muthawifs(id) ON DELETE SET NULL,
  responded_at         TIMESTAMPTZ,
  resolved_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sos_departure_id ON sos_alerts(departure_id);
CREATE INDEX IF NOT EXISTS idx_sos_status       ON sos_alerts(status);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sos_staff_manage"  ON sos_alerts;
DROP POLICY IF EXISTS "sos_jamaah_create" ON sos_alerts;

CREATE POLICY "sos_staff_manage" ON sos_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "sos_jamaah_create" ON sos_alerts
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sos_updated_at'
    AND tgrelid='sos_alerts'::regclass) THEN
    CREATE TRIGGER set_sos_updated_at
      BEFORE UPDATE ON sos_alerts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sos_escalation_log (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  sos_alert_id  UUID    NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
  escalated_to  TEXT    NOT NULL,
  escalated_by  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  reason        TEXT,
  notified_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_sel_sos_id ON sos_escalation_log(sos_alert_id);

