-- Enhanced Granular Permissions Implementation
-- Sesuai dengan dokumen petunjuk perbaikan dan pengembangan hak akses

-- =====================================================
-- 1. ENHANCED PERMISSIONS_LIST
-- =====================================================

-- Tambahkan izin granular yang lebih spesifik
INSERT INTO public.permissions_list (key, label, group_name, description, icon_name) VALUES
-- Booking - View Granular (view_all, view_branch, view_own)
('bookings.view_all', 'Lihat Semua Booking', 'Booking', 'Melihat semua booking dari semua cabang/agen', 'CalendarEye'),
('bookings.view_branch', 'Lihat Booking Cabang', 'Booking', 'Melihat booking yang terkait dengan cabang pengguna', 'CalendarBranch'),
('bookings.view_own', 'Lihat Booking Sendiri', 'Booking', 'Melihat booking yang terkait dengan diri sendiri (sebagai agen)', 'CalendarUser'),
('bookings.approve', 'Setujui Booking', 'Booking', 'Menyetujui atau mengonfirmasi booking', 'CalendarCheck'),

-- Payment - View Granular (view_all, view_branch, view_own)
('payments.view_all', 'Lihat Semua Pembayaran', 'Pembayaran', 'Melihat semua riwayat pembayaran', 'CreditCardEye'),
('payments.view_branch', 'Lihat Pembayaran Cabang', 'Pembayaran', 'Melihat pembayaran yang terkait dengan cabang pengguna', 'CreditCardBranch'),
('payments.view_own', 'Lihat Pembayaran Sendiri', 'Pembayaran', 'Melihat pembayaran yang terkait dengan booking milik agen', 'CreditCardUser'),
('payments.refund', 'Proses Pengembalian Dana', 'Pembayaran', 'Melakukan proses pengembalian dana', 'CreditCardRefund'),

-- Customer - Sensitive Data
('customers.edit_sensitive', 'Edit Data Sensitif', 'Pelanggan', 'Mengubah data paspor/NIK', 'UserShield'),

-- Operational - Specific Actions
('operational.manifest', 'Kelola Manifest', 'Operasional', 'Mengelola manifest keberangkatan', 'FileList'),
('operational.visa', 'Update Status Visa', 'Operasional', 'Update status pengurusan visa', 'FileCheck'),

-- Equipment - Specific Actions
('equipment.inventory', 'Kelola Stok Perlengkapan', 'Perlengkapan', 'Kelola stok perlengkapan (kain ihram, tas)', 'Package'),
('equipment.distribute', 'Catat Serah Terima', 'Perlengkapan', 'Catat serah terima perlengkapan ke jamaah', 'PackageCheck'),

-- Finance - Reports
('finance.reports', 'Laporan Laba Rugi', 'Keuangan', 'Mengakses laporan laba rugi', 'ChartLine'),

-- Dashboard & Analytics
('dashboard.view', 'Lihat Dashboard', 'Dashboard', 'Akses halaman dashboard utama', 'LayoutDashboard'),
('analytics.view', 'Lihat Analytics', 'Analytics', 'Lihat analitik dan statistik', 'BarChart3')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. UPDATE ROLE_PERMISSIONS SESUAI MATRIKS DOKUMEN
-- =====================================================

-- BRANCH MANAGER - Pembatasan Akses (Read-Only + Limited Edit)
-- Booking
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('branch_manager', 'bookings.view_branch', true),
('branch_manager', 'bookings.view_all', false),
('branch_manager', 'bookings.view_own', false),
('branch_manager', 'bookings.create', true),
('branch_manager', 'bookings.edit', true),  -- Hanya untuk cabang mereka
('branch_manager', 'bookings.delete', false),  -- DITOLAK
('branch_manager', 'bookings.approve', false)  -- DITOLAK
ON CONFLICT (role, permission_key) DO NOTHING;

