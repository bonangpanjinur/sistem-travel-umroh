-- Idempotent re-run of role_permissions setup (handles partial previous run)

-- Ensure table exists (no-op if created previously)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions_list(key) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON public.role_permissions(permission_key);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admin can manage role_permissions" ON public.role_permissions;
CREATE POLICY "Super admin can manage role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Recreate trigger safely
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Replace check_user_permission dengan logika 2 lapis
CREATE OR REPLACE FUNCTION public.check_user_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_override boolean;
  v_role_allows boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN
    RETURN true;
  END IF;

  SELECT is_enabled INTO v_override
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key
  LIMIT 1;
  IF FOUND THEN
    RETURN v_override;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.is_enabled = true
  ) INTO v_role_allows;

  RETURN COALESCE(v_role_allows, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id uuid)
RETURNS TABLE(permission_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN
    RETURN QUERY SELECT pl.key FROM public.permissions_list pl;
    RETURN;
  END IF;

  RETURN QUERY
  WITH role_allowed AS (
    SELECT DISTINCT rp.permission_key
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.is_enabled = true
  ),
  user_overrides AS (
    SELECT up.permission_key, up.is_enabled
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
  ),
  combined AS (
    SELECT ra.permission_key
    FROM role_allowed ra
    WHERE NOT EXISTS (
      SELECT 1 FROM user_overrides uo
      WHERE uo.permission_key = ra.permission_key AND uo.is_enabled = false
    )
    UNION
    SELECT uo.permission_key FROM user_overrides uo WHERE uo.is_enabled = true
  )
  SELECT c.permission_key FROM combined c;
END;
$$;

-- Seed permissions_list
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES
  ('dashboard', 'Dashboard', 'Overview', 'Akses dashboard utama admin'),
  ('analytics', 'Analytics', 'Overview', 'Akses halaman analytics'),
  ('leads', 'Leads', 'Penjualan', 'Manajemen leads / prospek'),
  ('bookings', 'Booking', 'Penjualan', 'Manajemen pesanan'),
  ('packages', 'Paket', 'Penjualan', 'Manajemen paket umroh/haji'),
  ('departures', 'Keberangkatan', 'Keberangkatan', 'Manajemen keberangkatan'),
  ('room-assignments', 'Kamar', 'Keberangkatan', 'Pengaturan kamar jamaah'),
  ('equipment', 'Perlengkapan', 'Keberangkatan', 'Manajemen perlengkapan jamaah'),
  ('payments', 'Pembayaran', 'Keuangan', 'Verifikasi pembayaran'),
  ('finance-cash', 'Kas & Bank', 'Keuangan', 'Pengelolaan kas dan bank'),
  ('reports', 'Laporan', 'Keuangan', 'Laporan keuangan dan operasional'),
  ('customers', 'Jamaah', 'Jamaah', 'Manajemen data jamaah'),
  ('agents', 'Agent', 'Jamaah', 'Manajemen agen'),
  ('branches', 'Cabang', 'Jamaah', 'Manajemen cabang'),
  ('hotels', 'Hotel', 'Master Data', 'Master data hotel'),
  ('airlines', 'Maskapai', 'Master Data', 'Master data maskapai'),
  ('airports', 'Bandara', 'Master Data', 'Master data bandara'),
  ('vendors', 'Vendor', 'Master Data', 'Master data vendor'),
  ('users', 'User', 'Pengaturan', 'Manajemen pengguna sistem'),
  ('document-types', 'Jenis Dokumen', 'Pengaturan', 'Konfigurasi jenis dokumen'),
  ('settings', 'Settings', 'Pengaturan', 'Pengaturan sistem'),
  ('roles', 'Manajemen Role', 'Pengaturan', 'Konfigurasi izin default per role')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  group_name = EXCLUDED.group_name,
  description = EXCLUDED.description,
  updated_at = now();

-- Seed menu_items
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, required_permission) VALUES
  ('dashboard', 'Dashboard', '/admin', 'LayoutDashboard', 'Overview', 1, 'dashboard'),
  ('analytics', 'Analytics', '/admin/analytics', 'BarChart3', 'Overview', 2, 'analytics'),
  ('leads', 'Leads', '/admin/leads', 'UserPlus', 'Penjualan', 1, 'leads'),
  ('bookings', 'Booking', '/admin/bookings', 'BookOpen', 'Penjualan', 2, 'bookings'),
  ('packages', 'Paket', '/admin/packages', 'Package', 'Penjualan', 3, 'packages'),
  ('departures', 'Keberangkatan', '/admin/departures', 'CalendarDays', 'Keberangkatan', 1, 'departures'),
  ('room-assignments', 'Kamar', '/admin/room-assignments', 'BedDouble', 'Keberangkatan', 2, 'room-assignments'),
  ('equipment', 'Perlengkapan', '/admin/equipment', 'Backpack', 'Keberangkatan', 3, 'equipment'),
  ('payments', 'Pembayaran', '/admin/payments', 'CreditCard', 'Keuangan', 1, 'payments'),
  ('finance-cash', 'Kas & Bank', '/admin/finance-cash', 'Coins', 'Keuangan', 2, 'finance-cash'),
  ('reports', 'Laporan', '/admin/reports', 'FileBarChart', 'Keuangan', 3, 'reports'),
  ('customers', 'Jamaah', '/admin/customers', 'Users', 'Jamaah', 1, 'customers'),
  ('agents', 'Agent', '/admin/agents', 'UserSquare2', 'Jamaah', 2, 'agents'),
  ('branches', 'Cabang', '/admin/branches', 'Network', 'Jamaah', 3, 'branches'),
  ('hotels', 'Hotel', '/admin/hotels', 'Hotel', 'Master Data', 1, 'hotels'),
  ('airlines', 'Maskapai', '/admin/airlines', 'Plane', 'Master Data', 2, 'airlines'),
  ('airports', 'Bandara', '/admin/airports', 'Building', 'Master Data', 3, 'airports'),
  ('vendors', 'Vendor', '/admin/vendors', 'Store', 'Master Data', 4, 'vendors'),
  ('users', 'User', '/admin/users', 'UserCog', 'Pengaturan', 1, 'users'),
  ('document-types', 'Jenis Dokumen', '/admin/document-types', 'FileCog', 'Pengaturan', 2, 'document-types'),
  ('roles', 'Manajemen Role', '/admin/roles', 'ShieldCheck', 'Pengaturan', 3, 'roles'),
  ('settings', 'Settings', '/admin/settings', 'Settings', 'Pengaturan', 4, 'settings')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  updated_at = now();

