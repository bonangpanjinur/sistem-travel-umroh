-- Restore All Menus and Update RLS Policy for Super Admin
-- Tanggal: 2026-04-20
-- Deskripsi: Memastikan semua menu terlihat dan dapat diakses oleh super admin.

-- 1. Set all menu items to be visible
UPDATE public.menu_items 
SET is_visible = TRUE;

-- 2. Update RLS Policy for menu_items to allow super_admin to see everything
-- First, drop the existing policy if it exists
DROP POLICY IF EXISTS "Enable read access for all users" ON public.menu_items;
DROP POLICY IF EXISTS "Users can view visible menu items" ON public.menu_items;

-- Create a new policy that allows:
-- - Super admins to see ALL rows
-- - Other users to see only rows where is_visible = TRUE
CREATE POLICY "Menu items access policy" ON public.menu_items
FOR SELECT
USING (
  (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  OR 
  is_visible = TRUE
);

-- 3. Ensure critical menus are explicitly enabled
UPDATE public.menu_items 
SET is_visible = TRUE 
WHERE key IN ('users', 'security_audit', '2fa_settings', 'role_management', 'user_permissions', 'udac_management', 'master_data');
