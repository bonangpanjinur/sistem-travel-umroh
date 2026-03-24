-- Phase 3: Granular Permissions

-- 1. Create permissions_list table
CREATE TABLE public.permissions_list (
  key VARCHAR(100) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permissions_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions_list
CREATE POLICY "Admins can manage permissions list" 
ON public.permissions_list 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view permissions list" 
ON public.permissions_list 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Populate permissions_list with granular entries
INSERT INTO public.permissions_list (key, label, group_name, description, icon_name) VALUES
("bookings.view", "Lihat Booking", "Booking", "Mengizinkan melihat daftar booking", "Calendar"),
("bookings.create", "Buat Booking", "Booking", "Mengizinkan membuat booking baru", "CalendarPlus"),
("bookings.edit", "Edit Booking", "Booking", "Mengizinkan mengubah detail booking", "CalendarEdit"),
("bookings.delete", "Hapus Booking", "Booking", "Mengizinkan menghapus booking", "CalendarMinus"),

("customers.view", "Lihat Pelanggan", "Pelanggan", "Mengizinkan melihat daftar pelanggan", "Users"),
("customers.create", "Buat Pelanggan", "Pelanggan", "Mengizinkan membuat pelanggan baru", "UserPlus"),
("customers.edit", "Edit Pelanggan", "Pelanggan", "Mengizinkan mengubah detail pelanggan", "UserEdit"),
("customers.delete", "Hapus Pelanggan", "Pelanggan", "Mengizinkan menghapus pelanggan", "UserMinus"),

("payments.view", "Lihat Pembayaran", "Pembayaran", "Mengizinkan melihat daftar pembayaran", "CreditCard"),
("payments.create", "Buat Pembayaran", "Pembayaran", "Mengizinkan membuat pembayaran baru", "CreditCardPlus"),
("payments.edit", "Edit Pembayaran", "Pembayaran", "Mengizinkan mengubah detail pembayaran", "CreditCardEdit"),
("payments.delete", "Hapus Pembayaran", "Pembayaran", "Mengizinkan menghapus pembayaran", "CreditCardMinus"),
("payments.verify", "Verifikasi Pembayaran", "Pembayaran", "Mengizinkan verifikasi pembayaran", "CheckCircle"),

("leads.view", "Lihat Leads", "Leads", "Mengizinkan melihat daftar leads", "Target"),
("leads.create", "Buat Leads", "Leads", "Mengizinkan membuat leads baru", "TargetPlus"),
("leads.edit", "Edit Leads", "Leads", "Mengizinkan mengubah detail leads", "TargetEdit"),
("leads.delete", "Hapus Leads", "Leads", "Mengizinkan menghapus leads", "TargetMinus"),

("packages.view", "Lihat Paket", "Paket", "Mengizinkan melihat daftar paket", "Briefcase"),
("packages.create", "Buat Paket", "Paket", "Mengizinkan membuat paket baru", "BriefcasePlus"),
("packages.edit", "Edit Paket", "Paket", "Mengizinkan mengubah detail paket", "BriefcaseEdit"),
("packages.delete", "Hapus Paket", "Paket", "Mengizinkan menghapus paket", "BriefcaseMinus"),

("departures.view", "Lihat Keberangkatan", "Keberangkatan", "Mengizinkan melihat daftar keberangkatan", "Plane"),
("departures.create", "Buat Keberangkatan", "Keberangkatan", "Mengizinkan membuat keberangkatan baru", "PlanePlus"),
("departures.edit", "Edit Keberangkatan", "Keberangkatan", "Mengizinkan mengubah detail keberangkatan", "PlaneEdit"),
("departures.delete", "Hapus Keberangkatan", "Keberangkatan", "Mengizinkan menghapus keberangkatan", "PlaneMinus"),

("users.view", "Lihat Pengguna", "Pengguna", "Mengizinkan melihat daftar pengguna", "Users"),
("users.create", "Buat Pengguna", "Pengguna", "Mengizinkan membuat pengguna baru", "UserPlus"),
("users.edit", "Edit Pengguna", "Pengguna", "Mengizinkan mengubah detail pengguna", "UserEdit"),
("users.delete", "Hapus Pengguna", "Pengguna", "Mengizinkan menghapus pengguna", "UserMinus"),

("agents.view", "Lihat Agen", "Agen", "Mengizinkan melihat daftar agen", "UserTie"),
("agents.create", "Buat Agen", "Agen", "Mengizinkan membuat agen baru", "UserTiePlus"),
("agents.edit", "Edit Agen", "Agen", "Mengizinkan mengubah detail agen", "UserTieEdit"),
("agents.delete", "Hapus Agen", "Agen", "Mengizinkan menghapus agen", "UserTieMinus"),

("master_data.view", "Lihat Master Data", "Master Data", "Mengizinkan melihat master data (airlines, airports, hotels, etc.)", "Database"),
("master_data.manage", "Kelola Master Data", "Master Data", "Mengizinkan mengelola master data (create, edit, delete)", "DatabaseCog"),

("settings.view", "Lihat Pengaturan", "Pengaturan", "Mengizinkan melihat pengaturan sistem", "Settings"),
("settings.manage", "Kelola Pengaturan", "Pengaturan", "Mengizinkan mengelola pengaturan sistem", "SettingsCog"),

("reports.view", "Lihat Laporan", "Laporan", "Mengizinkan melihat laporan", "ChartBar"),

("operational.view", "Lihat Operasional", "Operasional", "Mengizinkan melihat data operasional (manifests, attendance, luggage, equipment)", "Tools"),
("operational.manage", "Kelola Operasional", "Operasional", "Mengizinkan mengelola data operasional", "ToolsCog")
ON CONFLICT (key) DO NOTHING;

-- 3. Update role_permissions with granular permissions
-- This part needs to be done carefully, as existing roles might have broad permissions.
-- For now, we will map existing broad permissions to granular ones for super_admin and owner.

-- Map existing 'dashboard' to 'dashboard.view'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "dashboard.view", true),
("owner", "dashboard.view", true),
("branch_manager", "dashboard.view", true),
("finance", "dashboard.view", true),
("operational", "dashboard.view", true),
("sales", "dashboard.view", true),
("marketing", "dashboard.view", true),
("equipment", "dashboard.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'analytics' to 'analytics.view'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "analytics.view", true),
("owner", "analytics.view", true),
("branch_manager", "analytics.view", true),
("marketing", "analytics.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'packages' to 'packages.view' and 'packages.manage'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "packages.view", true),
("super_admin", "packages.create", true),
("super_admin", "packages.edit", true),
("super_admin", "packages.delete", true),
("owner", "packages.view", true),
("owner", "packages.create", true),
("owner", "packages.edit", true),
("owner", "packages.delete", true),
("branch_manager", "packages.view", true),
("branch_manager", "packages.create", true),
("branch_manager", "packages.edit", true),
("branch_manager", "packages.delete", true),
("operational", "packages.view", true),
("sales", "packages.view", true),
("marketing", "packages.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'departures' to 'departures.view' and 'departures.manage'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "departures.view", true),
("super_admin", "departures.create", true),
("super_admin", "departures.edit", true),
("super_admin", "departures.delete", true),
("owner", "departures.view", true),
("owner", "departures.create", true),
("owner", "departures.edit", true),
("owner", "departures.delete", true),
("branch_manager", "departures.view", true),
("branch_manager", "departures.create", true),
("branch_manager", "departures.edit", true),
("branch_manager", "departures.delete", true),
("operational", "departures.view", true),
("sales", "departures.view", true),
("marketing", "departures.view", true),
("equipment", "departures.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'bookings' to 'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "bookings.view", true),
("super_admin", "bookings.create", true),
("super_admin", "bookings.edit", true),
("super_admin", "bookings.delete", true),
("owner", "bookings.view", true),
("owner", "bookings.create", true),
("owner", "bookings.edit", true),
("owner", "bookings.delete", true),
("branch_manager", "bookings.view", true),
("branch_manager", "bookings.create", true),
("branch_manager", "bookings.edit", true),
("branch_manager", "bookings.delete", true),
("finance", "bookings.view", true),
("finance", "bookings.create", true),
("finance", "bookings.edit", true),
("finance", "bookings.delete", true),
("operational", "bookings.view", true),
("operational", "bookings.create", true),
("operational", "bookings.edit", true),
("operational", "bookings.delete", true),
("sales", "bookings.view", true),
("sales", "bookings.create", true),
("sales", "bookings.edit", true),
("sales", "bookings.delete", true),
("equipment", "bookings.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'payments' to 'payments.view', 'payments.create', 'payments.edit', 'payments.delete', 'payments.verify'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "payments.view", true),
("super_admin", "payments.create", true),
("super_admin", "payments.edit", true),
("super_admin", "payments.delete", true),
("super_admin", "payments.verify", true),
("owner", "payments.view", true),
("owner", "payments.create", true),
("owner", "payments.edit", true),
("owner", "payments.delete", true),
("owner", "payments.verify", true),
("branch_manager", "payments.view", true),
("branch_manager", "payments.create", true),
("branch_manager", "payments.edit", true),
("branch_manager", "payments.delete", true),
("branch_manager", "payments.verify", true),
("finance", "payments.view", true),
("finance", "payments.create", true),
("finance", "payments.edit", true),
("finance", "payments.delete", true),
("finance", "payments.verify", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'customers' to 'customers.view', 'customers.create', 'customers.edit', 'customers.delete'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "customers.view", true),
("super_admin", "customers.create", true),
("super_admin", "customers.edit", true),
("super_admin", "customers.delete", true),
("owner", "customers.view", true),
("owner", "customers.create", true),
("owner", "customers.edit", true),
("owner", "customers.delete", true),
("branch_manager", "customers.view", true),
("branch_manager", "customers.create", true),
("branch_manager", "customers.edit", true),
("branch_manager", "customers.delete", true),
("finance", "customers.view", true),
("operational", "customers.view", true),
("sales", "customers.view", true),
("equipment", "customers.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'leads' to 'leads.view', 'leads.create', 'leads.edit', 'leads.delete'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "leads.view", true),
("super_admin", "leads.create", true),
("super_admin", "leads.edit", true),
("super_admin", "leads.delete", true),
("owner", "leads.view", true),
("owner", "leads.create", true),
("owner", "leads.edit", true),
("owner", "leads.delete", true),
("branch_manager", "leads.view", true),
("branch_manager", "leads.create", true),
("branch_manager", "leads.edit", true),
("branch_manager", "leads.delete", true),
("sales", "leads.view", true),
("sales", "leads.create", true),
("sales", "leads.edit", true),
("sales", "leads.delete", true),
("marketing", "leads.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'master_data' to 'master_data.view' and 'master_data.manage'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "master_data.view", true),
("super_admin", "master_data.manage", true),
("owner", "master_data.view", true),
("owner", "master_data.manage", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'users' to 'users.view', 'users.create', 'users.edit', 'users.delete'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "users.view", true),
("super_admin", "users.create", true),
("super_admin", "users.edit", true),
("super_admin", "users.delete", true),
("owner", "users.view", true),
("owner", "users.create", true),
("owner", "users.edit", true),
("owner", "users.delete", true),
("branch_manager", "users.view", true),
("branch_manager", "users.create", true),
("branch_manager", "users.edit", true),
("branch_manager", "users.delete", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'agents' to 'agents.view', 'agents.create', 'agents.edit', 'agents.delete'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "agents.view", true),
("super_admin", "agents.create", true),
("super_admin", "agents.edit", true),
("super_admin", "agents.delete", true),
("owner", "agents.view", true),
("owner", "agents.create", true),
("owner", "agents.edit", true),
("owner", "agents.delete", true),
("branch_manager", "agents.view", true),
("branch_manager", "agents.create", true),
("branch_manager", "agents.edit", true),
("branch_manager", "agents.delete", true),
("finance", "agents.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'reports' to 'reports.view'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "reports.view", true),
("owner", "reports.view", true),
("branch_manager", "reports.view", true),
("finance", "reports.view", true),
("operational", "reports.view", true),
("marketing", "reports.view", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'settings' to 'settings.view' and 'settings.manage'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "settings.view", true),
("super_admin", "settings.manage", true),
("owner", "settings.view", true),
("owner", "settings.manage", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Map existing 'operational' to 'operational.view' and 'operational.manage'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
("super_admin", "operational.view", true),
("super_admin", "operational.manage", true),
("owner", "operational.view", true),
("owner", "operational.manage", true),
("branch_manager", "operational.view", true),
("branch_manager", "operational.manage", true),
("operational", "operational.view", true),
("operational", "operational.manage", true),
("equipment", "operational.view", true),
("equipment", "operational.manage", true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- 4. Create or modify public.check_permission function
CREATE OR REPLACE FUNCTION public.check_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _is_owner BOOLEAN;
BEGIN
  -- Check if the user is a super_admin or owner (they have all permissions)
  SELECT public.is_admin(_user_id) INTO _is_admin;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner') INTO _is_owner;

  IF _is_admin OR _is_owner THEN
    RETURN TRUE;
  END IF;

  -- Check if the user has the specific granular permission
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.is_enabled = TRUE
  );
END;
$$;