-- Seed default role_permissions
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'owner'::app_role, key, true FROM public.permissions_list
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
  ('branch_manager', 'dashboard', true),
  ('branch_manager', 'analytics', true),
  ('branch_manager', 'leads', true),
  ('branch_manager', 'bookings', true),
  ('branch_manager', 'packages', true),
  ('branch_manager', 'departures', true),
  ('branch_manager', 'room-assignments', true),
  ('branch_manager', 'equipment', true),
  ('branch_manager', 'payments', true),
  ('branch_manager', 'finance-cash', true),
  ('branch_manager', 'reports', true),
  ('branch_manager', 'customers', true),
  ('branch_manager', 'agents', true),
  ('branch_manager', 'branches', true),
  ('branch_manager', 'hotels', true),
  ('branch_manager', 'airlines', true),
  ('branch_manager', 'airports', true),
  ('branch_manager', 'vendors', true),
  ('branch_manager', 'document-types', true),
  ('branch_manager', 'settings', true)
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
  ('operational', 'dashboard', true),
  ('operational', 'bookings', true),
  ('operational', 'departures', true),
  ('operational', 'room-assignments', true),
  ('operational', 'equipment', true),
  ('operational', 'customers', true),
  ('operational', 'hotels', true),
  ('operational', 'airlines', true),
  ('operational', 'airports', true)
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
  ('equipment', 'dashboard', true),
  ('equipment', 'equipment', true),
  ('equipment', 'departures', true),
  ('equipment', 'customers', true),
  ('equipment', 'vendors', true)
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
  ('finance', 'dashboard', true),
  ('finance', 'analytics', true),
  ('finance', 'bookings', true),
  ('finance', 'payments', true),
  ('finance', 'finance-cash', true),
  ('finance', 'reports', true),
  ('finance', 'customers', true),
  ('finance', 'agents', true)
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
  ('sales', 'dashboard', true),
  ('sales', 'analytics', true),
  ('sales', 'leads', true),
  ('sales', 'bookings', true),
  ('sales', 'packages', true),
  ('sales', 'departures', true),
  ('sales', 'customers', true),
  ('sales', 'agents', true)
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
  ('marketing', 'dashboard', true),
  ('marketing', 'analytics', true),
  ('marketing', 'leads', true),
  ('marketing', 'packages', true),
  ('marketing', 'customers', true),
  ('marketing', 'agents', true)
ON CONFLICT (role, permission_key) DO NOTHING;