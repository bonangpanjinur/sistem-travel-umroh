-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M06: Operations — Notifikasi, WA Config, Visa, SOS, Approvals,
--           Equipment, Manasik, Room Assignments, Announcements, Banners,
--           Coupons, Portal Customer, Notification Templates
-- Depends on: M01–M05
-- =============================================================================

-- =============================================================================
-- 1. ANNOUNCEMENTS — Pengumuman untuk jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info','warning','urgent','success')),
  target       TEXT NOT NULL DEFAULT 'all'
    CHECK (target IN ('all','confirmed','agents','branch')),
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  departure_id UUID REFERENCES departures(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_is_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_branch_id    ON announcements(branch_id);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_staff_manage" ON announcements;
DROP POLICY IF EXISTS "announcements_auth_read"    ON announcements;
DROP POLICY IF EXISTS "announcements_anon_read"    ON announcements;

CREATE POLICY "announcements_staff_manage" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','operational','it'))
  );

CREATE POLICY "announcements_auth_read" ON announcements
  FOR SELECT USING (is_published = TRUE AND auth.role() = 'authenticated');

CREATE POLICY "announcements_anon_read" ON announcements
  FOR SELECT USING (is_published = TRUE AND target = 'all');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_announcements_updated_at'
    AND tgrelid='announcements'::regclass) THEN
    CREATE TRIGGER set_announcements_updated_at
      BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON announcements TO anon, authenticated;


-- =============================================================================
-- 2. BANNERS — Carousel / hero banners halaman publik
-- =============================================================================
CREATE TABLE IF NOT EXISTS banners (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT,
  subtitle     TEXT,
  image_url    TEXT NOT NULL,
  link_url     TEXT,
  link_text    TEXT,
  branch_id    UUID REFERENCES branches(id) ON DELETE CASCADE,
  agent_id     UUID REFERENCES agents(id) ON DELETE CASCADE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_branch_id ON banners(branch_id);
CREATE INDEX IF NOT EXISTS idx_banners_agent_id  ON banners(agent_id);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_anon_read"    ON banners;
DROP POLICY IF EXISTS "banners_staff_write"  ON banners;

CREATE POLICY "banners_anon_read" ON banners
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "banners_staff_write" ON banners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_banners_updated_at'
    AND tgrelid='banners'::regclass) THEN
    CREATE TRIGGER set_banners_updated_at
      BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON banners TO anon, authenticated;


-- =============================================================================
-- 3. COUPONS — Kupon diskon
-- =============================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  type              TEXT NOT NULL DEFAULT 'percentage'
    CHECK (type IN ('percentage','fixed','free_upgrade')),
  value             NUMERIC(15,2) NOT NULL DEFAULT 0,
  min_order_amount  NUMERIC(15,2) DEFAULT 0,
  max_discount      NUMERIC(15,2),
  usage_limit       INTEGER,
  usage_count       INTEGER NOT NULL DEFAULT 0,
  valid_from        DATE,
  valid_until       DATE,
  applicable_packages UUID[] DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code      ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_staff_manage"  ON coupons;
DROP POLICY IF EXISTS "coupons_anon_validate" ON coupons;

CREATE POLICY "coupons_staff_manage" ON coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','marketing','sales','it'))
  );

CREATE POLICY "coupons_anon_validate" ON coupons
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_coupons_updated_at'
    AND tgrelid='coupons'::regclass) THEN
    CREATE TRIGGER set_coupons_updated_at
      BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON coupons TO anon, authenticated;


