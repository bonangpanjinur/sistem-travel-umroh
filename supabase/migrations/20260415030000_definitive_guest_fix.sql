-- DEFINITIVE FIX FOR GUEST CHECKOUT RLS (RUN THIS IN SQL EDITOR IF MIGRATION FAILS)
-- This script ensures the 'anon' role can insert into all necessary tables for guest booking.

-- 1. CUSTOMERS: The primary source of the "new row violates row-level security policy" error.
-- We must drop all potential conflicting policies first.
DROP POLICY IF EXISTS "Allow guest and authenticated customer insert" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated customer insertion" ON public.customers;
DROP POLICY IF EXISTS "Allow guest to insert customer" ON public.customers;
DROP POLICY IF EXISTS "Unified customer insert policy" ON public.customers;
DROP POLICY IF EXISTS "Simple guest checkout insert" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers based on permissions" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers or admins/staff" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;

-- Create the definitive policy that explicitly includes 'anon'
CREATE POLICY "Definitive guest and auth customer insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL) -- Guest case
  OR (auth.uid() = user_id) -- Own record case
  OR public.is_admin(auth.uid()) -- Admin case
);

-- 2. BOOKINGS: Ensure guest can create the booking record
DROP POLICY IF EXISTS "Allow guest and authenticated booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest and authenticated booking insertion" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest to insert booking" ON public.bookings;
DROP POLICY IF EXISTS "Simple guest booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Unified booking insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings in their branch or as admin" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings based on permissions" ON public.bookings;

CREATE POLICY "Definitive guest and auth booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. BOOKING_PASSENGERS: Ensure guest can add passengers
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insertion" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest to insert booking passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Simple guest passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Unified passenger insert policy" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers in their branch or as admin" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;

CREATE POLICY "Definitive guest and auth passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. PAYMENTS: Ensure guest can initiate payment
DROP POLICY IF EXISTS "Allow guest and authenticated payment insert" ON public.payments;
DROP POLICY IF EXISTS "Allow guest and authenticated payment insertion" ON public.payments;
DROP POLICY IF EXISTS "Allow guest to insert payment" ON public.payments;
DROP POLICY IF EXISTS "Simple guest payment insert" ON public.payments;
DROP POLICY IF EXISTS "Unified payment insert policy" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments based on permissions" ON public.payments;

CREATE POLICY "Definitive guest and auth payment insert"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. PERMISSIONS: Explicitly grant INSERT to anon role
GRANT INSERT ON public.customers TO anon;
GRANT INSERT ON public.bookings TO anon;
GRANT INSERT ON public.booking_passengers TO anon;
GRANT INSERT ON public.payments TO anon;

-- Also ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 6. SCHEMA CACHE: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
