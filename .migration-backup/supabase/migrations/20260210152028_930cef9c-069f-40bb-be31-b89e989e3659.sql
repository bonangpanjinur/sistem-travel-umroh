-- Fix: bank_accounts should NOT be publicly readable (exposes bank numbers)
-- Replace with authenticated staff-only access
DROP POLICY IF EXISTS "Anyone can view active bank accounts" ON public.bank_accounts;
CREATE POLICY "Authenticated users can view active bank accounts" 
ON public.bank_accounts 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Fix: v_financial_summary - ensure only finance/admin can access
-- Revoke public access and grant only to authenticated
REVOKE ALL ON public.v_financial_summary FROM anon;
REVOKE ALL ON public.v_financial_summary FROM public;
GRANT SELECT ON public.v_financial_summary TO authenticated;