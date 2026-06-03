-- =============================================================================
-- 06_equipment_schema.sql
-- Creates the complete modern equipment schema that the app expects:
--   • equipment_items       — product catalog (perlengkapan jamaah)
--   • equipment_variants    — size/color variants per item
--   • equipment_stock_history  — audit log for stock movements
--   • equipment_stock_opname   — periodic physical stock count
--   • Alters equipment_distributions to modern schema
--   • Re-creates functions that failed in step 05 (table missing at that time)
-- Idempotent — safe to run multiple times.
-- =============================================================================

-- ── 1. equipment_items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  category            TEXT        NOT NULL DEFAULT 'umum',
  description         TEXT,
  photo_url           TEXT,
  stock_quantity      INTEGER     DEFAULT 0,
  low_stock_threshold INTEGER     NOT NULL DEFAULT 5,
  gender_target       TEXT        NOT NULL DEFAULT 'all'
    CHECK (gender_target IN ('all', 'male', 'female')),
  has_variants        BOOLEAN     NOT NULL DEFAULT FALSE,
  has_sizes           BOOLEAN     NOT NULL DEFAULT FALSE,
  available_sizes     TEXT[]      DEFAULT '{}',
  pic                 TEXT,
  pic_type            TEXT,
  qr_code             TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_items_category    ON equipment_items (category);
CREATE INDEX IF NOT EXISTS idx_equipment_items_gender      ON equipment_items (gender_target);
CREATE INDEX IF NOT EXISTS idx_equipment_items_has_sizes   ON equipment_items (has_sizes);

