/**
 * Migration: Dashboard Access Configuration
 * 
 * Membuat tabel untuk menyimpan konfigurasi akses dashboard per peran.
 * Memungkinkan super_admin untuk mengatur modul dashboard mana yang dapat diakses oleh setiap peran.
 */

-- Table: dashboard_access_config
-- Menyimpan konfigurasi akses dashboard untuk setiap peran
CREATE TABLE IF NOT EXISTS dashboard_access_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  enabled_modules TEXT[] NOT NULL DEFAULT '{}',
  disabled_modules TEXT[] NOT NULL DEFAULT '{}',
  default_dashboard TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Table: dashboard_access_audit_log
-- Audit trail untuk perubahan konfigurasi akses dashboard
CREATE TABLE IF NOT EXISTS dashboard_access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  action TEXT NOT NULL, -- 'enable_module', 'disable_module', 'set_default'
  module_key TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dashboard_access_config_role ON dashboard_access_config(role);
CREATE INDEX IF NOT EXISTS idx_dashboard_access_config_active ON dashboard_access_config(is_active);
CREATE INDEX IF NOT EXISTS idx_dashboard_access_audit_log_role ON dashboard_access_audit_log(role);
CREATE INDEX IF NOT EXISTS idx_dashboard_access_audit_log_changed_at ON dashboard_access_audit_log(changed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE dashboard_access_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_access_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dashboard_access_config
-- Super admin dapat melihat dan mengubah semua konfigurasi
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'super_admin_can_manage_dashboard_config') THEN
        CREATE POLICY "super_admin_can_manage_dashboard_config" ON dashboard_access_config
          FOR ALL
          USING (
            auth.uid() IN (
              SELECT user_id FROM user_roles WHERE role = 'super_admin'::app_role
            )
          )
          WITH CHECK (
            auth.uid() IN (
              SELECT user_id FROM user_roles WHERE role = 'super_admin'::app_role
            )
          );
    END IF;
END $$;

-- Staff dapat melihat konfigurasi untuk peran mereka sendiri
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'staff_can_view_own_dashboard_config') THEN
        CREATE POLICY "staff_can_view_own_dashboard_config" ON dashboard_access_config
          FOR SELECT
          USING (
            role IN (
              SELECT role FROM user_roles WHERE user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- RLS Policies for dashboard_access_audit_log
-- Super admin dapat melihat semua audit log
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'super_admin_can_view_dashboard_audit_log') THEN
        CREATE POLICY "super_admin_can_view_dashboard_audit_log" ON dashboard_access_audit_log
          FOR SELECT
          USING (
            auth.uid() IN (
              SELECT user_id FROM user_roles WHERE role = 'super_admin'::app_role
            )
          );
    END IF;
END $$;

-- Super admin dapat membuat audit log
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'super_admin_can_create_dashboard_audit_log') THEN
        CREATE POLICY "super_admin_can_create_dashboard_audit_log" ON dashboard_access_audit_log
          FOR INSERT
          WITH CHECK (
            auth.uid() IN (
              SELECT user_id FROM user_roles WHERE role = 'super_admin'::app_role
            )
          );
    END IF;
END $$;

-- Insert default configurations for all roles
INSERT INTO dashboard_access_config (role, enabled_modules, disabled_modules, default_dashboard)
VALUES
  ('super_admin'::app_role, ARRAY['admin_main', 'admin_analytics', 'branch_manager_dashboard', 'finance_dashboard', 'sales_dashboard', 'marketing_dashboard', 'equipment_dashboard', 'operational_dashboard'], ARRAY[]::TEXT[], 'admin_main'),
  ('owner'::app_role, ARRAY['admin_main', 'admin_analytics', 'branch_manager_dashboard', 'finance_dashboard', 'sales_dashboard', 'marketing_dashboard', 'equipment_dashboard', 'operational_dashboard'], ARRAY[]::TEXT[], 'admin_main'),
  ('branch_manager'::app_role, ARRAY['branch_manager_dashboard'], ARRAY[]::TEXT[], 'branch_manager_dashboard'),
  ('finance'::app_role, ARRAY['finance_dashboard'], ARRAY[]::TEXT[], 'finance_dashboard'),
  ('sales'::app_role, ARRAY['sales_dashboard'], ARRAY[]::TEXT[], 'sales_dashboard'),
  ('marketing'::app_role, ARRAY['marketing_dashboard'], ARRAY[]::TEXT[], 'marketing_dashboard'),
  ('operational'::app_role, ARRAY['operational_dashboard'], ARRAY[]::TEXT[], 'operational_dashboard'),
  ('equipment'::app_role, ARRAY['equipment_dashboard'], ARRAY[]::TEXT[], 'equipment_dashboard'),
  ('agent'::app_role, ARRAY['agent_dashboard'], ARRAY[]::TEXT[], 'agent_dashboard'),
  ('customer'::app_role, ARRAY['customer_dashboard'], ARRAY[]::TEXT[], 'customer_dashboard')
ON CONFLICT (role) DO NOTHING;
