-- Remove Root Access Menus (Users, Security Audit, 2FA Settings)
-- Tanggal: 2026-04-16
-- Deskripsi: Menyembunyikan menu-menu yang berkaitan dengan hak akses root/admin tingkat tinggi karena tidak diperlukan oleh user saat ini.

-- 1. Sembunyikan menu Users
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key = 'users';

-- 2. Sembunyikan menu Security Audit
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key = 'security_audit';

-- 3. Sembunyikan menu 2FA Settings
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key = '2fa_settings';

-- 4. Sembunyikan menu Manajemen Hak Akses (Role & User) yang mungkin masih aktif
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN ('role_management', 'user_permissions', 'udac_management');

-- 5. Pastikan menu Master Data juga tetap tersembunyi jika ada
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key = 'master_data';
