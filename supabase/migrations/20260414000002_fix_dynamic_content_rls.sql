-- Fix RLS policies for dynamic content tables to allow admins to manage them
-- The previous policies relied on website_settings.user_id which might not be set for all admins

-- 1. About Page Content
DROP POLICY IF EXISTS "Insert about content" ON public.about_page_content;
DROP POLICY IF EXISTS "Update own about content" ON public.about_page_content;
DROP POLICY IF EXISTS "Delete own about content" ON public.about_page_content;

CREATE POLICY "Admins can manage about content"
ON public.about_page_content
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 2. Contact Page Content
DROP POLICY IF EXISTS "Insert contact content" ON public.contact_page_content;
DROP POLICY IF EXISTS "Update own contact content" ON public.contact_page_content;
DROP POLICY IF EXISTS "Delete own contact content" ON public.contact_page_content;

CREATE POLICY "Admins can manage contact content"
ON public.contact_page_content
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3. Savings Page Content
DROP POLICY IF EXISTS "Insert savings content" ON public.savings_page_content;
DROP POLICY IF EXISTS "Update own savings content" ON public.savings_page_content;
DROP POLICY IF EXISTS "Delete own savings content" ON public.savings_page_content;

CREATE POLICY "Admins can manage savings content"
ON public.savings_page_content
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
