-- Migration 14: SEO fields for departures table
-- Adds meta_title, meta_description, slug for per-departure SEO
-- Idempotent — safe to run multiple times

ALTER TABLE departures ADD COLUMN IF NOT EXISTS meta_title       TEXT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS slug             TEXT;

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_departures_slug ON departures (slug) WHERE slug IS NOT NULL;
