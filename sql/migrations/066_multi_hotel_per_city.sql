-- =============================================================================
-- 066: Multi-Hotel per Kota (K7)
-- Mengizinkan beberapa hotel untuk kota yang sama dalam satu keberangkatan.
-- Menggunakan tabel departure_hotels yang sudah ada dengan hotel_role baru:
--   'makkah'  — hotel tambahan di Makkah (selain hotel_makkah_id di departures)
--   'madinah' — hotel tambahan di Madinah (selain hotel_madinah_id di departures)
-- Tabel departure_hotels sudah memiliki hotel_id (FK ke hotels) dan hotel_role (TEXT).
-- Tidak ada perubahan schema — hanya penambahan nilai hotel_role yang didukung.
-- =============================================================================

-- Tambah kolom city di departure_hotels untuk memudahkan grouping tampilan
-- (opsional — bisa juga JOIN ke hotels.city, tapi kolom eksplisit lebih cepat)
ALTER TABLE departure_hotels
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Backfill city dari tabel hotels untuk data yang sudah ada
UPDATE departure_hotels dh
SET city = h.city
FROM hotels h
WHERE dh.hotel_id = h.id
  AND dh.city IS NULL;

-- Index untuk pencarian cepat per kota
CREATE INDEX IF NOT EXISTS idx_departure_hotels_city ON departure_hotels(city);
CREATE INDEX IF NOT EXISTS idx_departure_hotels_role ON departure_hotels(hotel_role);

-- Trigger: auto-fill city dari hotels saat INSERT/UPDATE hotel_id
CREATE OR REPLACE FUNCTION sync_departure_hotel_city()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.hotel_id IS NOT NULL AND NEW.city IS NULL THEN
    SELECT city INTO NEW.city FROM hotels WHERE id = NEW.hotel_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_departure_hotel_city ON departure_hotels;
CREATE TRIGGER trg_sync_departure_hotel_city
  BEFORE INSERT OR UPDATE OF hotel_id ON departure_hotels
  FOR EACH ROW EXECUTE FUNCTION sync_departure_hotel_city();

-- Dokumentasi hotel_role yang valid (untuk referensi developer):
-- 'makkah'    — Hotel tambahan di Makkah
-- 'madinah'   — Hotel tambahan di Madinah
-- 'transit'   — Hotel transit (Jeddah, Istanbul, Dubai, dll)
-- 'umroh_plus'— Hotel Umroh Plus
-- 'haji'      — Hotel Haji
-- 'city_tour' — Hotel city tour
-- 'tour'      — Hotel paket wisata
-- 'additional'— Hotel tambahan lain

SELECT '066: Multi-hotel per kota — kolom city ditambahkan & trigger aktif' AS result;
