-- Create savings_page_content table
CREATE TABLE IF NOT EXISTS public.savings_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID REFERENCES public.website_settings(id) ON DELETE CASCADE,
  hero_title TEXT,
  hero_subtitle TEXT,
  benefits JSONB,
  cta_title TEXT,
  cta_subtitle TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create contact_page_content table
CREATE TABLE IF NOT EXISTS public.contact_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID REFERENCES public.website_settings(id) ON DELETE CASCADE,
  hero_title TEXT,
  hero_subtitle TEXT,
  form_title TEXT,
  operating_hours JSONB,
  map_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_savings_settings_id ON public.savings_page_content(settings_id);
CREATE INDEX IF NOT EXISTS idx_contact_settings_id ON public.contact_page_content(settings_id);

-- RLS
ALTER TABLE public.savings_page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_page_content ENABLE ROW LEVEL SECURITY;

-- Policies for savings_page_content
CREATE POLICY "Public read savings content" ON public.savings_page_content FOR SELECT USING (true);
CREATE POLICY "Insert savings content" ON public.savings_page_content FOR INSERT WITH CHECK (
  auth.uid() = (SELECT ws.user_id FROM public.website_settings ws WHERE ws.id = settings_id)
);
CREATE POLICY "Update own savings content" ON public.savings_page_content FOR UPDATE USING (
  auth.uid() = (SELECT ws.user_id FROM public.website_settings ws WHERE ws.id = settings_id)
);
CREATE POLICY "Delete own savings content" ON public.savings_page_content FOR DELETE USING (
  auth.uid() = (SELECT ws.user_id FROM public.website_settings ws WHERE ws.id = settings_id)
);

-- Policies for contact_page_content
CREATE POLICY "Public read contact content" ON public.contact_page_content FOR SELECT USING (true);
CREATE POLICY "Insert contact content" ON public.contact_page_content FOR INSERT WITH CHECK (
  auth.uid() = (SELECT ws.user_id FROM public.website_settings ws WHERE ws.id = settings_id)
);
CREATE POLICY "Update own contact content" ON public.contact_page_content FOR UPDATE USING (
  auth.uid() = (SELECT ws.user_id FROM public.website_settings ws WHERE ws.id = settings_id)
);
CREATE POLICY "Delete own contact content" ON public.contact_page_content FOR DELETE USING (
  auth.uid() = (SELECT ws.user_id FROM public.website_settings ws WHERE ws.id = settings_id)
);

-- Triggers for updated_at
CREATE TRIGGER update_savings_page_updated_at BEFORE UPDATE ON public.savings_page_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contact_page_updated_at BEFORE UPDATE ON public.contact_page_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
