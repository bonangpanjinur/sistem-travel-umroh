-- =============================================================================
-- Migration 064: Mahram Room Compatibility Validation (K6)
-- Fungsi: check_mahram_room_conflicts(departure_id, hotel_id)
-- Mengembalikan daftar pasangan mahram yang kamarnya tidak kompatibel:
--   - Salah satu belum ditempatkan di kamar (unassigned)
--   - Keduanya sudah ditempatkan tapi di hotel berbeda
-- Catatan: suami-istri MEMANG dipisah kamar (beda gender) — bukan konflik utama.
--          Yang dideteksi: mahram belum dapat kamar sementara jamaahnya sudah.
-- =============================================================================

CREATE OR REPLACE FUNCTION check_mahram_room_conflicts(
  p_departure_id UUID,
  p_hotel_id     UUID DEFAULT NULL
)
RETURNS TABLE (
  jamaah_id         UUID,
  jamaah_name       TEXT,
  jamaah_gender     TEXT,
  mahram_id         UUID,
  mahram_name       TEXT,
  mahram_gender     TEXT,
  mahram_relation   TEXT,
  jamaah_room       TEXT,
  jamaah_hotel      TEXT,
  mahram_room       TEXT,
  mahram_hotel      TEXT,
  conflict_type     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Semua penumpang keberangkatan ini
  departure_pax AS (
    SELECT DISTINCT bp.customer_id
    FROM booking_passengers bp
    JOIN bookings b ON bp.booking_id = b.id
    WHERE b.departure_id = p_departure_id
      AND b.booking_status IN ('confirmed', 'pending', 'completed')
  ),
  -- Semua penempatan kamar untuk keberangkatan ini (semua hotel)
  room_placements AS (
    SELECT
      ro.customer_id,
      ra.room_number,
      ra.hotel_id,
      h.name  AS hotel_name,
      ra.id   AS room_assignment_id
    FROM room_occupants ro
    JOIN room_assignments ra ON ro.room_assignment_id = ra.id
    JOIN hotels h ON ra.hotel_id = h.id
    WHERE ra.departure_id = p_departure_id
  )
  SELECT
    cm.customer_id                                   AS jamaah_id,
    c1.full_name                                     AS jamaah_name,
    COALESCE(c1.gender, 'unknown')                   AS jamaah_gender,
    cm.mahram_customer_id                            AS mahram_id,
    c2.full_name                                     AS mahram_name,
    COALESCE(c2.gender, 'unknown')                   AS mahram_gender,
    cm.mahram_relation,
    j_room.room_number                               AS jamaah_room,
    j_room.hotel_name                                AS jamaah_hotel,
    m_room.room_number                               AS mahram_room,
    m_room.hotel_name                                AS mahram_hotel,
    CASE
      WHEN j_room.room_number IS NULL AND m_room.room_number IS NULL
        THEN 'both_unassigned'
      WHEN j_room.room_number IS NULL
        THEN 'jamaah_unassigned'
      WHEN m_room.room_number IS NULL
        THEN 'mahram_unassigned'
      WHEN j_room.hotel_id IS DISTINCT FROM m_room.hotel_id
        THEN 'different_hotels'
      ELSE 'ok'
    END                                              AS conflict_type

  FROM customer_mahrams cm
  JOIN customers c1 ON cm.customer_id = c1.id
  JOIN customers c2 ON cm.mahram_customer_id = c2.id

  -- Kedua jamaah harus peserta keberangkatan ini
  JOIN departure_pax pj ON pj.customer_id = cm.customer_id
  JOIN departure_pax pm ON pm.customer_id = cm.mahram_customer_id

  -- Room placements (LEFT JOIN — bisa NULL jika belum ditempatkan)
  LEFT JOIN room_placements j_room ON j_room.customer_id = cm.customer_id
  LEFT JOIN room_placements m_room ON m_room.customer_id = cm.mahram_customer_id

  WHERE cm.mahram_customer_id IS NOT NULL
    -- Hanya tampilkan yang ada konflik
    AND (
      j_room.room_number IS NULL
      OR m_room.room_number IS NULL
      OR j_room.hotel_id IS DISTINCT FROM m_room.hotel_id
    )
    -- Jika filter hotel diberikan, setidaknya salah satu harus di hotel tsb
    AND (
      p_hotel_id IS NULL
      OR j_room.hotel_id = p_hotel_id
      OR m_room.hotel_id = p_hotel_id
      OR (j_room.hotel_id IS NULL AND m_room.hotel_id IS NULL)
    )
    -- Hindari duplikat: hanya tampilkan dari sisi yang customer_id lebih kecil
    -- KECUALI tidak ada pasangan balik
    AND (
      cm.customer_id < cm.mahram_customer_id
      OR NOT EXISTS (
        SELECT 1 FROM customer_mahrams cm2
        WHERE cm2.customer_id       = cm.mahram_customer_id
          AND cm2.mahram_customer_id = cm.customer_id
      )
    )

  ORDER BY
    CASE
      WHEN j_room.room_number IS NULL AND m_room.room_number IS NULL THEN 0
      WHEN m_room.room_number IS NULL THEN 1
      WHEN j_room.room_number IS NULL THEN 2
      ELSE 3
    END,
    c1.full_name;
END;
$$;

-- Izinkan staff yang berwenang memanggil fungsi ini
REVOKE ALL ON FUNCTION check_mahram_room_conflicts(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_mahram_room_conflicts(UUID, UUID) TO authenticated;

SELECT 'Migration 064 — mahram room compatibility validation selesai' AS result;
