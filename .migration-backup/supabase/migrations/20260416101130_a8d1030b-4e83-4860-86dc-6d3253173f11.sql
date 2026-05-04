
-- Drop role_permissions table
DROP TABLE IF EXISTS public.role_permissions CASCADE;

-- Create permissions_list master table
CREATE TABLE public.permissions_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'Lainnya',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions_list ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read permissions list
CREATE POLICY "Authenticated users can view permissions_list"
  ON public.permissions_list FOR SELECT TO authenticated USING (true);

-- Only super_admin can manage
CREATE POLICY "Super admin can manage permissions_list"
  ON public.permissions_list FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions_list(key) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything on user_permissions
CREATE POLICY "Super admin can manage user_permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Users can read their own permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Function to check user permission (default ALLOW if no override)
CREATE OR REPLACE FUNCTION public.check_user_permission(_user_id uuid, _permission_key text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.user_permissions WHERE user_id = _user_id AND permission_key = _permission_key),
    true
  );
$$;

-- Seed permissions_list from existing menu_items
INSERT INTO public.permissions_list (key, label, group_name, description)
SELECT 
  m.required_permission,
  m.label,
  m.group_name,
  'Akses menu ' || m.label
FROM public.menu_items m
WHERE m.required_permission IS NOT NULL
  AND m.required_permission != ''
ON CONFLICT (key) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_permissions_list_updated_at
  BEFORE UPDATE ON public.permissions_list
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
