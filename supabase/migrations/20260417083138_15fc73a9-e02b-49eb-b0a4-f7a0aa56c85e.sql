-- Cleanup menu/permission drift: remove redundant entries and ensure 1:1 mapping
DELETE FROM public.user_permissions WHERE permission_key IN ('static-pages','testimonials','master-data');
DELETE FROM public.menu_items WHERE key IN ('static-pages','testimonials','master-data');
DELETE FROM public.permissions_list WHERE key IN ('static-pages','testimonials','master-data');

-- Performance index for user permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_key 
  ON public.user_permissions(user_id, permission_key);

-- Performance index for menu ordering
CREATE INDEX IF NOT EXISTS idx_menu_items_group_sort 
  ON public.menu_items(group_name, sort_order);

-- Seed website_settings default row to stop 406 errors on public homepage
INSERT INTO public.website_settings (id, active_theme, template, company_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'classic', 'Vins Tour')
ON CONFLICT (id) DO NOTHING;