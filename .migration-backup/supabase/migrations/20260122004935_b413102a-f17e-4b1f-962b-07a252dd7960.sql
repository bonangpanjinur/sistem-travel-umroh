-- Fix infinite recursion in customers RLS policies
-- The issue is policies that reference bookings which reference back to customers

-- Drop problematic policies
DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;
DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Agents can view customers from their bookings" ON public.customers;
DROP POLICY IF EXISTS "Agents can update customers from their bookings" ON public.customers;

-- Recreate policies without recursive references

-- Customers can view their own data (direct user_id check, no recursion)
CREATE POLICY "Customers can view own data" 
ON public.customers 
FOR SELECT 
USING (auth.uid() = user_id);

-- Customers can update their own data
CREATE POLICY "Customers can update own data" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Customers/admins can insert data
CREATE POLICY "Customers can insert own data" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- Staff can view all customers
CREATE POLICY "Staff can view all customers" 
ON public.customers 
FOR SELECT 
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'sales'::app_role) 
  OR has_role(auth.uid(), 'operational'::app_role)
);

-- Admins can manage (update) all customers
CREATE POLICY "Admins can update all customers"
ON public.customers
FOR UPDATE
USING (is_admin(auth.uid()));

-- Create a security definer function to check if agent can access customer
CREATE OR REPLACE FUNCTION public.agent_can_access_customer(_customer_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.booking_passengers bp
    JOIN public.bookings b ON b.id = bp.booking_id
    JOIN public.agents a ON a.id = b.agent_id
    WHERE bp.customer_id = _customer_id 
      AND a.user_id = _user_id
  )
$$;

-- Agents can view customers from their bookings (using security definer function)
CREATE POLICY "Agents can view customers from their bookings" 
ON public.customers 
FOR SELECT 
USING (public.agent_can_access_customer(id, auth.uid()));

-- Agents can update customers from their bookings (using security definer function)
CREATE POLICY "Agents can update customers from their bookings" 
ON public.customers 
FOR UPDATE 
USING (public.agent_can_access_customer(id, auth.uid()));