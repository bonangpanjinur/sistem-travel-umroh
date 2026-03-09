-- Create company_features table for dynamic "Why Choose Us" section
CREATE TABLE IF NOT EXISTS company_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID REFERENCES website_settings(id) ON DELETE CASCADE,
  icon_name VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_company_features_settings_id ON company_features(settings_id);
CREATE INDEX idx_company_features_display_order ON company_features(display_order);
CREATE INDEX idx_company_features_is_active ON company_features(is_active);

-- Enable RLS
ALTER TABLE company_features ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read" ON company_features
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update" ON company_features
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert" ON company_features
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON company_features
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default company features
INSERT INTO company_features (settings_id, icon_name, title, description, display_order) VALUES
  ('default', 'Shield', 'Izin Resmi Kemenag', 'Terdaftar dan berizin resmi dari Kementerian Agama RI dengan nomor PPIU yang valid.', 1),
  ('default', 'Award', 'Pengalaman 15+ Tahun', 'Lebih dari 15 tahun pengalaman memberangkatkan jamaah umroh dan haji dengan aman.', 2),
  ('default', 'Building2', 'Hotel Bintang 5', 'Akomodasi terbaik dengan hotel bintang 5 dekat Masjidil Haram dan Masjid Nabawi.', 3),
  ('default', 'HeartHandshake', 'Muthawif Berpengalaman', 'Pembimbing ibadah profesional yang akan mendampingi selama perjalanan.', 4),
  ('default', 'Clock', 'Jadwal Fleksibel', 'Berbagai pilihan jadwal keberangkatan yang bisa disesuaikan dengan waktu Anda.', 5),
  ('default', 'Headphones', 'Layanan 24/7', 'Tim customer service siap membantu Anda kapan saja sebelum dan selama perjalanan.', 6)
ON CONFLICT DO NOTHING;
