-- Create function to update booking paid_amount when payment is verified
CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  total_paid NUMERIC;
  booking_total NUMERIC;
  new_payment_status payment_status;
BEGIN
  -- Calculate total paid amount from all verified payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payments
  WHERE booking_id = NEW.booking_id AND status = 'paid';

  -- Get booking total price
  SELECT total_price INTO booking_total
  FROM public.bookings
  WHERE id = NEW.booking_id;

  -- Determine payment status
  IF total_paid >= booking_total THEN
    new_payment_status := 'paid';
  ELSIF total_paid > 0 THEN
    new_payment_status := 'partial';
  ELSE
    new_payment_status := 'pending';
  END IF;

  -- Update booking with new paid amount and payment status
  UPDATE public.bookings
  SET 
    paid_amount = total_paid,
    payment_status = new_payment_status,
    updated_at = now()
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after payment insert or update
DROP TRIGGER IF EXISTS trigger_update_booking_paid_amount ON public.payments;
CREATE TRIGGER trigger_update_booking_paid_amount
  AFTER INSERT OR UPDATE OF status, amount ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_paid_amount();

-- Also fix existing data - update paid_amount for all bookings based on verified payments
UPDATE public.bookings b
SET 
  paid_amount = COALESCE((
    SELECT SUM(p.amount) 
    FROM public.payments p 
    WHERE p.booking_id = b.id AND p.status = 'paid'
  ), 0),
  payment_status = CASE 
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.booking_id = b.id AND p.status = 'paid'), 0) >= b.total_price THEN 'paid'::payment_status
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.booking_id = b.id AND p.status = 'paid'), 0) > 0 THEN 'partial'::payment_status
    ELSE 'pending'::payment_status
  END;