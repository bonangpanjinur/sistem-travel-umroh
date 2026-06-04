-- =============================================================================
-- 05_equipment_and_recent_migrations.sql
-- Applies migrations 062–065 idempotently so the API server has:
--   • return_equipment_item()          — retur perlengkapan (E1)
--   • bulk_distribute_equipment()      — distribusi dengan size (E2)
--   • confirm_equipment_receipt()      — konfirmasi terima (E3)
--   • bulk_confirm_equipment_departure()
--   • get_room_group_members()         — nomor kamar hotel (K1)
--   • trigger_recalculate_pl_on_complete() — auto P&L (D2)
--   • recalculate_all_departure_pl()
-- =============================================================================

-- ── Migration 062: Equipment Size + Return ────────────────────────────────────

ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS size              TEXT,
  ADD COLUMN IF NOT EXISTS return_reason     TEXT,
  ADD COLUMN IF NOT EXISTS return_condition  TEXT DEFAULT 'baik'
    CHECK (return_condition IN ('baik', 'rusak', 'hilang'));

ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS has_sizes       BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS available_sizes TEXT[]   DEFAULT '{}';

ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS returned_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_notes      TEXT,
  ADD COLUMN IF NOT EXISTS return_photo_url  TEXT;

CREATE INDEX IF NOT EXISTS idx_equip_dist_return_departure
  ON equipment_distributions (departure_id, status)
  WHERE status = 'returned';

CREATE INDEX IF NOT EXISTS idx_equip_dist_size
  ON equipment_distributions (departure_id, equipment_id, size)
  WHERE size IS NOT NULL;

-- RPC: return_equipment_item — atomic return of a single distribution record
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

-- RPC: bulk_distribute_equipment — supports optional size field
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

COMMENT ON COLUMN equipment_distributions.size             IS 'Ukuran item (S/M/L/XL/XXL atau custom) — null jika item tidak butuh ukuran';
COMMENT ON COLUMN equipment_distributions.return_condition IS 'Kondisi item saat dikembalikan: baik | rusak | hilang';
COMMENT ON COLUMN equipment_distributions.return_reason    IS 'Alasan pengembalian item';
COMMENT ON COLUMN equipment_items.has_sizes                IS 'true jika item ini butuh pemilihan ukuran (baju, koper, dll)';
COMMENT ON COLUMN equipment_items.available_sizes          IS 'Daftar ukuran tersedia, contoh: {S,M,L,XL,XXL}';

-- ── Migration 063: Hotel Room Numbers per Booking Passenger (K1) ──────────────

ALTER TABLE booking_passengers
  ADD COLUMN IF NOT EXISTS room_number_makkah   TEXT,
  ADD COLUMN IF NOT EXISTS room_number_madinah  TEXT,
  ADD COLUMN IF NOT EXISTS room_hotel_notes     TEXT;

COMMENT ON COLUMN booking_passengers.room_number_makkah  IS 'Nomor kamar hotel di Makkah (contoh: 301, Hilton-301)';
COMMENT ON COLUMN booking_passengers.room_number_madinah IS 'Nomor kamar hotel di Madinah (contoh: 205, Pullman-205)';
COMMENT ON COLUMN booking_passengers.room_hotel_notes    IS 'Catatan tambahan nomor kamar / hotel lain (transit, Istanbul, dll.)';

CREATE INDEX IF NOT EXISTS idx_bp_room_number_makkah
  ON booking_passengers(room_number_makkah)
  WHERE room_number_makkah IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bp_room_number_madinah
  ON booking_passengers(room_number_madinah)
  WHERE room_number_madinah IS NOT NULL;

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

-- ── Migration 064: Auto-trigger P&L recalculation on departure completion ─────

CREATE OR REPLACE FUNCTION public.trigger_recalculate_pl_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM recalculate_departure_financial_summary(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_recalculate_pl_on_complete ON departures;

CREATE TRIGGER trg_auto_recalculate_pl_on_complete
  AFTER UPDATE OF status ON departures
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_pl_on_complete();

CREATE OR REPLACE FUNCTION public.recalculate_all_departure_pl()
RETURNS TABLE(departure_id UUID, success BOOLEAN, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dep departures%ROWTYPE;
BEGIN
  FOR v_dep IN SELECT * FROM departures WHERE status IN ('completed', 'departed') LOOP
    BEGIN
      PERFORM recalculate_departure_financial_summary(v_dep.id);
      departure_id := v_dep.id;
      success      := TRUE;
      error_msg    := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      departure_id := v_dep.id;
      success      := FALSE;
      error_msg    := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION trigger_recalculate_pl_on_complete IS
  'Auto-triggers recalculate_departure_financial_summary when departure status changes to completed';
COMMENT ON FUNCTION recalculate_all_departure_pl IS
  'Batch recalculate P&L for all completed/departed departures — useful for backfill';

-- ── Migration 065: Equipment Confirmation by Jamaah (E3) ──────────────────────

ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS confirmed_by_jamaah    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_admin_id  UUID;

CREATE INDEX IF NOT EXISTS idx_equipment_dist_confirmed
  ON equipment_distributions (departure_id, confirmed_by_jamaah)
  WHERE status = 'distributed';

CREATE OR REPLACE FUNCTION public.bulk_confirm_equipment_departure(
  p_departure_id UUID,
  p_admin_id     UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE equipment_distributions
  SET
    confirmed_by_jamaah   = TRUE,
    confirmed_at          = NOW(),
    confirmed_by_admin_id = p_admin_id
  WHERE
    departure_id            = p_departure_id
    AND status              = 'distributed'
    AND confirmed_by_jamaah = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_equipment_receipt(
  p_distribution_id UUID,
  p_admin_id        UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE equipment_distributions
  SET
    confirmed_by_jamaah   = TRUE,
    confirmed_at          = NOW(),
    confirmed_by_admin_id = p_admin_id
  WHERE
    id     = p_distribution_id
    AND status = 'distributed';

  RETURN FOUND;
END;
$$;

COMMENT ON COLUMN equipment_distributions.confirmed_by_jamaah IS 'TRUE jika jamaah/admin sudah konfirmasi terima perlengkapan';
COMMENT ON COLUMN equipment_distributions.confirmed_at        IS 'Waktu konfirmasi penerimaan';

-- ── Grant execute to authenticated role (no-op if role doesn't exist) ─────────
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.return_equipment_item(UUID,TEXT,TEXT,TEXT,TEXT) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.bulk_distribute_equipment(UUID,JSONB) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.bulk_confirm_equipment_departure(UUID,UUID) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.confirm_equipment_receipt(UUID,UUID) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.recalculate_all_departure_pl() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_room_group_members(UUID) TO authenticated';
EXCEPTION WHEN OTHERS THEN
  NULL; -- authenticated role does not exist (plain Postgres); silently skip
END;
$$;

-- =============================================================================
SELECT '05_equipment_and_recent_migrations complete' AS result;
