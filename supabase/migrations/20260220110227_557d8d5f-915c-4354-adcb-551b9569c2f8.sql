
-- ============================================================
-- FIX: Infinite Recursion in RLS policies
-- customers <-> bookings <-> booking_passengers circular refs
-- ============================================================

-- 1. SECURITY DEFINER helper functions (bypass RLS internally)

CREATE OR REPLACE FUNCTION public.get_customer_user_id(_customer_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.customers WHERE id = _customer_id;
$$;

CREATE OR REPLACE FUNCTION public.get_booking_customer_ids_for_user(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(c.id), '{}')
  FROM public.customers c
  WHERE c.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_booking(_booking_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.id = _booking_id AND c.user_id = _user_id
  );
$$;

-- 2. Drop problematic policies on CUSTOMERS

DROP POLICY IF EXISTS "Sales can view relevant customers" ON public.customers;
DROP POLICY IF EXISTS "Agents can view customers from their bookings" ON public.customers;

-- 3. Drop problematic policies on BOOKINGS

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can view all bookings" ON public.bookings;

-- 4. Drop problematic policies on BOOKING_PASSENGERS

DROP POLICY IF EXISTS "Users can view own booking passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Agents can view their booking passengers" ON public.booking_passengers;

-- 5. Recreate CUSTOMERS policies (no cross-table query in RLS)

CREATE POLICY "Sales can view relevant customers" ON public.customers
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'sales')
  AND (
    branch_id = public.get_user_branch_id(auth.uid())
    OR branch_id IS NULL
  )
);

CREATE POLICY "Agents can view customers from their bookings" ON public.customers
FOR SELECT TO authenticated
USING (
  public.agent_can_access_customer(id, auth.uid())
);

-- 6. Recreate BOOKINGS policy using helper function

CREATE POLICY "Users can view own bookings" ON public.bookings
FOR SELECT TO authenticated
USING (
  customer_id = ANY(public.get_booking_customer_ids_for_user(auth.uid()))
);

-- 7. Recreate BOOKING_PASSENGERS policies using helper functions

CREATE POLICY "Users can view own booking passengers" ON public.booking_passengers
FOR SELECT TO authenticated
USING (
  public.user_owns_booking(booking_id, auth.uid())
);

CREATE POLICY "Agents can view their booking passengers" ON public.booking_passengers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.user_id = auth.uid()
      AND a.id = (
        SELECT b.agent_id FROM public.bookings b WHERE b.id = booking_id
      )
  )
);
