-- Add district and village columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS village TEXT;
