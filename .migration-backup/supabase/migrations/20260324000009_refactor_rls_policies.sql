-- Refactor RLS Policies for Multi-Branch and Granular Access

-- Create or replace has_role_in_branch function
CREATE OR REPLACE FUNCTION public.has_role_in_branch(_user_id UUID, _role app_role, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND branch_id = _branch_id
  );
END;
$$;


-- Drop existing RLS policies for public.customers
DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own data" ON public.customers;
DROP POLICY IF EXISTS "Agents can view customers they created" ON public.customers;

-- RLS Policies for public.customers
CREATE POLICY "Users can view own customers or customers in their branch" ON public.customers
FOR SELECT USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id))
  OR (created_by_agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent'))
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can insert own customers or admins/staff" ON public.customers
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND created_by_agent_id = auth.uid())
);

CREATE POLICY "Users can update own customers or admins/staff" ON public.customers
FOR UPDATE USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND created_by_agent_id = auth.uid())
);

CREATE POLICY "Admins can delete customers" ON public.customers
FOR DELETE USING (public.is_admin(auth.uid()));

-- Drop existing RLS policies for public.bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;

-- RLS Policies for public.bookings
CREATE POLICY "Users can view own bookings or bookings in their branch" ON public.bookings
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers WHERE customers.id = bookings.customer_id AND customers.user_id = auth.uid()) -- Customer dapat melihat data mereka sendiri
  OR public.is_admin(auth.uid()) -- Admin global dapat melihat semua
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id)) -- Manajer cabang melihat data cabangnya
  OR (agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent')) -- Agen melihat booking yang mereka buat
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'finance') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can create bookings in their branch or as admin" ON public.bookings
FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND agent_id = auth.uid())
);

CREATE POLICY "Users can update bookings in their branch or as admin" ON public.bookings
FOR UPDATE USING (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'finance') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND agent_id = auth.uid())
);

CREATE POLICY "Admins can delete bookings" ON public.bookings
FOR DELETE USING (public.is_admin(auth.uid()));

-- Drop existing RLS policies for public.leads
DROP POLICY IF EXISTS "Sales can view assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Sales can create leads" ON public.leads;
DROP POLICY IF EXISTS "Sales can update assigned leads" ON public.leads;

-- RLS Policies for public.leads
CREATE POLICY "Users can view own leads or leads in their branch" ON public.leads
FOR SELECT USING (
  assigned_to = auth.uid() -- User can view leads assigned to them
  OR public.is_admin(auth.uid()) -- Admin global dapat melihat semua
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id)) -- Manajer cabang melihat data cabangnya
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can create leads in their branch or as admin" ON public.leads
FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can update leads in their branch or as admin" ON public.leads
FOR UPDATE USING (
  assigned_to = auth.uid()
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Admins can delete leads" ON public.leads
FOR DELETE USING (public.is_admin(auth.uid()));

-- Drop existing RLS policies for public.payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;
DROP POLICY IF EXISTS "Finance can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Branch staff can view payments in their branch" ON public.payments;

-- RLS Policies for public.payments
CREATE POLICY "Users can view own payments or payments in their branch" ON public.payments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b JOIN public.customers c ON c.id = b.customer_id WHERE b.id = payments.booking_id AND c.user_id = auth.uid()) -- Customer dapat melihat data mereka sendiri
  OR public.is_admin(auth.uid()) -- Admin global dapat melihat semua
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id)) -- Manajer cabang melihat data cabangnya
  OR (public.has_role(auth.uid(), 'finance') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can upload payment proof or admins/finance" ON public.payments
FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'finance') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM public.bookings b JOIN public.customers c ON c.id = b.customer_id WHERE b.id = payments.booking_id AND c.user_id = auth.uid())
);

CREATE POLICY "Finance can manage payments in their branch or as admin" ON public.payments
FOR ALL USING (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'finance') AND branch_id = public.get_user_branch_id(auth.uid()))
);

-- Drop existing RLS policies for public.customer_documents
DROP POLICY IF EXISTS "Users can view own documents" ON public.customer_documents;
DROP POLICY IF EXISTS "Staff can view all documents" ON public.customer_documents;
DROP POLICY IF EXISTS "Users can upload own documents" ON public.customer_documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.customer_documents;
DROP POLICY IF EXISTS "Branch staff can view customer documents in their branch" ON public.customer_documents;

-- RLS Policies for public.customer_documents
CREATE POLICY "Users can view own documents or documents in their branch" ON public.customer_documents
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_documents.customer_id AND customers.user_id = auth.uid()) -- Customer dapat melihat data mereka sendiri
  OR public.is_admin(auth.uid()) -- Admin global dapat melihat semua
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id)) -- Manajer cabang melihat data cabangnya
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can upload own documents or admins/operational" ON public.customer_documents
FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_documents.customer_id AND customers.user_id = auth.uid())
);

CREATE POLICY "Admins can manage documents" ON public.customer_documents
FOR ALL USING (public.is_admin(auth.uid()));

-- Drop existing RLS policies for public.booking_passengers
DROP POLICY IF EXISTS "Users can view own booking passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Staff can view all passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;
DROP POLICY IF EXISTS "Branch staff can view booking passengers in their branch" ON public.booking_passengers;

-- RLS Policies for public.booking_passengers
CREATE POLICY "Users can view own booking passengers or passengers in their branch" ON public.booking_passengers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    JOIN public.customers c ON c.id = b.customer_id 
    WHERE b.id = booking_passengers.booking_id AND c.user_id = auth.uid()
  ) -- Customer dapat melihat data mereka sendiri
  OR public.is_admin(auth.uid()) -- Admin global dapat melihat semua
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id)) -- Manajer cabang melihat data cabangnya
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can insert passengers in their branch or as admin" ON public.booking_passengers
FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.bookings b 
    JOIN public.customers c ON c.id = b.customer_id 
    WHERE b.id = booking_passengers.booking_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage booking passengers" ON public.booking_passengers
FOR ALL USING (public.is_admin(auth.uid()));
