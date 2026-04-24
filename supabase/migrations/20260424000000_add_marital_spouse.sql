-- Add marital status and spouse relationship to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) DEFAULT 'single', -- 'single', 'married', 'widowed', 'divorced'
ADD COLUMN IF NOT EXISTS spouse_id UUID REFERENCES customers(id), -- links to spouse
ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS spouse_passport VARCHAR(50);

-- Add index for spouse lookup
CREATE INDEX IF NOT EXISTS idx_customers_spouse ON customers(spouse_id);
CREATE INDEX IF NOT EXISTS idx_customers_marital ON customers(marital_status);

-- Create marriage relationships table for flexibility
CREATE TABLE IF NOT EXISTS customer_family_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  relative_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  relation_type VARCHAR(30) NOT NULL, -- 'spouse', 'parent', 'child', 'sibling', 'mahram', 'other'
  relation_label VARCHAR(50), -- custom label like 'Suami', 'Istri', 'Ayah', 'Ibu', etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customer_family_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on family_relations"
  ON customer_family_relations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_family_relations_customer ON customer_family_relations(customer_id);
CREATE INDEX IF NOT EXISTS idx_family_relations_type ON customer_family_relations(relation_type);

SELECT 'Marital status and family relations tables created' as status;