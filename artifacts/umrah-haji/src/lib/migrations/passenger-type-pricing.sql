-- Migration: Passenger Type Pricing
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- Menambah kolom harga untuk anak dan bayi pada tabel departures
-- serta memastikan passenger_type enum valid di booking_passengers

-- 1. Tambah kolom harga anak (child) dan bayi (infant) di tabel departures
--    Nilai NULL berarti menggunakan persentase default (child=75%, infant=10%)
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS price_child_quad    BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_triple  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_double  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_single  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_quad   BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_triple BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_double BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_single BIGINT DEFAULT NULL;

-- Alternatif sederhana: simpan persentase harga anak/bayi dari harga dewasa
-- Misal: child_price_percent = 75 artinya 75% dari harga dewasa
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS child_price_percent  INTEGER DEFAULT 75 CHECK (child_price_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS infant_price_percent INTEGER DEFAULT 10  CHECK (infant_price_percent BETWEEN 0 AND 100);

-- 2. Pastikan passenger_type di booking_passengers hanya berisi nilai valid
--    (opsional — tambahkan constraint jika belum ada)
-- ALTER TABLE booking_passengers
--   ADD CONSTRAINT chk_passenger_type
--   CHECK (passenger_type IN ('adult', 'child', 'infant'));

-- 3. View: ringkasan jamaah per tipe untuk setiap booking
CREATE OR REPLACE VIEW v_booking_passenger_summary AS
SELECT
  b.id            AS booking_id,
  b.booking_code,
  b.departure_id,
  COUNT(bp.id)    AS total_pax,
  COUNT(bp.id) FILTER (WHERE COALESCE(bp.passenger_type, 'adult') = 'adult')  AS adult_count,
  COUNT(bp.id) FILTER (WHERE bp.passenger_type = 'child')                      AS child_count,
  COUNT(bp.id) FILTER (WHERE bp.passenger_type = 'infant')                     AS infant_count
FROM bookings b
LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
GROUP BY b.id, b.booking_code, b.departure_id;

-- Selesai. Refresh Supabase types setelah menjalankan migration ini.
-- Cara refresh: npx supabase gen types typescript --project-id <ID> > src/integrations/supabase/types.ts
