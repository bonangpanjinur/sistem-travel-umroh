-- =============================================================================
-- 88_passenger_per_room_pricing.sql
-- Menambah kolom harga per tipe kamar untuk penumpang anak & bayi di departures.
-- Juga membuat view ringkasan penumpang per tipe untuk setiap booking.
-- Idempotent — aman dijalankan berkali-kali.
-- =============================================================================

-- ── Harga per kamar untuk anak (child) ───────────────────────────────────────
-- NULL berarti menggunakan child_price_percent dari departures (fallback persentase)
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS price_child_quad    BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_triple  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_double  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_single  BIGINT DEFAULT NULL;

-- ── Harga per kamar untuk bayi (infant) ──────────────────────────────────────
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS price_infant_quad   BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_triple BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_double BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_single BIGINT DEFAULT NULL;

-- ── View: ringkasan jamaah per tipe untuk setiap booking ─────────────────────
CREATE OR REPLACE VIEW v_booking_passenger_summary AS
SELECT
  b.id            AS booking_id,
  b.booking_code,
  b.departure_id,
  COUNT(bp.id)    AS total_pax,
  COUNT(bp.id) FILTER (
    WHERE COALESCE(bp.passenger_type, 'adult') IN ('adult', 'dewasa')
  )               AS adult_count,
  COUNT(bp.id) FILTER (
    WHERE bp.passenger_type IN ('child', 'anak')
  )               AS child_count,
  COUNT(bp.id) FILTER (
    WHERE bp.passenger_type IN ('infant', 'bayi')
  )               AS infant_count
FROM bookings b
LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
GROUP BY b.id, b.booking_code, b.departure_id;

COMMENT ON VIEW v_booking_passenger_summary IS
  'Ringkasan jumlah penumpang adult/child/infant per booking — mendukung nilai EN (adult/child/infant) dan ID (dewasa/anak/bayi)';

-- =============================================================================
SELECT '88_passenger_per_room_pricing complete' AS result;
