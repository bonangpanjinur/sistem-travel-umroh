-- Reorganisasi Menu Sidebar sesuai Rekomendasi UX
-- Tanggal: 2026-04-17

-- 1. Bersihkan menu-menu yang tidak perlu atau redundan
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN ('master_data', 'udac_management');

-- 2. Update Group dan Sort Order sesuai rekomendasi
-- Overview
UPDATE public.menu_items SET group_name = 'Overview', sort_order = 10 WHERE key = 'dashboard';
UPDATE public.menu_items SET group_name = 'Overview', sort_order = 20 WHERE key = 'analytics';

-- Sales & CRM
UPDATE public.menu_items SET group_name = 'Sales & CRM', sort_order = 10 WHERE key = 'leads';
UPDATE public.menu_items SET group_name = 'Sales & CRM', sort_order = 20 WHERE key = 'coupons';
UPDATE public.menu_items SET group_name = 'Sales & CRM', sort_order = 30 WHERE key = 'landing_pages';

-- Operasional
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 10 WHERE key = 'packages';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 20 WHERE key = 'departures';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 30 WHERE key = 'bookings';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 40 WHERE key = 'equipment';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 50 WHERE key = 'room_assignments';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 60 WHERE key = 'itinerary_templates';

-- Keuangan
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 10 WHERE key = 'payments';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 20 WHERE key = 'finance_cash';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 30 WHERE key = 'finance_ar';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 40 WHERE key = 'finance_ap';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 50 WHERE key = 'finance_pl';

-- Database (Master Data)
UPDATE public.menu_items SET group_name = 'Database', sort_order = 10 WHERE key = 'customers';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 20 WHERE key = 'agents';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 30 WHERE key = 'branches';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 40 WHERE key = 'muthawifs';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 50 WHERE key = 'hotels';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 60 WHERE key = 'airlines';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 70 WHERE key = 'airports';

-- SDM (HR)
UPDATE public.menu_items SET group_name = 'SDM (HR)', sort_order = 10 WHERE key = 'hr_employees';
UPDATE public.menu_items SET group_name = 'SDM (HR)', sort_order = 20 WHERE key = 'hr_payroll';
UPDATE public.menu_items SET group_name = 'SDM (HR)', sort_order = 30 WHERE key = 'hr_attendance';

-- Komunikasi
UPDATE public.menu_items SET group_name = 'Komunikasi', sort_order = 10 WHERE key = 'whatsapp';
UPDATE public.menu_items SET group_name = 'Komunikasi', sort_order = 20 WHERE key = 'support_tickets';
UPDATE public.menu_items SET group_name = 'Komunikasi', sort_order = 30 WHERE key = 'marketing_materials';

-- Sistem
UPDATE public.menu_items SET group_name = 'Sistem', sort_order = 10 WHERE key = 'users';
UPDATE public.menu_items SET group_name = 'Sistem', sort_order = 20 WHERE key = 'security_audit';
UPDATE public.menu_items SET group_name = 'Sistem', sort_order = 30 WHERE key = 'settings';
UPDATE public.menu_items SET group_name = 'Sistem', sort_order = 40 WHERE key = 'appearance';

-- Laporan (Masuk ke Sistem atau Grup Terpisah jika perlu, tapi rekomendasi biasanya masuk Sistem atau grup sendiri)
-- Sesuai rekomendasi susunan menu, Laporan bisa masuk Overview atau grup sendiri. 
-- Kita biarkan di grup 'Laporan' tapi rapikan urutannya.
UPDATE public.menu_items SET group_name = 'Laporan', sort_order = 10 WHERE key = 'reports';
UPDATE public.menu_items SET group_name = 'Laporan', sort_order = 20 WHERE key = 'advanced_reports';
UPDATE public.menu_items SET group_name = 'Laporan', sort_order = 30 WHERE key = 'scheduled_reports';
