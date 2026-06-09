-- Migration 033: Auto-trigger P&L recalculation on bookings & payments
-- Menggantikan klik manual "Hitung Ulang" — P&L departure selalu akurat

-- ── Function: triggered by booking changes ───────────────────────────────────
CREATE OR REPLACE FUNCTION trg_refresh_departure_pl()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.departure_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(NEW.departure_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the original operation — P&L can be stale, data must not be lost
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_refresh_pl ON bookings;
CREATE TRIGGER trg_booking_refresh_pl
  AFTER INSERT OR UPDATE OF status, total_price, departure_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_departure_pl();

-- ── Function: triggered by payment changes ───────────────────────────────────
CREATE OR REPLACE FUNCTION trg_payment_refresh_departure_pl()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_dep_id UUID;
BEGIN
  SELECT departure_id INTO v_dep_id
    FROM bookings
   WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  IF v_dep_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(v_dep_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_refresh_pl ON payments;
CREATE TRIGGER trg_payment_refresh_pl
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_payment_refresh_departure_pl();
