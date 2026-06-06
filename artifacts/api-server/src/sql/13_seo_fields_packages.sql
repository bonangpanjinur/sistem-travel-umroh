-- Migration 13: SEO fields for packages table
-- Adds meta_title, meta_description, keywords for per-package SEO

ALTER TABLE packages ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS keywords TEXT[];
