-- Fix the payment verification logic to strictly only include 'verified' or 'paid' status in paid_amount calculation.
-- This ensures that 'failed', 'rejected', or 'pending' payments do not affect the booking balance.

-- 1. Update the function to strictly filter by 'paid' OR 'verified' status
CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  total_paid NUMERIC;
  booking_total NUMERIC;
  new_payment_status payment_status;
BEGIN
  -- Calculate total paid amount ONLY from 'paid' OR 'verified' payments
  -- This explicitly ignores 'failed', 'rejected', or 'pending' payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payments
  WHERE booking_id = NEW.booking_id AND status IN ('paid', 'verified');

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

-- 2. Fix existing data - recalculate paid_amount for all bookings based ONLY on 'paid' or 'verified' payments
UPDATE public.bookings b
SET 
  paid_amount = COALESCE((
    SELECT SUM(p.amount) 
    FROM public.payments p 
    WHERE p.booking_id = b.id AND p.status IN ('paid', 'verified')
  ), 0),
  payment_status = CASE 
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.booking_id = b.id AND p.status IN ('paid', 'verified')), 0) >= b.total_price THEN 'paid'::payment_status
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.booking_id = b.id AND p.status IN ('paid', 'verified')), 0) > 0 THEN 'partial'::payment_status
    ELSE 'pending'::payment_status
  END;
