-- =============================================================================
-- MIGRASI FASE 17 — Tabel Pendukung Fitur Lanjutan
-- Vinstour Travel Portal
-- Meliputi: vendor_contracts, departure_budgets, training_modules/quizzes/progress,
--           media_gallery, siskohat_sync_logs, approval_configs,
--           agent_override_commissions, baggage_reference_items
-- Jalankan setelah fase16_new_tables.sql
-- =============================================================================

-- Helper updated_at (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. VENDOR CONTRACTS — Kontrak per vendor + reminder expired
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  service_type    TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           NUMERIC(15, 2),
  currency        TEXT DEFAULT 'IDR',
  payment_terms   TEXT,
  auto_renew      BOOLEAN DEFAULT FALSE,
  document_url    TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id  ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end_date   ON vendor_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status     ON vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_branch_id  ON vendor_contracts(branch_id);

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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendor_contracts_updated_at'
    AND tgrelid='vendor_contracts'::regclass) THEN
    CREATE TRIGGER set_vendor_contracts_updated_at BEFORE UPDATE ON vendor_contracts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. DEPARTURE BUDGETS — Perencanaan anggaran per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_budgets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id     UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category         TEXT NOT NULL
    CHECK (category IN ('hotel','tiket','visa','katering','transportasi','handling',
                        'manasik','perlengkapan','lainnya')),
  description      TEXT,
  budgeted_amount  NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pax_count        INTEGER,
  per_pax_amount   NUMERIC(15, 2),
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, category)
);

CREATE INDEX IF NOT EXISTS idx_departure_budgets_departure_id ON departure_budgets(departure_id);

ALTER TABLE departure_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_budgets"       ON departure_budgets;
DROP POLICY IF EXISTS "branch_manager_read_dep_budgets"      ON departure_budgets;

CREATE POLICY "staff_manage_departure_budgets" ON departure_budgets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance','operational'))
  );

CREATE POLICY "branch_manager_read_dep_budgets" ON departure_budgets
  FOR SELECT USING (
    departure_id IN (
      SELECT d.id FROM departures d
      JOIN packages p ON p.id = d.package_id
      JOIN branches b ON b.id = p.branch_id
      WHERE b.manager_user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_budgets_updated_at'
    AND tgrelid='departure_budgets'::regclass) THEN
    CREATE TRIGGER set_departure_budgets_updated_at BEFORE UPDATE ON departure_budgets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 3. TRAINING MODULES — Modul pelatihan produk untuk agen
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_training_modules_category   ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_active     ON training_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_training_modules_order      ON training_modules(order_index);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_modules" ON training_modules;
DROP POLICY IF EXISTS "agent_read_training_modules"   ON training_modules;

CREATE POLICY "admin_manage_training_modules" ON training_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_modules" ON training_modules
  FOR SELECT USING (
    is_active = TRUE AND auth.role() = 'authenticated'
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_training_modules_updated_at'
    AND tgrelid='training_modules'::regclass) THEN
    CREATE TRIGGER set_training_modules_updated_at BEFORE UPDATE ON training_modules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. TRAINING QUIZZES — Soal kuis per modul
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_quizzes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_module_id ON training_quizzes(module_id);

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


-- =============================================================================
-- 5. AGENT TRAINING PROGRESS — Progress belajar per agen per modul
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_agent_training_agent_id   ON agent_training_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_module_id  ON agent_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_status     ON agent_training_progress(status);

ALTER TABLE agent_training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_training"     ON agent_training_progress;
DROP POLICY IF EXISTS "admin_read_all_training"       ON agent_training_progress;

CREATE POLICY "agent_manage_own_training" ON agent_training_progress
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_read_all_training" ON agent_training_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agent_training_updated_at'
    AND tgrelid='agent_training_progress'::regclass) THEN
    CREATE TRIGGER set_agent_training_updated_at BEFORE UPDATE ON agent_training_progress
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 6. MEDIA GALLERY — Video testimoni, virtual tour 360°, foto hotel
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_media_gallery_type       ON media_gallery(type);
CREATE INDEX IF NOT EXISTS idx_media_gallery_hotel_id   ON media_gallery(hotel_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_package_id ON media_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_active     ON media_gallery(is_active);
CREATE INDEX IF NOT EXISTS idx_media_gallery_order      ON media_gallery(order_index);

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


-- =============================================================================
-- 7. SISKOHAT SYNC LOGS — Riwayat ekspor data jamaah haji ke format Kemenag
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_created_at ON siskohat_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_status     ON siskohat_sync_logs(status);

ALTER TABLE siskohat_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_siskohat_logs" ON siskohat_sync_logs;

CREATE POLICY "admin_manage_siskohat_logs" ON siskohat_sync_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );


-- =============================================================================
-- 8. APPROVAL CONFIGS — Aturan level approval per tipe & threshold
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_configs (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type                 TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  level                SMALLINT NOT NULL DEFAULT 1,
  required_role        TEXT NOT NULL,
  amount_threshold     NUMERIC(15, 2),
  percentage_threshold NUMERIC(5, 2),
  auto_approve_below   NUMERIC(15, 2),
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner'))
  );

