-- Add package card icon visibility settings to website_settings
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS package_card_show_airline boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS package_card_show_hotel boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS package_card_show_duration boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS package_card_show_departure boolean DEFAULT true;

-- Update existing row with default values
UPDATE public.website_settings 
SET 
  package_card_show_airline = true,
  package_card_show_hotel = true,
  package_card_show_duration = true,
  package_card_show_departure = true
WHERE id = '00000000-0000-0000-0000-000000000001';
