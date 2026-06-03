-- =============================================================================
-- Migration 065: Hotel Room Capacities (K3)
-- Batas kapasitas kamar berdasarkan data hotel aktual per tipe kamar.
-- Staff bisa set: "Hotel Hilton Makkah punya 20 kamar Quad, 10 Double, 5 Triple"
-- Sistem lalu memperingatkan jika rooming list melebihi batas tersebut.
-- =============================================================================

-- 1. Tabel batas kapasitas kamar per hotel per tipe
CREATE TABLE IF NOT EXISTS hotel_room_capacities (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id      UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type     TEXT        NOT NULL CHECK (room_type IN ('single','double','triple','quad')),
  total_rooms   INTEGER     NOT NULL DEFAULT 0 CHECK (total_rooms >= 0),
  notes         TEXT,
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hotel_id, room_type)
);

CREATE INDEX IF NOT EXISTS idx_hotel_room_caps_hotel_id ON hotel_room_capacities(hotel_id);

COMMENT ON TABLE hotel_room_capacities IS
  'Kapasitas fisik kamar hotel per tipe. Digunakan untuk validasi rooming list.';
COMMENT ON COLUMN hotel_room_capacities.total_rooms IS
  'Jumlah kamar fisik hotel untuk tipe ini. 0 = belum dikonfigurasi / tidak ada batas.';

ALTER TABLE hotel_room_capacities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_hotel_room_capacities" ON hotel_room_capacities;
CREATE POLICY "staff_manage_hotel_room_capacities" ON hotel_room_capacities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "auth_read_hotel_room_capacities" ON hotel_room_capacities;
CREATE POLICY "auth_read_hotel_room_capacities" ON hotel_room_capacities
  FOR SELECT TO authenticated USING (true);

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_hotel_room_caps_updated_at'
      AND tgrelid = 'hotel_room_capacities'::regclass) THEN
    CREATE TRIGGER set_hotel_room_caps_updated_at
      BEFORE UPDATE ON hotel_room_capacities
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. Fungsi: get_hotel_capacity_summary(hotel_id, departure_id)
-- Mengembalikan per tipe kamar:
--   room_type | capacity_limit | assigned_count | remaining | status
-- status: 'ok' | 'near_full' (>=80%) | 'full' (>=100%) | 'exceeded' (>100%) | 'unconfigured'
-- =============================================================================
CREATE OR REPLACE FUNCTION get_hotel_capacity_summary(
  p_hotel_id     UUID,
  p_departure_id UUID
)
RETURNS TABLE (
  room_type        TEXT,
  capacity_limit   INTEGER,
  assigned_count   INTEGER,
  remaining        INTEGER,
  usage_pct        NUMERIC,
  status           TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Kapasitas yang dikonfigurasi untuk hotel ini
  caps AS (
    SELECT hrc.room_type, hrc.total_rooms
    FROM hotel_room_capacities hrc
    WHERE hrc.hotel_id = p_hotel_id
  ),
  -- Jumlah kamar yang sudah dibuat di rooming list untuk departure ini
  assigned AS (
    SELECT
      ra.room_type,
      COUNT(*)::INTEGER AS cnt
    FROM room_assignments ra
    WHERE ra.hotel_id     = p_hotel_id
      AND ra.departure_id = p_departure_id
    GROUP BY ra.room_type
  ),
  -- Gabungkan semua tipe yang muncul di salah satu sumber
  all_types AS (
    SELECT room_type FROM caps
    UNION
    SELECT room_type FROM assigned
  )
  SELECT
    t.room_type,
    COALESCE(c.total_rooms, 0)                                   AS capacity_limit,
    COALESCE(a.cnt, 0)                                           AS assigned_count,
    CASE
      WHEN COALESCE(c.total_rooms, 0) = 0 THEN NULL
      ELSE GREATEST(0, c.total_rooms - COALESCE(a.cnt, 0))
    END                                                          AS remaining,
    CASE
      WHEN COALESCE(c.total_rooms, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(a.cnt, 0)::NUMERIC / c.total_rooms) * 100, 1)
    END                                                          AS usage_pct,
    CASE
      WHEN COALESCE(c.total_rooms, 0) = 0               THEN 'unconfigured'
      WHEN COALESCE(a.cnt, 0) > c.total_rooms            THEN 'exceeded'
      WHEN COALESCE(a.cnt, 0) = c.total_rooms            THEN 'full'
      WHEN COALESCE(a.cnt, 0) >= c.total_rooms * 0.8    THEN 'near_full'
      ELSE                                                    'ok'
    END                                                          AS status
  FROM all_types t
  LEFT JOIN caps     c ON c.room_type = t.room_type
  LEFT JOIN assigned a ON a.room_type = t.room_type
  ORDER BY
    CASE t.room_type
      WHEN 'quad'   THEN 1
      WHEN 'triple' THEN 2
      WHEN 'double' THEN 3
      WHEN 'single' THEN 4
      ELSE 5
    END;
END;
$$;

REVOKE ALL ON FUNCTION get_hotel_capacity_summary(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_hotel_capacity_summary(UUID, UUID) TO authenticated;

SELECT 'Migration 065 — hotel_room_capacities selesai' AS result;