-- Payment
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('branch_manager', 'payments.view_branch', true),
('branch_manager', 'payments.view_all', false),
('branch_manager', 'payments.view_own', false),
('branch_manager', 'payments.create', true),
('branch_manager', 'payments.edit', true),
('branch_manager', 'payments.delete', false),  -- DITOLAK
('branch_manager', 'payments.verify', false),  -- DITOLAK
('branch_manager', 'payments.refund', false)   -- DITOLAK
ON CONFLICT (role, permission_key) DO NOTHING;

-- Customer
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('branch_manager', 'customers.view', true),
('branch_manager', 'customers.create', true),
('branch_manager', 'customers.edit', true),
('branch_manager', 'customers.delete', false),  -- DITOLAK
('branch_manager', 'customers.edit_sensitive', false)  -- DITOLAK
ON CONFLICT (role, permission_key) DO NOTHING;

-- AGENT - Pembatasan Akses Ketat (Read-Only untuk data sendiri)
-- Booking
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('agent', 'bookings.view_own', true),
('agent', 'bookings.view_branch', false),
('agent', 'bookings.view_all', false),
('agent', 'bookings.create', true),
('agent', 'bookings.edit', false),  -- DITOLAK
('agent', 'bookings.delete', false),  -- DITOLAK
('agent', 'bookings.approve', false)  -- DITOLAK
ON CONFLICT (role, permission_key) DO NOTHING;

-- Payment
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('agent', 'payments.view_own', true),
('agent', 'payments.view_branch', false),
('agent', 'payments.view_all', false),
('agent', 'payments.create', true),
('agent', 'payments.edit', false),  -- DITOLAK
('agent', 'payments.delete', false),  -- DITOLAK
('agent', 'payments.verify', false),  -- DITOLAK
('agent', 'payments.refund', false)   -- DITOLAK
ON CONFLICT (role, permission_key) DO NOTHING;

-- Customer
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('agent', 'customers.view', true),  -- Hanya pelanggan yang terkait
('agent', 'customers.create', true),
('agent', 'customers.edit', false),  -- DITOLAK
('agent', 'customers.delete', false),  -- DITOLAK
('agent', 'customers.edit_sensitive', false)  -- DITOLAK
ON CONFLICT (role, permission_key) DO NOTHING;

-- Leads
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('agent', 'leads.view', true),  -- Hanya leads yang ditugaskan
('agent', 'leads.create', true),
('agent', 'leads.edit', true),  -- Hanya leads yang dibuat/ditugaskan
('agent', 'leads.delete', false)  -- DITOLAK
ON CONFLICT (role, permission_key) DO NOTHING;

