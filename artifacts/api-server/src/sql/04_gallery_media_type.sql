-- =============================================================================
-- Migration 04: Add media_type column to media_gallery table
-- Supports photos and videos in package gallery
-- Safe to run multiple times (idempotent)
-- =============================================================================

ALTER TABLE media_gallery
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

-- Backfill existing rows: detect video from URL extension
UPDATE media_gallery
SET media_type = 'video'
WHERE media_type = 'image'
  AND (
    media_url ILIKE '%.mp4' OR
    media_url ILIKE '%.webm' OR
    media_url ILIKE '%.ogg' OR
    media_url ILIKE '%.mov' OR
    media_url ILIKE '%.avi' OR
    media_url ILIKE '%.mkv' OR
    media_url ILIKE '%.m4v'
  );

CREATE INDEX IF NOT EXISTS idx_media_gallery_media_type ON media_gallery(media_type);

COMMENT ON COLUMN media_gallery.media_type IS 'Type of media: image or video';
