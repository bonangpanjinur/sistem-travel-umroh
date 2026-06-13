-- ============================================================
-- Migration 089: Fix customers table — semua kolom yang hilang
-- Berdasarkan analisis rencanasql.md §17.3 & §24.5
-- Idempotent: ADD COLUMN IF NOT EXISTS
-- ============================================================

-- Golongan darah (AdminCustomerDetail.tsx, CustomerForm)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS blood_type
  TEXT CHECK (blood_type IN ('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-'));

-- Kontak darurat (CustomerForm, portal jamaah — 5+ hit)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relation  TEXT;

-- Data orang tua untuk dokumen PDF
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mother_name                 TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS father_name                 TEXT;

-- Status pernikahan
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marital_status
  TEXT CHECK (marital_status IN ('single','married','widowed','divorced'));

-- Ringkasan mahram (detail ada di customer_mahrams)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mahram_name                 TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mahram_relation             TEXT;

-- Flag tour leader (6× diakses di portal jamaah)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_tour_leader              BOOLEAN DEFAULT FALSE;

-- face_descriptor untuk fitur biometrik (migration 049 add ke employees, bukan customers)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS face_descriptor             JSONB;

-- Index baru
CREATE INDEX IF NOT EXISTS idx_customers_full_name    ON customers(full_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_email        ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_passport     ON customers(passport_number);
CREATE INDEX IF NOT EXISTS idx_customers_is_tour_lead ON customers(is_tour_leader) WHERE is_tour_leader = TRUE;
