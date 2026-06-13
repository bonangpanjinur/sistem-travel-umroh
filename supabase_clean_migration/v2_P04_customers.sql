-- =============================================================================
-- v2_P04 — ALTER: Customers + Tabel Customer Baru
-- Modul : Data Pelanggan / Jamaah
-- Aman  : ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOMERS — Semua kolom yang hilang (dari analisis §17)
-- ---------------------------------------------------------------------------

-- Lokasi detail
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS village      TEXT;

-- Data dokumen & keluarga
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mother_name  TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS father_name  TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marital_status TEXT
  CHECK (marital_status IN ('single','married','widowed','divorced'));

-- Kesehatan & fisik (penting untuk dokumen kelayakan terbang)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS blood_type   TEXT
  CHECK (blood_type IN ('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS height_cm    INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS weight_kg    NUMERIC(5,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS clothing_size TEXT;

-- Kontak darurat
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone    TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- Ringkasan mahram (detail di customer_mahrams)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mahram_name     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mahram_relation TEXT;

-- Flag operasional
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_tour_leader BOOLEAN DEFAULT FALSE;

-- Index baru
CREATE INDEX IF NOT EXISTS idx_customers_full_name   ON customers(full_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone       ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_nik         ON customers(nik);
CREATE INDEX IF NOT EXISTS idx_customers_passport    ON customers(passport_number);

-- ---------------------------------------------------------------------------
-- 2. CUSTOMER_MAHRAMS — Tabel mahram terpisah (dari 036)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_mahrams (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id         UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mahram_name         TEXT    NOT NULL,
  mahram_relation     TEXT    NOT NULL
    CHECK (mahram_relation IN ('suami','ayah','kakak_laki','adik_laki','paman','kakek','anak_laki','lainnya')),
  mahram_customer_id  UUID    REFERENCES customers(id) ON DELETE SET NULL,
  relation_category   TEXT    DEFAULT 'lainnya',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cm_customer_id ON customer_mahrams(customer_id);

ALTER TABLE customer_mahrams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mahrams_admin_manage" ON customer_mahrams;
DROP POLICY IF EXISTS "mahrams_own_read"     ON customer_mahrams;

CREATE POLICY "mahrams_admin_manage" ON customer_mahrams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance'))
  );

CREATE POLICY "mahrams_own_read" ON customer_mahrams
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_mahrams_updated_at'
    AND tgrelid='customer_mahrams'::regclass) THEN
    CREATE TRIGGER set_customer_mahrams_updated_at
      BEFORE UPDATE ON customer_mahrams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. VISA_APPLICATIONS — Tabel permohonan visa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visa_applications (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID    NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  booking_id       UUID    REFERENCES bookings(id)            ON DELETE SET NULL,
  departure_id     UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  visa_type        TEXT    DEFAULT 'umroh'
                           CHECK (visa_type IN ('umroh','haji','ziarah')),
  status           TEXT    NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','submitted','processing','approved','rejected','expired')),
  application_date DATE    DEFAULT CURRENT_DATE,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  expiry_date      DATE,
  visa_number      TEXT,
  notes            TEXT,
  rejection_reason TEXT,
  handled_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_va_customer_id  ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_va_departure_id ON visa_applications(departure_id);
CREATE INDEX IF NOT EXISTS idx_va_status       ON visa_applications(status);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visa_staff_manage" ON visa_applications;
DROP POLICY IF EXISTS "visa_own_read"     ON visa_applications;

CREATE POLICY "visa_staff_manage" ON visa_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer'))
  );

CREATE POLICY "visa_own_read" ON visa_applications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_visa_applications_updated_at'
    AND tgrelid='visa_applications'::regclass) THEN
    CREATE TRIGGER set_visa_applications_updated_at
      BEFORE UPDATE ON visa_applications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS visa_status_logs (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID    NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
  old_status     TEXT,
  new_status     TEXT    NOT NULL,
  notes          TEXT,
  changed_by     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vsl_application_id ON visa_status_logs(application_id);

