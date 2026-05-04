-- Fix infinite recursion in bookings RLS policies
-- The issue is that policies reference customers which may reference back to bookings

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;

-- Recreate policies without recursive references
-- Users can view their own bookings (simplified - use customer_id directly linked to user)
CREATE POLICY "Users can view own bookings" 
ON public.bookings 
FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE user_id = auth.uid()
  )
);

-- Staff can view all bookings
CREATE POLICY "Staff can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'sales'::app_role) 
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'operational'::app_role)
);

-- Agents can view bookings they referred
CREATE POLICY "Agents can view their bookings" 
ON public.bookings 
FOR SELECT 
USING (
  agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);

-- Users can create bookings
CREATE POLICY "Users can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can manage (update/delete) bookings
CREATE POLICY "Admins can manage bookings" 
ON public.bookings 
FOR ALL 
USING (is_admin(auth.uid()));

-- Also fix booking_passengers policies if they have similar issues
DROP POLICY IF EXISTS "Users can view own booking passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Staff can view all passengers" ON public.booking_passengers;

-- Users can view passengers from their bookings
CREATE POLICY "Users can view own booking passengers" 
ON public.booking_passengers 
FOR SELECT 
USING (
  booking_id IN (
    SELECT b.id FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE c.user_id = auth.uid()
  )
);

-- Staff can view all passengers
CREATE POLICY "Staff can view all passengers" 
ON public.booking_passengers 
FOR SELECT 
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'sales'::app_role) 
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'operational'::app_role)
);

-- Agents can view passengers from their bookings
CREATE POLICY "Agents can view their booking passengers" 
ON public.booking_passengers 
FOR SELECT 
USING (
  booking_id IN (
    SELECT id FROM public.bookings WHERE agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
);