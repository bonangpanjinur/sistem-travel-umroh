-- Migration 048: Booking seat lock — hindari race condition overbooking (P7)
-- Menggunakan advisory lock + transaction di level DB

-- Fungsi: cek dan reservasi slot dengan advisory lock
CREATE OR REPLACE FUNCTION reserve_departure_slot(
  p_departure_id UUID,
  p_seats_needed INT DEFAULT 1
)
RETURNS TABLE(
  success         BOOLEAN,
  available_seats INT,
  message         TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_quota           INT;
  v_booked_count    INT;
  v_hold_count      INT;
  v_available       INT;
  v_lock_key        BIGINT;
BEGIN
  -- Advisory lock per departure (cegah concurrent booking pada departure yang sama)
  v_lock_key := hashtext(p_departure_id::TEXT);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Ambil quota keberangkatan
  SELECT quota INTO v_quota
  FROM departures WHERE id = p_departure_id;

  IF v_quota IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Keberangkatan tidak ditemukan'::TEXT;
    RETURN;
  END IF;

  -- Hitung booking aktif (confirmed + processing + completed)
  SELECT COUNT(*) INTO v_booked_count
  FROM bookings
  WHERE departure_id = p_departure_id
    AND status IN ('confirmed','processing','completed');

  -- Hitung seat hold aktif (yang belum expired)
  SELECT COALESCE(SUM(seats_held), 0) INTO v_hold_count
  FROM seat_holds
  WHERE departure_id = p_departure_id
    AND expires_at > NOW()
    AND released_at IS NULL;

  v_available := v_quota - v_booked_count - v_hold_count;

  IF v_available < p_seats_needed THEN
    RETURN QUERY SELECT
      FALSE,
      GREATEST(v_available, 0),
      FORMAT('Slot tidak cukup: tersedia %s, dibutuhkan %s', GREATEST(v_available, 0), p_seats_needed)::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_available, 'Slot tersedia'::TEXT;
END;
$$;

-- Fungsi: validasi overbooking sebelum INSERT booking
CREATE OR REPLACE FUNCTION check_booking_quota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_quota        INT;
  v_booked_count INT;
BEGIN
  -- Hanya check saat booking baru dibuat atau status berubah ke confirmed
  IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed','processing') THEN
    SELECT quota INTO v_quota FROM departures WHERE id = NEW.departure_id;

    SELECT COUNT(*) INTO v_booked_count
    FROM bookings
    WHERE departure_id = NEW.departure_id
      AND status IN ('confirmed','processing','completed')
      AND id != NEW.id;

    IF v_quota IS NOT NULL AND v_booked_count >= v_quota THEN
      RAISE EXCEPTION 'Kuota keberangkatan penuh (% / %)', v_booked_count, v_quota
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_OP = 'UPDATE'
    AND OLD.status NOT IN ('confirmed','processing')
    AND NEW.status IN ('confirmed','processing')
  THEN
    SELECT quota INTO v_quota FROM departures WHERE id = NEW.departure_id;

    SELECT COUNT(*) INTO v_booked_count
    FROM bookings
    WHERE departure_id = NEW.departure_id
      AND status IN ('confirmed','processing','completed')
      AND id != NEW.id;

    IF v_quota IS NOT NULL AND v_booked_count >= v_quota THEN
      RAISE EXCEPTION 'Kuota keberangkatan penuh (% / %)', v_booked_count, v_quota
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_booking_quota ON bookings;
CREATE TRIGGER trg_check_booking_quota
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_quota();

-- Index untuk query kuota cepat
CREATE INDEX IF NOT EXISTS idx_bookings_departure_status
  ON bookings(departure_id, status);

SELECT 'Migration 048 completed — booking seat lock + quota check trigger created' AS result;
