-- Add PIC field to equipment_items
ALTER TABLE equipment_items 
ADD COLUMN IF NOT EXISTS pic VARCHAR(100),
ADD COLUMN IF NOT EXISTS pic_type VARCHAR(50), -- 'agent', 'pusat', 'cabang'
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255), -- generated QR code string
ADD COLUMN IF NOT EXISTS photo_url TEXT; -- photo documentation

-- PIC Types as enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_pic_type') THEN
    CREATE TYPE equipment_pic_type AS ENUM ('agent', 'pusat', 'cabang', 'lainnya');
  END IF;
END $$;

-- Stock Opname table
CREATE TABLE IF NOT EXISTS equipment_stock_opname (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  opname_date DATE NOT NULL DEFAULT CURRENT_DATE,
  physical_count INTEGER NOT NULL,
  system_count INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  notes TEXT,
  checked_by UUID REFERENCES auth.users(id),
  pic_name VARCHAR(100),
  pic_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'verified', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment_stock_opname ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on stock_opname"
  ON equipment_stock_opname FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Equipment photo documentation table
CREATE TABLE IF NOT EXISTS equipment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id UUID REFERENCES equipment_items(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id), -- optional, link to customer if distribution
  departure_id UUID REFERENCES departures(id),
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(50), -- 'distribution', 'return', 'opname', 'damage', 'other'
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on equipment_photos"
  ON equipment_photos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Low stock notification settings table
CREATE TABLE IF NOT EXISTS equipment_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  notify_admins BOOLEAN DEFAULT true,
  notify_agents BOOLEAN DEFAULT false,
  notify_pic BOOLEAN DEFAULT true,
  low_stock_threshold_default INTEGER DEFAULT 10,
  email_notification BOOLEAN DEFAULT false,
  in_app_notification BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO equipment_notification_settings (enabled, notify_admins, notify_pic) 
VALUES (true, true, true)
ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_equipment_stock_opname_item ON equipment_stock_opname(equipment_item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_photos_item ON equipment_photos(equipment_item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_photos_customer ON equipment_photos(customer_id);

-- Settings table for manifest/design configuration
CREATE TABLE IF NOT EXISTS equipment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  description VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default manifest settings
INSERT INTO equipment_settings (key, value, description) VALUES
  ('show_logo', 'true', 'Show logo on manifest'),
  ('logo_url', '', 'Logo URL for manifest'),
  ('company_name', 'Vins Tour Travel', 'Company name for manifest'),
  ('show_address', 'true', 'Show company address'),
  ('show_contact', 'true', 'Show contact info'),
  ('theme_color', '#3B82F6', 'Theme color for manifest'),
  ('font_size', '12', 'Default font size'),
  ('paper_size', 'A4', 'Paper size: A4, Letter')
ON CONFLICT (key) DO NOTHING;

SELECT 'New tables and columns created' as status;