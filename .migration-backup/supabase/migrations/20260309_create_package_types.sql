-- Create package_types table for dynamic package type management
CREATE TABLE IF NOT EXISTS package_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_package_types_code ON package_types(code);
CREATE INDEX idx_package_types_is_active ON package_types(is_active);
CREATE INDEX idx_package_types_display_order ON package_types(display_order);

-- Enable RLS
ALTER TABLE package_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read" ON package_types
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update" ON package_types
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert" ON package_types
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON package_types
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default package types
INSERT INTO package_types (code, name, description, display_order) VALUES
  ('umroh', 'Umroh', 'Paket umroh reguler', 1),
  ('haji', 'Haji Reguler', 'Paket haji reguler', 2),
  ('haji_plus', 'Haji Plus', 'Paket haji dengan fasilitas tambahan', 3),
  ('umroh_plus', 'Umroh Plus', 'Paket umroh dengan fasilitas tambahan', 4)
ON CONFLICT (code) DO NOTHING;
