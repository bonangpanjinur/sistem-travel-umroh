-- 09_passenger_pricing.sql
-- Harga per tipe penumpang: Dewasa / Anak / Balita
-- Menambah price_adult (sebelumnya tidak ada di departures) + kolom persentase

ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS price_adult  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS child_price_percent  numeric DEFAULT 75,
  ADD COLUMN IF NOT EXISTS infant_price_percent numeric DEFAULT 10;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS child_price_percent  numeric DEFAULT 75,
  ADD COLUMN IF NOT EXISTS infant_price_percent numeric DEFAULT 10;
