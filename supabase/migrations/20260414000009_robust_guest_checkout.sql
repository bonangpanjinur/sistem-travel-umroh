-- Robust Guest Checkout Policies
-- This migration ensures that unauthenticated users (anon) can perform checkout
-- by providing explicit permissions for all tables involved in the booking process.

-- 1. CUSTOMERS: Allow anyone to insert a customer record
-- We check for user_id IS NULL for guests, or auth.uid() = user_id for logged-in users.
DROP POLICY IF EXISTS "Allow guest and authenticated customer insert" ON public.customers;
DROP POLICY IF EXISTS "Allow guest to insert customer" ON public.customers;
CREATE POLICY "Allow guest and authenticated customer insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.role() = 'anon' AND user_id IS NULL)
  OR (auth.role() = 'authenticated' AND (auth.uid() = user_id OR user_id IS NULL))
  OR public.is_admin(auth.uid())
);

-- 2. BOOKINGS: Allow anyone to insert a booking
DROP POLICY IF EXISTS "Allow guest and authenticated booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest to insert booking" ON public.bookings;
CREATE POLICY "Allow guest and authenticated booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. BOOKING_PASSENGERS: Allow anyone to insert passengers
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest to insert booking passengers" ON public.booking_passengers;
CREATE POLICY "Allow guest and authenticated passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. PAYMENTS: Allow anyone to insert initial payment record
DROP POLICY IF EXISTS "Allow guest and authenticated payment insert" ON public.payments;
DROP POLICY IF EXISTS "Allow guest to insert payment" ON public.payments;
CREATE POLICY "Allow guest and authenticated payment insert"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. WHATSAPP LOGS: Allow system to log notifications triggered by guests
DROP POLICY IF EXISTS "Allow guest to insert notification logs" ON public.whatsapp_notification_logs;
CREATE POLICY "Allow guest to insert notification logs"
ON public.whatsapp_notification_logs FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 6. Grant necessary permissions to anon role
GRANT INSERT ON public.customers TO anon;
GRANT INSERT ON public.bookings TO anon;
GRANT INSERT ON public.booking_passengers TO anon;
GRANT INSERT ON public.payments TO anon;
GRANT INSERT ON public.whatsapp_notification_logs TO anon;

-- Also grant usage on sequences if any (usually handled by Supabase, but safe to include)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
