-- ============================================================
-- FASE 2 MIGRATION: Public Website Agent & Branch
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Pastikan kolom slug ada di tabel agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS website_bio TEXT;

-- 2. Pastikan kolom slug dan website ada di tabel branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_description TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_banner_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_gallery JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_testimonials JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 3. Function untuk auto-generate slug dari nama
CREATE OR REPLACE FUNCTION slugify_text(input TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(input);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(result, '-');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Backfill slug untuk agen yang belum punya slug
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN SELECT id, company_name, agent_code FROM agents WHERE slug IS NULL LOOP
    base_slug := slugify_text(COALESCE(rec.company_name, rec.agent_code, rec.id::TEXT));
    final_slug := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM agents WHERE slug = final_slug AND id != rec.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    UPDATE agents SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- 5. Backfill slug untuk cabang yang belum punya slug
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN SELECT id, name, code FROM branches WHERE slug IS NULL LOOP
    base_slug := slugify_text(COALESCE(rec.name, rec.code, rec.id::TEXT));
    final_slug := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM branches WHERE slug = final_slug AND id != rec.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    UPDATE branches SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- 6. Trigger auto-slug saat insert agen baru
CREATE OR REPLACE FUNCTION set_agent_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := slugify_text(COALESCE(NEW.company_name, NEW.agent_code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM agents WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_slug ON agents;
CREATE TRIGGER trg_agent_slug
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION set_agent_slug();

-- 7. Trigger auto-slug saat insert cabang baru
CREATE OR REPLACE FUNCTION set_branch_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := slugify_text(COALESCE(NEW.name, NEW.code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM branches WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branch_slug ON branches;
CREATE TRIGGER trg_branch_slug
  BEFORE INSERT OR UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_branch_slug();

-- ============================================================
-- SELESAI — Fase 2: Slug agen & cabang siap
-- ============================================================
