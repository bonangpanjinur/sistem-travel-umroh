-- 1. Create role_permissions table for menu access control
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Add muthawif_id and team_leader_id to departures table
ALTER TABLE public.departures 
ADD COLUMN muthawif_id UUID REFERENCES public.muthawifs(id) ON DELETE SET NULL,
ADD COLUMN team_leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Insert default permissions for all roles
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
-- Super Admin - full access
('super_admin', 'dashboard', true),
('super_admin', 'analytics', true),
('super_admin', 'packages', true),
('super_admin', 'departures', true),
('super_admin', 'bookings', true),
('super_admin', 'payments', true),
('super_admin', 'customers', true),
('super_admin', 'leads', true),
('super_admin', 'master_data', true),
('super_admin', 'users', true),
('super_admin', 'agents', true),
('super_admin', 'reports', true),
('super_admin', 'settings', true),
('super_admin', 'operational', true),

-- Owner - almost full access
('owner', 'dashboard', true),
('owner', 'analytics', true),
('owner', 'packages', true),
('owner', 'departures', true),
('owner', 'bookings', true),
('owner', 'payments', true),
('owner', 'customers', true),
('owner', 'leads', true),
('owner', 'master_data', true),
('owner', 'users', true),
('owner', 'agents', true),
('owner', 'reports', true),
('owner', 'settings', true),
('owner', 'operational', true),

-- Branch Manager
('branch_manager', 'dashboard', true),
('branch_manager', 'analytics', true),
('branch_manager', 'packages', true),
('branch_manager', 'departures', true),
('branch_manager', 'bookings', true),
('branch_manager', 'payments', true),
('branch_manager', 'customers', true),
('branch_manager', 'leads', true),
('branch_manager', 'master_data', false),
('branch_manager', 'users', true),
('branch_manager', 'agents', true),
('branch_manager', 'reports', true),
('branch_manager', 'settings', false),
('branch_manager', 'operational', true),

-- Finance
('finance', 'dashboard', true),
('finance', 'analytics', false),
('finance', 'packages', false),
('finance', 'departures', false),
('finance', 'bookings', true),
('finance', 'payments', true),
('finance', 'customers', true),
('finance', 'leads', false),
('finance', 'master_data', false),
('finance', 'users', false),
('finance', 'agents', true),
('finance', 'reports', true),
('finance', 'settings', false),
('finance', 'operational', false),

-- Operational
('operational', 'dashboard', true),
('operational', 'analytics', false),
('operational', 'packages', true),
('operational', 'departures', true),
('operational', 'bookings', true),
('operational', 'payments', false),
('operational', 'customers', true),
('operational', 'leads', false),
('operational', 'master_data', false),
('operational', 'users', false),
('operational', 'agents', false),
('operational', 'reports', true),
('operational', 'settings', false),
('operational', 'operational', true),

-- Sales
('sales', 'dashboard', true),
('sales', 'analytics', false),
('sales', 'packages', true),
('sales', 'departures', true),
('sales', 'bookings', true),
('sales', 'payments', false),
('sales', 'customers', true),
('sales', 'leads', true),
('sales', 'master_data', false),
('sales', 'users', false),
('sales', 'agents', false),
('sales', 'reports', false),
('sales', 'settings', false),
('sales', 'operational', false),

-- Marketing
('marketing', 'dashboard', true),
('marketing', 'analytics', true),
('marketing', 'packages', true),
('marketing', 'departures', true),
('marketing', 'bookings', false),
('marketing', 'payments', false),
('marketing', 'customers', false),
('marketing', 'leads', true),
('marketing', 'master_data', false),
('marketing', 'users', false),
('marketing', 'agents', false),
('marketing', 'reports', true),
('marketing', 'settings', false),
('marketing', 'operational', false),

-- Equipment
('equipment', 'dashboard', true),
('equipment', 'analytics', false),
('equipment', 'packages', false),
('equipment', 'departures', true),
('equipment', 'bookings', true),
('equipment', 'payments', false),
('equipment', 'customers', true),
('equipment', 'leads', false),
('equipment', 'master_data', false),
('equipment', 'users', false),
('equipment', 'agents', false),
('equipment', 'reports', false),
('equipment', 'settings', false),
('equipment', 'operational', true)

ON CONFLICT (role, permission_key) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();