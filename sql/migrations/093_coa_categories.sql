-- ============================================================
-- Migration 093: coa_categories — Chart of Accounts
-- Berdasarkan rencanasql.md §F-09, §24.6
-- KRITIS: API server mengakses `coa_categories` (bukan `chart_of_accounts`)
-- dan payments.account_code FK ke coa_categories.code
-- Idempotent: CREATE TABLE IF NOT EXISTS + migrasi data jika perlu
-- ============================================================

-- Buat tabel coa_categories (nama yang dipakai API server)
CREATE TABLE IF NOT EXISTS coa_categories (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  parent_code  TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  category_key TEXT    CHECK (category_key IN
                         ('revenue','expense','asset','liability','equity')),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coa_code       ON coa_categories(code);
CREATE INDEX IF NOT EXISTS idx_coa_parent     ON coa_categories(parent_code);
CREATE INDEX IF NOT EXISTS idx_coa_key        ON coa_categories(category_key);
CREATE INDEX IF NOT EXISTS idx_coa_is_active  ON coa_categories(is_active);

-- Jika chart_of_accounts sudah ada, migrasi data ke coa_categories
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'chart_of_accounts' AND table_schema = 'public'
  ) THEN
    -- Copy data jika belum ada
    INSERT INTO coa_categories (id, code, name, description, is_active, created_at)
    SELECT id, code, name, description,
           COALESCE(is_active, TRUE),
           COALESCE(created_at, NOW())
    FROM chart_of_accounts
    ON CONFLICT (code) DO NOTHING;

    -- Buat VIEW alias agar kode yang pakai chart_of_accounts tetap jalan
    EXECUTE '
      CREATE OR REPLACE VIEW chart_of_accounts AS
        SELECT id, code, name, parent_code, category_key,
               description, is_active, sort_order, created_at, updated_at
        FROM coa_categories
    ';
  END IF;
END $$;

-- Tambah FK payments.account_code → coa_categories.code
-- (hanya jika kolom account_code ada tapi belum ada FK)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'account_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'payments' AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'account_code'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT fk_payments_account_code
      FOREIGN KEY (account_code) REFERENCES coa_categories(code) ON DELETE SET NULL;
  END IF;
END $$;

-- Tambah FK departure_cost_items.account_code → coa_categories.code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departure_cost_items' AND column_name = 'account_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'departure_cost_items' AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'account_code'
  ) THEN
    ALTER TABLE departure_cost_items
      ADD CONSTRAINT fk_dci_account_code
      FOREIGN KEY (account_code) REFERENCES coa_categories(code) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed: COA dasar untuk perusahaan travel (Umroh/Haji)
INSERT INTO coa_categories (code, name, category_key, sort_order) VALUES
  -- ASET
  ('1000', 'Kas & Bank',                        'asset',     100),
  ('1001', 'Kas Tunai',                          'asset',     101),
  ('1002', 'Bank BCA',                           'asset',     102),
  ('1003', 'Bank BNI',                           'asset',     103),
  ('1004', 'Bank Mandiri',                       'asset',     104),
  ('1100', 'Piutang Usaha',                      'asset',     200),
  ('1101', 'Piutang Jamaah',                     'asset',     201),
  ('1200', 'Aset Tetap',                         'asset',     300),
  -- LIABILITAS
  ('2000', 'Utang Usaha',                        'liability', 400),
  ('2001', 'Utang Vendor',                       'liability', 401),
  ('2100', 'Pendapatan Diterima Dimuka',         'liability', 500),
  ('2101', 'DP Jamaah Belum Berangkat',          'liability', 501),
  -- EKUITAS
  ('3000', 'Modal',                              'equity',    600),
  ('3001', 'Laba Ditahan',                       'equity',    601),
  -- PENDAPATAN
  ('4000', 'Pendapatan Usaha',                   'revenue',   700),
  ('4001', 'Pendapatan Umroh',                   'revenue',   701),
  ('4002', 'Pendapatan Haji',                    'revenue',   702),
  ('4003', 'Pendapatan Toko Online',             'revenue',   703),
  ('4004', 'Pendapatan Tabungan',                'revenue',   704),
  ('4005', 'Pendapatan Komisi Agen',             'revenue',   705),
  ('4900', 'Pendapatan Lain-lain',               'revenue',   790),
  -- BEBAN
  ('5000', 'HPP — Biaya Paket',                  'expense',   800),
  ('5001', 'HPP — Hotel Makkah',                 'expense',   801),
  ('5002', 'HPP — Hotel Madinah',                'expense',   802),
  ('5003', 'HPP — Tiket Penerbangan',            'expense',   803),
  ('5004', 'HPP — Visa Umroh',                   'expense',   804),
  ('5005', 'HPP — Muthawif/Tour Leader',         'expense',   805),
  ('5006', 'HPP — Transportasi Lokal',           'expense',   806),
  ('5007', 'HPP — Konsumsi',                     'expense',   807),
  ('5008', 'HPP — Perlengkapan Jamaah',          'expense',   808),
  ('5100', 'Beban Operasional',                  'expense',   900),
  ('5101', 'Beban Gaji Karyawan',                'expense',   901),
  ('5102', 'Beban Sewa Kantor',                  'expense',   902),
  ('5103', 'Beban Marketing & Promosi',          'expense',   903),
  ('5104', 'Beban Administrasi & Umum',          'expense',   904),
  ('5105', 'Beban Komisi Agen',                  'expense',   905),
  ('5200', 'Beban Lain-lain',                    'expense',   990)
ON CONFLICT (code) DO NOTHING;
