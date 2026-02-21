
-- Fix RLS Recursion: Drop problematic policies and replace with SECURITY DEFINER function-based ones

-- ============ PAYMENTS ============
-- Drop recursive policy
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

-- Create new policy using SECURITY DEFINER function
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  public.user_owns_booking(booking_id, auth.uid())
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'operational')
);

-- ============ BOOKING_STATUS_HISTORY ============
DROP POLICY IF EXISTS "Users can view own booking history" ON public.booking_status_history;

CREATE POLICY "Users can view own booking history"
ON public.booking_status_history
FOR SELECT
TO authenticated
USING (
  public.user_owns_booking(booking_id, auth.uid())
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'operational')
);

-- ============ CUSTOMER_DOCUMENTS ============
-- Drop recursive user policy
DROP POLICY IF EXISTS "Users can view own documents" ON public.customer_documents;

CREATE POLICY "Users can view own documents"
ON public.customer_documents
FOR SELECT
TO authenticated
USING (
  public.get_customer_user_id(customer_id) = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'operational')
);

-- Drop recursive agent view policy
DROP POLICY IF EXISTS "Agents can view customer documents" ON public.customer_documents;

CREATE POLICY "Agents can view customer documents"
ON public.customer_documents
FOR SELECT
TO authenticated
USING (
  public.agent_can_access_customer(customer_id, auth.uid())
);

-- Drop recursive agent update policy  
DROP POLICY IF EXISTS "Agents can update customer documents" ON public.customer_documents;

CREATE POLICY "Agents can update customer documents"
ON public.customer_documents
FOR UPDATE
TO authenticated
USING (
  public.agent_can_access_customer(customer_id, auth.uid())
);
