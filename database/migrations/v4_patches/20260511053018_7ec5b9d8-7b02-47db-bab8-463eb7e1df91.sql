-- Add layout/overrides to website_settings
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS layout_variant jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_overrides jsonb DEFAULT '{}'::jsonb;

-- Add layout & mood metadata to theme_presets
ALTER TABLE public.theme_presets
  ADD COLUMN IF NOT EXISTS mood text DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS accent_gold text,
  ADD COLUMN IF NOT EXISTS surface_color text,
  ADD COLUMN IF NOT EXISTS radius_style text DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS density text DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS hero_variant text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS cta_variant text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS card_style text DEFAULT 'elevated',
  ADD COLUMN IF NOT EXISTS ornament text DEFAULT 'none';

-- Seed 7 themes (idempotent)
INSERT INTO public.theme_presets (slug, name, description, primary_color, secondary_color, accent_color, background_color, foreground_color, heading_font, body_font, mood, accent_gold, surface_color, radius_style, density, hero_variant, cta_variant, card_style, ornament, is_default)
VALUES
  ('classic',    'Classic Professional',  'Layout korporat dengan hero besar, statistik, dan section standar.',                   '142 70% 38%', '45 90% 50%',  '160 65% 32%', '0 0% 100%',  '142 25% 12%', 'Plus Jakarta Sans', 'Inter',                'light', NULL,           '0 0% 98%',     'soft',   'comfortable', 'classic',    'classic',    'elevated', 'none',           true),
  ('modern',     'Modern Minimalist',     'Hero split, layout horizontal lega, CTA card-style bergradasi.',                       '215 90% 50%', '215 30% 25%', '195 90% 45%', '0 0% 100%',  '220 25% 10%', 'Space Grotesk',     'Inter',                'light', NULL,           '215 30% 97%',  'sharp',  'spacious',    'split',      'gradient',   'flat',     'none',           false),
  ('luxury',     'Elegant Luxury',        'Tipografi serif, aksen emas halus, layout asimetris untuk segmen premium.',            '160 50% 22%', '40 75% 55%',  '40 65% 45%',  '40 30% 97%', '160 25% 12%', 'Playfair Display',  'Cormorant Garamond',   'sepia', '40 80% 55%',   '40 25% 94%',   'soft',   'spacious',    'asymmetric', 'serif',      'bordered', 'serif-divider',  false),
  ('islamic',    'Islamic Contemporary',  'Sentuhan ornamen Islami, search widget menonjol, layout dinamis.',
   '162 80% 28%', '45 92% 52%', '162 60% 38%', '0 0% 99%',  '162 30% 12%', 'Amiri',             'Plus Jakarta Sans',    'light', '45 92% 52%',  '162 30% 96%',  'soft',   'comfortable', 'asymmetric', 'islamic',    'glass',    'islamic',        false),
  ('futuristic', 'Futuristic Dark',       'Dark UI elegan dengan aksen neon dan elemen digital.',                                  '180 90% 55%', '280 80% 60%', '160 90% 50%', '230 25% 6%', '0 0% 96%',    'Space Grotesk',     'Inter',                'dark',  '180 90% 55%', '230 20% 10%',  'sharp',  'compact',     'neon',       'neon',       'glass',    'neon',           false),
  ('nature',     'Nature Serenity',       'Palet alam, tipografi serif lembut, bentuk organik menenangkan.',                      '152 35% 30%', '40 35% 60%',  '152 30% 45%', '60 25% 97%', '152 20% 15%', 'Playfair Display',  'Lora',                 'sepia', NULL,           '60 30% 94%',   'pill',   'spacious',    'serene',     'organic',    'flat',     'leaf',           false),
  ('royal',      'Royal Gold',            'Background gelap mewah dengan aksen emas eksklusif untuk layanan VVIP.',                '42 95% 52%',  '0 0% 8%',     '42 80% 45%',  '0 0% 4%',    '42 30% 92%',  'Cinzel',            'Cormorant Garamond',   'dark',  '42 95% 52%',   '0 0% 8%',     'soft',   'spacious',    'royal',      'gold',       'bordered', 'gold-foil',      false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  background_color = EXCLUDED.background_color,
  foreground_color = EXCLUDED.foreground_color,
  heading_font = EXCLUDED.heading_font,
  body_font = EXCLUDED.body_font,
  mood = EXCLUDED.mood,
  accent_gold = EXCLUDED.accent_gold,
  surface_color = EXCLUDED.surface_color,
  radius_style = EXCLUDED.radius_style,
  density = EXCLUDED.density,
  hero_variant = EXCLUDED.hero_variant,
  cta_variant = EXCLUDED.cta_variant,
  card_style = EXCLUDED.card_style,
  ornament = EXCLUDED.ornament;