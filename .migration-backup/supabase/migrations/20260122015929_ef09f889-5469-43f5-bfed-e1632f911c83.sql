-- Fix permissive RLS policy for whatsapp_logs
DROP POLICY IF EXISTS "System can insert whatsapp logs" ON public.whatsapp_logs;

-- Create more restrictive insert policy - only authenticated users or service role
CREATE POLICY "Authenticated users can insert whatsapp logs"
ON public.whatsapp_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add service role policy for edge functions
CREATE POLICY "Service role can manage whatsapp logs"
ON public.whatsapp_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);