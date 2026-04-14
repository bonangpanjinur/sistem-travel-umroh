-- Fix RLS for Guest Checkout
-- This migration allows anonymous users (not logged in) to create customer and booking records.
-- This is necessary for the "Booking Tanpa Login" feature.

-- 1. Allow anonymous inserts for customers
-- We allow insertion when user_id is NULL (guest) or matches auth.uid()
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
CREATE POLICY "Allow guest and authenticated customer insertion"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR is_admin(auth.uid()));

-- 2. Allow anonymous inserts for bookings
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Allow guest and authenticated booking insertion"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. Allow anonymous inserts for booking_passengers
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;
CREATE POLICY "Allow guest and authenticated passenger insertion"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. Allow anonymous inserts for payments (for uploading proof after guest booking)
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;
CREATE POLICY "Allow guest and authenticated payment insertion"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. Add comments for clarity
COMMENT ON POLICY "Allow guest and authenticated customer insertion" ON public.customers IS 'Memungkinkan tamu (anonim) dan pengguna terautentikasi untuk membuat data pelanggan.';
COMMENT ON POLICY "Allow guest and authenticated booking insertion" ON public.bookings IS 'Memungkinkan tamu (anonim) dan pengguna terautentikasi untuk membuat data booking.';
