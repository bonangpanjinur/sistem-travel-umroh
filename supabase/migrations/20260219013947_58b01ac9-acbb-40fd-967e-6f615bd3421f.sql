
-- Drop the duplicate policy and recreate if needed
DROP POLICY IF EXISTS "Admins can manage website settings" ON public.website_settings;
CREATE POLICY "Admins can manage all website settings" ON public.website_settings FOR ALL USING (public.is_admin(auth.uid()));
