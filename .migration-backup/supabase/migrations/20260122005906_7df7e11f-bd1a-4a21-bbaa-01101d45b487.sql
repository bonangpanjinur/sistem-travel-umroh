
-- Create table for website appearance settings
CREATE TABLE public.website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Theme selection
  active_theme text NOT NULL DEFAULT 'emerald',
  
  -- Branding
  company_name text DEFAULT 'Extraordinary Umroh',
  tagline text DEFAULT 'Perjalanan Spiritual Menuju Baitullah',
  logo_url text,
  favicon_url text,
  
  -- Colors (stored as HSL values)
  primary_color text DEFAULT '142 70% 45%',
  secondary_color text DEFAULT '45 93% 47%',
  accent_color text DEFAULT '142 60% 35%',
  background_color text DEFAULT '0 0% 100%',
  foreground_color text DEFAULT '142 20% 10%',
  
  -- Typography
  heading_font text DEFAULT 'Plus Jakarta Sans',
  body_font text DEFAULT 'Inter',
  
  -- Homepage sections (order and visibility)
  homepage_sections jsonb DEFAULT '[
    {"id": "hero", "title": "Hero Banner", "enabled": true, "order": 1},
    {"id": "featured_packages", "title": "Paket Unggulan", "enabled": true, "order": 2},
    {"id": "why_choose_us", "title": "Mengapa Memilih Kami", "enabled": true, "order": 3},
    {"id": "testimonials", "title": "Testimoni", "enabled": true, "order": 4},
    {"id": "cta", "title": "Call to Action", "enabled": true, "order": 5}
  ]'::jsonb,
  
  -- Hero section content
  hero_title text DEFAULT 'Wujudkan Perjalanan Spiritual Anda',
  hero_subtitle text DEFAULT 'Pengalaman umroh dan haji terbaik dengan pelayanan profesional dan bimbingan ustadz berpengalaman',
  hero_image_url text,
  hero_cta_text text DEFAULT 'Lihat Paket',
  hero_cta_link text DEFAULT '/packages',
  
  -- Footer content
  footer_address text,
  footer_phone text,
  footer_email text,
  footer_whatsapp text,
  social_instagram text,
  social_facebook text,
  social_youtube text,
  social_tiktok text,
  
  -- SEO
  meta_title text DEFAULT 'Extraordinary Umroh - Perjalanan Spiritual Menuju Baitullah',
  meta_description text DEFAULT 'Layanan perjalanan umroh dan haji terpercaya dengan pengalaman bertahun-tahun melayani jamaah Indonesia',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read website settings (for public website)
CREATE POLICY "Anyone can view website settings" 
ON public.website_settings FOR SELECT 
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can manage website settings" 
ON public.website_settings FOR ALL 
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_website_settings_updated_at
BEFORE UPDATE ON public.website_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.website_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001');

-- Create theme presets table
CREATE TABLE public.theme_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  preview_image_url text,
  
  -- Theme colors
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  accent_color text NOT NULL,
  background_color text NOT NULL DEFAULT '0 0% 100%',
  foreground_color text NOT NULL DEFAULT '0 0% 5%',
  
  -- Typography
  heading_font text DEFAULT 'Plus Jakarta Sans',
  body_font text DEFAULT 'Inter',
  
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for theme_presets
ALTER TABLE public.theme_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view theme presets" 
ON public.theme_presets FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage theme presets" 
ON public.theme_presets FOR ALL 
USING (is_admin(auth.uid()));

-- Insert 3 default theme presets
INSERT INTO public.theme_presets (name, slug, description, primary_color, secondary_color, accent_color, background_color, foreground_color, heading_font, body_font, is_default) VALUES
('Emerald Classic', 'emerald', 'Tema hijau zamrud yang elegan dan spiritual, cocok untuk nuansa Islami', '142 70% 45%', '45 93% 47%', '142 60% 35%', '0 0% 100%', '142 20% 10%', 'Plus Jakarta Sans', 'Inter', true),
('Royal Blue', 'royal', 'Tema biru royal yang profesional dan mewah', '220 70% 50%', '45 93% 47%', '220 60% 40%', '220 20% 98%', '220 20% 10%', 'Poppins', 'Open Sans', false),
('Desert Gold', 'desert', 'Tema emas pasir gurun yang hangat dan klasik', '35 80% 45%', '35 60% 30%', '35 90% 55%', '35 30% 98%', '35 30% 10%', 'Playfair Display', 'Lato', false);