-- =============================================================================
-- 4. VISA_APPLICATIONS — Pengajuan visa jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS visa_applications (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id      UUID NOT NULL REFERENCES booking_passengers(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','under_review','approved','rejected','expired','cancelled')),
  submission_date   DATE,
  approval_date     DATE,
  expiry_date       DATE,
  visa_number       TEXT,
  rejection_reason  TEXT,
  documents         JSONB DEFAULT '[]'::JSONB,
  notes             TEXT,
  processed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_apps_booking_id   ON visa_applications(booking_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_passenger_id ON visa_applications(passenger_id);
CREATE INDEX IF NOT EXISTS idx_visa_apps_status       ON visa_applications(status);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visa_apps_staff_manage" ON visa_applications;
DROP POLICY IF EXISTS "visa_apps_own_read"     ON visa_applications;

CREATE POLICY "visa_apps_staff_manage" ON visa_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer','it'))
  );

CREATE POLICY "visa_apps_own_read" ON visa_applications
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_visa_apps_updated_at'
    AND tgrelid='visa_applications'::regclass) THEN
    CREATE TRIGGER set_visa_apps_updated_at
      BEFORE UPDATE ON visa_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON visa_applications TO authenticated;


-- =============================================================================
-- 5. MANASIK_SESSIONS — Jadwal & materi manasik
-- =============================================================================
CREATE TABLE IF NOT EXISTS manasik_sessions (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID REFERENCES departures(id) ON DELETE CASCADE,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  session_date DATE NOT NULL,
  start_time   TIME,
  end_time     TIME,
  location     TEXT,
  location_url TEXT,
  is_online    BOOLEAN NOT NULL DEFAULT FALSE,
  meeting_url  TEXT,
  materials    JSONB DEFAULT '[]'::JSONB,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manasik_sessions_departure_id ON manasik_sessions(departure_id);
CREATE INDEX IF NOT EXISTS idx_manasik_sessions_branch_id    ON manasik_sessions(branch_id);
CREATE INDEX IF NOT EXISTS idx_manasik_sessions_date         ON manasik_sessions(session_date);

ALTER TABLE manasik_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manasik_sessions_staff_manage" ON manasik_sessions;
DROP POLICY IF EXISTS "manasik_sessions_auth_read"    ON manasik_sessions;

CREATE POLICY "manasik_sessions_staff_manage" ON manasik_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','it'))
  );

CREATE POLICY "manasik_sessions_auth_read" ON manasik_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_manasik_sessions_updated_at'
    AND tgrelid='manasik_sessions'::regclass) THEN
    CREATE TRIGGER set_manasik_sessions_updated_at
      BEFORE UPDATE ON manasik_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON manasik_sessions TO authenticated;


