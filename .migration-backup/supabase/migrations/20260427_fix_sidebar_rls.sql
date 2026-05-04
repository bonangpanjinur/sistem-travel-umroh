-- Fix RLS for menu_items table to allow admins to manage sidebar
-- Date: 2026-04-27

-- Add policy to allow admins to insert/update/delete menu items
CREATE POLICY "Admins can manage menu items" ON public.menu_items
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Grant permissions if necessary (usually public schema is accessible by authenticated)
GRANT ALL ON public.menu_items TO authenticated;
