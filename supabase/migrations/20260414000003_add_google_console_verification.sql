-- Add google_console_verification column to website_settings table
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS google_console_verification TEXT;

-- Update description if needed (optional, since this table doesn't seem to have a description column for each field)
COMMENT ON COLUMN public.website_settings.google_console_verification IS 'Google Search Console verification meta tag content';
