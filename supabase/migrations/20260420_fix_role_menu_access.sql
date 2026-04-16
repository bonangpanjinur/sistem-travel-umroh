-- Fix Role Menu Access and Permissions
-- Tanggal: 2026-04-20
-- Deskripsi: Menyesuaikan hak akses role agar menu sidebar tampil sesuai dengan tanggung jawab masing-masing role.

-- 1. Pastikan semua role staf memiliki akses dasar ke Dashboard & Analytics
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT r.role, p.key, true
FROM (SELECT unnest(ARRAY['branch_manager', 'finance', 'sales', 'marketing', 'operational', 'equipment', 'agent']) as role) r
CROSS JOIN (SELECT unnest(ARRAY['dashboard.view', 'analytics.view']) as key) p
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 2. Role: EQUIPMENT (Fokus pada Perlengkapan & Operasional Dasar)
-- Menu yang harus tampil: Dashboard, Analytics, Paket, Keberangkatan, Booking, Perlengkapan, Jamaah
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('equipment', 'packages.view', true),
('equipment', 'departures.view', true),
('equipment', 'bookings.view_own', true),
('equipment', 'bookings.view_all', true),
('equipment', 'operational.view', true),
('equipment', 'customers.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 3. Role: OPERATIONAL (Fokus pada Pelaksanaan Ibadah & Logistik)
-- Menu yang harus tampil: Dashboard, Analytics, Paket, Keberangkatan, Booking, Perlengkapan, Itinerary, Kamar, Jamaah, Haji, Manasik, Visa, Verifikasi Dokumen
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('operational', 'packages.view', true),
('operational', 'departures.view', true),
('operational', 'bookings.view_own', true),
('operational', 'bookings.view_all', true),
('operational', 'operational.view', true),
('operational', 'itinerary.view', true),
('operational', 'operational.rooms.view', true),
('operational', 'customers.view', true),
('operational', 'operational.manasik.view', true),
('operational', 'departures.visa.view', true),
('operational', 'documents.verification.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 4. Role: FINANCE (Fokus pada Transaksi & Laporan Keuangan)
-- Menu yang harus tampil: Dashboard, Analytics, Booking, Pembayaran, Kas & Bank, Piutang, Hutang, Laba Rugi, Payroll, Slip Gaji
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('finance', 'bookings.view_all', true),
('finance', 'payments.view_own', true),
('finance', 'payments.view_all', true),
('finance', 'finance.reports', true),
('finance', 'hr.payroll.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 5. Role: SALES (Fokus pada Leads & Penjualan)
-- Menu yang harus tampil: Dashboard, Analytics, CRM Leads, Paket, Booking, Jamaah, Agent
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('sales', 'leads.view', true),
('sales', 'packages.view', true),
('sales', 'bookings.view_own', true),
('sales', 'customers.view', true),
('sales', 'agents.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 6. Role: MARKETING (Fokus pada Promosi & Materi)
-- Menu yang harus tampil: Dashboard, Analytics, CRM Leads, Kupon, Landing Page, Loyalty, Referral, Materi Promosi
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('marketing', 'leads.view', true),
('marketing', 'marketing.view', true),
('marketing', 'marketing_materials.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 7. Role: AGENT (Fokus pada Booking Sendiri & Jamaah Sendiri)
-- Menu yang harus tampil: Dashboard, Paket, Booking (Own), Pembayaran (Own), Jamaah (Own), Referral
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('agent', 'packages.view', true),
('agent', 'bookings.view_own', true),
('agent', 'payments.view_own', true),
('agent', 'customers.view', true),
('agent', 'marketing.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 8. Role: BRANCH MANAGER (Akses Luas di Level Cabang)
-- Menu yang harus tampil: Hampir semua kecuali pengaturan sistem tingkat tinggi
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('branch_manager', 'leads.view', true),
('branch_manager', 'marketing.view', true),
('branch_manager', 'packages.view', true),
('branch_manager', 'departures.view', true),
('branch_manager', 'bookings.view_own', true),
('branch_manager', 'bookings.view_branch', true),
('branch_manager', 'operational.view', true),
('branch_manager', 'itinerary.view', true),
('branch_manager', 'operational.rooms.view', true),
('branch_manager', 'payments.view_own', true),
('branch_manager', 'payments.view_branch', true),
('branch_manager', 'finance.reports', true),
('branch_manager', 'customers.view', true),
('branch_manager', 'agents.view', true),
('branch_manager', 'settings.view', true),
('branch_manager', 'hr.employees.view', true),
('branch_manager', 'hr.attendance.view', true),
('branch_manager', 'support.tickets.view', true),
('branch_manager', 'reports.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 9. Trigger Sync: Pastikan perubahan di role_permissions langsung turun ke user_permissions
-- Fungsi sync_role_permissions_to_users sudah ada dari migrasi sebelumnya (20260416000001)
-- Kita panggil secara manual untuk memastikan semua user terupdate sekarang
SELECT public.sync_role_permissions_to_users('equipment');
SELECT public.sync_role_permissions_to_users('operational');
SELECT public.sync_role_permissions_to_users('finance');
SELECT public.sync_role_permissions_to_users('sales');
SELECT public.sync_role_permissions_to_users('marketing');
SELECT public.sync_role_permissions_to_users('agent');
SELECT public.sync_role_permissions_to_users('branch_manager');

-- 10. Perbaikan Menu Items (Jika ada yang belum terdaftar atau salah permission)
-- Pastikan menu 'role_management' dan 'user_permissions' hanya untuk super_admin/owner
-- Ini ditangani oleh is_admin() di level aplikasi atau permission 'users.view' yang ketat
UPDATE public.menu_items SET required_permission = 'settings.manage' WHERE key IN ('role_management', 'user_permissions', 'security_audit');