-- ── 2. equipment_variants ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_variants (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id        UUID        NOT NULL REFERENCES equipment_items (id) ON DELETE CASCADE,
  size                TEXT,
  color               TEXT,
  sku                 TEXT,
  stock_good          INTEGER     NOT NULL DEFAULT 0,
  stock_damaged       INTEGER     NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER     NOT NULL DEFAULT 2,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_variants_equipment_id ON equipment_variants (equipment_id);

-- ── 3. equipment_stock_history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_stock_history (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id   UUID        NOT NULL REFERENCES equipment_items (id) ON DELETE CASCADE,
  change_type         TEXT        NOT NULL,
  quantity_change     INTEGER     NOT NULL DEFAULT 0,
  previous_quantity   INTEGER     NOT NULL DEFAULT 0,
  new_quantity        INTEGER     NOT NULL DEFAULT 0,
  notes               TEXT,
  changed_by          UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_stock_hist_item_id  ON equipment_stock_history (equipment_item_id);
CREATE INDEX IF NOT EXISTS idx_equip_stock_hist_created  ON equipment_stock_history (created_at DESC);

-- ── 4. equipment_stock_opname ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_stock_opname (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id   UUID        NOT NULL REFERENCES equipment_items (id) ON DELETE CASCADE,
  opname_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  system_count        INTEGER     NOT NULL DEFAULT 0,
  physical_count      INTEGER     NOT NULL DEFAULT 0,
  difference          INTEGER     NOT NULL DEFAULT 0,
  status              TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'adjusted')),
  notes               TEXT,
  pic_name            TEXT,
  pic_type            TEXT,
  created_by          UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_opname_item_id   ON equipment_stock_opname (equipment_item_id);
CREATE INDEX IF NOT EXISTS idx_equip_opname_date      ON equipment_stock_opname (opname_date DESC);

-- ── 5. Alter equipment_distributions to modern schema ─────────────────────────
-- The old table has: id, customer_id, departure_id, item_name, quantity,
--   distributed_at, distributed_by, notes, created_at
-- The app now expects: equipment_id, status, delivery_type, variant_id, etc.

ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS equipment_id          UUID        REFERENCES equipment_items (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS variant_id            UUID        REFERENCES equipment_variants (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status                TEXT        DEFAULT 'pending'
    CHECK (status IN ('pending', 'distributed', 'returned')),
  ADD COLUMN IF NOT EXISTS delivery_type         TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_proof_url    TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number       TEXT,
  ADD COLUMN IF NOT EXISTS expedition_name       TEXT,
  ADD COLUMN IF NOT EXISTS condition_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason         TEXT,
  ADD COLUMN IF NOT EXISTS cancel_admin_fee      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS size                  TEXT,
  ADD COLUMN IF NOT EXISTS return_reason         TEXT,
  ADD COLUMN IF NOT EXISTS return_condition      TEXT        DEFAULT 'baik'
    CHECK (return_condition IN ('baik', 'rusak', 'hilang')),
  ADD COLUMN IF NOT EXISTS returned_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_notes          TEXT,
  ADD COLUMN IF NOT EXISTS return_photo_url      TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_by_jamaah   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_admin_id UUID        REFERENCES auth.users (id) ON DELETE SET NULL;

-- Backfill status for existing rows that were distributed (have distributed_at set)
UPDATE equipment_distributions
SET status = 'distributed'
WHERE status IS NULL AND distributed_at IS NOT NULL;

UPDATE equipment_distributions
SET status = 'pending'
WHERE status IS NULL;

-- Indexes that failed in step 05 (columns didn't exist yet)
CREATE INDEX IF NOT EXISTS idx_equip_dist_return_departure
  ON equipment_distributions (departure_id, status)
  WHERE status = 'returned';

CREATE INDEX IF NOT EXISTS idx_equip_dist_size
  ON equipment_distributions (departure_id, size)
  WHERE size IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_dist_confirmed
  ON equipment_distributions (departure_id, confirmed_by_jamaah)
  WHERE status = 'distributed';

-- ── 6. Re-create functions that failed in step 05 ─────────────────────────────

-- return_equipment_item — uses equipment_id and status columns (now exist)
CREATE OR REPLACE FUNCTION public.return_equipment_item(
  p_distribution_id  UUID,
  p_return_condition TEXT DEFAULT 'baik',
  p_return_notes     TEXT DEFAULT NULL,
  p_return_reason    TEXT DEFAULT NULL,
  p_return_photo_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qty        INT;
  v_equip_id   UUID;
  v_status     TEXT;
BEGIN
  SELECT quantity, equipment_id, status
    INTO v_qty, v_equip_id, v_status
    FROM equipment_distributions
   WHERE id = p_distribution_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Distribution record not found: %', p_distribution_id;
  END IF;

  IF v_status <> 'distributed' THEN
    RAISE EXCEPTION 'Cannot return item with status: %', v_status;
  END IF;

  UPDATE equipment_distributions SET
    status             = 'returned',
    returned_at        = NOW(),
    return_condition   = p_return_condition,
    return_notes       = p_return_notes,
    return_reason      = p_return_reason,
    return_photo_url   = p_return_photo_url
  WHERE id = p_distribution_id;

  UPDATE equipment_items
     SET stock_quantity = COALESCE(stock_quantity, 0) + COALESCE(v_qty, 1)
   WHERE id = v_equip_id;
END;
$$;

-- bulk_distribute_equipment — uses equipment_id and size columns (now exist)
CREATE OR REPLACE FUNCTION public.bulk_distribute_equipment(
  p_departure_id   UUID,
  p_distributions  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dist     JSONB;
  v_qty    INT;
  v_stock  INT;
BEGIN
  FOR dist IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_qty := COALESCE((dist->>'quantity')::INT, 1);

    SELECT stock_quantity INTO v_stock
      FROM equipment_items
     WHERE id = (dist->>'equipment_id')::UUID
     FOR UPDATE;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Stok % tidak cukup (tersedia: %, dibutuhkan: %)',
        dist->>'equipment_id', v_stock, v_qty;
    END IF;

    INSERT INTO equipment_distributions (
      equipment_id, customer_id, departure_id,
      quantity, status, distributed_at, size
    ) VALUES (
      (dist->>'equipment_id')::UUID,
      (dist->>'customer_id')::UUID,
      p_departure_id,
      v_qty,
      'distributed',
      NOW(),
      dist->>'size'
    );

    UPDATE equipment_items
       SET stock_quantity = stock_quantity - v_qty
     WHERE id = (dist->>'equipment_id')::UUID;
  END LOOP;
END;
$$;

-- decrement_equipment_stock — safe stock decrement
CREATE OR REPLACE FUNCTION public.decrement_equipment_stock(
  p_equipment_id UUID,
  p_quantity     INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE equipment_items
     SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - p_quantity)
   WHERE id = p_equipment_id;
END;
$$;

-- increment_equipment_stock — safe stock increment
CREATE OR REPLACE FUNCTION public.increment_equipment_stock(
  p_equipment_id UUID,
  p_quantity     INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE equipment_items
     SET stock_quantity = COALESCE(stock_quantity, 0) + p_quantity
   WHERE id = p_equipment_id;
END;
$$;

-- Drop and re-create get_room_group_members (was failing due to return type change)
DROP FUNCTION IF EXISTS public.get_room_group_members(UUID);

CREATE OR REPLACE FUNCTION public.get_room_group_members(group_id UUID)
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

-- Grant execute (no-op if authenticated role missing)
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.return_equipment_item(UUID,TEXT,TEXT,TEXT,TEXT) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.bulk_distribute_equipment(UUID,JSONB) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.decrement_equipment_stock(UUID,INT) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.increment_equipment_stock(UUID,INT) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_room_group_members(UUID) TO authenticated';
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

COMMENT ON TABLE equipment_items              IS 'Katalog perlengkapan jamaah (baju ihram, koper, dll)';
COMMENT ON TABLE equipment_variants           IS 'Varian ukuran/warna per item perlengkapan';
COMMENT ON TABLE equipment_stock_history      IS 'Riwayat perubahan stok perlengkapan';
COMMENT ON TABLE equipment_stock_opname       IS 'Hasil opname stok fisik perlengkapan';
COMMENT ON COLUMN equipment_distributions.equipment_id IS 'FK ke equipment_items — item yang didistribusikan';
COMMENT ON COLUMN equipment_distributions.status       IS 'Status distribusi: pending | distributed | returned';

-- =============================================================================
SELECT '06_equipment_schema complete' AS result;
