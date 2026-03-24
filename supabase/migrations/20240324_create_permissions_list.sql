-- Create permissions_list table for more dynamic permission management
-- This table stores the master list of all available permissions

CREATE TABLE IF NOT EXISTS public.permissions_list (
  key VARCHAR(100) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.permissions_list IS 'Master list of all available permissions in the system';

-- Insert default permissions
INSERT INTO public.permissions_list (key, label, group_name, description, icon_name) VALUES
  ('dashboard', 'Dashboard', 'Overview', 'Akses halaman dashboard utama', 'LayoutDashboard'),
  ('analytics', 'Analytics', 'Overview', 'Lihat analitik dan statistik', 'BarChart3'),
  ('leads', 'CRM Leads', 'Sales & CRM', 'Kelola calon jamaah', 'Target'),
  ('marketing', 'Marketing', 'Sales & CRM', 'Akses modul marketing', 'Gift'),
  ('packages', 'Paket', 'Produk & Operasional', 'Kelola paket umroh/haji', 'Package'),
  ('departures', 'Keberangkatan', 'Produk & Operasional', 'Kelola jadwal keberangkatan', 'Plane'),
  ('bookings', 'Booking', 'Produk & Operasional', 'Kelola booking jamaah', 'Calendar'),
  ('operational', 'Operasional', 'Produk & Operasional', 'Akses modul operasional', 'Box'),
  ('payments', 'Pembayaran', 'Keuangan & Akuntansi', 'Kelola verifikasi pembayaran', 'CreditCard'),
  ('customers', 'Jamaah', 'Jamaah & Agent', 'Lihat data jamaah', 'Users'),
  ('agents', 'Agen', 'Jamaah & Agent', 'Kelola agen & komisi', 'UserCheck'),
  ('master_data', 'Master Data', 'Master Data', 'Kelola hotel, maskapai, dll', 'Settings'),
  ('users', 'Users', 'Pengaturan', 'Kelola pengguna & role', 'Shield'),
  ('reports', 'Laporan', 'Laporan', 'Akses laporan & export', 'FileBarChart'),
  ('settings', 'Pengaturan', 'Pengaturan', 'Pengaturan sistem', 'Settings')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_list_group ON public.permissions_list(group_name);

-- Enable RLS on permissions_list table
ALTER TABLE public.permissions_list ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - allow authenticated users to read permissions_list
CREATE POLICY "Allow authenticated users to read permissions_list" ON public.permissions_list
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policy - allow super_admin and owner to manage permissions_list
CREATE POLICY "Allow super_admin and owner to manage permissions_list" ON public.permissions_list
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'owner')
    )
  );

-- Add audit trigger to track changes
CREATE OR REPLACE FUNCTION public.handle_permissions_list_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    created_at
  ) VALUES (
    'permissions_list',
    NEW.key,
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audit
DROP TRIGGER IF EXISTS permissions_list_audit_trigger ON public.permissions_list;
CREATE TRIGGER permissions_list_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.permissions_list
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_permissions_list_audit();

-- Update role_permissions table to add audit tracking
ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create audit trigger for role_permissions
CREATE OR REPLACE FUNCTION public.handle_role_permissions_audit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    created_at
  ) VALUES (
    'role_permissions',
    NEW.id,
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role_permissions audit
DROP TRIGGER IF EXISTS role_permissions_audit_trigger ON public.role_permissions;
CREATE TRIGGER role_permissions_audit_trigger
  BEFORE INSERT OR UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_role_permissions_audit();

-- Create view for easier permission checking
CREATE OR REPLACE VIEW public.user_permissions AS
SELECT 
  ur.user_id,
  ur.role,
  rp.permission_key,
  rp.is_enabled,
  pl.label,
  pl.group_name,
  pl.description
FROM public.user_roles ur
LEFT JOIN public.role_permissions rp ON ur.role = rp.role
LEFT JOIN public.permissions_list pl ON rp.permission_key = pl.key
WHERE ur.role NOT IN ('agent', 'customer');

-- Grant permissions on view
GRANT SELECT ON public.user_permissions TO authenticated;
