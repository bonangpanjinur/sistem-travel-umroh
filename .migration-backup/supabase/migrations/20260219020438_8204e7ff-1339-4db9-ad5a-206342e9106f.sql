-- Add custom_sections JSONB column to website_settings for persisting section editor data
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT NULL;