-- Add discount fields to packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0;

COMMENT ON COLUMN public.packages.discount_amount IS 'Fixed discount amount to be subtracted from the package price';
COMMENT ON COLUMN public.packages.discount_percentage IS 'Discount percentage to be applied to the package price';
