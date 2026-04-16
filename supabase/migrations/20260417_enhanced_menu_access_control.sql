-- Enhanced Menu Access Control with Dynamic Permission Resolution
-- Implementasi sistem hak akses dinamis yang menggabungkan RBAC dan User-Level Overrides
-- Tanggal: 2026-04-17

-- =====================================================
-- 1. CREATE MENU_ITEMS TABLE (untuk tracking menu dinamis)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  icon VARCHAR(100),
  group_name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  required_permission VARCHAR(100) NOT NULL REFERENCES public.permissions_list(key) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view menu items (permission check happens in app)
CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT USING (is_visible = TRUE);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_key ON public.menu_items(key);
CREATE INDEX IF NOT EXISTS idx_menu_items_group ON public.menu_items(group_name);
CREATE INDEX IF NOT EXISTS idx_menu_items_permission ON public.menu_items(required_permission);

-- =====================================================
-- 2. CREATE ENHANCED PERMISSION RESOLUTION FUNCTION
-- =====================================================

-- Function to get effective permission for a user (considering all overrides)
CREATE OR REPLACE FUNCTION public.get_user_effective_permission(
  _user_id UUID,
  _permission_key VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super_admin BOOLEAN;
  _user_permission_status BOOLEAN;
  _found_user_override BOOLEAN;
BEGIN
  -- 1. Check if user is super_admin (bypass all checks)
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  ) INTO _is_super_admin;
  
  IF _is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit user-level permission override
  SELECT is_enabled, TRUE
  INTO _user_permission_status, _found_user_override
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key;

  IF _found_user_override THEN
    RETURN _user_permission_status;
  END IF;

  -- 3. Check role-based permissions (user must have at least one role with this permission)
  RETURN EXISTS(
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.is_enabled = TRUE
  );
END;
$$;

-- =====================================================
-- 3. CREATE FUNCTION TO GET USER ACCESSIBLE MENUS
-- =====================================================

