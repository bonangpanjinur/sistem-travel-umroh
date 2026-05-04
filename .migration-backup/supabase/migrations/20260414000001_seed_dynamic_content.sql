-- Seed data for dynamic content based on frontend defaults
-- Target settings_id: 00000000-0000-0000-0000-000000000001

-- 1. About Page Content
INSERT INTO public.about_page_content (
  settings_id, 
  mission_text, 
  vision_text, 
  values, 
  milestones
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Memberikan layanan umroh dan haji berkualitas tinggi, menyediakan pembimbing ibadah yang kompeten, mengutamakan kenyamanan dan keamanan jamaah, dan inovasi teknologi untuk kemudahan jamaah.',
  'Menjadi biro perjalanan umroh dan haji terdepan di Indonesia yang memberikan pelayanan terbaik dengan standar internasional, serta menjadi mitra terpercaya umat Islam dalam menunaikan ibadah ke Tanah Suci.',
  '[
    {"icon": "Heart", "title": "Amanah", "description": "Kami menjalankan setiap perjalanan dengan penuh tanggung jawab dan kejujuran."},
    {"icon": "Shield", "title": "Terpercaya", "description": "Puluhan tahun pengalaman melayani jamaah dengan standar kualitas terbaik."},
    {"icon": "Users", "title": "Profesional", "description": "Tim berpengalaman yang siap melayani dengan sepenuh hati."},
    {"icon": "Star", "title": "Berkualitas", "description": "Layanan premium dengan fasilitas terbaik untuk kenyamanan ibadah Anda."}
  ]'::jsonb,
  '[
    {"year": "2009", "event": "Didirikan sebagai biro perjalanan umroh"},
    {"year": "2012", "event": "Mendapatkan izin resmi Kemenag RI"},
    {"year": "2015", "event": "Melayani 10.000 jamaah pertama"},
    {"year": "2018", "event": "Ekspansi ke 10 cabang di seluruh Indonesia"},
    {"year": "2021", "event": "Meluncurkan sistem digital booking"},
    {"year": "2024", "event": "Mencapai 50.000+ jamaah terlayani"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. Contact Page Content
INSERT INTO public.contact_page_content (
  settings_id,
  hero_title,
  hero_subtitle,
  form_title,
  operating_hours,
  map_url
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ada Pertanyaan?',
  'Tim kami siap membantu merencanakan perjalanan ibadah Anda. Hubungi kami melalui form di bawah atau kontak langsung.',
  'Kirim Pesan',
  '[
    {"label": "Senin - Jumat", "value": "08:00 - 17:00"},
    {"label": "Sabtu", "value": "09:00 - 14:00"},
    {"label": "Minggu & Hari Libur", "value": "Tutup"}
  ]'::jsonb,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- 3. Savings Page Content
INSERT INTO public.savings_page_content (
  settings_id,
  hero_title,
  hero_subtitle,
  benefits,
  cta_title,
  cta_subtitle
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Tabungan Umroh',
  'Wujudkan impian beribadah ke Tanah Suci dengan menabung secara bertahap. Pilih paket dan tentukan tenor cicilan sesuai kemampuan Anda.',
  '[
    {"icon": "Calculator", "title": "Cicilan Fleksibel", "description": "Tenor 6-36 bulan sesuai kemampuan"},
    {"icon": "TrendingUp", "title": "Harga Terkunci", "description": "Harga paket tidak berubah selama menabung"},
    {"icon": "Shield", "title": "Dana Aman", "description": "Tercatat rapi di sistem kami"},
    {"icon": "CheckCircle", "title": "Prioritas Kuota", "description": "Dapat kuota saat tabungan lunas"}
  ]'::jsonb,
  'Ada Pertanyaan?',
  'Tim kami siap membantu menjelaskan program tabungan umroh dan membantu Anda memilih paket yang tepat.'
) ON CONFLICT (id) DO NOTHING;
