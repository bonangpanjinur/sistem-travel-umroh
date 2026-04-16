-- 1. Pastikan semua role staf bisa melihat Dashboard & Analytics dasar
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT r.role, p.key, true
FROM (SELECT unnest(ARRAY['branch_manager', 'finance', 'sales', 'marketing', 'operational', 'equipment']) as role) r
CROSS JOIN (SELECT unnest(ARRAY['dashboard.view', 'analytics.view']) as key) p
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 2. Sinkronisasi spesifik untuk role 'equipment'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('equipment', 'operational.view', true),
('equipment', 'bookings.view_own', true),
('equipment', 'bookings.view_all', true),
('equipment', 'packages.view', true),
('equipment', 'customers.view', true),
('equipment', 'departures.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 3. Sinkronisasi untuk role 'operational'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('operational', 'operational.view', true),
('operational', 'bookings.view_own', true),
('operational', 'bookings.view_all', true),
('operational', 'departures.view', true),
('operational', 'itinerary.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 4. Sinkronisasi untuk role 'finance'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('finance', 'payments.view_own', true),
('finance', 'payments.view_all', true),
('finance', 'finance.reports', true),
('finance', 'bookings.view_all', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 5. Sinkronisasi untuk role 'sales' & 'marketing'
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('sales', 'leads.view', true),
('sales', 'bookings.view_own', true),
('sales', 'customers.view', true),
('marketing', 'leads.view', true),
('marketing', 'marketing.view', true),
('marketing', 'analytics.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;
