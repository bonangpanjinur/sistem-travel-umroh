-- Force Cleanup and Allow Guest Checkout RLS
-- This migration aggressively drops all potential conflicting policies and ensures guest access.

-- 1. CLEANUP: Drop all known previous policies for customers to avoid conflicts
DROP POLICY IF EXISTS "Allow guest and authenticated customer insertion" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers based on permissions" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers or admins/staff" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;

-- 2. CREATE: New unified insert policy for customers
-- This allows:
-- a) Guests (anon) where user_id is NULL
-- b) Authenticated users for themselves (user_id = auth.uid())
-- c) Admins/Staff/Agents based on their roles
CREATE POLICY "Unified customer insert policy"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.role() = 'anon' AND user_id IS NULL)
  OR (auth.uid() = user_id)
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales'))
  OR (public.has_role(auth.uid(), 'agent'))
);

-- 3. CLEANUP & CREATE: Bookings
DROP POLICY IF EXISTS "Allow guest and authenticated booking insertion" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings based on permissions" ON public.bookings;

CREATE POLICY "Unified booking insert policy"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. CLEANUP & CREATE: Booking Passengers
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insertion" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;

CREATE POLICY "Unified passenger insert policy"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. CLEANUP & CREATE: Payments
DROP POLICY IF EXISTS "Allow guest and authenticated payment insertion" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;

CREATE POLICY "Unified payment insert policy"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 6. Add comments
COMMENT ON POLICY "Unified customer insert policy" ON public.customers IS 'Kebijakan tunggal untuk insert customer, mendukung guest checkout dan user terautentikasi.';
