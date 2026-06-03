-- =============================================================================
-- Migration 063: Hotel Room Numbers per Room Group (K1)
-- Tambah kolom nomor kamar hotel spesifik per jamaah per grup kamar
-- Mendukung multi-hotel: Makkah dan Madinah (+ kolom bebas untuk hotel lain)
-- =============================================================================

-- 1. Tambah kolom nomor kamar per hotel ke booking_passengers
ALTER TABLE booking_passengers
  ADD COLUMN IF NOT EXISTS room_number_makkah   TEXT,
  ADD COLUMN IF NOT EXISTS room_number_madinah  TEXT,
  ADD COLUMN IF NOT EXISTS room_hotel_notes     TEXT;

COMMENT ON COLUMN booking_passengers.room_number_makkah  IS 'Nomor kamar hotel di Makkah (contoh: 301, Hilton-301)';
COMMENT ON COLUMN booking_passengers.room_number_madinah IS 'Nomor kamar hotel di Madinah (contoh: 205, Pullman-205)';
COMMENT ON COLUMN booking_passengers.room_hotel_notes    IS 'Catatan tambahan nomor kamar / hotel lain (transit, Istanbul, dll.)';

-- 2. Index agar query per grup bisa filter cepat berdasarkan nomor kamar
CREATE INDEX IF NOT EXISTS idx_bp_room_number_makkah
  ON booking_passengers(room_number_makkah)
  WHERE room_number_makkah IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bp_room_number_madinah
  ON booking_passengers(room_number_madinah)
  WHERE room_number_madinah IS NOT NULL;

-- 3. Update fungsi get_room_group_members agar ikut kembalikan kolom baru
CREATE OR REPLACE FUNCTION get_room_group_members(group_id UUID)
RETURNS TABLE(
  id                   UUID,
  customer_id          UUID,
  full_name            TEXT,
  gender               TEXT,
  room_preference      TEXT,
  room_number          TEXT,
  room_number_makkah   TEXT,
  room_number_madinah  TEXT,
  room_hotel_notes     TEXT,
  booking_code         TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.customer_id,
    c.full_name,
    c.gender,
    bp.room_preference::TEXT,
    bp.room_number,
    bp.room_number_makkah,
    bp.room_number_madinah,
    bp.room_hotel_notes,
    b.booking_code
  FROM booking_passengers bp
  JOIN customers c ON bp.customer_id = c.id
  JOIN bookings  b ON bp.booking_id  = b.id
  WHERE bp.room_group_id = group_id
  ORDER BY bp.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Izinkan staff yang berwenang menggunakan fungsi ini
REVOKE ALL ON FUNCTION get_room_group_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_room_group_members(UUID) TO authenticated;

-- 4. Tambah policy RLS agar kolom baru bisa diupdate oleh staff
-- (menggunakan policy yang sudah ada di booking_passengers — tidak perlu policy baru
--  karena kolom baru otomatis masuk ke policy FOR ALL yang sudah ada)

SELECT 'Migration 063 — hotel room numbers selesai' AS result;
