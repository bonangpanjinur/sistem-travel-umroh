-- RBAC Improvements Phase 3: RLS Layer Refactor
-- Berdasarkan Rencana Strategis Perbaikan Sistem RBAC

-- ==========================================
-- 1. FUNGSI HELPER BARU (Jika Belum Ada)
-- ==========================================

-- Memastikan fungsi is_super_admin menggunakan logika yang konsisten
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Memastikan fungsi is_admin mencakup super_admin dan owner
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'owner')
  )
$$;

-- ==========================================
-- 2. REFAKTOR POLICY: CUSTOMERS
-- ==========================================

DROP POLICY IF EXISTS "Users can view own customers or customers in their branch" ON public.customers;
DROP POLICY IF EXISTS "Admins and operational can delete customers" ON public.customers;

CREATE POLICY "Users can view own customers or staff/admin" ON public.customers
FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR public.is_admin(auth.uid())
  OR auth.uid() = user_id
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role(auth.uid(), 'branch_manager'))
  OR (created_by_agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent'))
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Admins and branch managers can delete customers" ON public.customers
FOR DELETE USING (
  public.is_admin(auth.uid())
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role(auth.uid(), 'branch_manager'))
);

-- ==========================================
-- 3. REFAKTOR POLICY: BOOKINGS
-- ==========================================

DROP POLICY IF EXISTS "Users can view own bookings or bookings in their branch" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

CREATE POLICY "Users can view bookings based on permissions" ON public.bookings
FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.customers WHERE customers.id = bookings.customer_id AND customers.user_id = auth.uid())
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role(auth.uid(), 'branch_manager'))
  OR (agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent'))
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'finance') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Admins and branch managers can delete bookings" ON public.bookings
FOR DELETE USING (
  public.is_admin(auth.uid())
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role(auth.uid(), 'branch_manager'))
);

-- ==========================================
-- 4. REFAKTOR POLICY: DEPARTURES
-- ==========================================

DROP POLICY IF EXISTS "Departures are viewable by everyone" ON public.departures;
DROP POLICY IF EXISTS "Departures are manageable by admins" ON public.departures;

CREATE POLICY "Departures are viewable by authenticated users" ON public.departures
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Departures are manageable by staff and admins" ON public.departures
FOR ALL USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'operational')
  OR public.has_role(auth.uid(), 'branch_manager')
);

-- ==========================================
-- 5. REFAKTOR POLICY: PAYMENTS
-- ==========================================

DROP POLICY IF EXISTS "Users can view own payments or payments in their branch" ON public.payments;

CREATE POLICY "Users can view payments based on permissions" ON public.payments
FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.bookings b JOIN public.customers c ON c.id = b.customer_id WHERE b.id = payments.booking_id AND c.user_id = auth.uid())
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role(auth.uid(), 'branch_manager'))
  OR (public.has_role(auth.uid(), 'finance') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);
