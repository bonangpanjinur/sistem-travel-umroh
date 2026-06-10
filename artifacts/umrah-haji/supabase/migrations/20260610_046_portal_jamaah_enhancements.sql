-- ============================================================
-- Migration 046: Portal Jamaah Enhancements (Sprint 16)
-- Adds columns to departure_itineraries, creates ibadah_guides
-- and jamaah_journals tables.
-- ============================================================

-- 1. Kolom tambahan di departure_itineraries
ALTER TABLE departure_itineraries
  ADD COLUMN IF NOT EXISTS location_city  TEXT,
  ADD COLUMN IF NOT EXISTS guide_key      TEXT,
  ADD COLUMN IF NOT EXISTS icon_name      TEXT,
  ADD COLUMN IF NOT EXISTS category       TEXT;

-- Index untuk query itinerary hari ini
CREATE INDEX IF NOT EXISTS idx_dep_itin_departure_day
  ON departure_itineraries(departure_id, day_number);

-- 2. Tabel konten panduan ibadah
CREATE TABLE IF NOT EXISTS ibadah_guides (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_key    TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  arabic_text  TEXT,
  latin_text   TEXT,
  translation  TEXT NOT NULL,
  audio_url    TEXT,
  steps        JSONB,
  tags         TEXT[],
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ibadah_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active guides"
  ON ibadah_guides FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage guides"
  ON ibadah_guides FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'operational')
  ));

-- 3. Seed: panduan ibadah dasar
INSERT INTO ibadah_guides (guide_key, title, translation, tags, steps)
VALUES
  ('tawaf',  'Tawaf',  'Mengelilingi Ka''bah 7 putaran berlawanan arah jarum jam, dimulai dari Hajar Aswad.',
   ARRAY['makkah','umroh','haji'],
   '[{"step":1,"title":"Niat","desc":"Niatkan tawaf di dalam hati"},{"step":2,"title":"Mulai di Hajar Aswad","desc":"Lambaikan tangan kanan ke arah Hajar Aswad sambil mengucapkan Bismillah"},{"step":3,"title":"7 Putaran","desc":"Kelilingi Ka''bah 7 kali, Ka''bah selalu di sebelah kiri"},{"step":4,"title":"Doa","desc":"Berdoa sesuai sunnah di setiap sudut Ka''bah"},{"step":5,"title":"Sholat 2 Rakaat","desc":"Sholat sunnah tawaf di belakang Maqam Ibrahim"}]'::jsonb),

  ('sai',    'Sa''i',  'Berjalan 7 kali antara bukit Shafa dan Marwah mengikuti jejak Siti Hajar.',
   ARRAY['makkah','umroh','haji'],
   '[{"step":1,"title":"Naiki Bukit Shafa","desc":"Mulai dari Shafa, hadapkan wajah ke Ka''bah dan berdoa"},{"step":2,"title":"Berjalan ke Marwah","desc":"Berjalan menuju Marwah (laki-laki berlari kecil di antara tanda hijau)"},{"step":3,"title":"7 Perjalanan","desc":"Shafa→Marwah dihitung 1, Marwah→Shafa dihitung 2, dst. Selesai di Marwah"},{"step":4,"title":"Doa di Marwah","desc":"Tutup dengan doa di atas bukit Marwah"}]'::jsonb),

  ('wuquf',  'Wukuf Arafah',  'Berdiam di padang Arafah dari tergelincir matahari (dzuhur) hingga maghrib pada 9 Dzulhijjah.',
   ARRAY['arafah','haji'],
   '[{"step":1,"title":"Tiba di Arafah","desc":"Pastikan sudah tiba sebelum dzuhur tanggal 9 Dzulhijjah"},{"step":2,"title":"Khutbah & Sholat","desc":"Ikuti khutbah wukuf, sholat dzuhur dan ashar dijamak qasar"},{"step":3,"title":"Berdoa","desc":"Perbanyak doa, dzikir, istighfar hingga terbenam matahari"},{"step":4,"title":"Berangkat ke Muzdalifah","desc":"Setelah maghrib, bertolak ke Muzdalifah dengan tenang"}]'::jsonb),

  ('ihram',  'Ihram',  'Berniat masuk dalam ibadah haji atau umroh dengan memakai pakaian ihram.',
   ARRAY['makkah','madinah','umroh','haji'],
   '[{"step":1,"title":"Mandi Sunnah","desc":"Mandi sunnah sebelum memakai ihram"},{"step":2,"title":"Pakai Ihram","desc":"Pria: 2 lembar kain putih tak berjahit. Wanita: pakaian yang menutup aurat kecuali wajah & tangan"},{"step":3,"title":"Sholat Sunnah Ihram","desc":"Sholat 2 rakaat di miqat"},{"step":4,"title":"Niat","desc":"Ucapkan niat umroh atau haji: Labbaika Allahumma umratan / hajjan"},{"step":5,"title":"Talbiyah","desc":"Ucapkan talbiyah terus menerus hingga tawaf dimulai"}]'::jsonb),

  ('tahallul', 'Tahallul', 'Memotong atau mencukur rambut sebagai tanda selesainya ihram.',
   ARRAY['makkah','umroh','haji'],
   '[{"step":1,"title":"Setelah Sa''i","desc":"Dilakukan setelah menyelesaikan sa''i"},{"step":2,"title":"Pria: Cukur/Potong","desc":"Pria dianjurkan mencukur seluruh kepala (afdhal) atau minimal memotong 3 helai"},{"step":3,"title":"Wanita: Potong","desc":"Wanita memotong rambut sepanjang ujung jari (sekitar 1 cm)"},{"step":4,"title":"Ihram Selesai","desc":"Setelah tahallul, semua larangan ihram berakhir"}]'::jsonb)

ON CONFLICT (guide_key) DO NOTHING;

-- 4. Tabel jurnal perjalanan jamaah
CREATE TABLE IF NOT EXISTS jamaah_journals (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id),
  trip_day     INTEGER,
  content      TEXT,
  mood         TEXT,
  photo_urls   TEXT[],
  location     TEXT,
  is_private   BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jamaah_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their journals"
  ON jamaah_journals FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_journals_user_booking
  ON jamaah_journals(user_id, booking_id, trip_day);
