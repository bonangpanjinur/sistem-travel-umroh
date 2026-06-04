-- PAK-F5: Tambah kolom booking_mode ke package_types jika belum ada
ALTER TABLE package_types
  ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'umroh'
  CHECK (booking_mode IN ('umroh', 'haji', 'wisata'));

-- Update booking_mode dari package yang sudah ada berdasarkan kode
UPDATE package_types SET booking_mode = 'haji'
  WHERE code IN ('haji', 'haji_plus', 'haji_reguler', 'haji_khusus');

UPDATE package_types SET booking_mode = 'wisata'
  WHERE code LIKE 'wisata%' OR code LIKE '%_wisata%';

-- Seed: tipe paket wisata religi yang belum ada
INSERT INTO package_types (code, name, description, booking_mode, display_order, is_active)
VALUES
  ('wisata', 'Wisata Religi', 'Paket wisata religi umum — tour lokasi bersejarah Islam', 'wisata', 10, true),
  ('wisata_turki', 'Wisata Turki', 'Tour religi ke Turki: Istanbul, Konya, Bursa, jejak peradaban Islam', 'wisata', 11, true),
  ('wisata_maroko', 'Wisata Maroko', 'Tour religi ke Maroko: Fes, Marrakech, Casablanca', 'wisata', 12, true),
  ('wisata_jordan', 'Wisata Jordan', 'Tour religi ke Yordania: Petra, Wadi Rum, Laut Mati, Sungai Yordan', 'wisata', 13, true),
  ('wisata_palestina', 'Wisata Palestina', 'Tour religi ke Palestina: Masjid Al-Aqsa, Betlehem, Hebron', 'wisata', 14, true),
  ('wisata_mesir', 'Wisata Mesir', 'Tour religi ke Mesir: Kairo, Iskandariyah, piramid dan situs Islam', 'wisata', 15, true),
  ('wisata_eropa', 'Wisata Eropa Islam', 'Tour jejak Islam di Eropa: Andalusia (Spanyol), Portugal, Sisilia', 'wisata', 16, true)
ON CONFLICT (code) DO UPDATE SET
  booking_mode = EXCLUDED.booking_mode,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- PAK-F4: Pastikan tabel exchange_rates ada (sudah dibuat di CUR-1, ini idempotent)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from TEXT NOT NULL,
  currency_to TEXT NOT NULL DEFAULT 'IDR',
  rate NUMERIC(18, 4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "exchange_rates_read_all"
  ON exchange_rates FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "exchange_rates_write_admin"
  ON exchange_rates FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed kurs default jika belum ada
INSERT INTO exchange_rates (currency_from, currency_to, rate, source, notes, is_active)
SELECT 'USD', 'IDR', 16500, 'seed', 'Kurs default awal — perbarui setiap hari via admin', true
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates WHERE currency_from = 'USD' AND is_active = true);

INSERT INTO exchange_rates (currency_from, currency_to, rate, source, notes, is_active)
SELECT 'SAR', 'IDR', 4400, 'seed', 'Kurs default awal (1 SAR ≈ 1 USD/3.75) — perbarui setiap hari', true
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates WHERE currency_from = 'SAR' AND is_active = true);

INSERT INTO exchange_rates (currency_from, currency_to, rate, source, notes, is_active)
SELECT 'EUR', 'IDR', 18000, 'seed', 'Kurs default awal — perbarui setiap hari via admin', true
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates WHERE currency_from = 'EUR' AND is_active = true);

INSERT INTO exchange_rates (currency_from, currency_to, rate, source, notes, is_active)
SELECT 'MYR', 'IDR', 3700, 'seed', 'Kurs default awal — perbarui setiap hari via admin', true
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates WHERE currency_from = 'MYR' AND is_active = true);

INSERT INTO exchange_rates (currency_from, currency_to, rate, source, notes, is_active)
SELECT 'SGD', 'IDR', 12500, 'seed', 'Kurs default awal — perbarui setiap hari via admin', true
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates WHERE currency_from = 'SGD' AND is_active = true);

-- RPC: get_active_exchange_rate (idempotent)
CREATE OR REPLACE FUNCTION get_active_exchange_rate(from_currency TEXT, to_currency TEXT DEFAULT 'IDR')
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT rate FROM exchange_rates
  WHERE currency_from = upper(from_currency)
    AND currency_to = upper(to_currency)
    AND is_active = true
  ORDER BY fetched_at DESC
  LIMIT 1;
$$;
