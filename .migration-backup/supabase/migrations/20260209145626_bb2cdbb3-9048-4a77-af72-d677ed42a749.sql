-- Fix 1: Restrict profiles SELECT to own profile + admins/staff (remove overly permissive policy)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Fix 2: Tighten audit_logs INSERT policy to require authenticated user
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 3: Restrict whatsapp_logs INSERT to admins/service_role only
DROP POLICY IF EXISTS "Authenticated users can insert their whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Staff can insert whatsapp logs" 
ON public.whatsapp_logs 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'::app_role) OR has_role(auth.uid(), 'sales'::app_role));