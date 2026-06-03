-- =============================================================================
-- 04_gallery_media_type.sql
-- Adds media_type column to media_gallery / package_gallery tables if missing.
-- Idempotent — safe to run multiple times.
-- =============================================================================

-- media_gallery table (used by packages for images/videos)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'media_gallery'
  ) THEN
    ALTER TABLE media_gallery ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
  END IF;
END $$;

-- package_gallery alias
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'package_gallery'
  ) THEN
    ALTER TABLE package_gallery ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
  END IF;
END $$;

-- =============================================================================
SELECT '04_gallery_media_type complete' AS result;
