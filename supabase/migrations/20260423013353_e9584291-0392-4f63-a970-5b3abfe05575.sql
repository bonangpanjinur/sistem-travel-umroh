
-- Seed baris kanonis website_settings agar update dari admin tidak gagal diam-diam
INSERT INTO public.website_settings (id, active_theme, template)
VALUES ('00000000-0000-0000-0000-000000000001', 'islamic', 'modern')
ON CONFLICT (id) DO NOTHING;

-- Seed baris awal contact_page_content yang merujuk ke settings utama
INSERT INTO public.contact_page_content (settings_id, hero_title, hero_subtitle, form_title, operating_hours)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Ada Pertanyaan?',
  'Tim kami siap membantu merencanakan perjalanan ibadah Anda. Hubungi kami melalui kanal di bawah ini.',
  'Kirim Pesan',
  '[
    {"label":"Senin - Jumat","value":"08:00 - 17:00"},
    {"label":"Sabtu","value":"09:00 - 14:00"},
    {"label":"Minggu","value":"Tutup"}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_page_content
  WHERE settings_id = '00000000-0000-0000-0000-000000000001'
);
