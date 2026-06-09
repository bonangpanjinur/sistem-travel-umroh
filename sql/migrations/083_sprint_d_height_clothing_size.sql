-- =============================================================================
-- 083: Sprint D — D6: TB/BB & Clothing Size pada Customers
-- Tambah kolom height_cm, weight_kg, clothing_size ke customers
-- agar equipment distribution bisa auto-suggest ukuran baju/kain ihram.
-- =============================================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS height_cm   INTEGER,
  ADD COLUMN IF NOT EXISTS weight_kg   NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS clothing_size TEXT;

COMMENT ON COLUMN customers.height_cm     IS 'Tinggi badan jamaah dalam cm (untuk auto-suggest ukuran perlengkapan)';
COMMENT ON COLUMN customers.weight_kg     IS 'Berat badan jamaah dalam kg';
COMMENT ON COLUMN customers.clothing_size IS 'Ukuran baju/seragam: XS, S, M, L, XL, XXL, XXXL — bisa diisi manual atau auto-suggest dari TB';

-- Fungsi helper: hitung clothing_size dari tinggi badan
CREATE OR REPLACE FUNCTION suggest_clothing_size(height_cm INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN height_cm IS NULL THEN NULL
    WHEN height_cm < 150 THEN 'S'
    WHEN height_cm < 155 THEN 'M'
    WHEN height_cm < 160 THEN 'L'
    WHEN height_cm < 165 THEN 'XL'
    WHEN height_cm < 170 THEN 'XL'
    WHEN height_cm < 175 THEN 'XXL'
    ELSE 'XXXL'
  END
$$;

-- Index untuk filter jamaah berdasarkan ukuran
CREATE INDEX IF NOT EXISTS idx_customers_clothing_size ON customers(clothing_size) WHERE clothing_size IS NOT NULL;
