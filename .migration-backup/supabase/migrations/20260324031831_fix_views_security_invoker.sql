-- Fix views defined with SECURITY DEFINER property to use SECURITY INVOKER
-- This ensures that views enforce Postgres permissions and row level security policies (RLS) 
-- of the querying user, rather than that of the view creator.

-- 1. Fix public.user_permissions
DROP VIEW IF EXISTS public.user_permissions;
CREATE VIEW public.user_permissions 
WITH (security_invoker = true)
AS
SELECT 
  ur.user_id,
  ur.role,
  rp.permission_key,
  rp.is_enabled,
  pl.label,
  pl.group_name,
  pl.description
FROM public.user_roles ur
LEFT JOIN public.role_permissions rp ON ur.role = rp.role
LEFT JOIN public.permissions_list pl ON rp.permission_key = pl.key
WHERE ur.role NOT IN ('agent', 'customer');

-- 2. Fix public.active_pics
DROP VIEW IF EXISTS public.active_pics;
CREATE VIEW public.active_pics
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  agent_code,
  company_name,
  avatar_url,
  specialization,
  location,
  description,
  is_active,
  created_at,
  updated_at
FROM public.agents
WHERE is_active = true AND is_pic = true;

-- 3. Fix public.pic_packages
DROP VIEW IF EXISTS public.pic_packages;
CREATE VIEW public.pic_packages
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.package_type,
  p.duration_days,
  p.price_base,
  p.featured_image,
  a.id as pic_id,
  a.agent_code,
  a.company_name,
  a.avatar_url,
  a.specialization,
  a.location
FROM public.packages p
LEFT JOIN public.agents a ON p.pic_id = a.id
WHERE a.is_active = true AND a.is_pic = true;

-- Re-grant permissions
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT SELECT ON public.active_pics TO anon, authenticated;
GRANT SELECT ON public.pic_packages TO anon, authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.user_permissions IS 'View for user permissions with security_invoker enabled';
COMMENT ON VIEW public.active_pics IS 'View for active PICs with security_invoker enabled';
COMMENT ON VIEW public.pic_packages IS 'View for PIC packages with security_invoker enabled';
