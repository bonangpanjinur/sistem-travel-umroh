-- Patch trigger function: explicitly avoid touching generated column
-- and harden against any edge case that could trigger
-- "column 'remaining_amount' can only be updated to DEFAULT"
CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_paid NUMERIC;
  booking_total NUMERIC;
  new_payment_status payment_status;
BEGIN
  -- Sum verified payments for this booking
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payments
  WHERE booking_id = NEW.booking_id AND status = 'paid';

  SELECT total_price INTO booking_total
  FROM public.bookings
  WHERE id = NEW.booking_id;

  IF booking_total IS NULL THEN
    RETURN NEW;
  END IF;

  IF total_paid >= booking_total THEN
    new_payment_status := 'paid';
  ELSIF total_paid > 0 THEN
    new_payment_status := 'partial';
  ELSE
    new_payment_status := 'pending';
  END IF;

  -- Explicit column list (NEVER includes generated remaining_amount)
  UPDATE public.bookings
  SET 
    paid_amount = total_paid,
    payment_status = new_payment_status,
    updated_at = now()
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$function$;