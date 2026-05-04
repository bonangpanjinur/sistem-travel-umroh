-- Fix overly permissive RLS policy on email_logs
DROP POLICY IF EXISTS "Service can insert email logs" ON public.email_logs;

-- Create proper policy for email_logs insert (only from authenticated requests or service role)
CREATE POLICY "Authenticated users can log emails"
ON public.email_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Also allow admins to insert
CREATE POLICY "Admins can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));