-- =============================================================================
-- 6. ROOM_ASSIGNMENTS — Penugasan kamar per jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS room_assignments (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  hotel_id       UUID REFERENCES hotels(id) ON DELETE SET NULL,
  passenger_id   UUID NOT NULL REFERENCES booking_passengers(id) ON DELETE CASCADE,
  room_number    TEXT,
  room_type      TEXT NOT NULL DEFAULT 'quad',
  floor_number   INTEGER,
  bed_position   TEXT,
  check_in_date  DATE,
  check_out_date DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_departure_id ON room_assignments(departure_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_passenger_id ON room_assignments(passenger_id);

ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_assignments_staff_manage" ON room_assignments;
DROP POLICY IF EXISTS "room_assignments_own_read"     ON room_assignments;

CREATE POLICY "room_assignments_staff_manage" ON room_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','it'))
  );

CREATE POLICY "room_assignments_own_read" ON room_assignments
  FOR SELECT USING (
    passenger_id IN (
      SELECT bp.id FROM booking_passengers bp
      JOIN bookings b ON b.id = bp.booking_id
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_room_assignments_updated_at'
    AND tgrelid='room_assignments'::regclass) THEN
    CREATE TRIGGER set_room_assignments_updated_at
      BEFORE UPDATE ON room_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON room_assignments TO authenticated;


-- =============================================================================
-- 7. EQUIPMENT_ITEMS — Master perlengkapan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment_items (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  code            TEXT UNIQUE,
  category        TEXT NOT NULL DEFAULT 'other',
  description     TEXT,
  unit            TEXT NOT NULL DEFAULT 'pcs',
  stock_total     INTEGER NOT NULL DEFAULT 0,
  stock_available INTEGER NOT NULL DEFAULT 0,
  reorder_point   INTEGER DEFAULT 0,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_items_category ON equipment_items(category);

ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_items_staff_manage" ON equipment_items;
DROP POLICY IF EXISTS "equipment_items_auth_read"    ON equipment_items;

CREATE POLICY "equipment_items_auth_read" ON equipment_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "equipment_items_staff_manage" ON equipment_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','equipment','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_equipment_items_updated_at'
    AND tgrelid='equipment_items'::regclass) THEN
    CREATE TRIGGER set_equipment_items_updated_at
      BEFORE UPDATE ON equipment_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON equipment_items TO authenticated;


-- =============================================================================
-- 8. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan per jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment_distributions (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id   UUID REFERENCES booking_passengers(id) ON DELETE SET NULL,
  equipment_id   UUID NOT NULL REFERENCES equipment_items(id) ON DELETE RESTRICT,
  qty            INTEGER NOT NULL DEFAULT 1,
  size           TEXT,
  distributed_at TIMESTAMPTZ,
  distributed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','distributed','returned','lost')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_dist_departure_id ON equipment_distributions(departure_id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_booking_id   ON equipment_distributions(booking_id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_equipment_id ON equipment_distributions(equipment_id);

ALTER TABLE equipment_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equip_dist_staff_manage" ON equipment_distributions;

CREATE POLICY "equip_dist_staff_manage" ON equipment_distributions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','equipment','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_equip_dist_updated_at'
    AND tgrelid='equipment_distributions'::regclass) THEN
    CREATE TRIGGER set_equip_dist_updated_at
      BEFORE UPDATE ON equipment_distributions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON equipment_distributions TO authenticated;


-- =============================================================================
-- 9. BAGGAGE_REFERENCE_ITEMS — Referensi bawaan standar jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS baggage_reference_items (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  estimated_weight_kg NUMERIC(6,2),
  is_mandatory        BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE baggage_reference_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "baggage_ref_read_all" ON baggage_reference_items;

CREATE POLICY "baggage_ref_read_all" ON baggage_reference_items
  FOR SELECT USING (TRUE);

GRANT SELECT ON baggage_reference_items TO anon, authenticated;


-- =============================================================================
-- 10. SOS_ALERTS — Alert darurat jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS sos_alerts (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  departure_id    UUID REFERENCES departures(id) ON DELETE SET NULL,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  location_text   TEXT,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','acknowledged','resolved','false_alarm')),
  severity        TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  resolved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_customer_id   ON sos_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_departure_id  ON sos_alerts(departure_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status        ON sos_alerts(status);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sos_alerts_staff_manage" ON sos_alerts;
DROP POLICY IF EXISTS "sos_alerts_customer_add" ON sos_alerts;

CREATE POLICY "sos_alerts_staff_manage" ON sos_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','it'))
  );

CREATE POLICY "sos_alerts_customer_add" ON sos_alerts
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sos_alerts_updated_at'
    AND tgrelid='sos_alerts'::regclass) THEN
    CREATE TRIGGER set_sos_alerts_updated_at
      BEFORE UPDATE ON sos_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT, INSERT ON sos_alerts TO authenticated;


-- =============================================================================
-- 11. APPROVAL_CONFIGS — Konfigurasi alur persetujuan
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_configs (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type                  TEXT NOT NULL,
  level                 INTEGER NOT NULL,
  required_role         TEXT NOT NULL,
  amount_threshold      NUMERIC(15,2),
  percentage_threshold  NUMERIC(5,2),
  auto_approve_below    NUMERIC(15,2),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type, level, required_role)
);

ALTER TABLE approval_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_configs_auth_read"    ON approval_configs;
DROP POLICY IF EXISTS "approval_configs_admin_write"  ON approval_configs;

CREATE POLICY "approval_configs_auth_read" ON approval_configs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "approval_configs_admin_write" ON approval_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_approval_configs_updated_at'
    AND tgrelid='approval_configs'::regclass) THEN
    CREATE TRIGGER set_approval_configs_updated_at
      BEFORE UPDATE ON approval_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON approval_configs TO authenticated;


-- =============================================================================
-- 12. APPROVAL_REQUESTS — Permintaan persetujuan aktif
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type             TEXT NOT NULL,
  reference_id     UUID NOT NULL,
  reference_table  TEXT NOT NULL,
  amount           NUMERIC(15,2),
  requested_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_level    INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  notes            TEXT,
  metadata         JSONB DEFAULT '{}'::JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_type         ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_reference_id ON approval_requests(reference_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status       ON approval_requests(status);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_requests_staff_manage" ON approval_requests;

CREATE POLICY "approval_requests_staff_manage" ON approval_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_approval_requests_updated_at'
    AND tgrelid='approval_requests'::regclass) THEN
    CREATE TRIGGER set_approval_requests_updated_at
      BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON approval_requests TO authenticated;


-- =============================================================================
-- 13. NOTIFICATION_TEMPLATES — Template pesan notifikasi
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  channel        TEXT NOT NULL DEFAULT 'push'
    CHECK (channel IN ('push','email','whatsapp','sms','in_app')),
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','it'))
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

GRANT SELECT ON notification_templates TO authenticated;


-- =============================================================================
-- 14. CONTACT_PAGE_CONTENT — Konten halaman kontak publik
-- =============================================================================
CREATE TABLE IF NOT EXISTS contact_page_content (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID REFERENCES branches(id) ON DELETE CASCADE,
  agent_id         UUID REFERENCES agents(id) ON DELETE CASCADE,
  hero_title       TEXT DEFAULT 'Hubungi Kami',
  hero_subtitle    TEXT,
  form_title       TEXT DEFAULT 'Kirim Pesan',
  operating_hours  JSONB DEFAULT '{}'::JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_page_anon_read"   ON contact_page_content;
DROP POLICY IF EXISTS "contact_page_staff_write" ON contact_page_content;

CREATE POLICY "contact_page_anon_read" ON contact_page_content
  FOR SELECT USING (TRUE);

CREATE POLICY "contact_page_staff_write" ON contact_page_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_contact_page_updated_at'
    AND tgrelid='contact_page_content'::regclass) THEN
    CREATE TRIGGER set_contact_page_updated_at
      BEFORE UPDATE ON contact_page_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON contact_page_content TO anon, authenticated;


-- =============================================================================
-- SELESAI — File M06: Operations
-- =============================================================================
SELECT 'v3_M06_operations: OK' AS result;
