-- =============================================================================
-- FASE 24 — Trigger: sync booking paid_amount / remaining_amount / payment_status
-- Fires on INSERT, UPDATE, DELETE of any row in the payments table.
-- Counts only payments with status IN ('paid', 'verified').
-- =============================================================================

-- ─── Trigger function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_booking_payment_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_booking_id   UUID;
  v_total_price  NUMERIC;
  v_paid_amount  NUMERIC;
  v_remaining    NUMERIC;
  v_pay_status   TEXT;
BEGIN
  -- Determine the affected booking_id from OLD or NEW row
  IF TG_OP = 'DELETE' THEN
    v_booking_id := OLD.booking_id;
  ELSE
    v_booking_id := NEW.booking_id;
  END IF;

  -- Nothing to do if no booking is linked
  IF v_booking_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Fetch the booking's total price
  SELECT total_price INTO v_total_price
  FROM bookings
  WHERE id = v_booking_id;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum only confirmed payments
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
  FROM payments
  WHERE booking_id = v_booking_id
    AND status IN ('paid', 'verified');

  v_remaining := GREATEST(0, v_total_price - v_paid_amount);

  v_pay_status :=
    CASE
      WHEN v_paid_amount >= v_total_price AND v_total_price > 0 THEN 'paid'
      WHEN v_paid_amount > 0                                    THEN 'partial'
      ELSE                                                           'pending'
    END;

  UPDATE bookings
  SET
    paid_amount      = v_paid_amount,
    remaining_amount = v_remaining,
    payment_status   = v_pay_status
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── Attach trigger to payments table ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_booking_payment_totals ON payments;

CREATE TRIGGER trg_sync_booking_payment_totals
  AFTER INSERT OR UPDATE OF amount, status OR DELETE
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_payment_totals();

-- =============================================================================
SELECT 'Fase 24 — payment sync trigger installed' AS result;