CREATE POLICY "staff_read_approval_configs" ON approval_configs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seed konfigurasi default
INSERT INTO approval_configs (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',          1, 'branch_manager', 5000000,  NULL, 500000),
  ('refund',          2, 'admin',          50000000, NULL, 5000000),
  ('refund',          3, 'owner',          NULL,     NULL, NULL),
  ('discount',        1, 'branch_manager', NULL,     10.0, NULL),
  ('discount',        2, 'admin',          NULL,     30.0, NULL),
  ('cancellation',    1, 'branch_manager', NULL,     NULL, NULL),
  ('cancellation',    2, 'admin',          NULL,     NULL, NULL),
  ('vendor_invoice',  1, 'finance',        10000000, NULL, 1000000),
  ('vendor_invoice',  2, 'owner',          NULL,     NULL, 10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;


-- =============================================================================
-- 9. AGENT OVERRIDE COMMISSIONS — Komisi bertingkat dari booking sub-agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_override_commissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sub_agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  override_percentage NUMERIC(5, 2) NOT NULL,
  override_amount     NUMERIC(15, 2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_override_agent_id     ON agent_override_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_sub_agent_id ON agent_override_commissions(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_booking_id   ON agent_override_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_status       ON agent_override_commissions(status);

ALTER TABLE agent_override_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_read_own_override"   ON agent_override_commissions;
DROP POLICY IF EXISTS "admin_manage_override"      ON agent_override_commissions;

CREATE POLICY "agent_read_own_override" ON agent_override_commissions
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_manage_override" ON agent_override_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );


-- =============================================================================
-- 10. BAGGAGE REFERENCE ITEMS — Referensi berat barang bawaan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS baggage_reference_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  estimated_weight_kg NUMERIC(5, 2) NOT NULL,
  is_mandatory        BOOLEAN DEFAULT FALSE,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_baggage_reference_category ON baggage_reference_items(category);

ALTER TABLE baggage_reference_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_baggage_reference"  ON baggage_reference_items;
DROP POLICY IF EXISTS "admin_manage_baggage_reference" ON baggage_reference_items;

CREATE POLICY "public_read_baggage_reference" ON baggage_reference_items
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_manage_baggage_reference" ON baggage_reference_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

-- Seed referensi berat barang umum
INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory)
VALUES
  ('Koper besar (kosong)',     'koper',     3.50, TRUE),
  ('Koper kabin (kosong)',     'koper',     2.00, FALSE),
  ('Tas ransel',               'tas',       0.80, FALSE),
  ('Baju ihram pria (2 lembar)','pakaian',  0.80, TRUE),
  ('Mukena',                   'pakaian',   0.40, FALSE),
  ('Baju ganti (per pasang)',  'pakaian',   0.50, FALSE),
  ('Sandal',                   'alas_kaki', 0.40, TRUE),
  ('Sepatu',                   'alas_kaki', 0.70, FALSE),
  ('Al-Quran',                 'ibadah',    0.50, FALSE),
  ('Sajadah travel',           'ibadah',    0.30, FALSE),
  ('Tasbih',                   'ibadah',    0.10, FALSE),
  ('Payung',                   'aksesoris', 0.30, FALSE),
  ('Obat-obatan pribadi',      'kesehatan', 0.50, FALSE),
  ('Masker (kotak)',           'kesehatan', 0.20, TRUE),
  ('Sunscreen & skincare',     'kesehatan', 0.40, FALSE),
  ('Charger & kabel',          'elektronik',0.30, FALSE),
  ('Power bank',               'elektronik',0.25, FALSE),
  ('Kamera',                   'elektronik',0.50, FALSE),
  ('Bantal leher',             'kenyamanan',0.25, FALSE),
  ('Makanan ringan/bekal',     'makanan',   0.50, FALSE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 11. KOLOM TAMBAHAN — di tabel yang sudah ada
-- =============================================================================

-- Kolom SISKOHAT di customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nomor_porsi_haji     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS embarkasi_kode        TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS estimasi_keberangkatan_haji INTEGER;

-- Kuota bagasi per booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bagasi_kg_allowed INTEGER DEFAULT 23;

-- Kolom SOS tambahan
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS assigned_muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Sub-agen / jaringan multi-level
ALTER TABLE agents ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- =============================================================================
-- 12. MENU ITEMS untuk fitur baru
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('vendor-contracts',  'Kontrak Vendor',      '/admin/vendor-contracts',  'FilePen',      'Operasional',  340, 'vendor-contracts',  true),
  ('training',          'Pelatihan Agen',       '/admin/training',          'GraduationCap','SDM',          610, 'training',          true),
  ('siskohat',          'SISKOHAT Kemenag',     '/admin/siskohat',          'Landmark',     'Operasional',  350, 'siskohat',          true),
  ('media-gallery',     'Galeri Media',         '/admin/media-gallery',     'Film',         'Marketing',    520, 'media-gallery',     true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- Role permissions
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('super_admin'),('owner'),('admin')) AS r(role)
CROSS JOIN (VALUES
  ('vendor-contracts'),('training'),('siskohat'),('media-gallery')
) AS p(perm)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', p FROM (VALUES ('vendor-contracts'),('training'),('siskohat')) AS t(p)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
VALUES ('marketing', 'media-gallery'), ('operational', 'siskohat')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Fase 17 migration completed
-- =============================================================================
SELECT 'Fase 17 migration completed — all remaining tables created' AS result;
