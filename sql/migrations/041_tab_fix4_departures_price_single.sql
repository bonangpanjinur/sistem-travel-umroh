-- =============================================================================
-- TAB-FIX4 patch: Tambah price_single & booked_count di departures
-- =============================================================================

ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS price_single  NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS booked_count  INTEGER NOT NULL DEFAULT 0;

-- Backfill booked_count dari bookings aktif yang ada
UPDATE departures d
SET booked_count = (
  SELECT COUNT(*)
  FROM bookings b
  WHERE b.departure_id = d.id
    AND b.booking_status NOT IN ('cancelled','rejected')
)
WHERE booked_count = 0;

-- Trigger untuk sinkronisasi booked_count otomatis (idempotent)
CREATE OR REPLACE FUNCTION sync_departure_booked_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    UPDATE departures SET booked_count = (
      SELECT COUNT(*) FROM bookings
      WHERE departure_id = NEW.departure_id
        AND booking_status NOT IN ('cancelled','rejected')
    ) WHERE id = NEW.departure_id;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.departure_id IS DISTINCT FROM NEW.departure_id THEN
    UPDATE departures SET booked_count = (
      SELECT COUNT(*) FROM bookings
      WHERE departure_id = OLD.departure_id
        AND booking_status NOT IN ('cancelled','rejected')
    ) WHERE id = OLD.departure_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE departures SET booked_count = (
      SELECT COUNT(*) FROM bookings
      WHERE departure_id = OLD.departure_id
        AND booking_status NOT IN ('cancelled','rejected')
    ) WHERE id = OLD.departure_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_departure_booked_count ON bookings;
CREATE TRIGGER tr_sync_departure_booked_count
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_departure_booked_count();

SELECT 'TAB-FIX4 patch applied — price_single & booked_count added to departures' AS result;
