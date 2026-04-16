-- Final Sidebar Cleanup for Super Admin
-- Tanggal: 2026-04-21
-- Deskripsi: Menghilangkan menu-menu redundan yang sudah ada di dalam tab atau modul lain.

-- 1. Sembunyikan menu HR yang sudah ada di dalam tab Manajemen HR
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN (
    'hr_attendance', 
    'hr_departments', 
    'hr_positions', 
    'hr_schedules', 
    'hr_devices', 
    'hr_settings',
    'hr_salary_slip'
);

-- 2. Sembunyikan menu Laporan yang redundan (bisa diakses dari menu Laporan utama)
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN (
    'advanced_reports', 
    'scheduled_reports'
);

-- 3. Pastikan menu sistem yang membingungkan tetap tersembunyi
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN (
    'udac_management', 
    'master_data'
);

-- 4. Update label untuk kejelasan
UPDATE public.menu_items SET label = 'Manajemen HR' WHERE key = 'hr_employees';
UPDATE public.menu_items SET label = 'Payroll' WHERE key = 'hr_payroll';
UPDATE public.menu_items SET label = 'Laporan' WHERE key = 'reports';

-- 5. Reorganisasi urutan untuk Super Admin agar lebih efisien
UPDATE public.menu_items SET sort_order = 10 WHERE key = 'dashboard';
UPDATE public.menu_items SET sort_order = 20 WHERE key = 'analytics';
