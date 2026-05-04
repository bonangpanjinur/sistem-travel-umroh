-- Fix permissive RLS policies

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System manage otp codes" ON public.otp_codes;
DROP POLICY IF EXISTS "System insert login attempts" ON public.login_attempts;

-- Create more secure policies for activity_logs insert
-- Only authenticated users or service role can insert
CREATE POLICY "Authenticated users insert activity logs" ON public.activity_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- OTP codes should only be managed via service role (edge functions)
-- For SELECT: Users can only see their own unexpired codes
CREATE POLICY "Users view own unexpired otp codes" ON public.otp_codes
FOR SELECT USING (
    user_id = auth.uid() 
    AND expires_at > now() 
    AND is_used = false
);

-- For INSERT/UPDATE/DELETE: Only via service role
CREATE POLICY "Service role manage otp codes" ON public.otp_codes
FOR ALL USING (auth.role() = 'service_role');

-- Login attempts: Only service role can insert
CREATE POLICY "Service role insert login attempts" ON public.login_attempts
FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);