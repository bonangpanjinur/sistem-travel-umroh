-- BUG 1: Add UPDATE RLS policy for booking_passengers
CREATE POLICY "Staff can update passengers"
ON public.booking_passengers FOR UPDATE
TO public
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'::app_role))
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'::app_role));

-- BUG 7: Update booking_code default to use parameterized version, then drop old function
ALTER TABLE public.bookings ALTER COLUMN booking_code SET DEFAULT '';
DROP FUNCTION IF EXISTS public.generate_booking_code();
