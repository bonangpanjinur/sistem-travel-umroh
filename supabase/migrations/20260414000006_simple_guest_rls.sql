-- SIMPLE GUEST CHECKOUT RLS FIX
-- This migration uses the most basic logic to allow guest checkout, 
-- avoiding any complex functions that might fail for anonymous users.

-- 1. Drop ALL existing insert policies for customers to ensure a clean slate
DROP POLICY IF EXISTS "Unified customer insert policy" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated customer insertion" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers based on permissions" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers or admins/staff" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;

-- 2. Create the simplest possible insert policy for customers
-- Logic: If it's a guest (user_id is null), allow it. If it's a user, allow if they are setting their own ID.
-- We also allow admins to insert any record.
CREATE POLICY "Simple guest checkout insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  user_id IS NULL 
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner', 'branch_manager')
  )
);

-- 3. Ensure Bookings also have a simple policy
DROP POLICY IF EXISTS "Unified booking insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest and authenticated booking insertion" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings based on permissions" ON public.bookings;

CREATE POLICY "Simple guest booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. Ensure Booking Passengers also have a simple policy
DROP POLICY IF EXISTS "Unified passenger insert policy" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insertion" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;

CREATE POLICY "Simple guest passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. Ensure Payments also have a simple policy
DROP POLICY IF EXISTS "Unified payment insert policy" ON public.payments;
DROP POLICY IF EXISTS "Allow guest and authenticated payment insertion" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;

CREATE POLICY "Simple guest payment insert"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);
