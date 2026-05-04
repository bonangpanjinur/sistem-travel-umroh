-- =============================================
-- EQUIPMENT TRACKING & DISTRIBUTION
-- =============================================

-- Create equipment distribution status enum if not exists
DO $$ BEGIN
  CREATE TYPE equipment_distribution_status AS ENUM ('pending', 'distributed', 'returned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to equipment_distributions if not exists
DO $$ BEGIN
  ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'distributed';
  ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
  ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS notes TEXT;
END $$;

-- =============================================
-- BUS MANAGEMENT SYSTEM
-- =============================================

-- Bus assignments for departures
CREATE TABLE IF NOT EXISTS bus_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES departures(id) ON DELETE CASCADE NOT NULL,
  bus_provider_id UUID REFERENCES bus_providers(id),
  bus_number VARCHAR(50) NOT NULL,
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  capacity INTEGER DEFAULT 40,
  route_type VARCHAR(50) DEFAULT 'transfer', -- transfer, city_tour, airport
  departure_point TEXT,
  arrival_point TEXT,
  departure_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bus passengers assignment
CREATE TABLE IF NOT EXISTS bus_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_assignment_id UUID REFERENCES bus_assignments(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  seat_number VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bus_assignment_id, customer_id)
);

-- =============================================
-- OFFLINE CONTENT FOR PWA (Doa & Panduan)
-- =============================================

CREATE TABLE IF NOT EXISTS offline_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL, -- doa, panduan, manasik, tips
  title VARCHAR(200) NOT NULL,
  arabic_text TEXT,
  latin_text TEXT,
  translation TEXT,
  content TEXT,
  audio_url TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert sample content for offline use
INSERT INTO offline_content (category, title, arabic_text, latin_text, translation, sort_order) VALUES
('doa', 'Doa Niat Umrah', 'اللَّهُمَّ إِنِّي أُرِيدُ الْعُمْرَةَ فَيَسِّرْهَا لِي وَتَقَبَّلْهَا مِنِّي', 
 'Allahumma inni uridul umrata fayassirha li wa taqabbalha minni',
 'Ya Allah, sesungguhnya aku hendak melaksanakan umrah, mudahkanlah bagiku dan terimalah dariku', 1),
('doa', 'Doa Talbiyah', 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ', 
 'Labbaik Allahumma labbaik, labbaik la syarika laka labbaik',
 'Aku penuhi panggilan-Mu ya Allah, aku penuhi panggilan-Mu. Tiada sekutu bagi-Mu', 2),
('doa', 'Doa Masuk Masjidil Haram', 'بِسْمِ اللَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', 
 'Bismillah wassholatu wassalamu ala Rasulillah, Allahummaftah li abwaba rahmatik',
 'Dengan nama Allah, shalawat dan salam atas Rasulullah. Ya Allah bukakanlah pintu-pintu rahmat-Mu untukku', 3),
('doa', 'Doa Sai', 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ', 
 'Innash shafa wal marwata min syaairillah',
 'Sesungguhnya Shafa dan Marwah adalah sebagian dari syiar-syiar Allah', 4),
('doa', 'Doa Minum Air Zamzam', 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَاسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ', 
 'Allahumma inni asaluka ilman nafian wa rizqan wasian wa syifaan min kulli daa',
 'Ya Allah aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang luas, dan kesembuhan dari segala penyakit', 5),
('panduan', 'Tata Cara Thawaf', NULL, NULL, NULL, 1),
('panduan', 'Tata Cara Sai', NULL, NULL, NULL, 2),
('panduan', 'Tata Cara Tahallul', NULL, NULL, NULL, 3)
ON CONFLICT DO NOTHING;

-- Update the panduan content
UPDATE offline_content SET content = 
'1. Mulai dari Hajar Aswad
2. Berjalan mengelilingi Ka''bah sebanyak 7 putaran
3. Setiap putaran dimulai dan diakhiri di Hajar Aswad
4. Pria disunnahkan berlari-lari kecil (raml) pada 3 putaran pertama
5. Berdoa sepanjang thawaf
6. Shalat 2 rakaat di belakang Maqam Ibrahim setelah selesai'
WHERE title = 'Tata Cara Thawaf' AND category = 'panduan';

UPDATE offline_content SET content = 
'1. Dimulai dari Bukit Shafa
2. Naik ke Bukit Shafa dan menghadap Ka''bah
3. Berjalan menuju Bukit Marwah
4. Pria berlari-lari kecil di antara dua tanda hijau
5. Naik ke Bukit Marwah (satu perjalanan)
6. Kembali ke Shafa (perjalanan kedua)
7. Ulangi hingga 7 kali perjalanan, berakhir di Marwah'
WHERE title = 'Tata Cara Sai' AND category = 'panduan';

UPDATE offline_content SET content = 
'1. Setelah menyelesaikan Sai
2. Potong/cukur rambut (tahallul)
3. Pria: mencukur habis (afdhal) atau memendekkan minimal 3 helai
4. Wanita: memotong ujung rambut sepanjang ruas jari
5. Setelah tahallul, selesai sudah ibadah umrah
6. Semua larangan ihram sudah halal kembali'
WHERE title = 'Tata Cara Tahallul' AND category = 'panduan';

-- =============================================
-- DOCUMENT OCR RESULTS
-- =============================================

ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS ocr_data JSONB;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMPTZ;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5,2);

-- =============================================
-- ENABLE RLS ON NEW TABLES
-- =============================================

ALTER TABLE bus_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bus_assignments
CREATE POLICY "Staff can manage bus assignments" ON bus_assignments
  FOR ALL USING (true);

-- RLS Policies for bus_passengers
CREATE POLICY "Staff can manage bus passengers" ON bus_passengers
  FOR ALL USING (true);

-- RLS Policies for offline_content (public read)
CREATE POLICY "Anyone can read offline content" ON offline_content
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage offline content" ON offline_content
  FOR ALL USING (true);

-- =============================================
-- ENABLE REALTIME FOR RELEVANT TABLES
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE bus_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE bus_passengers;