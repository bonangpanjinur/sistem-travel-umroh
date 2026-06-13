-- Invoice templates table
-- Stores dynamic layout settings for Form Transaksi PDF generation
CREATE TABLE IF NOT EXISTS invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default',
  is_default boolean DEFAULT true,
  accent_color text DEFAULT '#1e3a5f',
  font_family text DEFAULT 'helvetica',
  header_style text DEFAULT 'centered',
  show_logo boolean DEFAULT true,
  show_passenger_list boolean DEFAULT true,
  show_signature boolean DEFAULT true,
  left_signature_label text DEFAULT 'PETUGAS',
  right_signature_label text DEFAULT 'PEMESAN',
  payment_info_blocks jsonb DEFAULT '[]'::jsonb,
  terms_text text DEFAULT '',
  footer_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one default at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_templates_default
  ON invoice_templates (is_default)
  WHERE is_default = true;

-- Insert a starter template (only if table is empty)
INSERT INTO invoice_templates (name, is_default, payment_info_blocks, terms_text)
SELECT
  'Default',
  true,
  '[]'::jsonb,
  ''
WHERE NOT EXISTS (SELECT 1 FROM invoice_templates);
