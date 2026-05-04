-- Add package card design settings to website_settings
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS package_card_layout text DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS package_card_image_ratio text DEFAULT '16/10';

-- Update existing row with default values
UPDATE public.website_settings 
SET 
  package_card_layout = 'modern',
  package_card_image_ratio = '16/10'
WHERE id = '00000000-0000-0000-0000-000000000001';
