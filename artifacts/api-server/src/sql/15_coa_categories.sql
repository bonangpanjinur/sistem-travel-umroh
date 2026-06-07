-- ============================================================
-- 15_coa_categories.sql
-- Chart of Accounts (COA) untuk kategorisasi biaya HPP
-- ============================================================

-- Tabel COA Kategori
CREATE TABLE IF NOT EXISTS public.coa_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  parent_code   TEXT        REFERENCES public.coa_categories(code) ON DELETE SET NULL,
  category_key  TEXT,
  description   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_coa_categories_category_key ON public.coa_categories(category_key);
CREATE INDEX IF NOT EXISTS idx_coa_categories_sort ON public.coa_categories(sort_order, code);

-- Seed default COA
INSERT INTO public.coa_categories (code, name, category_key, description, sort_order) VALUES
  ('5000', 'BIAYA OPERASIONAL PERJALANAN', NULL,   'Akun induk semua biaya perjalanan', 0),
  ('5100', 'Tiket Penerbangan',            'airline',        'Biaya tiket pesawat domestik/internasional', 10),
  ('5110', 'Airport Tax & Surcharge',      'airline',        'Pajak bandara dan surcharge bahan bakar', 11),
  ('5200', 'Akomodasi Hotel',              'hotel',          'Biaya hotel Makkah dan Madinah', 20),
  ('5210', 'Hotel Makkah',                 'hotel',          'Biaya hotel di Makkah', 21),
  ('5220', 'Hotel Madinah',                'hotel',          'Biaya hotel di Madinah', 22),
  ('5230', 'Hotel Transit',                'hotel',          'Hotel transit (Istanbul, Dubai, dll)', 23),
  ('5300', 'Transportasi Darat',           'land_transport', 'Sewa bus dan transportasi darat', 30),
  ('5400', 'Visa & Dokumen',               'visa',           'Biaya visa, legalisasi, dan pengurusan dokumen', 40),
  ('5410', 'Visa Umroh/Haji',              'visa',           'Biaya visa Saudi Arabia', 41),
  ('5420', 'Asuransi Perjalanan',          'insurance',      'Premi asuransi jamaah', 42),
  ('5500', 'Biaya Handling & Porter',      'handling',       'Handling bandara, porter, trolley', 50),
  ('5600', 'Biaya Muthawif / Guide',       'muthawif',       'Honor muthawif, guide, dan pembimbing', 60),
  ('5700', 'Perlengkapan Jamaah',          'equipment',      'Koper, baju ihram, tas, dll', 70),
  ('5800', 'Manasik & Edukasi',            'manasik',        'Biaya manasik, buku panduan, konsumsi', 80),
  ('5900', 'Marketing & Promosi',          'marketing',      'Biaya iklan, brosur, komisi marketing', 90),
  ('5910', 'Komisi PIC / Agen',            'pic_fee',        'Komisi PIC dan agen penjualan', 91),
  ('6000', 'Overhead Kantor',              'overhead',       'Biaya operasional kantor', 100),
  ('5990', 'Biaya Lain-lain',              'other',          'Biaya tidak terkategorikan', 110)
ON CONFLICT (code) DO NOTHING;

-- Tambah kolom account_code ke departure_cost_items
ALTER TABLE public.departure_cost_items
  ADD COLUMN IF NOT EXISTS account_code TEXT REFERENCES public.coa_categories(code) ON DELETE SET NULL;

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_account_code
  ON public.departure_cost_items(account_code)
  WHERE account_code IS NOT NULL;

-- Auto-populate account_code dari category_key yang sudah ada
-- (mengisi data lama secara otomatis)
UPDATE public.departure_cost_items dci
SET account_code = (
  SELECT c.code
  FROM public.coa_categories c
  WHERE c.category_key = dci.category
  ORDER BY c.sort_order ASC
  LIMIT 1
)
WHERE dci.account_code IS NULL
  AND dci.category IS NOT NULL;

COMMENT ON TABLE public.coa_categories IS 'Chart of Accounts untuk kategorisasi biaya HPP per keberangkatan';
COMMENT ON COLUMN public.departure_cost_items.account_code IS 'Kode akun COA (FK ke coa_categories.code)';