-- FINANCE - Fokus pada Payment & Reports
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('finance', 'payments.view_all', true),
('finance', 'payments.view_branch', true),
('finance', 'payments.view_own', false),
('finance', 'payments.verify', true),
('finance', 'payments.refund', true),
('finance', 'finance.reports', true),
('finance', 'bookings.view_all', true),
('finance', 'customers.view', true),
('finance', 'dashboard.view', true),
('finance', 'analytics.view', true),
('finance', 'reports.view', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- OPERATIONAL - Fokus pada Operational & Equipment
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('operational', 'operational.manifest', true),
('operational', 'operational.visa', true),
('operational', 'bookings.view_all', true),
('operational', 'customers.view', true),
('operational', 'dashboard.view', true),
('operational', 'analytics.view', true),
('operational', 'reports.view', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- EQUIPMENT - Fokus pada Equipment Management
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('equipment', 'equipment.inventory', true),
('equipment', 'equipment.distribute', true),
('equipment', 'operational.view', true),
('equipment', 'bookings.view_all', true),
('equipment', 'customers.view', true),
('equipment', 'dashboard.view', true),
('equipment', 'departures.view', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- SALES - Fokus pada Booking & Leads
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('sales', 'bookings.create', true),
('sales', 'bookings.view_all', true),
('sales', 'customers.view', true),
('sales', 'customers.create', true),
('sales', 'leads.create', true),
('sales', 'leads.view', true),
('sales', 'leads.edit', true),
('sales', 'packages.view', true),
('sales', 'departures.view', true),
('sales', 'dashboard.view', true),
('sales', 'analytics.view', true),
('sales', 'reports.view', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- MARKETING - Fokus pada Leads & Marketing
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('marketing', 'leads.view', true),
('marketing', 'leads.create', true),
('marketing', 'leads.edit', true),
('marketing', 'packages.view', true),
('marketing', 'dashboard.view', true),
('marketing', 'analytics.view', true),
('marketing', 'reports.view', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- =====================================================
-- 3. ENHANCE RLS POLICIES UNTUK BOOKINGS (View Granular)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own bookings or bookings in their branch" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings in their branch or as admin" ON public.bookings;
DROP POLICY IF EXISTS "Users can update bookings in their branch or as admin" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

-- Recreate dengan granular permissions
CREATE POLICY "Users can view bookings based on permissions" ON public.bookings
FOR SELECT USING (
  -- Super Admin & Owner: view all
  (public.check_permission(auth.uid(), 'bookings.view_all'))
  -- Branch Manager: view branch bookings
  OR (public.check_permission(auth.uid(), 'bookings.view_branch') AND 
      branch_id = public.get_user_branch_id(auth.uid()))
  -- Agent: view own bookings
  OR (public.check_permission(auth.uid(), 'bookings.view_own') AND 
      agent_id = auth.uid())
  -- Customer: view own bookings
  OR (EXISTS (SELECT 1 FROM public.customers WHERE customers.id = bookings.customer_id AND customers.user_id = auth.uid()))
  -- Finance & Operational: view all in branch
  OR (public.check_permission(auth.uid(), 'bookings.view_all') AND 
      branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can create bookings based on permissions" ON public.bookings
FOR INSERT WITH CHECK (
  public.check_permission(auth.uid(), 'bookings.create')
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can update bookings based on permissions" ON public.bookings
FOR UPDATE USING (
  -- Super Admin & Owner: update all
  (public.check_permission(auth.uid(), 'bookings.edit') AND 
   (public.is_admin(auth.uid()) OR branch_id = public.get_user_branch_id(auth.uid())))
  -- Branch Manager: update branch bookings only
  OR (public.check_permission(auth.uid(), 'bookings.edit') AND 
      branch_id = public.get_user_branch_id(auth.uid()) AND
      NOT public.is_admin(auth.uid()))
  -- Agent: cannot update (permission denied)
  OR false
);

CREATE POLICY "Only admins can delete bookings" ON public.bookings
FOR DELETE USING (
  public.check_permission(auth.uid(), 'bookings.delete') AND public.is_admin(auth.uid())
);

-- =====================================================
-- 4. ENHANCE RLS POLICIES UNTUK PAYMENTS (View Granular)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own payments or payments in their branch" ON public.payments;
DROP POLICY IF EXISTS "Users can upload payment proof or admins/finance" ON public.payments;
DROP POLICY IF EXISTS "Finance can manage payments in their branch or as admin" ON public.payments;

-- Recreate dengan granular permissions
CREATE POLICY "Users can view payments based on permissions" ON public.payments
FOR SELECT USING (
  -- Super Admin & Owner: view all
  (public.check_permission(auth.uid(), 'payments.view_all'))
  -- Finance Manager: view all payments
  OR (public.check_permission(auth.uid(), 'payments.view_all') AND 
      public.has_role(auth.uid(), 'finance'))
  -- Branch Manager: view branch payments
  OR (public.check_permission(auth.uid(), 'payments.view_branch') AND 
      branch_id = public.get_user_branch_id(auth.uid()))
  -- Agent: view own payments
  OR (public.check_permission(auth.uid(), 'payments.view_own') AND 
      EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = payments.booking_id AND bookings.agent_id = auth.uid()))
  -- Customer: view own payments
  OR (EXISTS (SELECT 1 FROM public.bookings b JOIN public.customers c ON c.id = b.customer_id WHERE b.id = payments.booking_id AND c.user_id = auth.uid()))
);

CREATE POLICY "Users can create payments based on permissions" ON public.payments
FOR INSERT WITH CHECK (
  public.check_permission(auth.uid(), 'payments.create')
  OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.bookings b JOIN public.customers c ON c.id = b.customer_id WHERE b.id = payments.booking_id AND c.user_id = auth.uid())
);

CREATE POLICY "Only authorized users can verify payments" ON public.payments
FOR UPDATE USING (
  -- Only Finance Manager can verify
  (public.check_permission(auth.uid(), 'payments.verify') AND 
   public.has_role(auth.uid(), 'finance'))
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Only admins can delete payments" ON public.payments
FOR DELETE USING (
  public.check_permission(auth.uid(), 'payments.delete') AND public.is_admin(auth.uid())
);

-- =====================================================
-- 5. ENHANCE RLS POLICIES UNTUK CUSTOMERS (Edit Sensitive)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own customers or customers in their branch" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers or admins/staff" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers or admins/staff" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

-- Recreate dengan granular permissions
CREATE POLICY "Users can view customers based on permissions" ON public.customers
FOR SELECT USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id))
  OR (created_by_agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent'))
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can insert customers based on permissions" ON public.customers
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND created_by_agent_id = auth.uid())
);

CREATE POLICY "Users can update customers based on permissions" ON public.customers
FOR UPDATE USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND created_by_agent_id = auth.uid())
);

CREATE POLICY "Only authorized users can edit sensitive customer data" ON public.customers
FOR UPDATE USING (
  public.check_permission(auth.uid(), 'customers.edit_sensitive')
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Only admins can delete customers" ON public.customers
FOR DELETE USING (
  public.check_permission(auth.uid(), 'customers.delete') AND public.is_admin(auth.uid())
);

-- =====================================================
-- 6. AUDIT LOG UNTUK TRACKING PERUBAHAN SENSITIF
-- =====================================================

-- Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.is_admin(auth.uid()));

-- Create function to log sensitive actions
CREATE OR REPLACE FUNCTION public.log_audit_action(
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (auth.uid(), _action, _resource_type, _resource_id, _old_values, _new_values);
END;
$$;

-- =====================================================
-- 7. TRIGGER UNTUK AUDIT LOG PADA OPERASI SENSITIF
-- =====================================================

-- Trigger untuk payments.verify
CREATE OR REPLACE FUNCTION public.audit_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status = 'paid' THEN
    PERFORM public.log_audit_action(
      'PAYMENT_VERIFIED',
      'payments',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'verified_at', NEW.verified_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_payment_verification_trigger ON public.payments;
CREATE TRIGGER audit_payment_verification_trigger
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.audit_payment_verification();

-- Trigger untuk bookings.approve
CREATE OR REPLACE FUNCTION public.audit_booking_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status != OLD.booking_status AND NEW.booking_status = 'confirmed' THEN
    PERFORM public.log_audit_action(
      'BOOKING_APPROVED',
      'bookings',
      NEW.id,
      jsonb_build_object('status', OLD.booking_status),
      jsonb_build_object('status', NEW.booking_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_booking_approval_trigger ON public.bookings;
CREATE TRIGGER audit_booking_approval_trigger
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.audit_booking_approval();

-- Trigger untuk sensitive customer data changes
CREATE OR REPLACE FUNCTION public.audit_customer_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.nik != OLD.nik OR NEW.passport_number != OLD.passport_number OR NEW.passport_expiry != OLD.passport_expiry) THEN
    PERFORM public.log_audit_action(
      'CUSTOMER_SENSITIVE_DATA_CHANGED',
      'customers',
      NEW.id,
      jsonb_build_object('nik', OLD.nik, 'passport_number', OLD.passport_number, 'passport_expiry', OLD.passport_expiry),
      jsonb_build_object('nik', NEW.nik, 'passport_number', NEW.passport_number, 'passport_expiry', NEW.passport_expiry)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_customer_sensitive_changes_trigger ON public.customers;
CREATE TRIGGER audit_customer_sensitive_changes_trigger
AFTER UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.audit_customer_sensitive_changes();
