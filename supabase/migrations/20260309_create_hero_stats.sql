-- Create hero_stats table for dynamic hero section statistics
CREATE TABLE IF NOT EXISTS hero_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID REFERENCES website_settings(id) ON DELETE CASCADE,
  stat_value VARCHAR(50) NOT NULL,
  stat_label VARCHAR(100) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_hero_stats_settings_id ON hero_stats(settings_id);
CREATE INDEX idx_hero_stats_display_order ON hero_stats(display_order);

-- Enable RLS
ALTER TABLE hero_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read" ON hero_stats
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update" ON hero_stats
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert" ON hero_stats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON hero_stats
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default hero stats
INSERT INTO hero_stats (settings_id, stat_value, stat_label, display_order) VALUES
  ('default', '15+', 'Tahun Pengalaman', 1),
  ('default', '50K+', 'Jamaah Terlayani', 2),
  ('default', '100+', 'Keberangkatan/Tahun', 3),
  ('default', '4.9', 'Rating Kepuasan', 4)
ON CONFLICT DO NOTHING;
