-- =====================================================================
-- Migration 062: Equipment Size Per Jamaah (E2) + Return Improvements (E1)
-- =====================================================================

-- E2: Add size/ukuran field to equipment_distributions
ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS return_condition TEXT DEFAULT 'baik'
    CHECK (return_condition IN ('baik', 'rusak', 'hilang'));

-- E2: Add size configuration to equipment_items
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS available_sizes TEXT[] DEFAULT '{}';

-- E1: Ensure return columns exist (may already exist from earlier migrations)
ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_notes TEXT,
  ADD COLUMN IF NOT EXISTS return_photo_url TEXT;

-- Index for fast return queries per departure
CREATE INDEX IF NOT EXISTS idx_equip_dist_return_departure
  ON equipment_distributions (departure_id, status)
  WHERE status = 'returned';

-- Index for size lookups
CREATE INDEX IF NOT EXISTS idx_equip_dist_size
  ON equipment_distributions (departure_id, equipment_id, size)
  WHERE size IS NOT NULL;

-- RPC: return_equipment_item — atomic return of a single distribution record
CREATE OR REPLACE FUNCTION return_equipment_item(
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
  -- Lock the row
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

  -- Mark as returned
  UPDATE equipment_distributions SET
    status             = 'returned',
    returned_at        = NOW(),
    return_condition   = p_return_condition,
    return_notes       = p_return_notes,
    return_reason      = p_return_reason,
    return_photo_url   = p_return_photo_url
  WHERE id = p_distribution_id;

  -- Restore stock atomically
  UPDATE equipment_items
     SET stock_quantity = COALESCE(stock_quantity, 0) + COALESCE(v_qty, 1)
   WHERE id = v_equip_id;
END;
$$;

-- RPC: bulk_distribute_equipment — extend to accept optional size field
-- (Override the existing one to support size)
CREATE OR REPLACE FUNCTION bulk_distribute_equipment(
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

    -- Check stock
    SELECT stock_quantity INTO v_stock
      FROM equipment_items
     WHERE id = (dist->>'equipment_id')::UUID
     FOR UPDATE;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Stok % tidak cukup (tersedia: %, dibutuhkan: %)',
        dist->>'equipment_id', v_stock, v_qty;
    END IF;

    -- Insert distribution
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

    -- Decrement stock
    UPDATE equipment_items
       SET stock_quantity = stock_quantity - v_qty
     WHERE id = (dist->>'equipment_id')::UUID;
  END LOOP;
END;
$$;

COMMENT ON COLUMN equipment_distributions.size IS 'Ukuran item (S/M/L/XL/XXL atau custom) — null jika item tidak butuh ukuran';
COMMENT ON COLUMN equipment_distributions.return_condition IS 'Kondisi item saat dikembalikan: baik | rusak | hilang';
COMMENT ON COLUMN equipment_distributions.return_reason IS 'Alasan pengembalian item';
COMMENT ON COLUMN equipment_items.has_sizes IS 'true jika item ini butuh pemilihan ukuran (baju, koper, dll)';
COMMENT ON COLUMN equipment_items.available_sizes IS 'Daftar ukuran tersedia, contoh: {S,M,L,XL,XXL}';
