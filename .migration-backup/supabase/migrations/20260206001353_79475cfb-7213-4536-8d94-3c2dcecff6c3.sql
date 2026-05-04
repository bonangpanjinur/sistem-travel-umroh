-- Fix overly permissive RLS policies on whatsapp_logs
DROP POLICY IF EXISTS "Authenticated users can insert whatsapp logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Service role can manage whatsapp logs" ON public.whatsapp_logs;

-- Create proper policies
CREATE POLICY "Admins can manage whatsapp logs"
ON public.whatsapp_logs FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert their whatsapp logs"
ON public.whatsapp_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);