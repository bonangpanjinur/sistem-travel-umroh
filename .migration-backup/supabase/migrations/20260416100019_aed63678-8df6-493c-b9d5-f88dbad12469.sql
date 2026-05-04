
-- 1. package_types table
CREATE TABLE public.package_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.package_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read package_types" ON public.package_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage package_types" ON public.package_types FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_package_types_updated_at BEFORE UPDATE ON public.package_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default package types
INSERT INTO public.package_types (code, name, description, display_order) VALUES
  ('umroh', 'Umroh', 'Paket umroh reguler', 1),
  ('haji', 'Haji Reguler', 'Paket haji reguler', 2),
  ('haji_plus', 'Haji Plus', 'Paket haji dengan fasilitas tambahan', 3),
  ('umroh_plus', 'Umroh Plus', 'Paket umroh dengan fasilitas tambahan', 4);

-- 2. about_page_content table
CREATE TABLE public.about_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id TEXT NOT NULL,
  mission_text TEXT,
  vision_text TEXT,
  values JSONB,
  milestones JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.about_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read about_page_content" ON public.about_page_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage about_page_content" ON public.about_page_content FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_about_page_content_updated_at BEFORE UPDATE ON public.about_page_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. contact_page_content table
CREATE TABLE public.contact_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id TEXT NOT NULL,
  hero_title TEXT,
  hero_subtitle TEXT,
  form_title TEXT,
  operating_hours JSONB,
  map_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contact_page_content" ON public.contact_page_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage contact_page_content" ON public.contact_page_content FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_contact_page_content_updated_at BEFORE UPDATE ON public.contact_page_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. savings_page_content table
CREATE TABLE public.savings_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id TEXT NOT NULL,
  hero_title TEXT,
  hero_subtitle TEXT,
  benefits JSONB,
  cta_title TEXT,
  cta_subtitle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read savings_page_content" ON public.savings_page_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage savings_page_content" ON public.savings_page_content FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_savings_page_content_updated_at BEFORE UPDATE ON public.savings_page_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. landing_pages table
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_source_type TEXT NOT NULL DEFAULT 'global',
  whatsapp_agent_id UUID REFERENCES public.agents(id),
  whatsapp_custom_number TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published landing pages are public" ON public.landing_pages FOR SELECT USING (is_published = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage landing_pages" ON public.landing_pages FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT,
  group_name TEXT NOT NULL DEFAULT 'Lainnya',
  sort_order INTEGER NOT NULL DEFAULT 0,
  required_permission TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read menu_items" ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage menu_items" ON public.menu_items FOR ALL USING (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. bulk_sync_menu_items function
CREATE OR REPLACE FUNCTION public.bulk_sync_menu_items(_menu_items TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  items JSONB;
  item JSONB;
BEGIN
  items := _menu_items::jsonb;
  
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, required_permission)
    VALUES (
      item->>'key',
      item->>'label',
      item->>'path',
      item->>'icon',
      COALESCE(item->>'group_name', 'Lainnya'),
      COALESCE((item->>'sort_order')::integer, 0),
      item->>'required_permission'
    )
    ON CONFLICT (key) DO UPDATE SET
      label = EXCLUDED.label,
      path = EXCLUDED.path,
      icon = EXCLUDED.icon,
      group_name = EXCLUDED.group_name,
      sort_order = EXCLUDED.sort_order,
      required_permission = EXCLUDED.required_permission,
      updated_at = now();
  END LOOP;
END;
$$;
