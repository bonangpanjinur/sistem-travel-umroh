-- Final Fix for Guest Checkout RLS and 401 Unauthorized
-- This migration ensures that unauthenticated users can perform checkout
-- and provides a clean, consolidated set of policies for all related tables.

-- 1. CLEANUP: Drop all known conflicting policies for customers
DROP POLICY IF EXISTS "Allow guest and authenticated customer insert" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated customer insertion" ON public.customers;
DROP POLICY IF EXISTS "Allow guest to insert customer" ON public.customers;
DROP POLICY IF EXISTS "Unified customer insert policy" ON public.customers;
DROP POLICY IF EXISTS "Simple guest checkout insert" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers based on permissions" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers or admins/staff" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;

-- 2. CREATE: Consolidated customer insert policy
CREATE POLICY "Allow guest and authenticated customer insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  -- Case 1: Guest checkout - user_id is NULL
  (user_id IS NULL)
  -- Case 2: Authenticated user - must be their own record
  OR (auth.uid() = user_id)
  -- Case 3: Admin/staff/agent can insert records based on their roles
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner', 'branch_manager', 'sales', 'agent')
  )
);

-- 3. BOOKINGS: Consolidated booking insert policy
DROP POLICY IF EXISTS "Allow guest and authenticated booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest and authenticated booking insertion" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest to insert booking" ON public.bookings;
DROP POLICY IF EXISTS "Simple guest booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Unified booking insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings in their branch or as admin" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Allow guest and authenticated booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. BOOKING_PASSENGERS: Consolidated passenger insert policy
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insertion" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest to insert booking passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Simple guest passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Unified passenger insert policy" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers in their branch or as admin" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;

CREATE POLICY "Allow guest and authenticated passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. PAYMENTS: Consolidated payment insert policy
DROP POLICY IF EXISTS "Allow guest and authenticated payment insert" ON public.payments;
DROP POLICY IF EXISTS "Allow guest and authenticated payment insertion" ON public.payments;
DROP POLICY IF EXISTS "Allow guest to insert payment" ON public.payments;
DROP POLICY IF EXISTS "Simple guest payment insert" ON public.payments;
DROP POLICY IF EXISTS "Unified payment insert policy" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;

CREATE POLICY "Allow guest and authenticated payment insert"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 6. WHATSAPP LOGS: Allow system to log notifications triggered by guests
DROP POLICY IF EXISTS "Allow guest to insert notification logs" ON public.whatsapp_notification_logs;
CREATE POLICY "Allow guest to insert notification logs"
ON public.whatsapp_notification_logs FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 7. Grant necessary permissions to anon role
GRANT INSERT ON public.customers TO anon;
GRANT INSERT ON public.bookings TO anon;
GRANT INSERT ON public.booking_passengers TO anon;
GRANT INSERT ON public.payments TO anon;
GRANT INSERT ON public.whatsapp_notification_logs TO anon;

-- Also grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 8. Add documentation comments
COMMENT ON POLICY "Allow guest and authenticated customer insert" ON public.customers 
IS 'Allows both guest (anonymous) and authenticated users to insert customer records. Guests can only insert records with user_id=NULL. Authenticated users must insert their own records or be admins/staff.';

COMMENT ON POLICY "Allow guest and authenticated booking insert" ON public.bookings 
IS 'Allows both guest and authenticated users to insert booking records. Used for guest checkout feature.';
