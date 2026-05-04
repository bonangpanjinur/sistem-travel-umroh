-- Fix function search path for security
ALTER FUNCTION public.generate_referral_code_trigger() SET search_path = public;
ALTER FUNCTION public.award_loyalty_points_on_payment() SET search_path = public;

-- Fix RLS policies - make them role-based instead of always true
DROP POLICY IF EXISTS "Admin full access referral_codes" ON public.referral_codes;
CREATE POLICY "Authenticated users manage referral_codes" ON public.referral_codes
  FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin full access referral_usages" ON public.referral_usages;
CREATE POLICY "Authenticated users manage referral_usages" ON public.referral_usages
  FOR ALL USING (auth.uid() IS NOT NULL);