-- Cleanup Redundant Menu Items
-- Tanggal: 2026-04-21
-- Deskripsi: Menghapus atau menyembunyikan menu-menu yang memiliki kunci ganda (seperti landing_pages vs landing-pages) 
-- agar sidebar admin bersih dan tidak membingungkan.

-- 1. Identifikasi dan sembunyikan menu dengan kunci lama (snake_case) yang sudah digantikan oleh kunci baru (kebab-case)
-- Menu 'landing_pages' (lama) digantikan oleh 'landing-pages' (baru)
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN ('landing_pages', 'crm_leads', 'itinerary_templates', 'support_tickets', 'finance_reports', 'finance_pl');

-- 2. Pastikan menu dengan kunci baru (kebab-case) terlihat dan berada di grup yang benar
UPDATE public.menu_items 
SET is_visible = TRUE, 
    group_name = 'Sales & CRM',
    sort_order = 3
WHERE key = 'landing-pages';

UPDATE public.menu_items 
SET is_visible = TRUE, 
    group_name = 'Sales & CRM',
    sort_order = 1
WHERE key = 'leads';

-- 3. Sembunyikan menu sistem yang redundan atau tidak diperlukan di sidebar utama
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN ('udac_management', 'master_data', 'hr_settings', 'static_pages');

-- 4. Perbaiki label untuk konsistensi
UPDATE public.menu_items SET label = 'CRM Leads' WHERE key = 'leads';
UPDATE public.menu_items SET label = 'Landing Page' WHERE key = 'landing-pages';
UPDATE public.menu_items SET label = 'Kupon' WHERE key = 'coupons';

-- 5. Reorganisasi urutan grup Sales & CRM agar rapi
UPDATE public.menu_items SET sort_order = 1 WHERE key = 'leads';
UPDATE public.menu_items SET sort_order = 2 WHERE key = 'coupons';
UPDATE public.menu_items SET sort_order = 3 WHERE key = 'landing-pages';
