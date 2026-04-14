-- Fix Guest Checkout RLS Policy
-- This migration resolves the "new row violates row-level security policy for table customers" error
-- by ensuring a clear, non-conflicting RLS policy that allows guest checkout

-- ============================================================================
-- 1. CLEANUP: Drop all conflicting policies for customers
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated customer insertion" ON public.customers;
DROP POLICY IF EXISTS "Unified customer insert policy" ON public.customers;
DROP POLICY IF EXISTS "Simple guest checkout insert" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers or admins/staff" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;

-- ============================================================================
-- 2. CREATE: Clear and explicit policy for guest checkout
-- ============================================================================
CREATE POLICY "Allow guest and authenticated customer insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  -- Case 1: Guest checkout - user_id is NULL
  user_id IS NULL
  -- Case 2: Authenticated user - must be their own record
  OR auth.uid() = user_id
  -- Case 3: Admin/staff can insert any record
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner', 'branch_manager', 'admin')
  )
);

-- ============================================================================
-- 3. CLEANUP & CREATE: Bookings policies
-- ============================================================================
DROP POLICY IF EXISTS "Simple guest booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Unified booking insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings in their branch or as admin" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Allow guest and authenticated booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- ============================================================================
-- 4. CLEANUP & CREATE: Booking Passengers policies
-- ============================================================================
DROP POLICY IF EXISTS "Simple guest passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Unified passenger insert policy" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers in their branch or as admin" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;

CREATE POLICY "Allow guest and authenticated passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- ============================================================================
-- 5. CLEANUP & CREATE: Payments policies
-- ============================================================================
DROP POLICY IF EXISTS "Simple guest payment insert" ON public.payments;
DROP POLICY IF EXISTS "Unified payment insert policy" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;

CREATE POLICY "Allow guest and authenticated payment insert"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- ============================================================================
-- 6. Add comments for documentation
-- ============================================================================
COMMENT ON POLICY "Allow guest and authenticated customer insert" ON public.customers 
IS 'Allows both guest (anonymous) and authenticated users to insert customer records. Guests can only insert records with user_id=NULL. Authenticated users must insert their own records or be admins.';

COMMENT ON POLICY "Allow guest and authenticated booking insert" ON public.bookings 
IS 'Allows both guest and authenticated users to insert booking records. Used for guest checkout feature.';

COMMENT ON POLICY "Allow guest and authenticated passenger insert" ON public.booking_passengers 
IS 'Allows both guest and authenticated users to insert booking passenger records. Used for guest checkout feature.';

COMMENT ON POLICY "Allow guest and authenticated payment insert" ON public.payments 
IS 'Allows both guest and authenticated users to insert payment records. Used for guest checkout feature.';
