-- Add category field to equipment_items
ALTER TABLE equipment_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Lainnya';

-- Create equipment_categories table for master data
CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Insert default categories
INSERT INTO equipment_categories (name, description, color) VALUES
  ('Pakaian Ihram', 'Baju ihram untuk pria dan wanita', '#8B5CF6'),
  ('Buku & Panduan', 'Buku doa, panduan manasik, dll', '#3B82F6'),
  ('Koper & Tas', 'Koper, tas kabin, tas kecil', '#10B981'),
  ('Aksesoris', 'Kacamata, topi, sajadah, dll', '#F59E0B'),
  ('Perlengkapan Lain', 'Obat-obatan, kebutuhan pribadi', '#EF4444'),
  ('Lainnya', 'Barang lain-lain', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Create stock_history table for tracking changes
CREATE TABLE IF NOT EXISTS equipment_stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'in', 'out', 'adjustment', 'distribution', 'return'
  quantity_change INTEGER NOT NULL, -- positive for in, negative for out
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  reference_id UUID, -- can reference booking_id, departure_id, etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment_stock_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all for authenticated users on stock_history"
  ON equipment_stock_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_equipment_stock_history_item 
  ON equipment_stock_history(equipment_item_id, created_at DESC);

-- Add index for departure filter
CREATE INDEX IF NOT EXISTS idx_equipment_stock_history_reference
  ON equipment_stock_history(reference_id);

-- Verify
SELECT 'Categories created:' as status, COUNT(*) as count FROM equipment_categories;
SELECT 'Stock history table ready' as status;