-- Function to get all menu items accessible by a user
CREATE OR REPLACE FUNCTION public.get_user_accessible_menus(_user_id UUID)
RETURNS TABLE(
  id UUID,
  key VARCHAR,
  label VARCHAR,
  path VARCHAR,
  icon VARCHAR,
  group_name VARCHAR,
  sort_order INTEGER,
  required_permission VARCHAR,
  has_access BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.key,
    mi.label,
    mi.path,
    mi.icon,
    mi.group_name,
    mi.sort_order,
    mi.required_permission,
    public.get_user_effective_permission(_user_id, mi.required_permission) as has_access
  FROM public.menu_items mi
  WHERE mi.is_visible = TRUE
  ORDER BY mi.group_name, mi.sort_order, mi.label;
END;
$$;

-- =====================================================
-- 4. CREATE FUNCTION TO SYNC MENU ITEMS FROM FRONTEND
-- =====================================================

-- Function to create or update menu items (called when frontend discovers new menus)
CREATE OR REPLACE FUNCTION public.sync_menu_item(
  _key VARCHAR,
  _label VARCHAR,
  _path VARCHAR,
  _icon VARCHAR,
  _group_name VARCHAR,
  _sort_order INTEGER,
  _required_permission VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _menu_id UUID;
BEGIN
  -- Only admins can sync menu items
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can sync menu items';
  END IF;

  -- Ensure permission exists
  IF NOT EXISTS (SELECT 1 FROM public.permissions_list WHERE key = _required_permission) THEN
    RAISE EXCEPTION 'Permission % does not exist', _required_permission;
  END IF;

  -- Insert or update menu item
  INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, required_permission)
  VALUES (_key, _label, _path, _icon, _group_name, _sort_order, _required_permission)
  ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    group_name = EXCLUDED.group_name,
    sort_order = EXCLUDED.sort_order,
    required_permission = EXCLUDED.required_permission,
    updated_at = now()
  RETURNING id INTO _menu_id;

  RETURN _menu_id;
END;
$$;

-- =====================================================
-- 5. CREATE FUNCTION TO BULK SYNC MENUS
-- =====================================================

-- Function to sync multiple menu items at once
CREATE OR REPLACE FUNCTION public.bulk_sync_menu_items(
  _menu_items JSONB
)
RETURNS TABLE(synced_count INTEGER, failed_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _synced_count INTEGER := 0;
  _failed_count INTEGER := 0;
  _item JSONB;
BEGIN
  -- Only admins can sync menu items
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can sync menu items';
  END IF;

  FOR _item IN SELECT jsonb_array_elements(_menu_items)
  LOOP
    BEGIN
      PERFORM public.sync_menu_item(
        _item->>'key',
        _item->>'label',
        _item->>'path',
        _item->>'icon',
        _item->>'group_name',
        (_item->>'sort_order')::INTEGER,
        _item->>'required_permission'
      );
      _synced_count := _synced_count + 1;
    EXCEPTION WHEN OTHERS THEN
      _failed_count := _failed_count + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT _synced_count, _failed_count;
END;
$$;

-- =====================================================
-- 6. CREATE AUDIT TABLE FOR MENU ACCESS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.menu_access_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_key VARCHAR(100) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  access_granted BOOLEAN NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_access_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view audit logs
CREATE POLICY "Admins can view menu access audit" ON public.menu_access_audit 
FOR SELECT USING (public.is_admin(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_menu_access_audit_user ON public.menu_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_access_audit_menu ON public.menu_access_audit(menu_key);

-- =====================================================
-- 7. INITIAL MENU ITEMS SYNC (from AdminLayout.tsx)
-- =====================================================

-- Overview Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('dashboard', 'Dashboard', '/admin', 'Overview', 10, 'dashboard.view'),
('analytics', 'Analytics', '/admin/analytics', 'Overview', 20, 'analytics.view')
ON CONFLICT (key) DO NOTHING;

-- Sales & CRM Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('crm_leads', 'CRM Leads', '/admin/leads', 'Sales & CRM', 10, 'leads.view'),
('coupons', 'Kupon', '/admin/coupons', 'Sales & CRM', 20, 'marketing.view'),
('landing_pages', 'Landing Page', '/admin/landing-pages', 'Sales & CRM', 30, 'settings.manage')
ON CONFLICT (key) DO NOTHING;

-- Produk & Operasional Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('packages', 'Paket', '/admin/packages', 'Produk & Operasional', 10, 'packages.view'),
('departures', 'Keberangkatan', '/admin/departures', 'Produk & Operasional', 20, 'departures.view'),
('bookings', 'Booking', '/admin/bookings', 'Produk & Operasional', 30, 'bookings.view_own'),
('equipment', 'Perlengkapan', '/admin/equipment', 'Produk & Operasional', 40, 'operational.view'),
('itinerary_templates', 'Template Itinerary', '/admin/itinerary-templates', 'Produk & Operasional', 50, 'itinerary.view'),
('savings', 'Tabungan', '/admin/savings', 'Produk & Operasional', 60, 'packages.view'),
('room_assignments', 'Kamar', '/admin/room-assignments', 'Produk & Operasional', 70, 'operational.rooms.view')
ON CONFLICT (key) DO NOTHING;

-- Keuangan & Akuntansi Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('payments', 'Pembayaran', '/admin/payments', 'Keuangan & Akuntansi', 10, 'payments.view_own'),
('finance_cash', 'Kas & Bank', '/admin/finance-cash', 'Keuangan & Akuntansi', 20, 'payments.view_own'),
('finance_ar', 'Piutang Jamaah', '/admin/finance/ar', 'Keuangan & Akuntansi', 30, 'payments.view_all'),
('finance_ap', 'Hutang Vendor', '/admin/finance/ap', 'Keuangan & Akuntansi', 40, 'payments.view_all'),
('finance_reports', 'Laporan Laba Rugi', '/admin/finance', 'Keuangan & Akuntansi', 50, 'finance.reports')
ON CONFLICT (key) DO NOTHING;

-- Jamaah & Agent Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('customers', 'Jamaah', '/admin/customers', 'Jamaah & Agent', 10, 'customers.view'),
('agents', 'Agent', '/admin/agents', 'Jamaah & Agent', 20, 'agents.view'),
('branches', 'Cabang', '/admin/branches', 'Jamaah & Agent', 30, 'settings.view'),
('loyalty', 'Loyalty', '/admin/loyalty', 'Jamaah & Agent', 40, 'marketing.view'),
('referrals', 'Referral', '/admin/referrals', 'Jamaah & Agent', 50, 'marketing.view'),
('haji', 'Haji', '/admin/haji', 'Jamaah & Agent', 60, 'operational.view'),
('manasik', 'Manasik', '/admin/manasik', 'Jamaah & Agent', 70, 'operational.manasik.view'),
('visa', 'Visa', '/admin/visa', 'Jamaah & Agent', 80, 'departures.visa.view')
ON CONFLICT (key) DO NOTHING;

-- SDM (HR) Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('hr_employees', 'Data Karyawan', '/admin/hr?tab=employees', 'SDM (HR)', 10, 'hr.employees.view'),
('hr_attendance', 'Absensi', '/admin/hr?tab=attendance', 'SDM (HR)', 20, 'hr.attendance.view'),
('hr_payroll', 'Penggajian / Payroll', '/admin/hr/payroll', 'SDM (HR)', 30, 'hr.payroll.view'),
('hr_salary_slip', 'Slip Gaji', '/admin/finance-cash?tab=salary', 'SDM (HR)', 40, 'hr.payroll.view'),
('hr_departments', 'Departemen', '/admin/hr?tab=departments', 'SDM (HR)', 50, 'hr.departments.view'),
('hr_positions', 'Posisi', '/admin/hr?tab=positions', 'SDM (HR)', 60, 'hr.positions.view'),
('hr_schedules', 'Jadwal Kerja', '/admin/hr?tab=schedules', 'SDM (HR)', 70, 'hr.schedules.view'),
('hr_devices', 'Perangkat', '/admin/hr?tab=devices', 'SDM (HR)', 80, 'hr.devices.view'),
('hr_settings', 'Pengaturan HR', '/admin/hr?tab=settings', 'SDM (HR)', 90, 'hr.settings.view')
ON CONFLICT (key) DO NOTHING;

-- Support & Komunikasi Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('support_tickets', 'Tiket Support', '/admin/support', 'Support & Komunikasi', 10, 'support.tickets.view'),
('whatsapp', 'WhatsApp', '/admin/whatsapp', 'Support & Komunikasi', 20, 'whatsapp.view'),
('marketing_materials', 'Materi Promosi', '/admin/marketing-materials', 'Support & Komunikasi', 30, 'marketing_materials.view')
ON CONFLICT (key) DO NOTHING;

-- Master Data Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('master_data', 'Master Data', '/admin/master-data', 'Master Data', 10, 'master_data.view')
ON CONFLICT (key) DO NOTHING;

-- Dokumen & Surat Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('document_verification', 'Verifikasi Dokumen', '/admin/document-verification', 'Dokumen & Surat', 10, 'documents.verification.view'),
('documents_generator', 'Generate Surat', '/admin/documents-generator', 'Dokumen & Surat', 20, 'documents.generator.view'),
('offline_content', 'Konten Offline', '/admin/offline-content', 'Dokumen & Surat', 30, 'offline_content.view')
ON CONFLICT (key) DO NOTHING;

-- Laporan Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('reports', 'Laporan', '/admin/reports', 'Laporan', 10, 'reports.view'),
('advanced_reports', 'Laporan Lanjutan', '/admin/advanced-reports', 'Laporan', 20, 'reports.view'),
('scheduled_reports', 'Laporan Terjadwal', '/admin/scheduled-reports', 'Laporan', 30, 'reports.view')
ON CONFLICT (key) DO NOTHING;

-- Pengaturan Group
INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('users', 'Users', '/admin/users', 'Pengaturan', 10, 'users.view'),
('udac_management', 'UDAC Management', '/admin/udac', 'Pengaturan', 20, 'users.view'),
('security_audit', 'Security Audit', '/admin/security-audit', 'Pengaturan', 30, 'settings.manage'),
('2fa_settings', '2FA Settings', '/admin/2fa', 'Pengaturan', 40, 'settings.manage'),
('appearance', 'Tampilan', '/admin/appearance', 'Pengaturan', 50, 'settings.manage'),
('static_pages', 'Halaman Statis', '/admin/static-pages', 'Pengaturan', 60, 'settings.manage'),
('testimonials', 'Testimoni', '/admin/testimonials', 'Pengaturan', 70, 'settings.manage'),
('package_types', 'Tipe Paket', '/admin/package-types', 'Pengaturan', 80, 'packages.view'),
('settings', 'Pengaturan', '/admin/settings', 'Pengaturan', 90, 'settings.manage')
ON CONFLICT (key) DO NOTHING;
