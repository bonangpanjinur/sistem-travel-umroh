-- Fix Role Menu Access and Permissions
-- Tanggal: 2026-04-20
-- Deskripsi: Menyesuaikan hak akses role agar menu sidebar tampil sesuai dengan tanggung jawab masing-masing role.

-- 1. Pastikan semua role staf memiliki akses dasar ke Dashboard & Analytics
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT r.role::public.app_role, p.key, true
FROM (SELECT unnest(ARRAY['branch_manager', 'finance', 'sales', 'marketing', 'operational', 'equipment', 'agent']::text[]) as role) r
CROSS JOIN (SELECT unnest(ARRAY['dashboard.view', 'analytics.view']::text[]) as key) p
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 2. Role: EQUIPMENT (Fokus pada Perlengkapan & Operasional Dasar)
-- Menu yang harus tampil: Dashboard, Analytics, Paket, Keberangkatan, Booking, Perlengkapan, Jamaah
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('equipment'::public.app_role, 'packages.view', true),
('equipment'::public.app_role, 'departures.view', true),
('equipment'::public.app_role, 'bookings.view_own', true),
('equipment'::public.app_role, 'bookings.view_all', true),
('equipment'::public.app_role, 'operational.view', true),
('equipment'::public.app_role, 'customers.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 3. Role: OPERATIONAL (Fokus pada Pelaksanaan Ibadah & Logistik)
-- Menu yang harus tampil: Dashboard, Analytics, Paket, Keberangkatan, Booking, Perlengkapan, Itinerary, Kamar, Jamaah, Haji, Manasik, Visa, Verifikasi Dokumen
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('operational'::public.app_role, 'packages.view', true),
('operational'::public.app_role, 'departures.view', true),
('operational'::public.app_role, 'bookings.view_own', true),
('operational'::public.app_role, 'bookings.view_all', true),
('operational'::public.app_role, 'operational.view', true),
('operational'::public.app_role, 'itinerary.view', true),
('operational'::public.app_role, 'operational.rooms.view', true),
('operational'::public.app_role, 'customers.view', true),
('operational'::public.app_role, 'operational.manasik.view', true),
('operational'::public.app_role, 'departures.visa.view', true),
('operational'::public.app_role, 'documents.verification.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 4. Role: FINANCE (Fokus pada Transaksi & Laporan Keuangan)
-- Menu yang harus tampil: Dashboard, Analytics, Booking, Pembayaran, Kas & Bank, Piutang, Hutang, Laba Rugi, Payroll, Slip Gaji
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('finance'::public.app_role, 'bookings.view_all', true),
('finance'::public.app_role, 'payments.view_own', true),
('finance'::public.app_role, 'payments.view_all', true),
('finance'::public.app_role, 'finance.reports', true),
('finance'::public.app_role, 'hr.payroll.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 5. Role: SALES (Fokus pada Leads & Penjualan)
-- Menu yang harus tampil: Dashboard, Analytics, CRM Leads, Paket, Booking, Jamaah, Agent
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('sales'::public.app_role, 'leads.view', true),
('sales'::public.app_role, 'packages.view', true),
('sales'::public.app_role, 'bookings.view_own', true),
('sales'::public.app_role, 'customers.view', true),
('sales'::public.app_role, 'agents.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 6. Role: MARKETING (Fokus pada Promosi & Materi)
-- Menu yang harus tampil: Dashboard, Analytics, CRM Leads, Kupon, Landing Page, Loyalty, Referral, Materi Promosi
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('marketing'::public.app_role, 'leads.view', true),
('marketing'::public.app_role, 'marketing.view', true),
('marketing'::public.app_role, 'marketing_materials.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 7. Role: AGENT (Fokus pada Booking Sendiri & Jamaah Sendiri)
-- Menu yang harus tampil: Dashboard, Paket, Booking (Own), Pembayaran (Own), Jamaah (Own), Referral
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('agent'::public.app_role, 'packages.view', true),
('agent'::public.app_role, 'bookings.view_own', true),
('agent'::public.app_role, 'payments.view_own', true),
('agent'::public.app_role, 'customers.view', true),
('agent'::public.app_role, 'marketing.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 8. Role: BRANCH MANAGER (Akses Luas di Level Cabang)
-- Menu yang harus tampil: Hampir semua kecuali pengaturan sistem tingkat tinggi
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('branch_manager'::public.app_role, 'leads.view', true),
('branch_manager'::public.app_role, 'marketing.view', true),
('branch_manager'::public.app_role, 'packages.view', true),
('branch_manager'::public.app_role, 'departures.view', true),
('branch_manager'::public.app_role, 'bookings.view_own', true),
('branch_manager'::public.app_role, 'bookings.view_branch', true),
('branch_manager'::public.app_role, 'operational.view', true),
('branch_manager'::public.app_role, 'itinerary.view', true),
('branch_manager'::public.app_role, 'operational.rooms.view', true),
('branch_manager'::public.app_role, 'payments.view_own', true),
('branch_manager'::public.app_role, 'payments.view_branch', true),
('branch_manager'::public.app_role, 'finance.reports', true),
('branch_manager'::public.app_role, 'customers.view', true),
('branch_manager'::public.app_role, 'agents.view', true),
('branch_manager'::public.app_role, 'settings.view', true),
('branch_manager'::public.app_role, 'hr.employees.view', true),
('branch_manager'::public.app_role, 'hr.attendance.view', true),
('branch_manager'::public.app_role, 'support.tickets.view', true),
('branch_manager'::public.app_role, 'reports.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 9. Trigger Sync: Pastikan perubahan di role_permissions langsung turun ke user_permissions
-- Fungsi sync_role_permissions_to_users sudah ada dari migrasi sebelumnya (20260416000001)
-- Kita panggil secara manual untuk memastikan semua user terupdate sekarang
SELECT public.sync_role_permissions_to_users('branch_manager'::public.app_role);
SELECT public.sync_role_permissions_to_users('finance'::public.app_role);
SELECT public.sync_role_permissions_to_users('sales'::public.app_role);
SELECT public.sync_role_permissions_to_users('marketing'::public.app_role);
SELECT public.sync_role_permissions_to_users('operational'::public.app_role);
SELECT public.sync_role_permissions_to_users('equipment'::public.app_role);
SELECT public.sync_role_permissions_to_users('agent'::public.app_role);

-- 10. Perbaikan Menu Items (Jika ada yang belum terdaftar atau salah permission)
-- Pastikan menu 'role_management' dan 'user_permissions' hanya untuk super_admin/owner
-- Ini ditangani oleh is_admin() di level aplikasi atau permission 'users.view' yang ketat
UPDATE public.menu_items SET required_permission = 'settings.manage' WHERE key IN ('role_management', 'user_permissions', 'security_audit');
