-- FIX GUEST CHECKOUT RLS POLICIES
-- This script ensures the 'anon' role can insert into necessary tables for guest booking.
-- These policies were previously broken by migrations that added (auth.uid() IS NOT NULL) checks.

-- 1. CUSTOMERS: Allow guests to create customer records
DROP POLICY IF EXISTS "Definitive guest and auth customer insert" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated customer insert" ON public.customers;

CREATE POLICY "Allow guest and authenticated customer insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL) -- Guest case
  OR (auth.uid() = user_id) -- Own record case
  OR public.is_admin(auth.uid()) -- Admin case
);

-- 2. BOOKINGS: Allow guests to create booking records
DROP POLICY IF EXISTS "Definitive guest and auth booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest and authenticated booking insert" ON public.bookings;

CREATE POLICY "Allow guest and authenticated booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. BOOKING_PASSENGERS: Allow guests to add passengers
DROP POLICY IF EXISTS "Definitive guest and auth passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insert" ON public.booking_passengers;

CREATE POLICY "Allow guest and authenticated passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. PAYMENTS: Allow guests to initiate payment
DROP POLICY IF EXISTS "Definitive guest and auth payment insert" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;
DROP POLICY IF EXISTS "Allow guest and authenticated payment insert" ON public.payments;

CREATE POLICY "Allow guest and authenticated payment insert"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. NOTIFICATIONS: Allow guest-triggered notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Allow guest and auth notification insert"
ON public.notifications FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 6. PERMISSIONS: Explicitly grant INSERT to anon role
GRANT INSERT ON public.customers TO anon;
GRANT INSERT ON public.bookings TO anon;
GRANT INSERT ON public.booking_passengers TO anon;
GRANT INSERT ON public.payments TO anon;
GRANT INSERT ON public.notifications TO anon;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
