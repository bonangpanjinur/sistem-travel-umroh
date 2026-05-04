-- Restore Master Data Menu and Improve Menu Organization
-- Tanggal: 2026-04-16
-- Purpose: Restore hidden menus and add Master Data with sub-items for better UX

-- =====================================================
-- 1. RESTORE HIDDEN MENUS
-- =====================================================

-- Show Master Data menu
UPDATE public.menu_items 
SET is_visible = TRUE 
WHERE key = 'master_data';

-- Show UDAC Management menu (for super_admin only)
UPDATE public.menu_items 
SET is_visible = TRUE 
WHERE key = 'udac_management';

-- =====================================================
-- 2. ADD MASTER DATA MENU ITEMS
-- =====================================================

-- Add Master Data main menu if not exists
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_data', 'Master Data', '/admin/master-data', 'Settings', 'Data Master', 10, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 10;

-- Add Master Data sub-items (these can be accessed via tabs in the Master Data page)
-- Hotel Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_hotels', 'Hotel', '/admin/master-data?tab=hotels', 'Hotel', 'Data Master', 11, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 11;

-- Airline Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_airlines', 'Maskapai', '/admin/master-data?tab=airlines', 'Plane', 'Data Master', 12, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 12;

-- Airport Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_airports', 'Bandara', '/admin/master-data?tab=airports', 'MapPin', 'Data Master', 13, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 13;

-- Muthawif Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_muthawifs', 'Muthawif', '/admin/master-data?tab=muthawifs', 'User', 'Data Master', 14, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 14;

-- Equipment Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_equipment', 'Perlengkapan', '/admin/master-data?tab=equipment', 'Package', 'Data Master', 15, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 15;

-- Coupon Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_coupons', 'Kupon', '/admin/master-data?tab=coupons', 'Ticket', 'Data Master', 16, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 16;

-- Bus Provider Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_bus', 'Bus', '/admin/master-data?tab=bus', 'Bus', 'Data Master', 17, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 17;

-- Vendor Management
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('master_vendors', 'Vendor', '/admin/master-data?tab=vendors', 'Store', 'Data Master', 18, TRUE, 'master_data.view')
ON CONFLICT (key) DO UPDATE SET 
  is_visible = TRUE,
  group_name = 'Data Master',
  sort_order = 18;

-- =====================================================
-- 3. IMPROVE MENU ORGANIZATION - ADD MISSING GROUPS
-- =====================================================

-- Add UDAC Management to Pengaturan group
UPDATE public.menu_items 
SET group_name = 'Pengaturan', sort_order = 15
WHERE key = 'udac_management';

-- Ensure all menu items have proper icons
UPDATE public.menu_items SET icon = 'Database' WHERE key = 'master_data' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'Shield' WHERE key = 'udac_management' AND icon IS NULL;

-- =====================================================
-- 4. REORGANIZE PENGATURAN GROUP - ADD MISSING ITEMS
-- =====================================================

-- Add missing settings menu items if they don't exist
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('role_management', 'Manajemen Role', '/admin/role-management', 'KeyRound', 'Pengaturan', 25, TRUE, 'users.view')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, is_visible, required_permission)
VALUES ('user_permissions', 'Hak Akses User', '/admin/user-permissions', 'UserCheck', 'Pengaturan', 26, TRUE, 'users.view')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 5. IMPROVE VISUAL CONSISTENCY - UPDATE ALL ICONS
-- =====================================================

-- Update icons for better visual consistency across all groups
UPDATE public.menu_items SET icon = 'Target' WHERE key = 'crm_leads' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'Gift' WHERE key = 'loyalty' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'Share2' WHERE key = 'referrals' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'FileText' WHERE key = 'marketing_materials' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'HeadphonesIcon' WHERE key = 'support_tickets' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'MessageSquare' WHERE key = 'whatsapp' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'FileCheck' WHERE key = 'document_verification' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'FileText' WHERE key = 'documents_generator' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'BookOpen' WHERE key = 'offline_content' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'FileBarChart' WHERE key = 'reports' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'TrendingUp' WHERE key = 'advanced_reports' AND icon IS NULL;
UPDATE public.menu_items SET icon = 'Calendar' WHERE key = 'scheduled_reports' AND icon IS NULL;

-- =====================================================
-- 6. ENSURE DATA MASTER GROUP EXISTS WITH PROPER ORGANIZATION
-- =====================================================

-- Re-order all Data Master items
UPDATE public.menu_items SET sort_order = 10 WHERE key = 'master_data';
UPDATE public.menu_items SET sort_order = 11 WHERE key = 'master_hotels';
UPDATE public.menu_items SET sort_order = 12 WHERE key = 'master_airlines';
UPDATE public.menu_items SET sort_order = 13 WHERE key = 'master_airports';
UPDATE public.menu_items SET sort_order = 14 WHERE key = 'master_muthawifs';
UPDATE public.menu_items SET sort_order = 15 WHERE key = 'master_equipment';
UPDATE public.menu_items SET sort_order = 16 WHERE key = 'master_coupons';
UPDATE public.menu_items SET sort_order = 17 WHERE key = 'master_bus';
UPDATE public.menu_items SET sort_order = 18 WHERE key = 'master_vendors';
